import React, { useState, useEffect } from 'react';
import UserListModal from '../components/UserListModal';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import PostCard from '../components/PostCard';
import PostModal from '../components/PostModal';

const API_BASE_URL = 'http://localhost:3001';

const GroupDetailPage = () => {
    const { groupId } = useParams();
    const { userId, getAuthHeaders } = useAuth();
    const [groupData, setGroupData] = useState(null);
    const [posts, setPosts] = useState([]);
    const [membershipStatus, setMembershipStatus] = useState({ isMember: false, role: null });
    const [loading, setLoading] = useState(true);
    const [newPostContent, setNewPostContent] = useState('');
    const [selectedPostId, setSelectedPostId] = useState(null);
    const [modalConfig, setModalConfig] = useState(null);

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
        if (groupId) {
            fetchGroupDetails();
        }
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
            const response = await fetch(`${API_BASE_URL}/api/posts/`, {
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
                fetchGroupDetails();
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
            const response = await fetch(`${API_BASE_URL}/api/posts/post/${postId}/like`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                }
            });

            if (response.ok) {
                fetchGroupDetails();
            } else {
                const errorData = await response.json();
                alert(errorData.message || "Failed to like post.");
            }
        } catch (error) {
            console.error("Network error during like action:", error);
            alert("Network error during like action.");
        }
    };

    const openPostModal = (postId) => {
        setSelectedPostId(postId);
    };

    const closePostModal = () => {
        setSelectedPostId(null);
    };

    if (loading || !groupData) {
        return <div className="page-container"><p className="loading">Loading Group...</p></div>;
    }

    return (
        <div className="page-container">
            <div className="group-detail-header">
                <div>
                    <h1>{groupData.Name}</h1>
                    <p
                        className="group-stats clickable-stats"
                        onClick={() => setModalConfig({
                            title: `👥 Members of ${groupData.Name}`,
                            endpoint: `${API_BASE_URL}/api/group/${groupId}/members`,
                            showKick: true
                        })}
                        style={{ cursor: 'pointer' }}
                    >
                        👥 {groupData.MemberCount} members
                    </p>
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

            <h2>Group Posts ({posts.length})</h2>
            <div className="posts-grid" style={{ marginTop: '1.5rem' }}>
                {posts.length === 0 ? (
                    <p className="empty-state">No posts in this group yet. Be the first to post!</p>
                ) : (
                    posts.map(post => (
                        <PostCard
                            key={post.PostID}
                            post={post}
                            onLike={handleLike}
                            onCommentClick={openPostModal}
                            onPostClick={openPostModal}
                        />
                    ))
                )}
            </div>

            {selectedPostId && (
                <PostModal
                    postId={selectedPostId}
                    onClose={closePostModal}
                    onUpdate={fetchGroupDetails}
                />
            )}

            {modalConfig && (
  <UserListModal
    title={modalConfig.title}
    endpoint={modalConfig.endpoint}
    showKick={modalConfig.showKick}
    onClose={() => setModalConfig(null)}
    onActionComplete={fetchGroupDetails}
  />
)}
        </div>
    );
};

export default GroupDetailPage;
