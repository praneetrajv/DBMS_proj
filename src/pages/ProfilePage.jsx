import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import PostCard from '../components/PostCard';
import PostModal from '../components/PostModal';
import UserListModal from '../components/UserListModal';

const API_BASE_URL = 'http://localhost:3001';

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
    const [outgoingRequests, setOutgoingRequests] = useState([]);
    const [selectedPostId, setSelectedPostId] = useState(null);
    const [canViewProfile, setCanViewProfile] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [profileType, setProfileType] = useState('Public');
    const [followerCount, setFollowerCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [modalConfig, setModalConfig] = useState(null);

    const isCurrentUserProfile = userId === profileId;

    const interpretStatus = (data) => {
        if (!data || !data.status) return STATUS.NOT_FRIENDS;
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
                setPendingRequests([]);
            }
        } catch (error) {
            console.error("Network error fetching pending requests:", error);
        }
    };

    const fetchOutgoingRequests = async () => {
        if (!isCurrentUserProfile) {
            setOutgoingRequests([]);
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/api/friendship/outgoing-requests`, {
                headers: getAuthHeaders(),
            });
            if (response.ok) {
                const data = await response.json();
                setOutgoingRequests(data);
            } else {
                setOutgoingRequests([]);
            }
        } catch (error) {
            console.error("Network error fetching outgoing requests:", error);
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

    const checkViewPermissions = async () => {
        if (isCurrentUserProfile) {
            setCanViewProfile(true);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/user/${profileId}/can-view`, {
                headers: getAuthHeaders(),
            });
            if (response.ok) {
                const data = await response.json();
                setCanViewProfile(data.canView);
            } else {
                setCanViewProfile(false);
            }
        } catch (error) {
            console.error("Error checking view permissions:", error);
            setCanViewProfile(false);
        }
    };

    const fetchProfileDetails = async () => {
        if (!userId || !profileId) return;
        setLoading(true);

        try {
            const profileResponse = await fetch(`${API_BASE_URL}/api/user/${profileId}`, {
                headers: getAuthHeaders(),
            });
            if (profileResponse.ok) {
                const data = await profileResponse.json();
                setProfileData(data);
                setProfileType(data.ProfileType || 'Public');
            } else {
                setProfileData(null);
            }
        } catch (error) {
            console.error("Error fetching profile data:", error);
            setProfileData(null);
        }

        await checkViewPermissions();

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

        await fetchUserPosts();
        setLoading(false);
    };

    useEffect(() => {
        const fetchAllDetails = () => {
            fetchProfileDetails();
            fetchPendingRequests();
            fetchOutgoingRequests();
            fetchFollowerCounts();
        };
        fetchAllDetails();
    }, [profileId, userId, isCurrentUserProfile]);

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
                fetchOutgoingRequests();
            }

        } catch (error) {
            alert("Network error during friendship action.");
        }
    };

    const fetchFollowerCounts = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/user/${profileId}/follower-counts`, {
                headers: getAuthHeaders(),
            });
            if (response.ok) {
                const data = await response.json();
                setFollowerCount(data.followers || 0);
                setFollowingCount(data.following || 0);
            } else {
                setFollowerCount(0);
                setFollowingCount(0);
            }
        } catch (error) {
            console.error("Error fetching follower counts:", error);
            setFollowerCount(0);
            setFollowingCount(0);
        }
    };

    const handleUpdateSettings = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/user/${userId}/settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders(),
                },
                body: JSON.stringify({ profileType }),
            });

            const data = await response.json();

            if (response.ok) {
                alert(data.message);
                setShowSettings(false);
                fetchProfileDetails();
            } else {
                alert(data.message || "Failed to update settings.");
            }
        } catch (error) {
            console.error("Error updating settings:", error);
            alert("Network error during settings update.");
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
                fetchUserPosts();
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

    const getButtonText = () => {
        if (profileData?.ProfileType === 'Public') {
            switch (friendshipStatus) {
                case STATUS.ACCEPTED:
                    return 'Following';
                case STATUS.PENDING_SENT:
                    return 'Follow Request Sent';
                case STATUS.NOT_FRIENDS:
                    return 'Follow';
                default:
                    return 'Follow';
            }
        } else {
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
        }
    };

    if (loading || !profileData) {
        return <div className="page-container"><p className="loading">Loading Profile...</p></div>;
    }

    if (!profileData.UserID) {
        return <div className="page-container">User Not Found or Error Loading Profile.</div>;
    }

    if (!canViewProfile && !isCurrentUserProfile) {
        return (
            <div className="page-container">
                <div className="private-profile-notice">
                    <div className="private-profile-icon">👤</div>
                    <h1>{profileData.Name}</h1>
                    <p className="private-badge">🔒 Private Profile</p>
                    <p>This profile is private. Send a friend request to view their content.</p>
                    <div className="follower-stats" style={{ justifyContent: 'center', marginTop: '1rem' }}>
                        <span
                            className="stat-item clickable-stat"
                            onClick={() => setModalConfig({
                                title: `👥 ${profileData.Name}'s Followers`,
                                endpoint: `${API_BASE_URL}/api/user/${profileId}/followers`,
                                showFollowBack: false
                            })}
                        >
                            <strong>{followerCount}</strong> Followers
                        </span>
                        <span className="stat-divider">•</span>
                        <span
                            className="stat-item clickable-stat"
                            onClick={() => setModalConfig({
                                title: `👤 ${profileData.Name}'s Following`,
                                endpoint: `${API_BASE_URL}/api/user/${profileId}/following`,
                                showUnfollow: false
                            })}
                        >
                            <strong>{followingCount}</strong> Following
                        </span>
                    </div>
                    <button
                        className="btn-friend"
                        onClick={() => handleToggleFollow(null, null)}
                    >
                        {getButtonText()}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container profile-layout">
            <div className="profile-header">
                <div>
                    <h1>
                        {profileData.Name} {isCurrentUserProfile && '(You)'}
                        {profileData.ProfileType === 'Private' && ' 🔒'}
                    </h1>
                    <p className="subtext">@{profileData.Username} | User ID: <strong>{profileId}</strong></p>
                    <p className="subtext">
                        Profile Type: <strong>{profileData.ProfileType}</strong>
                    </p>
                    <div className="follower-stats">
                        <span
                            className="stat-item clickable-stat"
                            onClick={() => setModalConfig({
                                title: `👥 ${profileData.Name}'s Followers`,
                                endpoint: `${API_BASE_URL}/api/user/${profileId}/followers`,
                                showFollowBack: isCurrentUserProfile
                            })}
                        >
                            <strong>{followerCount}</strong> Followers
                        </span>
                        <span className="stat-divider">•</span>
                        <span
                            className="stat-item clickable-stat"
                            onClick={() => setModalConfig({
                                title: `👤 ${profileData.Name}'s Following`,
                                endpoint: `${API_BASE_URL}/api/user/${profileId}/following`,
                                showUnfollow: isCurrentUserProfile
                            })}
                        >
                            <strong>{followingCount}</strong> Following
                        </span>
                    </div>
                </div>

                {isCurrentUserProfile ? (
                    <button
                        className="btn-settings"
                        onClick={() => setShowSettings(!showSettings)}
                    >
                        ⚙️ Settings
                    </button>
                ) : (
                    <button
                        className={`btn-${friendshipStatus === STATUS.ACCEPTED ? 'unfriend' :
                            friendshipStatus === STATUS.PENDING_RECEIVED ? 'accept' : 'friend'}`}
                        onClick={() => handleToggleFollow(null, null)}
                    >
                        {getButtonText()}
                    </button>
                )}
            </div>

            {showSettings && isCurrentUserProfile && (
                <div className="settings-panel">
                    <h3>⚙️ Profile Settings</h3>
                    <div className="setting-item">
                        <label>
                            <strong>Profile Type:</strong>
                            <select
                                value={profileType}
                                onChange={(e) => setProfileType(e.target.value)}
                                className="profile-type-select"
                            >
                                <option value="Public">Public - Anyone can view and follow</option>
                                <option value="Private">Private - Requires friend request</option>
                            </select>
                        </label>
                        <p className="setting-description">
                            {profileType === 'Public'
                                ? '✓ Your profile and posts are visible to everyone'
                                : '🔒 Only friends can view your profile and posts'}
                        </p>
                    </div>
                    <div className="setting-actions">
                        <button onClick={handleUpdateSettings} className="btn-save">
                            Save Changes
                        </button>
                        <button onClick={() => setShowSettings(false)} className="btn-cancel">
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <hr />

            {isCurrentUserProfile && pendingRequests.length > 0 && (
                <div className="pending-requests-section">
                    <h2>📥 Incoming Friend Requests ({pendingRequests.length})</h2>
                    <ul>
                        {pendingRequests.map(request => (
                            <li key={request.SenderID}>
                                <span style={{ fontSize: '1.1em' }}>
                                    <Link
                                        to={`/profile/${request.SenderID}`}
                                        style={{ color: '#667eea', textDecoration: 'none', fontWeight: 'bold' }}
                                    >
                                        {request.SenderName}
                                    </Link> (@{request.SenderUsername})
                                    <small style={{ marginLeft: '10px', color: '#888' }}>
                                        sent on {new Date(request.SinceDate).toLocaleDateString()}
                                    </small>
                                </span>
                                <div>
                                    <button onClick={() => handleToggleFollow('accept', request.SenderID)}>
                                        Accept
                                    </button>
                                    <button onClick={() => handleToggleFollow('decline', request.SenderID)}>
                                        Decline
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {isCurrentUserProfile && outgoingRequests.length > 0 && (
                <div className="outgoing-requests-section">
                    <h2>📤 Outgoing Friend Requests ({outgoingRequests.length})</h2>
                    <ul>
                        {outgoingRequests.map(request => (
                            <li key={request.ReceiverID}>
                                <span style={{ fontSize: '1.1em' }}>
                                    <strong>{request.ReceiverName}</strong> (@{request.ReceiverUsername})
                                    <small style={{ marginLeft: '10px', color: '#888' }}>
                                        sent on {new Date(request.SinceDate).toLocaleDateString()}
                                    </small>
                                </span>
                                <div>
                                    <button
                                        onClick={() => handleToggleFollow('cancel', request.ReceiverID)}
                                        className="btn-cancel-request"
                                    >
                                        Cancel Request
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {isCurrentUserProfile && pendingRequests.length === 0 && outgoingRequests.length === 0 && (
                <div className="pending-requests-section">
                    <h2>📬 Friend Requests</h2>
                    <p>No pending requests.</p>
                </div>
            )}

            <hr />

            <h3>{profileData.Name}'s Posts ({userPosts.length})</h3>

            <div className="posts-grid" style={{ marginTop: '1.5rem' }}>
                {userPosts.length === 0 && (
                    <p className="empty-state">No posts yet.</p>
                )}
                {userPosts.map(post => (
                    <PostCard
                        key={post.PostID}
                        post={post}
                        onLike={handleLike}
                        onCommentClick={openPostModal}
                        onPostClick={openPostModal}
                    />
                ))}
            </div>

            {selectedPostId && (
                <PostModal
                    postId={selectedPostId}
                    onClose={closePostModal}
                    onUpdate={fetchUserPosts}
                />
            )}

            {modalConfig && (
                <UserListModal
                    title={modalConfig.title}
                    endpoint={modalConfig.endpoint}
                    showFollowBack={modalConfig.showFollowBack}
                    showUnfollow={modalConfig.showUnfollow}
                    onClose={() => setModalConfig(null)}
                    onActionComplete={() => {
                        fetchFollowerCounts();
                        fetchProfileDetails();
                    }}
                />
            )}
        </div>
    );
};

export default ProfilePage;
