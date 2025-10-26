import React, { useState } from 'react';

// This is your main functional component. 
// In React, components are the building blocks of your UI.
// We are using Tailwind CSS classes for styling.

const App = () => {
  // Use state to manage the 'Follow' status
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(345);

  const handleFollowToggle = () => {
    setIsFollowing(prev => !prev);
    setFollowerCount(prev => prev + (isFollowing ? -1 : 1));
  };

  // Inline SVG for the 'Share' icon (replaces reliance on external icon libraries)
  const ShareIcon = () => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className="w-5 h-5"
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );

  return (
    // Main container is centered and uses Inter font (default for Tailwind)
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      {/* Social Profile Card */}
      <div 
        className="w-full max-w-sm bg-white rounded-xl shadow-2xl overflow-hidden transform hover:scale-[1.02] transition duration-300 ease-in-out"
        style={{ fontFamily: 'Inter, sans-serif' }}
      >
        
        {/* Header Background Image */}
        <div className="h-24 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 relative">
          {/* Placeholder for Banner Image */}
          <div className="absolute inset-0 bg-black/10 flex items-center justify-center text-white text-sm font-semibold">
            Social Banner Area
          </div>
        </div>

        {/* Profile Details Section */}
        <div className="p-6 pt-0 text-center">
          
          {/* Avatar */}
          <img
            className="w-24 h-24 rounded-full mx-auto -mt-12 border-4 border-white object-cover shadow-lg"
            src="https://placehold.co/96x96/6C63FF/ffffff?text=U"
            alt="User Avatar"
            onError={(e) => { e.target.onerror = null; e.target.src="https://placehold.co/96x96/6C63FF/ffffff?text=User"}}
          />

          {/* User Info */}
          <h1 className="text-2xl font-bold text-gray-900 mt-3">Dev Starter</h1>
          <p className="text-sm text-indigo-600 font-medium">@beginner_dev</p>
          <p className="text-gray-500 text-sm mt-2 leading-relaxed">
            Building my first social media front end with React and Vite! Frontend enthusiast and quick learner.
          </p>
          
          {/* Stats */}
          <div className="flex justify-around items-center mt-4 border-t border-b py-3 bg-gray-50 rounded-lg">
            <div className="text-center">
              <p className="text-lg font-bold text-gray-800">12</p>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Posts</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-gray-800">{followerCount.toLocaleString()}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Followers</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-gray-800">58</p>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Following</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 mt-6">
            <button
              onClick={handleFollowToggle}
              className={`flex-1 py-3 text-sm font-semibold rounded-full transition duration-200 shadow-md ${
                isFollowing
                  ? 'bg-white text-indigo-600 border border-indigo-600 hover:bg-indigo-50 hover:shadow-lg'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg'
              }`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
            <button
              className="py-3 px-4 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition duration-200 flex items-center justify-center"
              onClick={() => {
                console.log("Share logic executed. Sharing profile link...");
                // In a real app, this would open a share dialog.
                // We'll use a simple alert replacement via console log for now.
              }}
            >
              <ShareIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
