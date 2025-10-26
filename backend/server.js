// server.js (Node.js/Express Backend)

import express from 'express';
import mysql from 'mysql2/promise'; 
import cors from 'cors';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// ⚠️ IMPORTANT: Replace with your actual database credentials
const dbConfig = {
    host: 'localhost',
    user: 'harshith',
    password: 'root',
    database: 'social_network'
};

// --- API Endpoints to Showcase SQL Features ---

// 1. Showcase: GetNewsFeed Stored Procedure
app.get('/api/feed/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const connection = await mysql.createConnection(dbConfig);
        // Execute the stored procedure
        const [rows] = await connection.execute('CALL GetNewsFeed(?)', [userId]);
        await connection.end();
        // Stored procedures return an array of result sets, we want the first one
        res.json(rows[0]); 
    } catch (error) {
        console.error('Error fetching news feed:', error);
        res.status(500).json({ message: 'Error fetching news feed' });
    }
});

// 2. Showcase: CalculateAge Function
app.get('/api/user/:userId/age', async (req, res) => {
    const { userId } = req.params;
    try {
        const connection = await mysql.createConnection(dbConfig);
        // Execute a query that calls the SQL function
        const [rows] = await connection.execute(
            'SELECT Name, Username, Gender, CalculateAge(DOB) AS Age FROM User WHERE UserID = ?', 
            [userId]
        );
        await connection.end();
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('Error calculating age:', error);
        res.status(500).json({ message: 'Error calculating age' });
    }
});

// 3. Showcase: Triggers (Like/Comment Count updates)
app.post('/api/post/:postId/like/:userId', async (req, res) => {
    const { postId, userId } = req.params;
    try {
        const connection = await mysql.createConnection(dbConfig);
        // This INSERT query will automatically fire the 'tr_LikeTable_AfterInsert' trigger
        await connection.execute(
            'INSERT INTO LikeTable (UserID, PostID) VALUES (?, ?)', 
            [userId, postId]
        );
        await connection.end();
        res.status(200).json({ message: 'Post liked! Trigger fired.' });
    } catch (error) {
        // Handle the duplicate key error if the user already liked the post
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Already liked this post.' });
        }
        console.error('Error processing like:', error);
        res.status(500).json({ message: 'Error processing like' });
    }
});

app.listen(port, () => {
    console.log(`Backend server running at http://localhost:${port}`);
});
