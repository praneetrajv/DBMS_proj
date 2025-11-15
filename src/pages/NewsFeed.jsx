import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import PostCard from '../components/PostCard';
import PostModal from '../components/PostModal';

const API_BASE_URL = 'http://localhost:3001';

const NewsFeed = () => {
    const { userId, getAuthHeaders } = useAuth();
    const [feed, setFeed] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedPostId, setSelectedPostId] = useState(null);
    const [newPostContent, setNewPostContent] = useState(''); // Missing state variable

    const fetchFeed = async () => {
        if (!userId) return;
        setLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/feed/${userId}`, {
                headers: getAuthHeaders(),
            });

            if (!response.ok) {
                console.error(`API Error: ${response.statusText}`);
                setFeed([]);
                return;
            }

            const data = await response.json();

            if (Array.isArray(data)) {
                setFeed(data);
            } else {
                console.warn("Received non-array data for feed:", data);
                setFeed([]);
            }
        } catch (error) {
            console.error("Failed to fetch feed:", error);
            setFeed([]);
        } finally {
            setLoading(false);
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
                    groupId: null, // Changed from undefined 'groupId' variable to null for home feed posts
                }),
            });

            const data = await response.json();

            if (response.ok) {
                alert(data.message);
                setNewPostContent('');
                fetchFeed(); // Changed from fetchGroupDetails() to fetchFeed()
            } else {
                alert(data.message || "Failed to create post.");
            }
        } catch (error) {
            console.error("Error creating post:", error);
            alert("Network error during post creation.");
        }
    };

    useEffect(() => {
        if (userId) {
            fetchFeed();
        }
    }, [userId]);

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
                fetchFeed();
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

    if (!userId) {
        return <div className="page-container">Please log in to view your feed.</div>;
    }

    return (
        <div className="page-container">
            <h1>Home Feed</h1>
            <p className="subtext">
                Viewing feed as User <strong>{userId}</strong>
            </p>
            {loading && <p className="loading">Loading Feed...</p>}

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
                        Post to Feed
                    </button>
                </form>
            </div>

            <div className="posts-grid">
                {feed.length === 0 && !loading && (
                    <p className="empty-state">
                        No posts to display. Add some friends to see their posts!
                    </p>
                )}
                {feed.map((post) => (
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
                    onUpdate={fetchFeed}
                />
            )}
        </div>
    );
};

export default NewsFeed;
