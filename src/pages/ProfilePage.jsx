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

    const isCurrentUserProfile = userId === profileId;

    const [friendshipStatus, setFriendshipStatus] = useState({
        yourStatus: STATUS.NOT_FRIENDS,
        theirStatus: STATUS.NOT_FRIENDS
    });

    const [hasIncomingRequest, setHasIncomingRequest] = useState(false);
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

    console.log("DEBUG — friendshipStatus:", friendshipStatus);
    const interpretStatus = (data) => {
        console.log(data)
        let { yourStatus, theirStatus } = data;

        switch (yourStatus) {
            case null: yourStatus = STATUS.NOT_FRIENDS; break;
            case "Accepted": yourStatus = STATUS.ACCEPTED; break;
            case "Pending": yourStatus = STATUS.PENDING_SENT; break;
        }
        switch (theirStatus) {
            case null: theirStatus = STATUS.NOT_FRIENDS; break;
            case "Accepted": theirStatus = STATUS.ACCEPTED; break;
            case "Pending": theirStatus = STATUS.PENDING_RECEIVED; break;

        }
        return { yourStatus, theirStatus };
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
            setPendingRequests(response.ok ? await response.json() : []);
        } catch {
            setPendingRequests([]);
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
            setOutgoingRequests(response.ok ? await response.json() : []);
        } catch {
            setOutgoingRequests([]);
        }
    };

    const fetchUserPosts = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/user/${profileId}/posts`, {
                headers: getAuthHeaders(),
            });
            setUserPosts(response.ok ? await response.json() : []);
        } catch {
            setUserPosts([]);
        }
    };

    const checkViewPermissions = async () => {
        if (isCurrentUserProfile) {
            setCanViewProfile(true);
            return;
        }
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/user/${profileId}/can-view`,
                { headers: getAuthHeaders() }
            );
            const data = response.ok ? await response.json() : { canView: false };
            setCanViewProfile(data.canView);
        } catch {
            setCanViewProfile(false);
        }
    };

    const fetchProfileDetails = async () => {
        if (!userId || !profileId) return;

        setLoading(true);

        try {
            const res = await fetch(`${API_BASE_URL}/api/user/${profileId}`, {
                headers: getAuthHeaders(),
            });

            if (res.ok) {
                const data = await res.json();
                setProfileData(data);
                setProfileType(data.ProfileType || "Public");
            }
        } catch {
            setProfileData(null);
        }

        await checkViewPermissions();

        if (isCurrentUserProfile) {
            setFriendshipStatus({
                yourStatus: STATUS.SELF,
                theirStatus: STATUS.SELF
            });
            setHasIncomingRequest(false);
        } else {
            try {
                const followResponse = await fetch(
                    `${API_BASE_URL}/api/friendship/${profileId}/follow-status`,
                    { headers: getAuthHeaders() }
                );

                if (followResponse.ok) {
                    const data = await followResponse.json();
                    const status = interpretStatus(data);
                    setFriendshipStatus(status);
                    setHasIncomingRequest(status.theirStatus === STATUS.PENDING_RECEIVED);
                }
            } catch { }
        }

        await fetchUserPosts();
        setLoading(false);
    };

    useEffect(() => {
        const fetchAll = () => {
            fetchProfileDetails();
            fetchPendingRequests();
            fetchOutgoingRequests();
            fetchFollowerCounts();
        };
        fetchAll();
    }, [profileId, userId]);

    const handleToggleFollow = async (explicitAction, targetProfileId) => {
        const targetId = targetProfileId || profileId;
        console.log(explicitAction)
        let actionToSend = explicitAction;
        if (!actionToSend) {
            const { yourStatus, theirStatus } = friendshipStatus;

            if (yourStatus === STATUS.NOT_FRIENDS)
                actionToSend = 'send';

            else if (yourStatus === STATUS.PENDING_SENT)
                actionToSend = 'cancel';

            else if (theirStatus === STATUS.PENDING_RECEIVED)
                actionToSend = 'accept';

            else if (yourStatus === STATUS.ACCEPTED)
                actionToSend = 'unfriend';
        }

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/friendship/${targetId}/toggle-friendship`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                    body: JSON.stringify({ action: actionToSend })
                }
            );

            const data = await response.json();
            alert(data.message);

            fetchProfileDetails();
            fetchPendingRequests();
            fetchOutgoingRequests();
            fetchFollowerCounts();
        } catch {
            alert("Network error.");
        }
    };

    const fetchFollowerCounts = async () => {
        try {
            const res = await fetch(
                `${API_BASE_URL}/api/user/${profileId}/follower-counts`,
                { headers: getAuthHeaders() }
            );

            if (res.ok) {
                const data = await res.json();
                setFollowerCount(data.followers || 0);
                setFollowingCount(data.following || 0);
            }
        } catch { }
    };

    const handleUpdateSettings = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/user/${userId}/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify({ profileType }),
            });

            const data = await res.json();

            if (res.ok) {
                alert(data.message);
                setShowSettings(false);
                fetchProfileDetails();
            } else {
                alert(data.message);
            }
        } catch {
            alert("Network error.");
        }
    };

    const handleLike = async (postId) => {
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/posts/post/${postId}/like`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json", ...getAuthHeaders() }
                }
            );

            if (response.ok) fetchUserPosts();
        } catch { }
    };

    const openPostModal = (postId) => setSelectedPostId(postId);
    const closePostModal = () => setSelectedPostId(null);

    if (loading || !profileData)
        return <div className="page-container">Loading Profile...</div>;

    if (!profileData?.UserID)
        return <div className="page-container">User Not Found</div>;

    const { yourStatus, theirStatus } = friendshipStatus;



    const renderFollowButton = () => {
        if (isCurrentUserProfile) return null;

        const wrapper = {
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "10px",
            width: "100%"
        };

        // Unfollow
        if (yourStatus === STATUS.ACCEPTED && (theirStatus === STATUS.ACCEPTED || theirStatus === STATUS.NOT_FRIENDS)) {
            return (
                <div style={wrapper}>
                    <button className="btn-unfriend" onClick={() => handleToggleFollow('unfriend')}>
                        {profileData?.ProfileType === 'Public' ? 'Unfollow' : 'Unfriend'}
                    </button>
                </div>
            );
        }

        // Unfollow + Accept/Decline
        if (yourStatus === STATUS.ACCEPTED && theirStatus === STATUS.PENDING_RECEIVED) {
            return (
                <div style={wrapper}>
                    <button className="btn-unfriend" onClick={() => handleToggleFollow('unfriend')}>
                        {profileData?.ProfileType === 'Public' ? 'Unfollow' : 'Unfriend'}
                    </button>
                    <button className="btn-accept" onClick={() => handleToggleFollow('accept')}>
                        Accept
                    </button>
                    <button className="btn-unfriend" onClick={() => handleToggleFollow('decline')}>
                        Decline
                    </button>
                </div>
            );
        }

        // Cancel Request
        if (yourStatus === STATUS.PENDING_SENT && (theirStatus === STATUS.ACCEPTED || theirStatus === STATUS.NOT_FRIENDS)) {
            return (
                <div style={wrapper}>
                    <button className="btn-friend" onClick={() => handleToggleFollow('cancel')}>
                        Cancel Request
                    </button>
                </div>
            );
        }

        // Cancel + Accept/Decline
        if (yourStatus === STATUS.PENDING_SENT && theirStatus === STATUS.PENDING_RECEIVED) {
            return (
                <div style={wrapper}>
                    <button className="btn-friend" onClick={() => handleToggleFollow('cancel')}>
                        Cancel Request
                    </button>
                    <button className="btn-accept" onClick={() => handleToggleFollow('accept')}>
                        Accept
                    </button>
                    <button className="btn-unfriend" onClick={() => handleToggleFollow('decline')}>
                        Decline
                    </button>
                </div>
            );
        }

        // Follow
        if (yourStatus === STATUS.NOT_FRIENDS && (theirStatus === STATUS.ACCEPTED || theirStatus === STATUS.NOT_FRIENDS)) {
            return (
                <div style={wrapper}>
                    <button className="btn-friend" onClick={() => handleToggleFollow('send')}>
                        {profileData?.ProfileType === 'Public' ? 'Follow' : 'Send Request'}
                    </button>
                </div>
            );
        }

        // Follow + Accept/Decline
        if (yourStatus === STATUS.NOT_FRIENDS && theirStatus === STATUS.PENDING_RECEIVED) {
            return (
                <div style={wrapper}>
                    <button className="btn-friend" onClick={() => handleToggleFollow('send')}>
                        {profileData?.ProfileType === 'Public' ? 'Follow' : 'Send Request'}
                    </button>
                    <button className="btn-accept" onClick={() => handleToggleFollow('accept')}>
                        Accept
                    </button>
                    <button className="btn-unfriend" onClick={() => handleToggleFollow('decline')}>
                        Decline
                    </button>
                </div>
            );
        }

        return null;
    };

    if (!canViewProfile && !isCurrentUserProfile) {
        return (
            <div className="page-container">
                <div className="private-profile-notice">
                    <div className="private-profile-icon">👤</div>
                    <h1>{profileData.Name}</h1>
                    <p className="private-badge">Private Profile</p>
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
                    {renderFollowButton()}
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
                    </h1>
                    <p>@{profileData.Username} | User ID: <strong>{profileId}</strong></p>
                    <p>Profile: <strong>{profileData.ProfileType}</strong></p>

                    <div className="follower-stats" style={{ justifyContent: 'center', margin: '1rem' }}>
                        <span
                            className="stat-item clickable-stat"
                            onClick={() => setModalConfig({
                                title: `${profileData.Name}'s Followers`,
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
                                title: `${profileData.Name}'s Following`,
                                endpoint: `${API_BASE_URL}/api/user/${profileId}/following`,
                                showUnfollow: isCurrentUserProfile
                            })}
                        >
                            <strong>{followingCount}</strong> Following
                        </span>
                    </div>
                </div>

                {!isCurrentUserProfile && renderFollowButton()}

                {isCurrentUserProfile && (
                    <button className="btn-settings" onClick={() => setShowSettings(!showSettings)}>
                        ⚙️ Settings
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
                                ? 'Your profile and posts are visible to everyone'
                                : 'Only friends can view your profile and posts'}
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
                    <h2>Incoming Friend Requests ({pendingRequests.length})</h2>
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
                    <h2>Outgoing Friend Requests ({outgoingRequests.length})</h2>
                    <ul>
                        {outgoingRequests.map(request => (
                            <li key={request.ReceiverID}>
                                <span style={{ fontSize: '1.1em' }}>
                                    <Link
                                        to={`/profile/${request.ReceiverID}`}
                                        style={{ color: '#667eea', textDecoration: 'none', fontWeight: 'bold' }}
                                    >
                                        {request.ReceiverName}</Link> (@{request.ReceiverUsername})
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

            <hr />

            <h3>{profileData.Name}'s Posts ({userPosts.length})</h3>

            <div className="posts-grid">
                {userPosts.length === 0 && <p>No posts yet.</p>}
                {userPosts.map(post => (
                    <PostCard
                        key={post.PostID}
                        post={post}
                        onLike={handleLike}
                        onCommentClick={() => openPostModal(post.PostID)}
                        onPostClick={() => openPostModal(post.PostID)}
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
