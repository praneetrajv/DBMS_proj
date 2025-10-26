// src/App.js (React Frontend)

import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE_URL = 'http://localhost:3001';

// --- Component 1: Showcasing GetNewsFeed Stored Procedure ---
const NewsFeed = ({ currentUserId }) => {
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchFeed = async () => {
      if (!currentUserId) return;
      setLoading(true);
      try {
        // Calls the /api/feed/:userId endpoint
        const response = await fetch(`${API_BASE_URL}/api/feed/${currentUserId}`);
        const data = await response.json();
        setFeed(data);
      } catch (error) {
        console.error("Failed to fetch feed:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchFeed();
  }, [currentUserId]);

  // Function to call the Like Trigger endpoint
  const handleLike = async (postId) => {
    try {
        // Calls the /api/post/:postId/like/:userId endpoint
      const response = await fetch(`${API_BASE_URL}/api/post/${postId}/like/${currentUserId}`, { method: 'POST' });
      if (response.ok) {
        alert(`Liked Post ${postId}. SQL Trigger (tr_LikeTable_AfterInsert) fired!`);
        // Re-fetch the feed to see the updated LikeCount (thanks to the trigger)
        // NOTE: In a real app, you'd update state locally for better performance.
        window.location.reload(); 
      } else {
        const errorData = await response.json();
        alert(errorData.message);
      }
    } catch (error) {
      alert("Failed to process like.");
    }
  };


  return (
    <div className="feed-container">
      <h2>Friends' Feed for User {currentUserId}</h2>
      <p className="subtext">
        (Loaded via **`CALL GetNewsFeed(${currentUserId})`** Stored Procedure)
      </p>
      {loading && <p>Loading...</p>}
      <div className="posts-grid">
        {feed.length === 0 && !loading && <p>No posts from you or your accepted friends.</p>}
        {feed.map((post) => (
          <div key={post.PostID} className="post-card">
            <h4>{post.Author} {post.Author === 'alice_s' ? ' (You)' : ''}</h4>
            <p className="content">{post.Content}</p>
            <p className="group">{post.GroupName ? `Group: ${post.GroupName}` : 'Personal Post'}</p>
            <div className="post-actions">
                <span className="count-showcase">
                    Likes: **{post.LikeCount}** | Comments: **{post.CommentCount}**
                    <span className="trigger-note">(Updated by Triggers)</span>
                </span>
                <button onClick={() => handleLike(post.PostID)}>
                    👍 Like (Test Trigger)
                </button>
            </div>
            <p className="timestamp">{new Date(post.Timestamp).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
};


// --- Component 2: Showcasing CalculateAge Function ---
const UserAgeDisplay = ({ userId }) => {
    const [userInfo, setUserInfo] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchAge = async () => {
            if (!userId) return;
            setLoading(true);
            try {
                 // Calls the /api/user/:userId/age endpoint
                const response = await fetch(`${API_BASE_URL}/api/user/${userId}/age`);
                const data = await response.json();
                setUserInfo(data);
            } catch (error) {
                console.error("Failed to fetch user age:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAge();
    }, [userId]);

    if (loading) return <div>Loading Age...</div>;
    if (!userInfo) return null;

    return (
        <div className="age-box">
            <h4>User: {userInfo.Name} (@{userInfo.Username})</h4>
            <p>Gender: {userInfo.Gender}</p>
            <p className="age-value">
                Age: **{userInfo.Age}** Years Old
                <span className="function-note">
                    (Calculated live via **`CalculateAge(DOB)`** SQL Function)
                </span>
            </p>
        </div>
    );
};


// --- Main App Component ---
function App() {
  // Use Alice (UserID 1) as the default user for the showcase
  const [currentUserId, setCurrentUserId] = useState(1);
  const userOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // All UserIDs

  return (
    <div className="App">
      <h1>Social Network SQL Showcase</h1>
      <div className="user-select-bar">
        <label>
          Select User to View Feed As:
          <select 
            value={currentUserId} 
            onChange={(e) => setCurrentUserId(parseInt(e.target.value))}
          >
            {userOptions.map(id => (
              <option key={id} value={id}>User ID {id}</option>
            ))}
          </select>
        </label>
      </div>

      <hr />

      <div className="showcase-section">
        <h3>Function Showcase: Live Age Calculation</h3>
        <UserAgeDisplay userId={currentUserId} />
      </div>

      <hr />

      <div className="showcase-section">
        <h3>Procedure & Trigger Showcase: News Feed Interaction</h3>
        <NewsFeed currentUserId={currentUserId} />
      </div>

    </div>
  );
}

export default App;
