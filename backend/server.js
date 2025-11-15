import express from "express";
import cors from "cors";
import { authenticate } from "./middleware/auth.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import friendshipRoutes from "./routes/friendship.js";
import postRoutes from "./routes/posts.js";
import groupRoutes from "./routes/groups.js";
import searchRoutes from "./routes/search.js";

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use("/api", authRoutes);
app.use(authenticate);
app.use("/api/user", userRoutes);
app.use("/api/friendship", friendshipRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/search", searchRoutes);

app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
});
