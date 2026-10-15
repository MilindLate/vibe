// src/components/auth/LoginPage.tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(emailOrUsername, password);
      navigate('/');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-primary mb-2">Vibe</h1>
          <p className="text-gray-400">Log in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={emailOrUsername}
            onChange={(e) => setEmailOrUsername(e.target.value)}
            placeholder="Email or username"
            className="input-field"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="input-field"
            required
          />
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full py-3 text-base disabled:opacity-60"
          >
            {isLoading ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link to="/register" className="text-gray-400 text-sm hover:text-white">
            Don't have an account? <span className="text-primary font-semibold">Sign up</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
