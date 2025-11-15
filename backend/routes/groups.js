import express from "express";
import mysql from "mysql2/promise";
import { dbConfig } from "../config/database.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      "SELECT GroupID, Name, Description, MemberCount FROM GroupTable ORDER BY MemberCount DESC",
    );
    await connection.end();
    res.json(rows);
  } catch (error) {
    console.error("Error fetching groups:", error);
    res.status(500).json({ message: "Failed to retrieve groups." });
  }
});

router.post("/create", async (req, res) => {
  const creatorId = req.currentUserId;
  const { name, description } = req.body;

  if (!name || !description) {
    return res
      .status(400)
      .json({ message: "Group name and description are required." });
  }

  try {
    const connection = await mysql.createConnection(dbConfig);
    await connection.beginTransaction();

    const [result] = await connection.execute(
      "INSERT INTO GroupTable (Name, Description, CreatedBy, CreatedDate) VALUES (?, ?, ?, CURRENT_DATE())",
      [name, description, creatorId],
    );

    const groupId = result.insertId;

    await connection.execute(
      "INSERT INTO GroupMembership (GroupID, UserID, Role, JoinDate) VALUES (?, ?, 'Admin', NOW())",
      [groupId, creatorId],
    );

    await connection.commit();
    await connection.end();

    res.status(201).json({
      message: "Group created successfully!",
      groupId: groupId,
    });
  } catch (error) {
    console.error("Error creating group:", error);
    res.status(500).json({ message: "Failed to create group." });
  }
});

router.get("/:groupId", async (req, res) => {
  const { groupId } = req.params;
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      "SELECT GroupID, Name, Description, MemberCount FROM GroupTable WHERE GroupID = ?",
      [groupId],
    );
    await connection.end();

    if (rows.length === 0) {
      return res.status(404).json({ message: "Group not found." });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error("Error fetching group details:", error);
    res.status(500).json({ message: "Failed to retrieve group details." });
  }
});

router.get("/:groupId/membership-status", async (req, res) => {
  const { groupId } = req.params;
  const userId = req.currentUserId;

  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      "SELECT Role FROM GroupMembership WHERE GroupID = ? AND UserID = ?",
      [groupId, userId],
    );
    await connection.end();

    if (rows.length > 0) {
      res.json({ isMember: true, role: rows[0].Role });
    } else {
      res.json({ isMember: false, role: null });
    }
  } catch (error) {
    console.error("Error checking membership status:", error);
    res.status(500).json({ message: "Failed to check membership status." });
  }
});

router.get("/:groupId/posts", async (req, res) => {
  const { groupId } = req.params;
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      `SELECT 
        P.PostID, P.UserID, U.Name AS Author, P.Content, P.Timestamp, 
        P.LikeCount, P.CommentCount
       FROM Post P
       JOIN User U ON P.UserID = U.UserID
       WHERE P.GroupID = ?
       ORDER BY P.Timestamp DESC`,
      [groupId],
    );
    await connection.end();
    res.json(rows);
  } catch (error) {
    console.error("Error fetching group posts:", error);
    res.status(500).json({ message: "Failed to retrieve group posts." });
  }
});

router.get("/:groupId/members", async (req, res) => {
  const { groupId } = req.params;
  const currentUserId = req.currentUserId;

  try {
    const connection = await mysql.createConnection(dbConfig);

    const [memberCheck] = await connection.execute(
      "SELECT Role FROM GroupMembership WHERE GroupID = ? AND UserID = ?",
      [groupId, currentUserId],
    );

    const userRole = memberCheck.length > 0 ? memberCheck[0].Role : null;

    const [rows] = await connection.execute(
      `SELECT 
        GM.UserID,
        U.Name,
        U.Username,
        GM.Role,
        GM.JoinDate
       FROM GroupMembership GM
       JOIN User U ON GM.UserID = U.UserID
       WHERE GM.GroupID = ?
       ORDER BY 
         CASE GM.Role 
           WHEN 'Admin' THEN 1 
           WHEN 'Member' THEN 2 
         END,
         GM.JoinDate ASC`,
      [groupId],
    );

    await connection.end();
    res.json({ members: rows, currentUserRole: userRole });
  } catch (error) {
    console.error("Error fetching group members:", error);
    res.status(500).json({ message: "Failed to retrieve group members." });
  }
});

