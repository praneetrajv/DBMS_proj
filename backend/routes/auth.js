import express from "express";
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { dbConfig } from "../config/database.js";
import { sessions } from "../middleware/auth.js";

const router = express.Router();
const saltRounds = 10;

router.post("/register", async (req, res) => {
  const { name, username, password, email, dob, gender } = req.body;
  try {
    const hash = await bcrypt.hash(password, saltRounds);
    const connection = await mysql.createConnection(dbConfig);
    const [result] = await connection.execute(
      "INSERT INTO User (Name, Username, Email, PasswordHash, DOB, Gender, ProfileType) VALUES (?, ?, ?, ?, ?, ?, 'Public')",
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

router.post("/login", async (req, res) => {
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

router.post("/logout", (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    delete sessions[token];
  }
  res.json({ message: "Logged out successfully." });
});

export default router;
