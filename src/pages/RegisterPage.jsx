import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:3001';

const RegisterPage = () => {
    const [formData, setFormData] = useState({
        name: '', username: '', email: '', password: '', dob: '', gender: 'Male'
    });
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const response = await fetch(`${API_BASE_URL}/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                alert(data.message);
                navigate('/login');
            } else {
                alert(`Registration failed: ${data.message}`);
            }
        } catch (error) {
            alert("Network error. Could not connect to the server.");
        }
    };

    return (
        <div className="auth-container">
            <h1>Register</h1>
            <form onSubmit={handleSubmit} className="auth-form">
                <input type="text" name="name" placeholder="Full Name" onChange={handleChange} required />
                <input type="text" name="username" placeholder="Username" onChange={handleChange} required />
                <input type="email" name="email" placeholder="Email" onChange={handleChange} required />
                <input type="password" name="password" placeholder="Password" onChange={handleChange} required />
                <label>Date of Birth: <input type="date" name="dob" onChange={handleChange} required /></label>
                <label>Gender:
                    <select name="gender" onChange={handleChange}>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                    </select>
                </label>
                <button type="submit">Create Account</button>
            </form>
        </div>
    );
};
export default RegisterPage;
