// src/components/feed/VideoCard.tsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaHeart, FaRegHeart, FaComment, FaShare, FaMusic,
  FaVolumeMute, FaVolumeUp, FaBookmark, FaRegBookmark, FaTimes, FaPaperPlane,
} from 'react-icons/fa';
import { videoApi, socialApi } from '../../services/api';
import { useAuthStore } from '../../context/AuthContext';
import { formatCount } from '../../utils/formatters';
import toast from 'react-hot-toast';

function formatNum(n: number) {
  return formatCount(n);
}

interface Video {
  id: string;
  videoUrl: string;
  thumbnailUrl?: string;
  title: string;
  description?: string;
  hashtags: string[];
  user: { id: string; username: string; displayName: string; avatarUrl?: string; isVerified?: boolean };
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
  isLiked?: boolean;
  music?: { title: string; artist: string };
}

interface Comment {
  id: string;
  content: string;
  user: { username: string; avatarUrl?: string; displayName: string };
  createdAt: string;
  likesCount?: number;
}

export default function VideoCard({ video }: { video: Video }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isLiked, setIsLiked] = useState(video.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(video.likesCount ?? 0);
  const [isSaved, setIsSaved] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [heartPos, setHeartPos] = useState({ x: 0, y: 0 });
  const [isExpanded, setIsExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentCount, setCommentCount] = useState(video.commentsCount ?? 0);
  const lastTapRef = useRef(0);
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();

  // InView — auto play/pause
  const { ref: inViewRef, inView } = useInView({ threshold: 0.6 });
  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      (videoRef as any).containerRef = node;
      inViewRef(node);
    },
    [inViewRef]
  );

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (inView) {
      el.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      el.pause();
      setIsPlaying(false);
    }
  }, [inView]);

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (isPlaying) { el.pause(); setIsPlaying(false); }
    else { el.play().then(() => setIsPlaying(true)).catch(() => {}); }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // Double-tap detection
  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setHeartPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 800);
      if (!isLiked) handleLike();
    } else {
      // Single tap — toggle play (delayed to distinguish from double tap)
      setTimeout(() => {
        if (Date.now() - lastTapRef.current >= 290) togglePlay();
      }, 300);
    }
    lastTapRef.current = now;
  };

  const handleLike = async () => {
    if (!isAuthenticated) { toast.error('Log in to like videos'); return; }
    const prev = isLiked;
    setIsLiked(!prev);
    setLikeCount((c) => (prev ? c - 1 : c + 1));
    try {
      if (prev) await videoApi.unlikeVideo(video.id);
      else await videoApi.likeVideo(video.id);
    } catch {
      setIsLiked(prev);
      setLikeCount((c) => (prev ? c + 1 : c - 1));
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await socialApi.shareVideo(video.id);
    if (navigator.share) {
      navigator.share({ title: video.title, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied!');
    }
  };

  const openComments = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowComments(true);
    if (comments.length === 0) {
      setCommentsLoading(true);
      try {
        const res = await socialApi.getComments(video.id);
        setComments(res.data.data?.comments ?? []);
      } catch { /* silent */ }
      setCommentsLoading(false);
    }
  };

  const postComment = async () => {
    if (!isAuthenticated) { toast.error('Log in to comment'); return; }
    if (!commentText.trim()) return;
    try {
      const res = await socialApi.addComment(video.id, commentText);
      setComments((prev) => [res.data.data, ...prev]);
      setCommentText('');
      setCommentCount((c) => c + 1);
    } catch { toast.error('Failed to post comment'); }
  };

  const descText = video.description || video.title;
  const shouldTruncate = descText.length > 90;
  const musicName = video.music ? `${video.music.title} — ${video.music.artist}` : 'Original Sound';

  return (
    <div
      className="video-card relative overflow-hidden bg-black"
      style={{ height: '100dvh', scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
    >
      {/* ─── VIDEO ─────────────────────────────────────────────── */}
      <div ref={inViewRef as any} className="absolute inset-0" onClick={handleTap}>
        <video
          ref={videoRef}
          src={video.videoUrl}
          poster={video.thumbnailUrl}
          className="absolute inset-0 w-full h-full object-cover"
          loop
          muted={isMuted}
          playsInline
          preload="metadata"
        />
        {/* Gradient overlay */}
        <div className="video-gradient absolute inset-0 pointer-events-none" />
      </div>

      {/* Play indicator */}
      <AnimatePresence>
        {!isPlaying && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
          >
            <div className="bg-black/40 rounded-full p-5">
              <svg className="w-9 h-9 text-white fill-current" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Double-tap heart burst */}
      <AnimatePresence>
        {showHeart && (
          <motion.div
            key="burst"
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.7 }}
            className="absolute pointer-events-none z-20 text-primary text-6xl"
            style={{ left: heartPos.x - 30, top: heartPos.y - 30 }}
          >
            <FaHeart />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── MUTE BUTTON ───────────────────────────────────────── */}
      <button
        onClick={toggleMute}
        className="absolute top-14 right-3 bg-black/50 rounded-full p-2 z-20"
      >
        {isMuted
          ? <FaVolumeMute className="text-white text-base" />
          : <FaVolumeUp className="text-white text-base" />}
      </button>

      {/* ─── RIGHT ACTION BAR ─────────────────────────────────── */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5 z-20">
        {/* Avatar + follow */}
        <Link
          to={`/profile/${video.user.username}`}
          onClick={(e) => e.stopPropagation()}
          className="relative"
        >
          <img
            src={video.user.avatarUrl || `https://ui-avatars.com/api/?name=${video.user.displayName}&background=FE2C55&color=fff&size=96`}
            alt={video.user.username}
            className="w-[48px] h-[48px] rounded-full border-2 border-white object-cover"
          />
          {/* + badge */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary rounded-full w-5 h-5 flex items-center justify-center text-white text-xs font-bold shadow-md">
            +
          </div>
        </Link>

        {/* Like */}
        <button
          onClick={(e) => { e.stopPropagation(); handleLike(); }}
          className="flex flex-col items-center gap-1"
        >
          <motion.div whileTap={{ scale: 1.35 }}>
            {isLiked
              ? <FaHeart className="text-primary text-[32px] drop-shadow-lg" />
              : <FaRegHeart className="text-white text-[32px] drop-shadow-lg" />}
          </motion.div>
          <span className="text-white text-xs font-semibold drop-shadow">{formatNum(likeCount)}</span>
        </button>

        {/* Comments */}
        <button
          onClick={openComments}
          className="flex flex-col items-center gap-1"
        >
          <FaComment className="text-white text-[32px] drop-shadow-lg" />
          <span className="text-white text-xs font-semibold drop-shadow">{formatNum(commentCount)}</span>
        </button>

        {/* Bookmark */}
        <button
          onClick={(e) => { e.stopPropagation(); setIsSaved(!isSaved); toast.success(isSaved ? 'Removed' : 'Saved!'); }}
          className="flex flex-col items-center gap-1"
        >
          {isSaved
            ? <FaBookmark className="text-white text-[28px] drop-shadow-lg" />
            : <FaRegBookmark className="text-white text-[28px] drop-shadow-lg" />}
          <span className="text-white text-xs font-semibold drop-shadow">{formatNum(video.sharesCount)}</span>
        </button>

        {/* Share */}
        <button
          onClick={handleShare}
          className="flex flex-col items-center gap-1"
        >
          <FaShare className="text-white text-[28px] drop-shadow-lg" />
          <span className="text-white text-xs font-semibold drop-shadow">Share</span>
        </button>

        {/* Spinning music disc */}
        <div className={`w-10 h-10 rounded-full border-[3px] border-gray-600 bg-gray-900 flex items-center justify-center music-disc ${isPlaying ? '' : 'paused'}`}>
          <div className="w-3 h-3 rounded-full bg-gray-600 flex items-center justify-center">
            <FaMusic className="text-white text-[7px]" />
          </div>
        </div>
      </div>

      {/* ─── BOTTOM INFO ──────────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-16 px-3 pb-4 z-20">
        {/* Username */}
        <Link
          to={`/profile/${video.user.username}`}
          className="flex items-center gap-1.5 mb-1"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-white font-bold text-[15px] drop-shadow">@{video.user.username}</span>
          {video.user.isVerified && (
            <span className="bg-blue-500 rounded-full w-4 h-4 flex items-center justify-center text-white text-[9px]">✓</span>
          )}
        </Link>

        {/* Description */}
        <div className="text-white text-sm drop-shadow mb-1.5 leading-snug">
          {shouldTruncate && !isExpanded ? (
            <>
              <span>{descText.slice(0, 90)}</span>
              <button
                className="text-gray-300 ml-1 font-semibold"
                onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
              >
                ...more
              </button>
            </>
          ) : (
            <span>{descText}</span>
          )}
        </div>

        {/* Hashtags */}
        <div className="flex flex-wrap gap-1 mb-2">
          {video.hashtags.slice(0, 5).map((tag) => (
            <Link
              key={tag}
              to={`/explore?q=${encodeURIComponent(tag)}`}
              className="text-white font-bold text-sm hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              #{tag}
            </Link>
          ))}
        </div>

        {/* Music ticker */}
        <div className="flex items-center gap-2 text-white text-xs overflow-hidden">
          <FaMusic className="text-[10px] flex-shrink-0" />
          <div className="overflow-hidden whitespace-nowrap">
            <span className="inline-block animate-[marquee_8s_linear_infinite]">{musicName}</span>
          </div>
        </div>
      </div>

      {/* ─── COMMENT SHEET ──────────────────────────────────────── */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="absolute inset-x-0 bottom-0 bg-vibe-card rounded-t-2xl z-30 flex flex-col"
            style={{ height: '70%' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-vibe-border">
              <h3 className="text-white font-semibold text-base">{formatNum(commentCount)} Comments</h3>
              <button onClick={() => setShowComments(false)}>
                <FaTimes className="text-gray-400 text-lg" />
              </button>
            </div>

            {/* Comment list */}
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
              {commentsLoading ? (
                <p className="text-gray-500 text-sm text-center mt-8">Loading comments…</p>
              ) : comments.length === 0 ? (
                <p className="text-gray-500 text-sm text-center mt-8">No comments yet. Be first!</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="flex items-start gap-3">
                    <img
                      src={c.user.avatarUrl || `https://ui-avatars.com/api/?name=${c.user.displayName}&background=555&color=fff&size=64`}
                      alt={c.user.username}
                      className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                    />
                    <div className="flex-1">
                      <span className="text-white text-sm font-semibold mr-2">@{c.user.username}</span>
                      <span className="text-white text-sm">{c.content}</span>
                    </div>
                    <button className="flex flex-col items-center gap-0.5">
                      <FaRegHeart className="text-gray-400 text-sm" />
                      <span className="text-gray-500 text-[10px]">{c.likesCount ?? 0}</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Comment input */}
            <div className="px-4 py-3 border-t border-vibe-border flex items-center gap-3">
              <img
                src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.displayName || 'U'}&background=FE2C55&color=fff&size=64`}
                alt=""
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') postComment(); }}
                placeholder="Add a comment..."
                className="flex-1 bg-white/10 text-white text-sm px-3 py-2 rounded-full placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-white/30"
              />
              <button onClick={postComment} disabled={!commentText.trim()}>
                <FaPaperPlane className={`text-lg ${commentText.trim() ? 'text-primary' : 'text-gray-600'}`} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
