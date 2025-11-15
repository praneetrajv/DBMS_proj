import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const API_BASE_URL = 'http://localhost:3001';

const UserListModal = ({ 
    title, 
    endpoint, 
    onClose, 
    showFollowBack = false,
    showUnfollow = false,
    showKick = false,
    onActionComplete 
}) => {
    const { userId: currentUserId, getAuthHeaders } = useAuth();
    const [users, setUsers] = useState([]);
    const [currentUserRole, setCurrentUserRole] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await fetch(endpoint, {
                headers: getAuthHeaders(),
            });

            if (response.ok) {
                const data = await response.json();
                
                // Handle different response formats
                if (data.members) {
                    // Group members format
                    setUsers(data.members);
                    setCurrentUserRole(data.currentUserRole);
                } else if (Array.isArray(data)) {
                    // Followers/Following format
                    setUsers(data);
                } else {
                    setUsers([]);
                }
            } else {
                const error = await response.json();
                alert(error.message || "Failed to load users");
                onClose();
            }
        } catch (error) {
            console.error("Error fetching users:", error);
            alert("Failed to load users");
            onClose();
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (endpoint) {
            fetchUsers();
        }
    }, [endpoint]);

    const handleFollowBack = async (userId, userName) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/friendship/${userId}/toggle-friendship`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders(),
                },
                body: JSON.stringify({ action: 'send' }),
            });

            const data = await response.json();
            alert(data.message);

            if (response.ok) {
                fetchUsers();
                if (onActionComplete) onActionComplete();
            }
        } catch (error) {
            console.error("Error following back:", error);
            alert("Network error during follow action");
        }
    };

    const handleUnfollow = async (userId, userName, profileType) => {
        const isPublic = profileType === 'Public';
        const confirmMessage = isPublic 
            ? `Are you sure you want to unfollow ${userName}?`
            : `Are you sure you want to unfriend ${userName}?`;

        if (!window.confirm(confirmMessage)) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/friendship/${userId}/toggle-friendship`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders(),
                },
                body: JSON.stringify({ action: 'unfriend' }),
            });

            const data = await response.json();
            alert(data.message);

            if (response.ok) {
                fetchUsers();
                if (onActionComplete) onActionComplete();
            }
        } catch (error) {
            console.error("Error unfollowing:", error);
            alert("Network error during unfollow action");
        }
    };

    const handleKick = async (userId, userName, groupId) => {
        if (!window.confirm(`Are you sure you want to kick ${userName} from the group?`)) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/group/${groupId}/kick/${userId}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });

            const data = await response.json();

            if (response.ok) {
                alert(data.message);
                fetchUsers();
                if (onActionComplete) onActionComplete();
            } else {
                alert(data.message || "Failed to kick member");
            }
        } catch (error) {
            console.error("Error kicking member:", error);
            alert("Network error during kick action");
        }
    };

    const renderUserItem = (user) => {
        // Determine if this is a group member or follower/following
        const isGroupMember = user.Role !== undefined;
        const userId = user.UserID;
        const name = user.Name;
        const username = user.Username;
        const date = user.JoinDate || user.SinceDate;
        const isAdmin = user.Role === 'Admin';
        const youFollowThem = user.YouFollowThem === 1;
        const profileType = user.ProfileType;

        return (
            <div key={userId} className="user-list-item">
                <div className="user-list-info">
                    <Link
                        to={`/profile/${userId}`}
                        onClick={onClose}
                        className="user-list-name"
                    >
                        {name}
                    </Link>
                    <span className="user-list-username">
                        @{username}
                        {profileType === 'Private' && ' 🔒'}
                    </span>
                    {isAdmin && (
                        <span className="role-badge admin">Admin</span>
                    )}
                </div>
                <div className="user-list-meta">
                    <span className="user-list-date">
                        {isGroupMember ? 'Joined' : 'Since'} {new Date(date).toLocaleDateString()}
                    </span>
                    <div className="user-list-actions">
                        {showFollowBack && !youFollowThem && (
                            <button
                                className="btn-follow-back"
                                onClick={() => handleFollowBack(userId, name)}
                            >
                                Follow Back
                            </button>
                        )}
                        {showUnfollow && (
                            <button
                                className="btn-unfollow"
                                onClick={() => handleUnfollow(userId, name, profileType)}
                            >
                                {profileType === 'Public' ? 'Unfollow' : 'Unfriend'}
                            </button>
                        )}
                        {showKick && currentUserRole === 'Admin' && !isAdmin && (
                            <button
                                className="btn-kick"
                                onClick={() => {
                                    // Extract groupId from endpoint
                                    const groupId = endpoint.match(/\/group\/(\d+)\//)?.[1];
                                    handleKick(userId, name, groupId);
                                }}
                            >
                                Kick
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content user-list-modal" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>×</button>

                <h2>{title}</h2>
                <p className="subtext">{users.length} total</p>

                {loading ? (
                    <p className="loading">Loading...</p>
                ) : users.length === 0 ? (
                    <p className="empty-state">No users to display.</p>
                ) : (
                    <div className="user-list">
                        {users.map(user => renderUserItem(user))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserListModal;
