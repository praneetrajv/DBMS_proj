import express from "express";
import mysql from "mysql2/promise";
import { dbConfig } from "../config/database.js";

const router = express.Router();

router.get("/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      "SELECT UserID, Name, Username, Email, Gender, ProfileType FROM User WHERE UserID = ?",
      [userId],
    );
    await connection.end();

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error("Error fetching profile data:", error);
    res.status(500).json({ message: "Failed to retrieve profile data." });
  }
});

router.get("/:userId/posts", async (req, res) => {
  const { userId } = req.params;
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      `SELECT 
        P.PostID, P.Content, P.Timestamp, P.LikeCount, P.CommentCount, 
        P.GroupID, G.Name AS GroupName 
       FROM Post P
       LEFT JOIN GroupTable G ON P.GroupID = G.GroupID
       WHERE P.UserID = ?
       ORDER BY P.Timestamp DESC`,
      [userId],
    );
    await connection.end();
    res.json(rows);
  } catch (error) {
    console.error("Error fetching user posts:", error);
    res.status(500).json({ message: "Failed to retrieve user posts." });
  }
});

router.get("/:userId/can-view", async (req, res) => {
  const currentUserId = req.currentUserId;
  const { userId } = req.params;
  const profileId = parseInt(userId);

  if (currentUserId === profileId) {
    return res.json({ canView: true, reason: "own_profile" });
  }

  try {
    const connection = await mysql.createConnection(dbConfig);

    const [userRows] = await connection.execute(
      "SELECT ProfileType FROM User WHERE UserID = ?",
      [profileId],
    );

    if (userRows.length === 0) {
      await connection.end();
      return res.status(404).json({ message: "User not found." });
    }

    const profileType = userRows[0].ProfileType;

    if (profileType === "Public") {
      await connection.end();
      return res.json({ canView: true, reason: "public_profile" });
    }

    const [friendRows] = await connection.execute(
      `SELECT Status FROM Friendship 
       WHERE ((UserID1 = ? AND UserID2 = ?) OR (UserID1 = ? AND UserID2 = ?))
       AND Status = 'Accepted'`,
      [currentUserId, profileId, profileId, currentUserId],
    );

    await connection.end();

    if (friendRows.length > 0) {
      return res.json({ canView: true, reason: "friends" });
    }

    return res.json({ canView: false, reason: "private_profile" });
  } catch (error) {
    console.error("Error checking view permissions:", error);
    res.status(500).json({ message: "Failed to check permissions." });
  }
});

router.get("/:userId/follower-counts", async (req, res) => {
  const { userId } = req.params;

  try {
    const connection = await mysql.createConnection(dbConfig);

    const [followersResult] = await connection.execute(
      `SELECT COUNT(*) as count FROM Friendship 
       WHERE UserID2 = ? AND Status = 'Accepted'`,
      [userId],
    );

    const [followingResult] = await connection.execute(
      `SELECT COUNT(*) as count FROM Friendship 
       WHERE UserID1 = ? AND Status = 'Accepted'`,
      [userId],
    );

    await connection.end();

    res.json({
      followers: followersResult[0].count,
      following: followingResult[0].count,
    });
  } catch (error) {
    console.error("Error fetching follower counts:", error);
    res.status(500).json({ message: "Failed to fetch follower counts." });
  }
});

router.put("/:userId/settings", async (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.currentUserId;
  const { profileType } = req.body;

  if (parseInt(userId) !== currentUserId) {
    return res
      .status(403)
      .json({ message: "Unauthorized to update this profile." });
  }

  if (!["Public", "Private"].includes(profileType)) {
    return res.status(400).json({ message: "Invalid profile type." });
  }

  try {
    const connection = await mysql.createConnection(dbConfig);
    await connection.execute(
      "UPDATE User SET ProfileType = ? WHERE UserID = ?",
      [profileType, userId],
    );
    await connection.end();
    res.json({ message: "Profile settings updated successfully." });
  } catch (error) {
    console.error("Error updating profile settings:", error);
    res.status(500).json({ message: "Failed to update profile settings." });
  }
});

router.get("/:userId/groups", async (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.currentUserId;

  if (parseInt(userId) !== currentUserId) {
    return res
      .status(403)
      .json({ message: "Unauthorized to view this user's groups." });
  }

  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      `SELECT 
        G.GroupID,
        G.Name,
        G.Description,
        G.MemberCount,
        GM.Role,
        GM.JoinDate
       FROM GroupMembership GM
       JOIN GroupTable G ON GM.GroupID = G.GroupID
       WHERE GM.UserID = ?
       ORDER BY GM.JoinDate DESC`,
      [userId],
    );
    await connection.end();
    res.json(rows);
  } catch (error) {
    console.error("Error fetching user groups:", error);
    res.status(500).json({ message: "Failed to retrieve user groups." });
  }
});

router.get("/:userId/followers", async (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.currentUserId;

  try {
    const connection = await mysql.createConnection(dbConfig);

    // Get followers (people who follow this user)
    const [rows] = await connection.execute(
      `SELECT 
        F.UserID1 AS UserID,
        U.Name,
        U.Username,
        U.ProfileType,
        F.SinceDate,
        CASE 
          WHEN F2.UserID1 IS NOT NULL THEN 1 
          ELSE 0 
        END AS YouFollowThem
       FROM Friendship F
       JOIN User U ON F.UserID1 = U.UserID
       LEFT JOIN Friendship F2 ON (
         F2.UserID1 = ? AND F2.UserID2 = F.UserID1 AND F2.Status = 'Accepted'
       )
       WHERE F.UserID2 = ? AND F.Status = 'Accepted'
       ORDER BY F.SinceDate DESC`,
      [currentUserId, userId],
    );

    await connection.end();
    res.json(rows);
  } catch (error) {
    console.error("Error fetching followers:", error);
    res.status(500).json({ message: "Failed to retrieve followers." });
  }
});

router.get("/:userId/following", async (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.currentUserId;

  try {
    const connection = await mysql.createConnection(dbConfig);

    // Get following (people this user follows)
    const [rows] = await connection.execute(
      `SELECT 
        F.UserID2 AS UserID,
        U.Name,
        U.Username,
        U.ProfileType,
        F.SinceDate,
        1 AS YouFollowThem
       FROM Friendship F
       JOIN User U ON F.UserID2 = U.UserID
       WHERE F.UserID1 = ? AND F.Status = 'Accepted'
       ORDER BY F.SinceDate DESC`,
      [userId],
    );

    await connection.end();
    res.json(rows);
  } catch (error) {
    console.error("Error fetching following:", error);
    res.status(500).json({ message: "Failed to retrieve following." });
  }
});

export default router;
