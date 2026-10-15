// src/components/common/Sidebar.tsx
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { socialApi } from '../../services/api';
import {
  FaHome, FaUserFriends, FaCompass, FaPlus,
  FaEnvelope, FaBell, FaUser, FaSignOutAlt,
} from 'react-icons/fa';
import { MdLiveTv } from 'react-icons/md';

const navItems = [
  { icon: FaHome,         label: 'For You',    path: '/' },
  { icon: FaUserFriends,  label: 'Following',  path: '/following', auth: true },
  { icon: FaCompass,      label: 'Explore',    path: '/explore' },
  { icon: FaEnvelope,     label: 'Messages',   path: '/messages', auth: true },
  { icon: FaBell,         label: 'Inbox',      path: '/notifications', auth: true },
  { icon: MdLiveTv,       label: 'LIVE',       path: '/live' },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();

  const { data: suggested } = useQuery({
    queryKey: ['suggested-users'],
    queryFn: () => socialApi.getSuggestedUsers().then((r) => r.data.data?.slice(0, 3) ?? []),
    enabled: isAuthenticated,
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-full py-4 px-3 bg-black overflow-y-auto">
      {/* Logo */}
      <Link to="/" className="mb-6 px-2">
        <span className="text-2xl font-black text-primary tracking-tight">Vibe</span>
      </Link>

      {/* Nav */}
      <nav className="space-y-0.5">
        {navItems.map(({ icon: Icon, label, path, auth }) => {
          if (auth && !isAuthenticated) return null;
          const active = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-4 px-3 py-[10px] rounded-lg transition-colors ${
                active ? 'font-bold text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className={`text-[22px] flex-shrink-0 ${active ? 'text-white' : ''}`} />
              <span className="text-[15px] font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Upload CTA */}
      {isAuthenticated && (
        <Link
          to="/upload"
          className="mt-4 mx-2 flex items-center justify-center gap-2 bg-primary text-white font-bold py-2.5 rounded-sm hover:bg-primary-hover transition-colors"
        >
          <FaPlus />
          <span>Upload</span>
        </Link>
      )}

      {/* Divider */}
      <div className="my-4 border-t border-vibe-border" />

      {/* Suggested accounts */}
      {isAuthenticated && suggested && suggested.length > 0 && (
        <div className="px-2 mb-4">
          <p className="text-gray-500 text-xs font-semibold uppercase mb-2 tracking-wide">Suggested</p>
          {suggested.map((su: any) => (
            <Link
              key={su.id}
              to={`/profile/${su.username}`}
              className="flex items-center gap-2 py-2 hover:bg-white/5 rounded-lg px-1 group"
            >
              <img
                src={su.avatarUrl || `https://ui-avatars.com/api/?name=${su.displayName}&background=FE2C55&color=fff&size=64`}
                alt={su.username}
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate">{su.username}</p>
                <p className="text-gray-500 text-xs truncate">{su.displayName}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Bottom user section */}
      <div className="mt-auto">
        {isAuthenticated ? (
          <div className="space-y-1">
            <Link
              to={`/profile/${user?.username}`}
              className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <img
                src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.displayName}&background=FE2C55&color=fff`}
                alt={user?.username}
                className="w-8 h-8 rounded-full object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate">{user?.displayName}</p>
                <p className="text-gray-500 text-xs truncate">@{user?.username}</p>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-2 py-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors w-full"
            >
              <FaSignOutAlt className="text-lg" />
              <span className="text-sm">Log out</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2 px-2">
            <p className="text-gray-400 text-sm mb-3">Log in to follow creators, like videos, and view comments.</p>
            <Link to="/login" className="btn-primary w-full flex items-center justify-center text-sm">
              Log in
            </Link>
            <Link to="/register" className="btn-outline w-full flex items-center justify-center text-sm">
              Sign up
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
