// src/components/feed/VideoCard.tsx
import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaHeart, FaRegHeart, FaComment, FaShare, FaMusic,
  FaVolumeMute, FaVolumeUp, FaBookmark, FaRegBookmark,
  FaTimes, FaPaperPlane, FaPlay,
} from 'react-icons/fa';
import { videoApi, socialApi } from '../../services/api';
import { useAuthStore } from '../../context/AuthContext';
import { formatCount } from '../../utils/formatters';
import toast from 'react-hot-toast';

interface Video {
  id: string;
  videoUrl: string;
  thumbnailUrl?: string;
  title: string;
  description?: string;
  hashtags: string[];
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    isVerified?: boolean;
  };
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
  const lastTapRef = useRef(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false); // hide play icon until first play attempt
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
  const [videoError, setVideoError] = useState(false);

  const { isAuthenticated, user } = useAuthStore();

  // ── InView: threshold 0.5 so video plays when half-visible ──────────────────
  const { ref: containerRef, inView } = useInView({ threshold: 0.5 });

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (inView) {
      setHasStarted(true);
      el.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else {
      el.pause();
      el.currentTime = 0;
      setIsPlaying(false);
    }
  }, [inView]);

  // ── Play / Pause toggle ──────────────────────────────────────────────────────
  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      el.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // ── Double tap ───────────────────────────────────────────────────────────────
  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    const diff = now - lastTapRef.current;
    lastTapRef.current = now;

    if (diff < 300) {
      // Double tap → like + heart burst
      const rect = e.currentTarget.getBoundingClientRect();
      setHeartPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 900);
      if (!isLiked) handleLike();
    } else {
      // Single tap → play/pause (debounced)
      setTimeout(() => {
        if (Date.now() - lastTapRef.current >= 290) togglePlay();
      }, 310);
    }
  };

  // ── Like / Unlike ────────────────────────────────────────────────────────────
  const handleLike = async () => {
    if (!isAuthenticated) { toast.error('Log in to like videos'); return; }
    const prev = isLiked;
    setIsLiked(!prev);
    setLikeCount(c => prev ? c - 1 : c + 1);
    try {
      await (prev ? videoApi.unlikeVideo(video.id) : videoApi.likeVideo(video.id));
    } catch {
      setIsLiked(prev);
      setLikeCount(c => prev ? c + 1 : c - 1);
    }
  };

  // ── Share ────────────────────────────────────────────────────────────────────
  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try { await socialApi.shareVideo(video.id); } catch { /* silent */ }
    try {
      if (navigator.share) {
        await navigator.share({ title: video.title, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied!');
      }
    } catch { /* user cancelled */ }
  };

  // ── Comments ─────────────────────────────────────────────────────────────────
  const openComments = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowComments(true);
    if (comments.length === 0) {
      setCommentsLoading(true);
      try {
        const res = await socialApi.getComments(video.id);
        // API: { success, data: { data: { comments: [...] } } } OR { data: { comments: [] } }
        const raw = res.data?.data;
        setComments(raw?.comments ?? raw ?? []);
      } catch { /* silent */ }
      setCommentsLoading(false);
    }
  };

  const postComment = async () => {
    if (!isAuthenticated) { toast.error('Log in to comment'); return; }
    if (!commentText.trim()) return;
    try {
      const res = await socialApi.addComment(video.id, commentText.trim());
      const newComment = res.data?.data;
      if (newComment) setComments(prev => [newComment, ...prev]);
      setCommentText('');
      setCommentCount(c => c + 1);
    } catch { toast.error('Failed to post'); }
  };

  const descText = video.description || video.title || '';
  const shouldTruncate = descText.length > 90;
  const musicName = video.music
    ? `${video.music.title} — ${video.music.artist}`
    : 'Original Sound';

  const avatarFallback = (name: string) =>
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=FE2C55&color=fff&size=96`;

  return (
    <div
      className="video-card relative bg-black select-none"
      style={{ height: '100dvh', scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
    >
      {/* ─── VIDEO + tap zone ─────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="absolute inset-0 cursor-pointer"
        onClick={handleTap}
      >
        {videoError ? (
          /* Thumbnail fallback when video can't load */
          <div className="w-full h-full bg-vibe-card flex items-center justify-center">
            {video.thumbnailUrl
              ? <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
              : <FaPlay className="text-gray-600 text-5xl" />}
          </div>
        ) : (
          <video
            ref={videoRef}
            src={video.videoUrl}
            poster={video.thumbnailUrl || undefined}
            className="absolute inset-0 w-full h-full object-cover"
            loop
            muted={isMuted}
            playsInline
            preload="metadata"
            onError={() => setVideoError(true)}
            onPlay={() => { setIsPlaying(true); setHasStarted(true); }}
            onPause={() => setIsPlaying(false)}
          />
        )}
        {/* Bottom gradient overlay */}
        <div className="video-gradient absolute inset-0 pointer-events-none" />
      </div>

      {/* ─── Pause indicator ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {hasStarted && !isPlaying && !videoError && (
          <motion.div
            key="pause-icon"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
          >
            <div className="bg-black/50 rounded-full p-5">
              <FaPlay className="text-white text-3xl ml-1" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Double-tap heart burst ───────────────────────────────────────── */}
      <AnimatePresence>
        {showHeart && (
          <motion.div
            key="heart-burst"
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 2.5, opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="absolute pointer-events-none z-30 text-primary text-6xl"
            style={{ left: heartPos.x - 30, top: heartPos.y - 30 }}
          >
            <FaHeart />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Mute button ──────────────────────────────────────────────────── */}
      <button
        onClick={toggleMute}
        className="absolute top-4 right-4 bg-black/50 rounded-full p-2.5 z-20"
        aria-label="Toggle mute"
      >
        {isMuted
          ? <FaVolumeMute className="text-white text-base" />
          : <FaVolumeUp className="text-white text-base" />}
      </button>

      {/* ─── Right action bar ─────────────────────────────────────────────── */}
      <div className="absolute right-3 bottom-24 md:bottom-8 flex flex-col items-center gap-5 z-20">

        {/* Avatar + follow badge */}
        <Link
          to={`/profile/${video.user.username}`}
          onClick={e => e.stopPropagation()}
          className="relative flex-shrink-0"
        >
          <img
            src={video.user.avatarUrl || avatarFallback(video.user.displayName)}
            alt={video.user.username}
            className="w-12 h-12 rounded-full border-2 border-white object-cover"
          />
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary rounded-full w-5 h-5 flex items-center justify-center text-white text-xs font-bold shadow">
            +
          </div>
        </Link>

        {/* Like */}
        <button
          onClick={e => { e.stopPropagation(); handleLike(); }}
          className="flex flex-col items-center gap-0.5"
          aria-label="Like"
        >
          <motion.div whileTap={{ scale: 1.4 }}>
            {isLiked
              ? <FaHeart className="text-primary text-[32px] drop-shadow-lg" />
              : <FaRegHeart className="text-white text-[32px] drop-shadow-lg" />}
          </motion.div>
          <span className="text-white text-xs font-semibold drop-shadow">{formatCount(likeCount)}</span>
        </button>

        {/* Comment */}
        <button
          onClick={openComments}
          className="flex flex-col items-center gap-0.5"
          aria-label="Comment"
        >
          <FaComment className="text-white text-[32px] drop-shadow-lg" />
          <span className="text-white text-xs font-semibold drop-shadow">{formatCount(commentCount)}</span>
        </button>

        {/* Bookmark */}
        <button
          onClick={e => { e.stopPropagation(); setIsSaved(s => !s); toast.success(isSaved ? 'Removed' : 'Saved!'); }}
          className="flex flex-col items-center gap-0.5"
          aria-label="Bookmark"
        >
          {isSaved
            ? <FaBookmark className="text-white text-[28px] drop-shadow-lg" />
            : <FaRegBookmark className="text-white text-[28px] drop-shadow-lg" />}
          <span className="text-white text-xs font-semibold drop-shadow">{formatCount(video.sharesCount)}</span>
        </button>

        {/* Share */}
        <button
          onClick={handleShare}
          className="flex flex-col items-center gap-0.5"
          aria-label="Share"
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

      {/* ─── Bottom info bar ──────────────────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-16 px-4 pb-24 md:pb-8 z-20 pointer-events-none">
        {/* Username */}
        <Link
          to={`/profile/${video.user.username}`}
          className="flex items-center gap-1.5 mb-1.5 pointer-events-auto w-fit"
          onClick={e => e.stopPropagation()}
        >
          <span className="text-white font-bold text-[15px] drop-shadow">@{video.user.username}</span>
          {video.user.isVerified && (
            <span className="bg-blue-500 rounded-full w-4 h-4 flex items-center justify-center text-white text-[9px] flex-shrink-0">✓</span>
          )}
        </Link>

        {/* Description */}
        {descText && (
          <div className="text-white text-sm drop-shadow mb-2 leading-snug pointer-events-auto">
            {shouldTruncate && !isExpanded ? (
              <>
                <span>{descText.slice(0, 90)}</span>
                <button
                  className="text-gray-300 ml-1 font-semibold"
                  onClick={e => { e.stopPropagation(); setIsExpanded(true); }}
                >
                  …more
                </button>
              </>
            ) : (
              <span>{descText}</span>
            )}
          </div>
        )}

        {/* Hashtags */}
        {video.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2 pointer-events-auto">
            {video.hashtags.slice(0, 5).map(tag => (
              <Link
                key={tag}
                to={`/explore?q=${encodeURIComponent(tag)}`}
                className="text-white font-bold text-sm hover:underline"
                onClick={e => e.stopPropagation()}
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}

        {/* Music ticker */}
        <div className="flex items-center gap-2 text-white text-xs overflow-hidden">
          <FaMusic className="text-[10px] flex-shrink-0" />
          <div className="overflow-hidden relative w-40">
            <span className="inline-block whitespace-nowrap animate-marquee">{musicName}&nbsp;&nbsp;&nbsp;{musicName}</span>
          </div>
        </div>
      </div>

      {/* ─── Comment sheet ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showComments && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 z-30"
              onClick={() => setShowComments(false)}
            />
            {/* Sheet */}
            <motion.div
              key="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
              className="absolute inset-x-0 bottom-0 bg-vibe-card rounded-t-2xl z-40 flex flex-col"
              style={{ height: '72%' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Handle */}
              <div className="flex justify-center pt-2 pb-1">
                <div className="w-10 h-1 rounded-full bg-gray-600" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-vibe-border">
                <h3 className="text-white font-semibold">
                  {formatCount(commentCount)} Comments
                </h3>
                <button onClick={() => setShowComments(false)} className="p-1">
                  <FaTimes className="text-gray-400 text-lg" />
                </button>
              </div>

              {/* Comment list */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                {commentsLoading ? (
                  <p className="text-gray-500 text-sm text-center mt-10">Loading…</p>
                ) : comments.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center mt-10">
                    No comments yet. Be the first!
                  </p>
                ) : (
                  comments.map(c => (
                    <div key={c.id} className="flex items-start gap-3">
                      <img
                        src={c.user.avatarUrl || avatarFallback(c.user.displayName)}
                        alt={c.user.username}
                        className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm">
                          <span className="font-semibold mr-1.5">@{c.user.username}</span>
                          {c.content}
                        </p>
                        <p className="text-gray-500 text-xs mt-0.5">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button className="flex-shrink-0 flex flex-col items-center gap-0.5 mt-1">
                        <FaRegHeart className="text-gray-400 text-sm" />
                        <span className="text-gray-500 text-[10px]">{c.likesCount ?? 0}</span>
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t border-vibe-border flex items-center gap-3 safe-bottom">
                <img
                  src={user?.avatarUrl || avatarFallback(user?.displayName || 'U')}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
                <input
                  type="text"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') postComment(); }}
                  placeholder={isAuthenticated ? 'Add a comment…' : 'Log in to comment'}
                  disabled={!isAuthenticated}
                  className="flex-1 bg-white/10 text-white text-sm px-3 py-2 rounded-full placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-white/30 disabled:opacity-50"
                />
                <button
                  onClick={postComment}
                  disabled={!commentText.trim() || !isAuthenticated}
                  className="disabled:opacity-40"
                >
                  <FaPaperPlane className={`text-lg ${commentText.trim() ? 'text-primary' : 'text-gray-600'}`} />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
