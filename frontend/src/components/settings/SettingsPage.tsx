import { useState, useEffect } from 'react';
import { useAuthStore } from '../../context/AuthContext';
import { userApi } from '../../services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setBio(user.bio || '');
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await userApi.updateProfile({ displayName, bio });
      setUser(res.data.data);
      toast.success('Profile updated successfully!');
      navigate(`/profile/${user?.username}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-black text-white p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Edit Profile</h1>
        <form onSubmit={handleSubmit} className="space-y-6 bg-vibe-card p-6 rounded-lg border border-vibe-border">
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-black border border-vibe-border rounded p-3 text-white focus:border-primary focus:outline-none"
              placeholder="Your name"
              maxLength={50}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-black border border-vibe-border rounded p-3 text-white focus:border-primary focus:outline-none h-32"
              placeholder="Tell us about yourself"
              maxLength={150}
            />
            <p className="text-xs text-gray-500 text-right mt-1">{bio.length}/150</p>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate(`/profile/${user?.username}`)}
              className="btn-outline flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex-1"
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
