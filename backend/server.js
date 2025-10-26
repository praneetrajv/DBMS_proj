import express from "express";
import mysql from "mysql2/promise";
import cors from "cors";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";

const app = express();
const port = 3001;
const saltRounds = 10;
const sessions = {};

app.use(cors());
app.use(express.json());

const dbConfig = {
  host: "localhost",
  user: "root",
  password: "praneet",
  database: "social_network",
};

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    const userId = sessions[token];
    if (userId) {
      req.currentUserId = userId;
      return next();
    }
  }
  return res
    .status(401)
    .json({ message: "Authentication required. Please log in." });
};

// =================================================================
// 🔑 PUBLIC AUTHENTICATION ROUTES
// =================================================================

app.post("/api/register", async (req, res) => {
  const { name, username, password, email, dob, gender } = req.body;
  try {
    const hash = await bcrypt.hash(password, saltRounds);
    const connection = await mysql.createConnection(dbConfig);
    const [result] = await connection.execute(
      "INSERT INTO User (Name, Username, Email, PasswordHash, DOB, Gender) VALUES (?, ?, ?, ?, ?, ?)",
      [name, username, email, hash, dob, gender],
    );
    await connection.end();
    res.status(201).json({
      message: "User registered successfully",
      userId: result.insertId,
    });
  } catch (error) {
    console.error("Registration error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      if (error.message.includes("Username")) {
        return res.status(409).json({
          message:
            "Username already taken. Please choose a different username.",
        });
      } else if (error.message.includes("Email")) {
        return res.status(409).json({
          message: "Email already registered. Please use a different email.",
        });
      }
      return res.status(409).json({
        message: "Username or Email already taken.",
      });
    }

    res.status(500).json({
      message: "Registration failed. Please try again.",
    });
  }
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      "SELECT UserID, PasswordHash FROM User WHERE Username = ?",
      [username],
    );
    await connection.end();

    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid username or password." });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.PasswordHash);

    if (match) {
      const token = uuidv4();
      sessions[token] = user.UserID;
      return res.json({ token, userId: user.UserID });
    } else {
      return res.status(401).json({ message: "Invalid username or password." });
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed." });
  }
});

app.post("/api/logout", (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    delete sessions[token];
  }
  res.json({ message: "Logged out successfully." });
});

// =================================================================
// 🛡️ APPLY AUTHENTICATION MIDDLEWARE
// =================================================================
app.use(authenticate);

// =================================================================
// 📰 PROTECTED NEWS FEED AND SEARCH ROUTES
// =================================================================

app.get("/api/feed/:userId", async (req, res) => {
  const userIdInput = req.currentUserId;

  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute("CALL GetNewsFeed(?)", [
      userIdInput,
    ]);
    await connection.end();
    res.json(rows[0] || []);
  } catch (error) {
    console.error("Error fetching news feed from stored procedure:", error);
    res.status(500).json({
      message:
        "Error fetching news feed. Check your SQL procedure definition and database.",
    });
  }
});

app.get("/api/users/search", async (req, res) => {
  const searchTerm = req.query.q;

  if (!searchTerm || searchTerm.length < 2) {
    return res.json([]);
  }

  const searchPattern = `%${searchTerm}%`;

  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      `SELECT UserID, Name, Username 
       FROM User 
       WHERE Name LIKE ? OR Username LIKE ? 
       LIMIT 10`,
      [searchPattern, searchPattern],
    );
    await connection.end();
    res.json(rows);
  } catch (error) {
    console.error("Error executing user search:", error);
    res.status(500).json({ message: "Failed to perform user search." });
  }
});

// =================================================================
// 👤 PROTECTED PROFILE AND ACTION ROUTES
// =================================================================

app.get("/api/user/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      "SELECT UserID, Name, Username, Email, Gender FROM User WHERE UserID = ?",
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

app.get("/api/user/:userId/posts", async (req, res) => {
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

app.get("/api/user/:profileId/follow-status", async (req, res) => {
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

app.post("/api/user/:profileId/toggle-friendship", async (req, res) => {
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
          await connection.execute(
            "INSERT INTO Friendship (UserID1, UserID2, Status, SinceDate) VALUES (?, ?, 'Pending', CURRENT_DATE())",
            [initiatorId, targetId],
          );
          actionMessage = "Friend request sent (Pending).";
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
          actionMessage =
            "Cannot accept: no pending request received or you sent the request.";
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
        } else {
          actionMessage =
            "Cannot cancel: not the sender or request is not pending.";
          success = false;
        }
        break;

      case "unfriend":
        if (status === "Accepted") {
          await connection.execute(
            "DELETE FROM Friendship WHERE (UserID1 = ? AND UserID2 = ?) OR (UserID1 = ? AND UserID2 = ?)",
            [initiatorId, targetId, targetId, initiatorId],
          );
          actionMessage = "Unfriended successfully.";
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
      return res
        .status(409)
        .json({ message: "A friendship request already exists." });
    }
    console.error(`Error processing friendship action:`, error);
    res.status(500).json({ message: "Could not update friendship status." });
  }
});

app.get("/api/friendship/pending-requests", async (req, res) => {
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

// =================================================================
// 📝 POST AND COMMENT ROUTES
// =================================================================

// Get specific post details
app.get("/api/post/:postId", async (req, res) => {
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

// Get comments for a specific post
app.get("/api/post/:postId/comments", async (req, res) => {
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

app.post("/api/post/:postId/like", async (req, res) => {
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
        return res
          .status(200)
          .json({ message: "Post unliked! Trigger fired." });
      } catch (deleteError) {
        console.error("Error processing unlike:", deleteError);
        return res.status(500).json({ message: "Error processing unlike" });
      }
    }
    console.error("Error processing like:", error);
    res.status(500).json({ message: "Error processing like" });
  }
});

app.post("/api/post/:postId/comment", async (req, res) => {
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

app.delete("/api/comment/:commentId", async (req, res) => {
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

// Create new post
app.post("/api/posts", async (req, res) => {
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

// =================================================================
// 👥 GROUP ROUTES
// =================================================================

// Get all groups
app.get("/api/groups", async (req, res) => {
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

// Get user's groups
app.get("/api/user/:userId/groups", async (req, res) => {
  const { userId } = req.params;
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      `SELECT G.GroupID, G.Name, G.Description, G.MemberCount, GM.Role, GM.JoinDate
       FROM GroupTable G
       JOIN GroupMembership GM ON G.GroupID = GM.GroupID
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

// Get group details
app.get("/api/group/:groupId", async (req, res) => {
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

// Check if user is member of group
app.get("/api/group/:groupId/membership-status", async (req, res) => {
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

// Get group posts
app.get("/api/group/:groupId/posts", async (req, res) => {
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

app.post("/api/group/:groupId/join", async (req, res) => {
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

app.delete("/api/group/:groupId/leave", async (req, res) => {
  const { groupId } = req.params;
  const userId = req.currentUserId;

  try {
    const connection = await mysql.createConnection(dbConfig);
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

app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
});
