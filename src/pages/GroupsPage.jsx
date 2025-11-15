import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const API_BASE_URL = 'http://localhost:3001';

const GroupsPage = () => {
    const { userId, getAuthHeaders } = useAuth();
    const navigate = useNavigate();
    const [allGroups, setAllGroups] = useState([]);
    const [myGroups, setMyGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newGroupData, setNewGroupData] = useState({
        name: '',
        description: ''
    });

    const fetchGroups = async () => {
        setLoading(true);
        try {
            // Fetch all groups
            const allGroupsResponse = await fetch(`${API_BASE_URL}/api/groups`, {
                headers: getAuthHeaders(),
            });
            if (allGroupsResponse.ok) {
                const allGroupsData = await allGroupsResponse.json();
                setAllGroups(allGroupsData);
            }

            // Fetch user's groups
            const myGroupsResponse = await fetch(`${API_BASE_URL}/api/user/${userId}/groups`, {
                headers: getAuthHeaders(),
            });
            if (myGroupsResponse.ok) {
                const myGroupsData = await myGroupsResponse.json();
                setMyGroups(myGroupsData);
            }
        } catch (error) {
            console.error("Error fetching groups:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGroups();
    }, [userId]);

    const handleJoinGroup = async (groupId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/groups/${groupId}/join`, {
                method: 'POST',
                headers: getAuthHeaders(),
            });

            const data = await response.json();
            alert(data.message);

            if (response.ok) {
                fetchGroups();
            }
        } catch (error) {
            console.error("Error joining group:", error);
            alert("Network error during join action.");
        }
    };

    const handleLeaveGroup = async (groupId) => {
        if (!window.confirm("Are you sure you want to leave this group?")) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/groups/${groupId}/leave`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });

            const data = await response.json();
            alert(data.message);

            if (response.ok) {
                fetchGroups();
            }
        } catch (error) {
            console.error("Error leaving group:", error);
            alert("Network error during leave action.");
        }
    };

    const handleCreateGroup = async (e) => {
        e.preventDefault();

        if (!newGroupData.name.trim() || !newGroupData.description.trim()) {
            alert("Please fill in all fields.");
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/groups/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders(),
                },
                body: JSON.stringify(newGroupData),
            });

            const data = await response.json();

            if (response.ok) {
                alert(data.message);
                setNewGroupData({ name: '', description: '' });
                setShowCreateForm(false);
                fetchGroups();
                // Navigate to the newly created group
                navigate(`/group/${data.groupId}`);
            } else {
                alert(data.message || "Failed to create group.");
            }
        } catch (error) {
            console.error("Error creating group:", error);
            alert("Network error during group creation.");
        }
    };

    const isUserMember = (groupId) => {
        return myGroups.some(group => group.GroupID === groupId);
    };

    if (loading) {
        return <div className="page-container"><p className="loading">Loading Groups...</p></div>;
    }

    return (
        <div className="page-container">
            <div className="groups-header">
                <div>
                    <h1>👥 Groups</h1>
                    <p className="subtext">Discover and join communities</p>
                </div>
                <button
                    className="btn-create-group"
                    onClick={() => setShowCreateForm(!showCreateForm)}
                >
                    ➕ Create New Group
                </button>
            </div>

            {showCreateForm && (
                <div className="create-group-form">
                    <h3>Create a New Group</h3>
                    <form onSubmit={handleCreateGroup}>
                        <div className="form-group">
                            <label>Group Name *</label>
                            <input
                                type="text"
                                value={newGroupData.name}
                                onChange={(e) => setNewGroupData({
                                    ...newGroupData,
                                    name: e.target.value
                                })}
                                placeholder="Enter group name"
                                maxLength="100"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Description *</label>
                            <textarea
                                value={newGroupData.description}
                                onChange={(e) => setNewGroupData({
                                    ...newGroupData,
                                    description: e.target.value
                                })}
                                placeholder="Describe what this group is about..."
                                rows="4"
                                required
                            />
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="btn-create">
                                Create Group
                            </button>
                            <button
                                type="button"
                                className="btn-cancel-form"
                                onClick={() => {
                                    setShowCreateForm(false);
                                    setNewGroupData({ name: '', description: '' });
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* My Groups Section */}
            <section style={{ marginBottom: '3rem', marginTop: '2rem' }}>
                <h2 style={{ color: '#667eea', marginBottom: '1rem' }}>My Groups ({myGroups.length})</h2>
                {myGroups.length === 0 ? (
                    <p className="empty-state">You haven't joined any groups yet.</p>
                ) : (
                    <div className="groups-grid">
                        {myGroups.map(group => (
                            <div key={group.GroupID} className="group-card">
                                <div className="group-header">
                                    <h3>
                                        <Link to={`/group/${group.GroupID}`}>{group.Name}</Link>
                                    </h3>
                                    {group.Role === 'Admin' && (
                                        <span className="role-badge admin">Admin</span>
                                    )}
                                </div>
                                <p className="group-description">{group.Description}</p>
                                <div className="group-stats">
                                    <span>👥 {group.MemberCount} members</span>
                                    <span>📅 Joined {new Date(group.JoinDate).toLocaleDateString()}</span>
                                </div>
                                <div className="group-actions">
                                    <Link to={`/group/${group.GroupID}`} className="btn-view">
                                        View Group
                                    </Link>
                                    <button
                                        className="btn-leave"
                                        onClick={() => handleLeaveGroup(group.GroupID)}
                                    >
                                        Leave Group
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <hr />

            {/* All Groups Section */}
            <section>
                <h2 style={{ color: '#667eea', marginBottom: '1rem' }}>Discover Groups ({allGroups.length})</h2>
                <div className="groups-grid">
                    {allGroups.map(group => (
                        <div key={group.GroupID} className="group-card">
                            <h3>
                                <Link to={`/group/${group.GroupID}`}>{group.Name}</Link>
                            </h3>
                            <p className="group-description">{group.Description}</p>
                            <div className="group-stats">
                                <span>👥 {group.MemberCount} members</span>
                            </div>
                            <div className="group-actions">
                                {isUserMember(group.GroupID) ? (
                                    <span className="member-badge">✓ Member</span>
                                ) : (
                                    <button
                                        className="btn-join"
                                        onClick={() => handleJoinGroup(group.GroupID)}
                                    >
                                        Join Group
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default GroupsPage;
