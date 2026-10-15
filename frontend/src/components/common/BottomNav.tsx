// src/components/common/BottomNav.tsx
import { Link, useLocation } from 'react-router-dom';
import { FaHome, FaPlus, FaUserFriends, FaUser } from 'react-icons/fa';
import { HiOutlineInbox } from 'react-icons/hi';
import { useAuthStore } from '../../context/AuthContext';

export default function BottomNav() {
  const location = useLocation();
  const { user, isAuthenticated } = useAuthStore();
  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="safe-bottom bg-black/95 backdrop-blur border-t border-white/10 flex items-center justify-around px-1 pt-1 pb-2">
      {/* Home */}
      <Link to="/" className={`flex flex-col items-center gap-0.5 px-4 py-1 ${isActive('/') ? 'text-white' : 'text-gray-500'}`}>
        <FaHome className="text-[22px]" />
        <span className="text-[10px] font-medium">Home</span>
      </Link>

      {/* Friends */}
      <Link to="/explore" className={`flex flex-col items-center gap-0.5 px-4 py-1 ${isActive('/explore') ? 'text-white' : 'text-gray-500'}`}>
        <FaUserFriends className="text-[22px]" />
        <span className="text-[10px] font-medium">Friends</span>
      </Link>

      {/* Upload — TikTok-style center button */}
      <Link to="/upload" className="flex flex-col items-center px-1 -mt-1">
        <div className="relative h-[34px] w-[48px] flex items-center justify-center">
          {/* Teal left pill */}
          <div className="absolute left-0 top-0 h-full w-[38px] rounded-l-md bg-[#69C9D0]" />
          {/* Red right pill */}
          <div className="absolute right-0 top-0 h-full w-[38px] rounded-r-md bg-[#EE1D52]" />
          {/* White center */}
          <div className="relative z-10 bg-white h-full w-[36px] rounded-[6px] flex items-center justify-center shadow-md">
            <FaPlus className="text-black text-[16px]" />
          </div>
        </div>
      </Link>

      {/* Inbox */}
      <Link to="/notifications" className={`flex flex-col items-center gap-0.5 px-4 py-1 ${isActive('/notifications') ? 'text-white' : 'text-gray-500'}`}>
        <div className="relative">
          <HiOutlineInbox className="text-[22px]" />
        </div>
        <span className="text-[10px] font-medium">Inbox</span>
      </Link>

      {/* Profile */}
      <Link
        to={isAuthenticated ? `/profile/${user?.username}` : '/login'}
        className={`flex flex-col items-center gap-0.5 px-4 py-1 ${location.pathname.startsWith('/profile') ? 'text-white' : 'text-gray-500'}`}
      >
        {isAuthenticated && user?.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="w-[22px] h-[22px] rounded-full object-cover border border-gray-400" />
        ) : (
          <FaUser className="text-[22px]" />
        )}
        <span className="text-[10px] font-medium">Profile</span>
      </Link>
    </div>
  );
}
