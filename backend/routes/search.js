import express from "express";
import mysql from "mysql2/promise";
import { dbConfig } from "../config/database.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const searchTerm = req.query.q;
  const currentUserId = req.currentUserId;

  if (!searchTerm || searchTerm.length < 2) {
    return res.json({ users: [], groups: [] });
  }

  const searchPattern = `%${searchTerm}%`;

  try {
    const connection = await mysql.createConnection(dbConfig);

    const [userRows] = await connection.execute(
      `SELECT UserID, Name, Username 
       FROM User 
       WHERE (Name LIKE ? OR Username LIKE ?) AND UserID != ?
       LIMIT 5`,
      [searchPattern, searchPattern, currentUserId],
    );

    const [groupRows] = await connection.execute(
      `SELECT GroupID, Name, Description, MemberCount 
       FROM GroupTable 
       WHERE Name LIKE ? OR Description LIKE ? 
       ORDER BY MemberCount DESC
       LIMIT 5`,
      [searchPattern, searchPattern],
    );

    await connection.end();
    res.json({ users: userRows, groups: groupRows });
  } catch (error) {
    console.error("Error executing unified search:", error);
    res.status(500).json({ message: "Failed to perform search." });
  }
});

export default router;
