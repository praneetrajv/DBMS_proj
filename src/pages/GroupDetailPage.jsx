import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const API_BASE_URL = 'http://localhost:3001';

const GroupDetailPage = () => {
    const { groupId } = useParams();
    const { userId, getAuthHeaders } = useAuth();
    const [groupData, setGroupData] = useState(null);
    const [posts, setPosts] = useState([]);
    const [membershipStatus, setMembershipStatus] = useState({ isMember: false, role: null });
    const [loading, setLoading] = useState(true);
    const [newPostContent, setNewPostContent] = useState('');

    const fetchGroupDetails = async () => {
        setLoading(true);
        try {
            // Fetch group details
            const groupResponse = await fetch(`${API_BASE_URL}/api/group/${groupId}`, {
                headers: getAuthHeaders(),
            });
            if (groupResponse.ok) {
                const data = await groupResponse.json();
                setGroupData(data);
            }

            // Check membership status
            const membershipResponse = await fetch(`${API_BASE_URL}/api/group/${groupId}/membership-status`, {
                headers: getAuthHeaders(),
            });
            if (membershipResponse.ok) {
                const data = await membershipResponse.json();
                setMembershipStatus(data);
            }

            // Fetch group posts
            const postsResponse = await fetch(`${API_BASE_URL}/api/group/${groupId}/posts`, {
                headers: getAuthHeaders(),
            });
            if (postsResponse.ok) {
                const data = await postsResponse.json();
                setPosts(data);
            }
        } catch (error) {
            console.error("Error fetching group details:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGroupDetails();
    }, [groupId]);

    const handleJoinGroup = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/group/${groupId}/join`, {
                method: 'POST',
                headers: getAuthHeaders(),
            });

            const data = await response.json();
            alert(data.message);

            if (response.ok) {
                fetchGroupDetails();
            }
        } catch (error) {
            console.error("Error joining group:", error);
            alert("Network error during join action.");
        }
    };

    const handleLeaveGroup = async () => {
        if (!window.confirm("Are you sure you want to leave this group?")) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/group/${groupId}/leave`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });

            const data = await response.json();
            alert(data.message);

            if (response.ok) {
                fetchGroupDetails();
            }
        } catch (error) {
            console.error("Error leaving group:", error);
            alert("Network error during leave action.");
        }
    };

    const handleCreatePost = async (e) => {
        e.preventDefault();
        if (!newPostContent.trim()) {
            alert("Post content cannot be empty.");
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/posts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders(),
                },
                body: JSON.stringify({
                    content: newPostContent,
                    groupId: groupId,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                alert(data.message);
                setNewPostContent('');
                fetchGroupDetails(); // Refresh posts
            } else {
                alert(data.message || "Failed to create post.");
            }
        } catch (error) {
            console.error("Error creating post:", error);
            alert("Network error during post creation.");
        }
    };

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
                fetchGroupDetails(); // Refresh posts
            } else {
                const errorData = await response.json();
                alert(errorData.message || "Failed to like post.");
            }
        } catch (error) {
            console.error("Network error during like action:", error);
            alert("Network error during like action.");
        }
    };

    if (loading || !groupData) {
        return <div className="page-container"><p className="loading">Loading Group...</p></div>;
    }

    return (
        <div className="page-container">
            <div className="group-detail-header">
                <div>
                    <h1>{groupData.Name}</h1>
                    <p className="subtext">{groupData.Description}</p>
                    <p className="group-stats">👥 {groupData.MemberCount} members</p>
                </div>

                {membershipStatus.isMember ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {membershipStatus.role === 'Admin' && (
                            <span className="role-badge admin">Admin</span>
                        )}
                        <button className="btn-leave" onClick={handleLeaveGroup}>
                            Leave Group
                        </button>
                    </div>
                ) : (
                    <button className="btn-join" onClick={handleJoinGroup}>
                        Join Group
                    </button>
                )}
            </div>

            <hr />

            {/* Create Post Section - Only for members */}
            {membershipStatus.isMember && (
                <div className="create-post-section">
                    <h3>✍️ Create a Post</h3>
                    <form onSubmit={handleCreatePost}>
                        <textarea
                            value={newPostContent}
                            onChange={(e) => setNewPostContent(e.target.value)}
                            placeholder="What's on your mind?"
                            rows="4"
                            style={{
                                width: '100%',
                                padding: '1rem',
                                borderRadius: '10px',
                                border: '2px solid #e8eaf6',
                                fontSize: '1rem',
                                marginBottom: '1rem',
                                fontFamily: 'inherit',
                            }}
                        />
                        <button type="submit" className="btn-post">
                            Post to Group
                        </button>
                    </form>
                </div>
            )}

            <hr />

            {/* Posts Section */}
            <h2>Group Posts ({posts.length})</h2>
            <div className="posts-grid" style={{ marginTop: '1.5rem' }}>
                {posts.length === 0 ? (
                    <p className="empty-state">No posts in this group yet. Be the first to post!</p>
                ) : (
                    posts.map(post => (
                        <div key={post.PostID} className="post-card">
                            <h4 className="post-author">
                                <Link to={`/profile/${post.UserID}`}>{post.Author}</Link>
                            </h4>
                            <p className="content">{post.Content}</p>
                            <div className="post-actions">
                                <span className="count-showcase">
                                    Likes: <strong>{post.LikeCount}</strong> | Comments: <strong>{post.CommentCount}</strong>
                                </span>
                                {membershipStatus.isMember && (
                                    <button onClick={() => handleLike(post.PostID)}>
                                        👍 Like
                                    </button>
                                )}
                            </div>
                            <p className="timestamp">{new Date(post.Timestamp).toLocaleString()}</p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default GroupDetailPage;
