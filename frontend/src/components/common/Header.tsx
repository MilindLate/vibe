// src/components/common/Header.tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaSearch, FaBell } from 'react-icons/fa';
import { useAuthStore } from '../../context/AuthContext';

export default function Header() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) navigate(`/explore?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <header className="flex items-center justify-between px-4 py-2 border-b border-vibe-border bg-black/95 backdrop-blur z-30 h-14 flex-shrink-0">
      {/* Logo (mobile only) */}
      <Link to="/" className="md:hidden text-xl font-black text-primary">Vibe</Link>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex-1 max-w-md mx-auto md:mx-0">
        <div className="relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="w-full bg-vibe-card border border-vibe-border rounded-full py-2 pl-4 pr-10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/30"
          />
          <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
            <FaSearch />
          </button>
        </div>
      </form>

      {/* Right side */}
      <div className="flex items-center gap-3 ml-4">
        {isAuthenticated ? (
          <>
            <Link to="/notifications" className="text-gray-400 hover:text-white relative">
              <FaBell className="text-xl" />
            </Link>
            <Link to={`/profile/${user?.username}`}>
              <img
                src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.displayName}&background=FE2C55&color=fff`}
                alt=""
                className="w-8 h-8 rounded-full object-cover"
              />
            </Link>
          </>
        ) : (
          <Link to="/login" className="btn-primary text-sm py-1.5 px-4">Log in</Link>
        )}
      </div>
    </header>
  );
}
