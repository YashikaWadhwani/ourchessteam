import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function AuthForm({ type }) {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`http://localhost:5000/api/auth/${type}`, formData);
      document.cookie = `token=${res.data.token}; path=/`;
      navigate('/dashboard');
    } catch (err) {
      alert(err.response?.data?.error || 'Auth failed');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" onChange={(e) => setFormData({...formData, email: e.target.value})} />
      <input type="password" onChange={(e) => setFormData({...formData, password: e.target.value})} />
      <button type="submit">{type === 'login' ? 'Login' : 'Register'}</button>
    </form>
  );
}