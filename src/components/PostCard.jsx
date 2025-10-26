import React from 'react';
import { Link } from 'react-router-dom';

const PostCard = ({ post, onLike, onCommentClick, onPostClick }) => {
    const handleLikeClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        onLike(post.PostID);
    };

    const handleCommentClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        onCommentClick(post.PostID);
    };

    const handlePostClick = (e) => {
        // Only trigger if clicking the card itself, not links or buttons
        if (e.target === e.currentTarget || e.target.classList.contains('content') || e.target.classList.contains('timestamp')) {
            onPostClick(post.PostID);
        }
    };

    return (
        <div className="post-card" onClick={handlePostClick}>
            <h4 className="post-author">
                <Link
                    to={`/profile/${post.UserID}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {post.Author}
                </Link>
            </h4>

            <p className="content">{post.Content}</p>

            {post.GroupName && post.GroupID && (
                <p className="group">
                    Posted in{' '}
                    <Link
                        to={`/group/${post.GroupID}`}
                        className="group-link"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {post.GroupName}
                    </Link>
                </p>
            )}

            <div className="post-actions" onClick={(e) => e.stopPropagation()}>
                <span className="count-showcase">
                    👍 {post.LikeCount} | 💬 {post.CommentCount}
                </span>
                <div className="action-buttons">
                    <button
                        type="button"
                        onClick={handleLikeClick}
                        className="btn-like"
                    >
                        👍 Like
                    </button>
                    <button
                        type="button"
                        onClick={handleCommentClick}
                        className="btn-comment"
                    >
                        💬 Comment
                    </button>
                </div>
            </div>

            <p className="timestamp">{new Date(post.Timestamp).toLocaleString()}</p>
        </div>
    );
};

export default PostCard;
