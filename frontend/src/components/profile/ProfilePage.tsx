// src/components/profile/ProfilePage.tsx
import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi, socialApi, videoApi } from '../../services/api';
import { useAuthStore } from '../../context/AuthContext';
import { formatCount } from '../../utils/formatters';
import { Loading } from '../common/Loading';
import {
  FaPlay, FaHeart, FaArrowLeft, FaBell, FaShare,
  FaEllipsisV, FaRegBookmark, FaTh,
} from 'react-icons/fa';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [activeTab, setActiveTab] = useState<'videos' | 'liked'>('videos');
  const { user: currentUser, isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', username],
    queryFn: () => userApi.getProfile(username!).then((r) => r.data.data),
    enabled: !!username,
  });

  const { data: videosData } = useQuery({
    queryKey: ['user-videos', profile?.id],
    queryFn: () => videoApi.getUserVideos(profile!.id).then((r) => r.data.data),
    enabled: !!profile?.id,
  });

  const followMutation = useMutation({
    mutationFn: () =>
      profile?.isFollowing
        ? socialApi.unfollow(profile.id)
        : socialApi.follow(profile!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', username] });
      toast.success(profile?.isFollowing ? 'Unfollowed' : 'Now following!');
    },
    onError: () => toast.error('Action failed'),
  });

  const isOwnProfile = currentUser?.username === username;

  if (profileLoading) return <Loading fullScreen />;
  if (!profile)
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        <p>User not found</p>
      </div>
    );

  const videos = videosData?.videos || [];

  return (
    <div className="h-full overflow-y-auto bg-black">
      {/* ─── TOP BAR ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button onClick={() => navigate(-1)} className="text-white">
          <FaArrowLeft className="text-xl" />
        </button>
        <h2 className="text-white font-bold text-base">@{profile.username}</h2>
        <div className="flex gap-4 text-white">
          <FaShare className="text-xl cursor-pointer" onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied!'); }} />
          <FaEllipsisV className="text-xl cursor-pointer" />
        </div>
      </div>

      {/* ─── AVATAR + NAME ───────────────────────────────────────── */}
      <div className="flex flex-col items-center px-4 pb-4">
        {/* Avatar with verified ring */}
        <div className={`p-0.5 rounded-full mb-3 ${profile.isVerified ? 'bg-gradient-to-br from-cyan-400 to-primary' : ''}`}>
          <div className="p-0.5 bg-black rounded-full">
            <img
              src={profile.avatarUrl || `https://ui-avatars.com/api/?name=${profile.displayName}&size=200&background=FE2C55&color=fff`}
              alt={profile.username}
              className="w-24 h-24 rounded-full object-cover"
            />
          </div>
        </div>

        {/* Display name */}
        <h1 className="text-white text-xl font-bold mb-0.5">{profile.displayName}</h1>
        <p className="text-gray-400 text-sm mb-3">@{profile.username}</p>

        {/* Stats row */}
        <div className="flex gap-7 mb-4">
          <div className="text-center">
            <p className="text-white font-bold text-base">{formatCount(profile.followingCount)}</p>
            <p className="text-gray-400 text-xs">Following</p>
          </div>
          <div className="text-center">
            <p className="text-white font-bold text-base">{formatCount(profile.followersCount)}</p>
            <p className="text-gray-400 text-xs">Followers</p>
          </div>
          <div className="text-center">
            <p className="text-white font-bold text-base">{formatCount(profile.likesCount)}</p>
            <p className="text-gray-400 text-xs">Likes</p>
          </div>
        </div>

        {/* Action buttons */}
        {isAuthenticated && !isOwnProfile ? (
          <div className="flex gap-2 w-full max-w-xs">
            <button
              onClick={() => followMutation.mutate()}
              disabled={followMutation.isPending}
              className={`flex-1 py-2 rounded-sm font-semibold text-sm transition-all ${
                profile.isFollowing
                  ? 'border border-gray-600 text-white hover:bg-white/5'
                  : 'bg-primary text-white hover:bg-primary-hover'
              }`}
            >
              {profile.isFollowing ? 'Following' : 'Follow'}
            </button>
            <Link
              to={`/messages`}
              className="flex-1 py-2 border border-gray-600 text-white rounded-sm font-semibold text-sm text-center hover:bg-white/5"
            >
              Message
            </Link>
            <button className="px-3 py-2 border border-gray-600 text-white rounded-sm hover:bg-white/5">
              <FaEllipsisV className="text-sm" />
            </button>
          </div>
        ) : isOwnProfile ? (
          <div className="flex gap-2 w-full max-w-xs">
            <Link
              to="/settings"
              className="flex-1 py-2 border border-gray-600 text-white rounded-sm font-semibold text-sm text-center hover:bg-white/5"
            >
              Edit Profile
            </Link>
            <button className="px-3 py-2 border border-gray-600 text-white rounded-sm hover:bg-white/5">
              <FaRegBookmark className="text-sm" />
            </button>
          </div>
        ) : null}

        {/* Bio */}
        {profile.bio && (
          <p className="text-white text-sm mt-3 text-center max-w-xs leading-snug">{profile.bio}</p>
        )}
      </div>

      {/* ─── TAB BAR ─────────────────────────────────────────────── */}
      <div className="flex border-b border-vibe-border">
        <button
          onClick={() => setActiveTab('videos')}
          className={`flex-1 flex items-center justify-center py-3 transition-colors ${
            activeTab === 'videos'
              ? 'text-white border-b-2 border-white'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <FaTh className="text-base" />
        </button>
        <button
          onClick={() => setActiveTab('liked')}
          className={`flex-1 flex items-center justify-center py-3 transition-colors ${
            activeTab === 'liked'
              ? 'text-white border-b-2 border-white'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <FaHeart className="text-base" />
        </button>
      </div>

      {/* ─── VIDEO GRID ──────────────────────────────────────────── */}
      {videos.length === 0 ? (
        <div className="py-24 text-center text-gray-500">
          <FaPlay className="text-4xl mx-auto mb-3 opacity-30" />
          <p>{activeTab === 'videos' ? 'No videos yet' : 'No liked videos'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-[1px] bg-vibe-border">
          {videos.map((video: any) => (
            <Link
              key={video.id}
              to="/"
              state={{ videoId: video.id }}
              className="relative bg-black overflow-hidden"
              style={{ aspectRatio: '9/16' }}
            >
              {video.thumbnailUrl ? (
                <img
                  src={video.thumbnailUrl}
                  alt={video.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-vibe-card flex items-center justify-center">
                  <FaPlay className="text-gray-600 text-2xl" />
                </div>
              )}
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                <FaPlay className="text-white text-2xl" />
              </div>
              {/* View count */}
              <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 text-white text-xs drop-shadow">
                <FaPlay className="text-[10px]" />
                <span>{formatCount(video.viewsCount)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
