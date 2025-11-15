import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const API_BASE_URL = 'http://localhost:3001';

const PostModal = ({ postId, onClose, onUpdate }) => {
    const { userId: currentUserId, getAuthHeaders } = useAuth();
    const navigate = useNavigate();
    const [post, setPost] = useState(null);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchPostDetails = async () => {
        setLoading(true);
        try {
            // Fetch post details
            const postResponse = await fetch(`${API_BASE_URL}/api/posts/${postId}`, {
                headers: getAuthHeaders(),
            });
            if (postResponse.ok) {
                const postData = await postResponse.json();
                setPost(postData);
            }

            // Fetch comments
            const commentsResponse = await fetch(`${API_BASE_URL}/api/posts/post/${postId}/comments`, {
                headers: getAuthHeaders(),
            });
            if (commentsResponse.ok) {
                const commentsData = await commentsResponse.json();
                setComments(commentsData);
            }
        } catch (error) {
            console.error("Error fetching post details:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (postId) {
            fetchPostDetails();
        }
    }, [postId]);

    const handleLike = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/posts/post/${postId}/like`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                }
            });

            if (response.ok) {
                fetchPostDetails();
                if (onUpdate) onUpdate();
            }
        } catch (error) {
            console.error("Error liking post:", error);
        }
    };

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) {
            alert("Comment cannot be empty.");
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/posts/comment/${postId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify({ content: newComment })
            });

            if (response.ok) {
                setNewComment('');
                fetchPostDetails();
                if (onUpdate) onUpdate();
            } else {
                const errorData = await response.json();
                alert(errorData.message || "Failed to add comment.");
            }
        } catch (error) {
            console.error("Error adding comment:", error);
            alert("Network error during comment action.");
        }
    };

    const handleDeleteComment = async (commentId) => {
        if (!window.confirm("Are you sure you want to delete this comment?")) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/posts/comment/${commentId}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });

            if (response.ok) {
                fetchPostDetails();
                if (onUpdate) onUpdate();
            } else {
                const errorData = await response.json();
                alert(errorData.message || "Failed to delete comment.");
            }
        } catch (error) {
            console.error("Error deleting comment:", error);
            alert("Network error during delete action.");
        }
    };

    const handleDeletePost = async () => {
        if (!window.confirm("Are you sure you want to delete this post? This action cannot be undone.")) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/posts/${postId}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });

            const data = await response.json();

            if (response.ok) {
                alert(data.message);
                onClose();
                if (onUpdate) onUpdate();
            } else {
                alert(data.message || "Failed to delete post.");
            }
        } catch (error) {
            console.error("Error deleting post:", error);
            alert("Network error during delete action.");
        }
    };

    if (loading || !post) {
        return (
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <p className="loading">Loading Post...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content post-modal" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>×</button>

                <div className="post-modal-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h2>
                                <Link to={`/profile/${post.UserID}`} onClick={onClose}>
                                    {post.Author}
                                </Link>
                            </h2>
                            <p className="timestamp">{new Date(post.Timestamp).toLocaleString()}</p>
                        </div>
                        {post.IsOwner === 1 && (
                            <button
                                onClick={handleDeletePost}
                                className="btn-delete-post"
                                style={{ marginLeft: '1rem' }}
                            >
                                🗑️ Delete Post
                            </button>
                        )}
                    </div>
                </div>

                <div className="post-modal-body">
                    <p className="content">{post.Content}</p>

                    {post.GroupName && (
                        <p className="group">
                            Posted in{' '}
                            <Link to={`/groups/${post.GroupID}`} onClick={onClose}>
                                {post.GroupName}
                            </Link>
                        </p>
                    )}

                    <div className="post-actions" style={{ marginTop: '1.5rem' }}>
                        <span className="count-showcase">
                            👍 {post.LikeCount} Likes | 💬 {post.CommentCount} Comments
                        </span>
                        <button onClick={handleLike} className="btn-like" type="button">
                            👍 Like
                        </button>
                    </div>
                </div>

                <hr style={{ margin: '1.5rem 0' }} />

                <div className="comments-section">
                    <h3>Comments ({comments.length})</h3>

                    <form onSubmit={handleCommentSubmit} className="comment-form">
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Write a comment..."
                            rows="3"
                            className="comment-input"
                        />
                        <button type="submit" className="btn-submit-comment">
                            Post Comment
                        </button>
                    </form>

                    <div className="comments-list">
                        {comments.length === 0 ? (
                            <p className="empty-state" style={{ padding: '2rem' }}>
                                No comments yet. Be the first to comment!
                            </p>
                        ) : (
                            comments.map(comment => (
                                <div key={comment.CommentID} className="comment-item">
                                    <div className="comment-header">
                                        <Link
                                            to={`/profile/${comment.UserID}`}
                                            onClick={onClose}
                                            className="comment-author"
                                        >
                                            {comment.Author}
                                        </Link>
                                        <span className="comment-timestamp">
                                            {new Date(comment.Timestamp).toLocaleString()}
                                        </span>
                                    </div>
                                    <p className="comment-content">{comment.Content}</p>
                                    {comment.IsOwner === 1 && (
                                        <button
                                            className="btn-delete-comment"
                                            onClick={() => handleDeleteComment(comment.CommentID)}
                                            type="button"
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PostModal;
