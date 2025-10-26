import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const API_BASE_URL = 'http://localhost:3001';

// Define possible friendship states for the frontend
const STATUS = {
    NOT_FRIENDS: 'None',
    PENDING_SENT: 'PendingSent',
    PENDING_RECEIVED: 'PendingReceived',
    ACCEPTED: 'Accepted',
    SELF: 'Self'
};

const ProfilePage = () => {
    const { userId, getAuthHeaders } = useAuth();
    const { userId: profileParam } = useParams();
    const profileId = parseInt(profileParam);

    const [friendshipStatus, setFriendshipStatus] = useState(STATUS.NOT_FRIENDS);
    const [profileData, setProfileData] = useState(null);
    const [userPosts, setUserPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [commentInputs, setCommentInputs] = useState({});
    const [showComments, setShowComments] = useState({});

    const isCurrentUserProfile = userId === profileId;

    // --- Core Logic: Interpret Status from Backend ---
    const interpretStatus = (data) => {
        if (!data.status) return STATUS.NOT_FRIENDS;

        if (data.status === 'Accepted') return STATUS.ACCEPTED;

        if (data.status === 'Pending') {
            if (data.rowInitiatorId === userId) {
                return STATUS.PENDING_SENT;
            } else {
                return STATUS.PENDING_RECEIVED;
            }
        }
        return STATUS.NOT_FRIENDS;
    };

    const fetchPendingRequests = async () => {
        if (!isCurrentUserProfile) {
            setPendingRequests([]);
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/api/friendship/pending-requests`, {
                headers: getAuthHeaders(),
            });
            if (response.ok) {
                const data = await response.json();
                setPendingRequests(data);
            } else {
                console.error("Failed to fetch pending requests.");
                setPendingRequests([]);
            }
        } catch (error) {
            console.error("Network error fetching pending requests:", error);
        }
    };

    const fetchUserPosts = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/user/${profileId}/posts`, {
                headers: getAuthHeaders(),
            });
            if (response.ok) {
                const data = await response.json();
                setUserPosts(data);
            } else {
                setUserPosts([]);
            }
        } catch (error) {
            console.error("Error fetching user posts:", error);
            setUserPosts([]);
        }
    };

    const fetchProfileDetails = async () => {
        if (!userId || !profileId) return;
        setLoading(true);

        // 1. Fetch Profile Data
        try {
            const profileResponse = await fetch(`${API_BASE_URL}/api/user/${profileId}`, {
                headers: getAuthHeaders(),
            });
            if (profileResponse.ok) {
                const data = await profileResponse.json();
                setProfileData(data);
            } else {
                setProfileData(null);
            }
        } catch (error) {
            console.error("Error fetching profile data:", error);
            setProfileData(null);
        }

        // 2. Check Friendship Status (only if not viewing own profile)
        if (isCurrentUserProfile) {
            setFriendshipStatus(STATUS.SELF);
        } else {
            try {
                const followResponse = await fetch(`${API_BASE_URL}/api/user/${profileId}/follow-status`, {
                    headers: getAuthHeaders(),
                });

                if (followResponse.ok) {
                    const data = await followResponse.json();
                    setFriendshipStatus(interpretStatus(data));
                } else {
                    setFriendshipStatus(STATUS.NOT_FRIENDS);
                }
            } catch (error) {
                console.error("Error fetching follow status:", error);
                setFriendshipStatus(STATUS.NOT_FRIENDS);
            }
        }

        // 3. Fetch User Posts
        await fetchUserPosts();

        setLoading(false);
    };

    useEffect(() => {
        const fetchAllDetails = () => {
            fetchProfileDetails();
            fetchPendingRequests();
        };
        fetchAllDetails();
    }, [profileId, userId]);


    const handleToggleFollow = async (explicitAction, targetProfileId) => {
        const targetId = targetProfileId || profileId;

        let actionToSend;
        if (explicitAction) {
            actionToSend = explicitAction;
        } else {
            switch (friendshipStatus) {
                case STATUS.NOT_FRIENDS: actionToSend = 'send'; break;
                case STATUS.PENDING_RECEIVED: actionToSend = 'accept'; break;
                case STATUS.PENDING_SENT: actionToSend = 'cancel'; break;
                case STATUS.ACCEPTED: actionToSend = 'unfriend'; break;
                default: return;
            }
        }

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/user/${targetId}/toggle-friendship`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...getAuthHeaders(),
                    },
                    body: JSON.stringify({ action: actionToSend }),
                }
            );

            const responseData = await response.json();
            alert(responseData.message);

            if (response.ok || response.status === 409) {
                fetchProfileDetails();
                fetchPendingRequests();
            }

        } catch (error) {
            alert("Network error during friendship action.");
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
                fetchUserPosts(); // Refresh posts
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
                fetchUserPosts(); // Refresh posts
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

    const getButtonText = () => {
        switch (friendshipStatus) {
            case STATUS.ACCEPTED:
                return 'Unfriend';
            case STATUS.PENDING_RECEIVED:
                return 'Accept Request';
            case STATUS.PENDING_SENT:
                return 'Cancel Request';
            case STATUS.NOT_FRIENDS:
                return 'Add Friend';
            default:
                return 'Action';
        }
    };

    if (loading || !profileData) return <div className="page-container"><p className="loading">Loading Profile...</p></div>;

    if (!profileData.UserID) return <div className="page-container">User Not Found or Error Loading Profile.</div>;

    return (
        <div className="page-container profile-layout">
            <div className="profile-header">
                <h1>{profileData.Name} {isCurrentUserProfile && '(You)'}</h1>
                <p className="subtext">@{profileData.Username} | User ID: <strong>{profileId}</strong></p>
                <p className="subtext">Email: {profileData.Email} | Gender: {profileData.Gender}</p>

                {!isCurrentUserProfile && (
                    <button
                        className={`btn-${friendshipStatus === STATUS.ACCEPTED ? 'unfriend' :
                            friendshipStatus === STATUS.PENDING_RECEIVED ? 'accept' : 'friend'}`}
                        onClick={() => handleToggleFollow(null, null)}
                    >
                        {getButtonText()}
                        {friendshipStatus === STATUS.PENDING_SENT && " (Sent)"}
                        {friendshipStatus === STATUS.PENDING_RECEIVED && " (Received)"}
                    </button>
                )}
            </div>

            <hr />

            {isCurrentUserProfile && pendingRequests.length > 0 && (
                <div className="pending-requests-section">
                    <h2>📥 Pending Friend Requests ({pendingRequests.length})</h2>
                    <ul>
                        {pendingRequests.map(request => (
                            <li key={request.SenderID}>
                                <span style={{ fontSize: '1.1em' }}>
                                    <strong>{request.SenderName}</strong> (@{request.SenderUsername})
                                    <small style={{ marginLeft: '10px', color: '#888' }}>
                                        sent on {new Date(request.SinceDate).toLocaleDateString()}
                                    </small>
                                </span>
                                <div>
                                    <button onClick={() => handleToggleFollow('accept', request.SenderID)}>
                                        Accept
                                    </button>
                                    <button onClick={() => handleToggleFollow('cancel', request.SenderID)}>
                                        Decline
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {isCurrentUserProfile && pendingRequests.length === 0 && (
                <div className="pending-requests-section">
                    <h2>📥 Pending Friend Requests (0)</h2>
                    <p>No new pending requests.</p>
                </div>
            )}

            <hr />

            <h3>{profileData.Name}'s Posts ({userPosts.length})</h3>

            <div className="posts-grid" style={{ marginTop: '1.5rem' }}>
                {userPosts.length === 0 && (
                    <p className="empty-state">No posts yet.</p>
                )}
                {userPosts.map(post => (
                    <div key={post.PostID} className="post-card">
                        <p className="content">{post.Content}</p>

                        {post.GroupName && post.GroupID && (
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
export default ProfilePage;
