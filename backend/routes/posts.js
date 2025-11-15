import express from "express";
import mysql from "mysql2/promise";
import { dbConfig } from "../config/database.js";

const router = express.Router();

router.get("/feed/:userId", async (req, res) => {
  const userIdInput = req.currentUserId;

  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute("CALL GetNewsFeed(?)", [userIdInput]);
    await connection.end();
    res.json(rows[0] || []);
  } catch (error) {
    console.error("Error fetching news feed from stored procedure:", error);
    res.status(500).json({
      message: "Error fetching news feed. Check your SQL procedure definition and database.",
    });
  }
});

router.get("/:postId", async (req, res) => {
  const { postId } = req.params;
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      `SELECT 
        P.PostID, P.UserID, P.Content, P.Timestamp, P.LikeCount, P.CommentCount,
        P.GroupID, G.Name AS GroupName, U.Name AS Author
       FROM Post P
       JOIN User U ON P.UserID = U.UserID
       LEFT JOIN GroupTable G ON P.GroupID = G.GroupID
       WHERE P.PostID = ?`,
      [postId],
    );
    await connection.end();

    if (rows.length === 0) {
      return res.status(404).json({ message: "Post not found." });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error("Error fetching post details:", error);
    res.status(500).json({ message: "Failed to retrieve post details." });
  }
});

router.get("/:postId/comments", async (req, res) => {
  const { postId } = req.params;
  const currentUserId = req.currentUserId;

  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      `SELECT 
        C.CommentID, C.Content, C.Timestamp, C.UserID,
        U.Name AS Author,
        CASE WHEN C.UserID = ? THEN 1 ELSE 0 END AS IsOwner
       FROM Comment C
       JOIN User U ON C.UserID = U.UserID
       WHERE C.PostID = ?
       ORDER BY C.Timestamp ASC`,
      [currentUserId, postId],
    );
    await connection.end();
    res.json(rows);
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ message: "Failed to retrieve comments." });
  }
});

router.post("/:postId/like", async (req, res) => {
  const { postId } = req.params;
  const likerId = req.currentUserId;

  try {
    const connection = await mysql.createConnection(dbConfig);
    await connection.execute(
      "INSERT INTO LikeTable (UserID, PostID) VALUES (?, ?)",
      [likerId, postId],
    );
    await connection.end();
    res.status(200).json({ message: "Post liked! Trigger fired." });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.execute(
          "DELETE FROM LikeTable WHERE UserID = ? AND PostID = ?",
          [likerId, postId],
        );
        await connection.end();
        return res.status(200).json({ message: "Post unliked! Trigger fired." });
      } catch (deleteError) {
        console.error("Error processing unlike:", deleteError);
        return res.status(500).json({ message: "Error processing unlike" });
      }
    }
    console.error("Error processing like:", error);
    res.status(500).json({ message: "Error processing like" });
  }
});

router.post("/:postId/comment", async (req, res) => {
  const { postId } = req.params;
  const userId = req.currentUserId;
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ message: "Comment content is required." });
  }

  try {
    const connection = await mysql.createConnection(dbConfig);
    const [result] = await connection.execute(
      "INSERT INTO Comment (PostID, UserID, Content, Timestamp) VALUES (?, ?, ?, NOW())",
      [postId, userId, content],
    );
    await connection.end();
    res.status(201).json({
      message: "Comment added successfully. CommentCount incremented.",
      commentId: result.insertId,
    });
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ message: "Failed to add comment." });
  }
});

router.delete("/comment/:commentId", async (req, res) => {
  const { commentId } = req.params;
  const userId = req.currentUserId;

  try {
    const connection = await mysql.createConnection(dbConfig);

    const [check] = await connection.execute(
      "SELECT 1 FROM Comment WHERE CommentID = ? AND UserID = ?",
      [commentId, userId],
    );

    if (check.length === 0) {
      await connection.end();
      return res.status(403).json({
        message: "You do not have permission to delete this comment.",
      });
    }

    const [result] = await connection.execute(
      "DELETE FROM Comment WHERE CommentID = ?",
      [commentId],
    );
    await connection.end();

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Comment not found." });
    }

    res.status(200).json({
      message: "Comment deleted successfully. CommentCount decremented.",
    });
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({ message: "Failed to delete comment." });
  }
});

router.post("/", async (req, res) => {
  const userId = req.currentUserId;
  const { content, groupId } = req.body;

  if (!content) {
    return res.status(400).json({ message: "Post content is required." });
  }

  try {
    const connection = await mysql.createConnection(dbConfig);
    const [result] = await connection.execute(
      "INSERT INTO Post (UserID, GroupID, Content, MediaType, Timestamp) VALUES (?, ?, ?, 'text', NOW())",
      [userId, groupId || null, content],
    );
    await connection.end();
    res.status(201).json({
      message: "Post created successfully.",
      postId: result.insertId,
    });
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({ message: "Failed to create post." });
  }
});

export default router;
