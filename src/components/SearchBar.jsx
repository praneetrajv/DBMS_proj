import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const API_BASE_URL = 'http://localhost:3001';

const SearchBar = () => {
    const { userId, getAuthHeaders } = useAuth(); 
    
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);

    const handleSearch = async (e) => {
        const q = e.target.value;
        setQuery(q);
        if (q.length < 2) {
            setResults([]);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/users/search?q=${q}`, {
                headers: getAuthHeaders(),
            });
            
            const data = await response.json();
            
            const filteredData = data.filter(user => user.UserID !== userId);
            
            setResults(filteredData);
            
        } catch (error) {
            console.error("Search failed:", error);
            setResults([]);
        }
    };

    const handleResultClick = () => {
        setResults([]);
        setQuery('');
    };

    return (
        <div className="search-container">
            <input
                type="text"
                placeholder="🔍 Find users by name or username..."
                value={query}
                onChange={handleSearch}
            />
            {query.length >= 2 && results.length > 0 && (
                <ul className="search-results-dropdown">
                    {results.map(user => (
                        <li key={user.UserID}>
                            <Link 
                                to={`/profile/${user.UserID}`} 
                                onClick={handleResultClick}
                            >
                                {user.Name} (@{user.Username})
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
            {query.length >= 2 && results.length === 0 && (
                <ul className="search-results-dropdown">
                    <li style={{ padding: '8px 10px', color: '#999' }}>No users found.</li>
                </ul>
            )}
        </div>
    );
};
export default SearchBar;