router.post("/:groupId/join", async (req, res) => {
  const { groupId } = req.params;
  const userId = req.currentUserId;

  try {
    const connection = await mysql.createConnection(dbConfig);
    await connection.execute(
      "INSERT INTO GroupMembership (GroupID, UserID, Role, JoinDate) VALUES (?, ?, 'Member', NOW())",
      [groupId, userId],
    );
    await connection.end();
    res
      .status(200)
      .json({ message: "Successfully joined group. MemberCount incremented." });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ message: "You are already a member of this group." });
    }
    console.error("Error joining group:", error);
    res.status(500).json({ message: "Failed to join group." });
  }
});

router.delete("/:groupId/leave", async (req, res) => {
  const { groupId } = req.params;
  const userId = req.currentUserId;

  try {
    const connection = await mysql.createConnection(dbConfig);

    // Check if user is an admin
    const [roleCheck] = await connection.execute(
      "SELECT Role FROM GroupMembership WHERE GroupID = ? AND UserID = ?",
      [groupId, userId],
    );

    if (roleCheck.length === 0) {
      await connection.end();
      return res
        .status(404)
        .json({ message: "You are not currently a member of this group." });
    }

    // If user is admin, they cannot leave - must delete group instead
    if (roleCheck[0].Role === "Admin") {
      await connection.end();
      return res.status(403).json({
        message: "Admins cannot leave groups. Use delete group instead.",
        isAdmin: true,
      });
    }

    const [result] = await connection.execute(
      "DELETE FROM GroupMembership WHERE GroupID = ? AND UserID = ?",
      [groupId, userId],
    );
    await connection.end();

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "You are not currently a member of this group." });
    }

    res
      .status(200)
      .json({ message: "Successfully left group. MemberCount decremented." });
  } catch (error) {
    console.error("Error leaving group:", error);
    res.status(500).json({ message: "Failed to leave group." });
  }
});

// NEW: Delete group endpoint (admin only)
router.delete("/:groupId", async (req, res) => {
  const { groupId } = req.params;
  const userId = req.currentUserId;

  try {
    const connection = await mysql.createConnection(dbConfig);

    // Check if user is an admin of this group
    const [adminCheck] = await connection.execute(
      "SELECT Role FROM GroupMembership WHERE GroupID = ? AND UserID = ?",
      [groupId, userId],
    );

    if (adminCheck.length === 0 || adminCheck[0].Role !== "Admin") {
      await connection.end();
      return res
        .status(403)
        .json({ message: "Only admins can delete groups." });
    }

    // Delete the group (cascade will handle memberships and posts)
    const [result] = await connection.execute(
      "DELETE FROM GroupTable WHERE GroupID = ?",
      [groupId],
    );
    await connection.end();

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Group not found." });
    }

    res.status(200).json({ message: "Group deleted successfully." });
  } catch (error) {
    console.error("Error deleting group:", error);
    res.status(500).json({ message: "Failed to delete group." });
  }
});

router.delete("/:groupId/kick/:userId", async (req, res) => {
  const { groupId, userId } = req.params;
  const adminId = req.currentUserId;
  const kickUserId = parseInt(userId);

  try {
    const connection = await mysql.createConnection(dbConfig);

    const [adminCheck] = await connection.execute(
      "SELECT Role FROM GroupMembership WHERE GroupID = ? AND UserID = ?",
      [groupId, adminId],
    );

    if (adminCheck.length === 0 || adminCheck[0].Role !== "Admin") {
      await connection.end();
      return res.status(403).json({ message: "Only admins can kick members." });
    }

    const [targetCheck] = await connection.execute(
      "SELECT Role FROM GroupMembership WHERE GroupID = ? AND UserID = ?",
      [groupId, kickUserId],
    );

    if (targetCheck.length === 0) {
      await connection.end();
      return res
        .status(404)
        .json({ message: "User is not a member of this group." });
    }

    if (targetCheck[0].Role === "Admin") {
      await connection.end();
      return res.status(403).json({ message: "Cannot kick another admin." });
    }

    if (adminId === kickUserId) {
      await connection.end();
      return res
        .status(400)
        .json({ message: "Cannot kick yourself. Use leave group instead." });
    }

    const [result] = await connection.execute(
      "DELETE FROM GroupMembership WHERE GroupID = ? AND UserID = ?",
      [groupId, kickUserId],
    );

    await connection.end();

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Member not found." });
    }

    res.status(200).json({ message: "Member kicked successfully." });
  } catch (error) {
    console.error("Error kicking member:", error);
    res.status(500).json({ message: "Failed to kick member." });
  }
});

export default router;
