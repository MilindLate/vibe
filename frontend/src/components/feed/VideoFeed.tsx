// src/components/feed/VideoFeed.tsx
import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import { useInfiniteQuery } from '@tanstack/react-query';
import { feedApi } from '../../services/api';
import VideoCard from './VideoCard';
import { Loading } from '../common/Loading';
import { FaSearch } from 'react-icons/fa';

interface VideoFeedProps {
  type: 'foryou' | 'following';
}

export default function VideoFeed({ type }: VideoFeedProps) {
  const feedRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const fetcher =
    type === 'following'
      ? ({ pageParam = 1 }: any) => feedApi.getFollowing(pageParam).then((r) => r.data.data)
      : ({ pageParam = 1 }: any) => feedApi.getForYou(pageParam).then((r) => r.data.data);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ['feed', type],
    queryFn: fetcher,
    initialPageParam: 1,
    getNextPageParam: (lastPage: any) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
  });

  const videos = data?.pages.flatMap((p: any) => p.videos ?? []) ?? [];

  const { ref: sentinelRef, inView } = useInView({ threshold: 0 });
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="relative h-full">
      {/* Top tab bar — pinned absolutely over the feed */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-center pt-3 pb-2 pointer-events-none">
        <div className="flex items-center gap-6 pointer-events-auto">
          <Link
            to="/following"
            className={`text-[15px] font-semibold transition-opacity ${
              type === 'following' ? 'text-white opacity-100' : 'text-white/50 opacity-80'
            }`}
          >
            Following
          </Link>
          <Link
            to="/"
            className={`text-[15px] font-semibold transition-opacity relative ${
              type === 'foryou' ? 'text-white opacity-100' : 'text-white/50 opacity-80'
            }`}
          >
            For You
            {type === 'foryou' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-white rounded-full" />
            )}
          </Link>
        </div>
        {/* Search icon top-right */}
        <Link to="/explore" className="absolute right-4 pointer-events-auto">
          <FaSearch className="text-white text-xl drop-shadow" />
        </Link>
      </div>

      {/* Video scroll container */}
      {isLoading ? (
        <div className="h-full flex items-center justify-center">
          <Loading />
        </div>
      ) : isError || videos.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-3">
          <p className="text-xl">
            {isError
              ? 'Failed to load feed'
              : type === 'following'
              ? 'Follow creators to see their videos'
              : 'No videos yet'}
          </p>
        </div>
      ) : (
        <div
          ref={feedRef}
          className="video-feed h-full"
          style={{ scrollSnapType: 'y mandatory', overflowY: 'scroll' }}
        >
          {videos.map((video: any, idx: number) => (
            <VideoCard key={`${video.id}-${idx}`} video={video} />
          ))}

          {/* Sentinel for infinite scroll */}
          <div ref={sentinelRef} className="h-10 flex items-center justify-center">
            {isFetchingNextPage && <Loading size="sm" />}
          </div>
        </div>
      )}
    </div>
  );
}
