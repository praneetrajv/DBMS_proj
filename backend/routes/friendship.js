import express from "express";
import mysql from "mysql2/promise";
import { dbConfig } from "../config/database.js";

const router = express.Router();

router.get("/:profileId/follow-status", async (req, res) => {
  const currentUserId = req.currentUserId;
  const profileId = parseInt(req.params.profileId);

  try {
    const connection = await mysql.createConnection(dbConfig);

    const [youToThem] = await connection.execute(
      `SELECT Status FROM Friendship 
       WHERE UserID1 = ? AND UserID2 = ?`,
      [currentUserId, profileId],
    );

    const [themToYou] = await connection.execute(
      `SELECT Status FROM Friendship 
       WHERE UserID1 = ? AND UserID2 = ?`,
      [profileId, currentUserId],
    );

    await connection.end();

    res.json({
      yourStatus: youToThem.length > 0 ? youToThem[0].Status : null,
      theirStatus: themToYou.length > 0 ? themToYou[0].Status : null,
    });
  } catch (error) {
    console.error("Error checking follow status:", error);
    res.status(500).json({ message: "Failed to check follow status." });
  }
});

router.post("/:profileId/toggle-friendship", async (req, res) => {
  const initiatorId = req.currentUserId;
  const targetId = parseInt(req.params.profileId);
  const { action } = req.body;

  if (initiatorId === targetId) {
    return res
      .status(400)
      .json({ message: "Cannot perform action on yourself." });
  }

  try {
    const connection = await mysql.createConnection(dbConfig);

    // Get target profile type
    const [[targetProfile]] = await connection.execute(
      "SELECT ProfileType FROM User WHERE UserID = ?",
      [targetId],
    );

    if (!targetProfile) {
      await connection.end();
      return res.status(404).json({ message: "User not found." });
    }

    const isTargetPublic = targetProfile.ProfileType === "Public";

    // ------------------------------------------------------
    // Separate A→B and B→A rows
    // ------------------------------------------------------
    const [[yourRow]] = await connection.execute(
      "SELECT * FROM Friendship WHERE UserID1 = ? AND UserID2 = ?",
      [initiatorId, targetId],
    );

    const [[theirRow]] = await connection.execute(
      "SELECT * FROM Friendship WHERE UserID1 = ? AND UserID2 = ?",
      [targetId, initiatorId],
    );

    const yourStatus = yourRow ? yourRow.Status : "None";
    const theirStatus = theirRow ? theirRow.Status : "None";

    let message = "";
    let success = true;

    // ------------------------------------------------------
    // ACTION HANDLING (Instagram Logic)
    // ------------------------------------------------------

    switch (action) {
      // ----------------------------------------------------
      // SEND FOLLOW
      // ----------------------------------------------------
      case "send":
        if (yourStatus !== "None") {
          message = "You already follow or requested.";
          success = false;
          break;
        }

        if (isTargetPublic) {
          // Instant follow
          await connection.execute(
            "INSERT INTO Friendship (UserID1, UserID2, Status, SinceDate) VALUES (?, ?, 'Accepted', CURRENT_DATE())",
            [initiatorId, targetId],
          );
          message = "Followed successfully!";
        } else {
          // Private → pending
          await connection.execute(
            "INSERT INTO Friendship (UserID1, UserID2, Status, SinceDate) VALUES (?, ?, 'Pending', CURRENT_DATE())",
            [initiatorId, targetId],
          );
          message = "Follow request sent!";
        }
        break;

      // ----------------------------------------------------
      // ACCEPT REQUEST (only if THEY sent you a pending)
      // ----------------------------------------------------
      case "accept":
        if (theirStatus !== "Pending") {
          message = "No incoming request to accept.";
          success = false;
          break;
        }

        await connection.execute(
          "UPDATE Friendship SET Status = 'Accepted', SinceDate = CURRENT_DATE() WHERE UserID1 = ? AND UserID2 = ?",
          [targetId, initiatorId],
        );

        message = "Request accepted!";
        break;

      // ----------------------------------------------------
      // DECLINE REQUEST (only if THEY sent it)
      // ----------------------------------------------------
      case "decline":
        if (theirStatus !== "Pending") {
          message = "No incoming request to decline.";
          success = false;
          break;
        }

        await connection.execute(
          "DELETE FROM Friendship WHERE UserID1 = ? AND UserID2 = ?",
          [targetId, initiatorId],
        );

        message = "Request declined.";
        break;

      // ----------------------------------------------------
      // CANCEL OUTGOING REQUEST
      // ----------------------------------------------------
      case "cancel":
        if (yourStatus !== "Pending") {
          message = "No pending outgoing request to cancel.";
          success = false;
          break;
        }

        await connection.execute(
          "DELETE FROM Friendship WHERE UserID1 = ? AND UserID2 = ?",
          [initiatorId, targetId],
        );

        message = "Request cancelled.";
        break;

      // ----------------------------------------------------
      // UNFRIEND / UNFOLLOW
      // ----------------------------------------------------
      case "unfriend":
        if (yourStatus !== "Accepted") {
          message = "You are not following this user.";
          success = false;
          break;
        }

        await connection.execute(
          "DELETE FROM Friendship WHERE UserID1 = ? AND UserID2 = ?",
          [initiatorId, targetId],
        );

        message = "Unfollowed successfully.";
        break;

      // ----------------------------------------------------
      default:
        success = false;
        message = "Invalid action.";
    }

    await connection.end();

    if (!success) return res.status(400).json({ message });
    return res.status(200).json({ message });
  } catch (err) {
    console.error(err);

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Duplicate follow row." });
    }
    return res.status(500).json({ message: "Server error." });
  }
});

router.get("/pending-requests", async (req, res) => {
  const receiverId = req.currentUserId;

  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      `SELECT 
        F.UserID1 AS SenderID,
        U.Name AS SenderName,
        U.Username AS SenderUsername,
        F.SinceDate
       FROM Friendship F
       JOIN User U ON F.UserID1 = U.UserID
       WHERE F.UserID2 = ? AND F.Status = 'Pending'`,
      [receiverId],
    );
    await connection.end();
    res.json(rows);
  } catch (error) {
    console.error("Error fetching pending requests:", error);
    res.status(500).json({ message: "Failed to retrieve pending requests." });
  }
});

router.get("/outgoing-requests", async (req, res) => {
  const senderId = req.currentUserId;

  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      `SELECT 
        F.UserID2 AS ReceiverID,
        U.Name AS ReceiverName,
        U.Username AS ReceiverUsername,
        F.SinceDate
       FROM Friendship F
       JOIN User U ON F.UserID2 = U.UserID
       WHERE F.UserID1 = ? AND F.Status = 'Pending'`,
      [senderId],
    );
    await connection.end();
    res.json(rows);
  } catch (error) {
    console.error("Error fetching outgoing requests:", error);
    res.status(500).json({ message: "Failed to retrieve outgoing requests." });
  }
});

export default router;
