// src/components/auth/RegisterPage.tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [form, setForm] = useState({ username: '', email: '', password: '', displayName: '' });
  const { register, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    try {
      await register(form.username, form.email, form.password, form.displayName);
      navigate('/');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-primary mb-2">Vibe</h1>
          <p className="text-gray-400">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input value={form.displayName} onChange={update('displayName')} placeholder="Display name" className="input-field" required />
          <input value={form.username} onChange={update('username')} placeholder="Username" className="input-field" required
            pattern="[a-zA-Z0-9_]{3,30}" title="3-30 alphanumeric characters and underscores" />
          <input type="email" value={form.email} onChange={update('email')} placeholder="Email" className="input-field" required />
          <input type="password" value={form.password} onChange={update('password')} placeholder="Password (8+ characters)" className="input-field" required minLength={8} />

          <button type="submit" disabled={isLoading} className="btn-primary w-full py-3 text-base disabled:opacity-60">
            {isLoading ? 'Creating account...' : 'Sign up'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link to="/login" className="text-gray-400 text-sm hover:text-white">
            Already have an account? <span className="text-primary font-semibold">Log in</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
