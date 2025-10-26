import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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
    const [loading, setLoading] = useState(true);
    const [pendingRequests, setPendingRequests] = useState([]);


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
                // Relies on the backend returning status and rowInitiatorId (Sender ID)
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
        setLoading(false);
    };

    useEffect(() => {
        const fetchAllDetails = () => {
            fetchProfileDetails(); 
            fetchPendingRequests();
        };
        fetchAllDetails();
    }, [profileId, userId, getAuthHeaders]);

    
    const handleToggleFollow = async (explicitAction, targetProfileId) => {
        
        // Determine the target ID and the action
        const targetId = targetProfileId || profileId;

        // Determine the action based on explicit call (from list) or current state (from main button)
        let actionToSend;
        if (explicitAction) {
            actionToSend = explicitAction;
        } else {
            switch (friendshipStatus) {
                case STATUS.NOT_FRIENDS: actionToSend = 'send'; break;
                case STATUS.PENDING_RECEIVED: actionToSend = 'accept'; break; 
                case STATUS.PENDING_SENT: actionToSend = 'cancel'; break;
                case STATUS.ACCEPTED: actionToSend = 'unfriend'; break;
                default: return; // Should not happen
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
                    // Send the explicit action in the request body
                    body: JSON.stringify({ action: actionToSend }), 
                }
            );

            const responseData = await response.json();
            alert(responseData.message);

            // Refresh status after action to reflect the new state
            if (response.ok || response.status === 409) { 
                // Refresh all relevant data
                fetchProfileDetails();
                fetchPendingRequests();
            }
            
        } catch (error) {
            alert("Network error during friendship action.");
        }
    };


    // --- UI Helper: Get Button Text ---
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

    if (loading || !profileData) return <div className="page-container">Loading Profile...</div>;
    
    // Fallback if profile data is null/error
    if (!profileData.UserID) return <div className="page-container">User Not Found or Error Loading Profile.</div>;

    return (
        <div className="page-container profile-layout">
            <div className="profile-header">
                <h1>{profileData.Name} Profile {isCurrentUserProfile && '(You)'}</h1>
                <p className="subtext">@{profileData.Username} | UserID **{profileId}**</p>

                {/* The Main Friend Action Button (for the viewed profile) */}
                {!isCurrentUserProfile && (
                    <button 
                        className={`btn-${friendshipStatus === STATUS.ACCEPTED ? 'unfriend' : 
                                       friendshipStatus === STATUS.PENDING_RECEIVED ? 'accept' : 'friend'}`} 
                        onClick={() => handleToggleFollow(null, null)} // Uses internal state logic
                    >
                        {getButtonText()}
                        {/* Status indicator for pending requests */}
                        {friendshipStatus === STATUS.PENDING_SENT && " (Sent)"}
                        {friendshipStatus === STATUS.PENDING_RECEIVED && " (Received)"}
                    </button>
                )}
            </div>

            <hr />

            {/* NEW SECTION: Incoming Pending Requests (Only for own profile) */}
            {isCurrentUserProfile && pendingRequests.length > 0 && (
                <div className="pending-requests-section">
                    <h2>📥 Pending Friend Requests ({pendingRequests.length})</h2>
                    <ul style={{listStyle: 'none', padding: 0}}>
                        {pendingRequests.map(request => (
                            <li key={request.SenderID} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #eee' }}>
                                <span style={{fontSize: '1.1em'}}>
                                    **{request.SenderName}** (@{request.SenderUsername}) 
                                    <small style={{marginLeft: '10px', color: '#888'}}>sent on {new Date(request.SinceDate).toLocaleDateString()}</small>
                                </span>
                                <div>
                                    {/* Accept Button: Calls handleToggleFollow with explicit action='accept' and the SenderID */}
                                    <button 
                                        onClick={() => handleToggleFollow('accept', request.SenderID)}
                                        style={{backgroundColor: '#4CAF50', color: 'white', border: 'none', padding: '8px 15px', cursor: 'pointer', marginRight: '5px', borderRadius: '4px'}}
                                    >
                                        Accept
                                    </button>
                                    {/* Decline Button: Calls handleToggleFollow with explicit action='cancel' (which deletes the row) */}
                                    <button 
                                        onClick={() => handleToggleFollow('cancel', request.SenderID)} 
                                        style={{backgroundColor: '#f44336', color: 'white', border: 'none', padding: '8px 15px', cursor: 'pointer', borderRadius: '4px'}}
                                    >
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

            <h3>{profileData.Name}'s Wall</h3>
            <p>[User's posts will be loaded here.]</p>

        </div>
    );
};
export default ProfilePage;
