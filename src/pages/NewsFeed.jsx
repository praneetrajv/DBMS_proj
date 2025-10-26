import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const API_BASE_URL = 'http://localhost:3001';

const NewsFeed = () => {
    const { userId, getAuthHeaders } = useAuth();
    const [feed, setFeed] = useState([]);
    const [loading, setLoading] = useState(false);

    // Function to fetch the feed
    const fetchFeed = async () => {
        if (!userId) return;
        setLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/feed/${userId}`, {
                headers: getAuthHeaders(),
            });

            if (!response.ok) {
                console.error(`API Error: ${response.statusText}`);
                setFeed([]);
                return;
            }

            const data = await response.json();

            if (Array.isArray(data)) {
                setFeed(data);
            } else {
                console.warn("Received non-array data for feed:", data);
                setFeed([]);
            }
        } catch (error) {
            console.error("Failed to fetch feed:", error);
            setFeed([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFeed();
    }, [userId, getAuthHeaders]); // Depend on userId and getAuthHeaders

    // Function to handle the like action
    const handleLike = async (postId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/post/${postId}/like/${userId}`, {
                method: 'POST',
                headers: getAuthHeaders(), // ⬅️ Sending Authentication Header
            });

            if (response.ok) {
                alert(`Post ${postId} liked!`);
                fetchFeed(); // Refresh the feed
            } else {
                const errorData = await response.json();
                alert(errorData.message || "Failed to like post.");
            }
        } catch (error) {
            alert("Network error during like action.");
        }
    };

    if (!userId) {
        return <div className="page-container">Please log in to view your feed.</div>;
    }

    return (
        <div className="page-container">
            <h1>Home Feed</h1>
            <p className="subtext">
                Viewing feed as User **{userId}**
            </p>
            {loading && <p>Loading Feed...</p>}
            <div className="posts-grid">
                {feed.length === 0 && !loading && <p>No posts to display.</p>}
                {feed.map((post) => (
                    <div key={post.PostID} className="post-card">
                        <h4 className="post-author">
                            <Link to={`/profile/${post.UserID}`}>{post.Author}</Link>
                        </h4>
                        <p className="content">{post.Content}</p>
                        <p className="group">{post.GroupName ? `Group: ${post.GroupName}` : 'Personal Post'}</p>

                        <div className="post-actions">
                            <span className="count-showcase">
                                Likes: **{post.LikeCount}** | Comments: **{post.CommentCount}**
                            </span>
                            <button onClick={() => handleLike(post.PostID)}>
                                👍 Like
                            </button>
                        </div>
                        <p className="timestamp">{new Date(post.Timestamp).toLocaleString()}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};
export default NewsFeed;
