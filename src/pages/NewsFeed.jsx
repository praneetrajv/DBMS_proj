import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const API_BASE_URL = 'http://localhost:3001';

const NewsFeed = () => {
    const { userId, getAuthHeaders } = useAuth();
    const [feed, setFeed] = useState([]);
    const [loading, setLoading] = useState(false);
    const [commentInputs, setCommentInputs] = useState({});
    const [showComments, setShowComments] = useState({});

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
    }, [userId]);

    // Function to handle the like action
    const handleLike = async (postId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/post/${postId}/like`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                }
            });

            if (response.ok) {
                const data = await response.json();
                alert(data.message);
                fetchFeed(); // Refresh the feed
            } else {
                const errorData = await response.json();
                alert(errorData.message || "Failed to like post.");
            }
        } catch (error) {
            console.error("Network error during like action:", error);
            alert("Network error during like action.");
        }
    };

    const handleCommentSubmit = async (postId) => {
        const content = commentInputs[postId];
        if (!content || !content.trim()) {
            alert("Comment cannot be empty.");
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/post/${postId}/comment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify({ content })
            });

            if (response.ok) {
                const data = await response.json();
                alert(data.message);
                setCommentInputs({ ...commentInputs, [postId]: '' }); // Clear input
                fetchFeed(); // Refresh the feed
            } else {
                const errorData = await response.json();
                alert(errorData.message || "Failed to add comment.");
            }
        } catch (error) {
            console.error("Network error during comment action:", error);
            alert("Network error during comment action.");
        }
    };

    const toggleCommentSection = (postId) => {
        setShowComments({
            ...showComments,
            [postId]: !showComments[postId]
        });
    };

    if (!userId) {
        return <div className="page-container">Please log in to view your feed.</div>;
    }

    return (
        <div className="page-container">
            <h1>Home Feed</h1>
            <p className="subtext">
                Viewing feed as User <strong>{userId}</strong>
            </p>
            {loading && <p className="loading">Loading Feed...</p>}
            <div className="posts-grid">
                {feed.length === 0 && !loading && <p className="empty-state">No posts to display. Add some friends to see their posts!</p>}
                {feed.map((post) => (
                    <div key={post.PostID} className="post-card">
                        <h4 className="post-author">
                            <Link to={`/profile/${post.UserID}`}>{post.Author}</Link>
                        </h4>
                        <p className="content">{post.Content}</p>

                        {post.GroupName && (
                            <p className="group">
                                Posted in{' '}
                                <Link to={`/group/${post.GroupID}`} className="group-link">
                                    {post.GroupName}
                                </Link>
                            </p>
                        )}

                        <div className="post-actions">
                            <span className="count-showcase">
                                Likes: <strong>{post.LikeCount}</strong> | Comments: <strong>{post.CommentCount}</strong>
                            </span>
                            <div className="action-buttons">
                                <button onClick={() => handleLike(post.PostID)} className="btn-like">
                                    👍 Like
                                </button>
                                <button onClick={() => toggleCommentSection(post.PostID)} className="btn-comment">
                                    💬 Comment
                                </button>
                            </div>
                        </div>

                        {showComments[post.PostID] && (
                            <div className="comment-section">
                                <textarea
                                    value={commentInputs[post.PostID] || ''}
                                    onChange={(e) => setCommentInputs({
                                        ...commentInputs,
                                        [post.PostID]: e.target.value
                                    })}
                                    placeholder="Write a comment..."
                                    rows="2"
                                    className="comment-input"
                                />
                                <button
                                    onClick={() => handleCommentSubmit(post.PostID)}
                                    className="btn-submit-comment"
                                >
                                    Post Comment
                                </button>
                            </div>
                        )}

                        <p className="timestamp">{new Date(post.Timestamp).toLocaleString()}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};
export default NewsFeed;
