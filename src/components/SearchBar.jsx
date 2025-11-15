import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const API_BASE_URL = 'http://localhost:3001';

const SearchBar = () => {
    const { getAuthHeaders } = useAuth();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState({ users: [], groups: [] });

    const handleSearch = async (e) => {
        const q = e.target.value;
        setQuery(q);
        
        if (q.length < 2) {
            setResults({ users: [], groups: [] });
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(q)}`, {
                headers: getAuthHeaders(),
            });
            
            if (!response.ok) {
                setResults({ users: [], groups: [] });
                return;
            }
            
            const data = await response.json();
            setResults(data);
        } catch (error) {
            console.error("Search failed:", error);
            setResults({ users: [], groups: [] });
        }
    };

    const handleResultClick = () => {
        setResults({ users: [], groups: [] });
        setQuery('');
    };

    const hasResults = results.users.length > 0 || results.groups.length > 0;

    return (
        <div className="search-container">
            <input
                type="text"
                placeholder="🔍 Search users and groups..."
                value={query}
                onChange={handleSearch}
            />
            {query.length >= 2 && hasResults && (
                <ul className="search-results-dropdown">
                    {results.users.length > 0 && (
                        <>
                            <li className="search-category-header">
                                <strong>👤 Users</strong>
                            </li>
                            {results.users.map(user => (
                                <li key={`user-${user.UserID}`} className="search-result-item">
                                    <Link 
                                        to={`/profile/${user.UserID}`} 
                                        onClick={handleResultClick}
                                    >
                                        <div className="search-result-main">
                                            <strong>{user.Name}</strong>
                                            <span className="search-result-meta">@{user.Username}</span>
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </>
                    )}
                    
                    {results.groups.length > 0 && (
                        <>
                            <li className="search-category-header">
                                <strong>👥 Groups</strong>
                            </li>
                            {results.groups.map(group => (
                                <li key={`group-${group.GroupID}`} className="search-result-item">
                                    <Link 
                                        to={`/group/${group.GroupID}`} 
                                        onClick={handleResultClick}
                                    >
                                        <div className="search-result-main">
                                            <strong>{group.Name}</strong>
                                        </div>
                                        <div className="search-result-description">
                                            {group.Description.substring(0, 60)}
                                            {group.Description.length > 60 ? '...' : ''}
                                        </div>
                                        <div className="search-result-meta">
                                            👥 {group.MemberCount} members
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </>
                    )}
                </ul>
            )}
            {query.length >= 2 && !hasResults && (
                <ul className="search-results-dropdown">
                    <li style={{ padding: '12px 15px', color: '#999', textAlign: 'center' }}>
                        No users or groups found.
                    </li>
                </ul>
            )}
        </div>
    );
};

export default SearchBar;
