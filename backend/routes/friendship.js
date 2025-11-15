import express from "express";
import mysql from "mysql2/promise";
import { dbConfig } from "../config/database.js";

const router = express.Router();

router.get("/:profileId/follow-status", async (req, res) => {
  const currentUserId = req.currentUserId;
  const profileId = parseInt(req.params.profileId);

  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      `SELECT Status, UserID1 FROM Friendship 
       WHERE (UserID1 = ? AND UserID2 = ?) OR (UserID1 = ? AND UserID2 = ?)`,
      [currentUserId, profileId, profileId, currentUserId],
    );
    await connection.end();

    if (rows.length > 0) {
      res.json({
        status: rows[0].Status,
        rowInitiatorId: rows[0].UserID1,
      });
    } else {
      res.json({ status: null, rowInitiatorId: null });
    }
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
    return res.status(400).json({ message: "Cannot perform action on yourself." });
  }

  try {
    const connection = await mysql.createConnection(dbConfig);

    const [profileRows] = await connection.execute(
      "SELECT ProfileType FROM User WHERE UserID = ?",
      [targetId],
    );

    if (profileRows.length === 0) {
      await connection.end();
      return res.status(404).json({ message: "User not found." });
    }

    const isPublicProfile = profileRows[0].ProfileType === "Public";

    const [existing] = await connection.execute(
      `SELECT Status, UserID1 
       FROM Friendship 
       WHERE (UserID1 = ? AND UserID2 = ?) OR (UserID1 = ? AND UserID2 = ?)`,
      [initiatorId, targetId, targetId, initiatorId],
    );

    const status = existing.length > 0 ? existing[0].Status : "None";
    const senderIdInRow = status !== "None" ? existing[0].UserID1 : null;
    const isInitiatorTheSender = senderIdInRow && senderIdInRow === initiatorId;

    let actionMessage = "No action taken.";
    let success = true;

    switch (action) {
      case "send":
        if (status === "None") {
          const relationshipStatus = isPublicProfile ? "Accepted" : "Pending";
          await connection.execute(
            "INSERT INTO Friendship (UserID1, UserID2, Status, SinceDate) VALUES (?, ?, ?, CURRENT_DATE())",
            [initiatorId, targetId, relationshipStatus],
          );
          actionMessage = isPublicProfile ? "Now following!" : "Friend request sent (Pending).";
        } else {
          actionMessage = "A relationship already exists.";
          success = false;
        }
        break;

      case "accept":
        if (status === "Pending" && !isInitiatorTheSender) {
          await connection.execute(
            "UPDATE Friendship SET Status = 'Accepted', SinceDate = CURRENT_DATE() WHERE UserID1 = ? AND UserID2 = ?",
            [senderIdInRow, initiatorId],
          );
          actionMessage = "Friend request accepted!";
        } else {
          actionMessage = "Cannot accept: no pending request received or you sent the request.";
          success = false;
        }
        break;

      case "cancel":
        if (status === "Pending" && isInitiatorTheSender) {
          await connection.execute(
            "DELETE FROM Friendship WHERE UserID1 = ? AND UserID2 = ?",
            [initiatorId, targetId],
          );
          actionMessage = "Friend request cancelled.";
        } else if (status === "Accepted" && isInitiatorTheSender && isPublicProfile) {
          await connection.execute(
            "DELETE FROM Friendship WHERE UserID1 = ? AND UserID2 = ?",
            [initiatorId, targetId],
          );
          actionMessage = "Unfollowed successfully.";
        } else {
          actionMessage = "Cannot cancel: not the sender or request is not pending.";
          success = false;
        }
        break;

      case "decline":
        if (status === "Pending" && !isInitiatorTheSender) {
          await connection.execute(
            "DELETE FROM Friendship WHERE UserID1 = ? AND UserID2 = ?",
            [senderIdInRow, initiatorId],
          );
          actionMessage = "Friend request declined.";
        } else {
          actionMessage = "Cannot decline: no pending request received or you sent the request.";
          success = false;
        }
        break;

      case "unfriend":
        if (status === "Accepted") {
          await connection.execute(
            "DELETE FROM Friendship WHERE (UserID1 = ? AND UserID2 = ?) OR (UserID1 = ? AND UserID2 = ?)",
            [initiatorId, targetId, targetId, initiatorId],
          );
          actionMessage = isPublicProfile ? "Unfollowed successfully." : "Unfriended successfully.";
        } else {
          actionMessage = "Cannot perform this deletion action.";
          success = false;
        }
        break;

      default:
        actionMessage = "Invalid action specified.";
        success = false;
    }

    await connection.end();
    if (success) {
      res.status(200).json({ message: actionMessage });
    } else {
      res.status(400).json({ message: actionMessage });
    }
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "A friendship request already exists." });
    }
    console.error(`Error processing friendship action:`, error);
    res.status(500).json({ message: "Could not update friendship status." });
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
