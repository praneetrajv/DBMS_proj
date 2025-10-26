import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

// Import components and pages
import NewsFeed from './pages/NewsFeed';
import ProfilePage from './pages/ProfilePage';
import SearchBar from './components/SearchBar';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import './App.css';

const Navbar = () => {
    const { isAuthenticated, userId, logout } = useAuth();

    return (
        <nav className="navbar">
            <div className="nav-links">
                <Link to="/" className="nav-logo">SQL Social</Link>
                {isAuthenticated && <Link to="/" className="nav-item">Home Feed</Link>}
                {isAuthenticated && <Link to={`/profile/${userId}`} className="nav-item">My Profile</Link>}
            </div>

            <div className="user-control">
                {isAuthenticated ? (
                    <>
                        <span>User ID: {userId}</span>
                        <button onClick={logout} className="btn-logout">Logout</button>
                    </>
                ) : (
                    <>
                        <Link to="/login" className="nav-item">Login</Link>
                        <Link to="/register" className="nav-item">Register</Link>
                    </>
                )}
            </div>
        </nav>
    );
};

function App() {
    const { isAuthenticated, userId } = useAuth();

    const ProtectedRoute = ({ children }) => {
        if (!isAuthenticated) {
            return <Navigate to="/login" replace />;
        }
        return children;
    };

    return (
        <Router>
            <Navbar />

            <div className="main-content">
                {isAuthenticated && <SearchBar />}

                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />

                    <Route path="/" element={
                        <ProtectedRoute>
                            <NewsFeed currentUserId={userId} />
                        </ProtectedRoute>
                    } />
                    <Route path="/profile/:userId" element={
                        <ProtectedRoute>
                            <ProfilePage currentUserId={userId} />
                        </ProtectedRoute>
                    } />
                    <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
