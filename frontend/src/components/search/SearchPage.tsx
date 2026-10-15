// src/components/search/SearchPage.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { FaSearch, FaFire } from 'react-icons/fa';
import { searchApi } from '../../services/api';
import { formatCount } from '../../utils/formatters';
import { Loading } from '../common/Loading';
import { useDebounce } from '../../hooks/useDebounce';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const initialQ = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQ);
  const [activeTab, setActiveTab] = useState<'all' | 'users' | 'videos' | 'hashtags'>('all');
  const debouncedQuery = useDebounce(query, 300);

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['search', debouncedQuery, activeTab],
    queryFn: () => searchApi.search(debouncedQuery, activeTab).then((r) => r.data.data),
    enabled: debouncedQuery.length > 0,
  });

  const { data: trending } = useQuery({
    queryKey: ['trending-searches'],
    queryFn: () => searchApi.getTrending().then((r) => r.data.data),
    enabled: !query,
  });

  const { data: discover } = useQuery({
    queryKey: ['discover'],
    queryFn: () => import('../../services/api').then(({ feedApi }) => feedApi.getDiscover().then((r) => r.data.data)),
    enabled: !query,
  });

  return (
    <div className="h-full overflow-y-auto bg-black">
      {/* Search bar */}
      <div className="sticky top-0 bg-black/95 backdrop-blur z-10 p-4 border-b border-vibe-border">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users, videos, hashtags..."
            className="w-full bg-vibe-card border border-vibe-border rounded-full py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-white/30"
            autoFocus={!!initialQ}
          />
        </div>

        {/* Tabs (shown when searching) */}
        {query && (
          <div className="flex gap-2 mt-3">
            {(['all', 'users', 'videos', 'hashtags'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
                  activeTab === tab ? 'bg-white text-black' : 'bg-vibe-card text-gray-400 hover:bg-white/10'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-4">
        {/* Search results */}
        {query && debouncedQuery ? (
          isLoading ? <Loading /> : (
            <div className="space-y-6">
              {/* Users */}
              {searchResults?.users?.length > 0 && (
                <div>
                  <h3 className="text-white font-semibold mb-3">Users</h3>
                  <div className="space-y-3">
                    {searchResults.users.map((user: any) => (
                      <Link key={user.id} to={`/profile/${user.username}`} className="flex items-center gap-3 hover:bg-white/5 p-2 rounded-xl transition-colors">
                        <img src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.displayName}&background=FE2C55&color=fff`} alt="" className="w-12 h-12 rounded-full object-cover" />
                        <div>
                          <p className="text-white font-semibold">@{user.username}</p>
                          <p className="text-gray-400 text-sm">{user.displayName} · {formatCount(user.followersCount)} followers</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Hashtags */}
              {searchResults?.hashtags?.length > 0 && (
                <div>
                  <h3 className="text-white font-semibold mb-3">Hashtags</h3>
                  <div className="space-y-2">
                    {searchResults.hashtags.map((tag: any) => (
                      <Link key={tag.id} to={`/explore?q=${tag.name}`} className="flex items-center gap-3 hover:bg-white/5 p-2 rounded-xl transition-colors">
                        <div className="w-12 h-12 rounded-full bg-vibe-card flex items-center justify-center text-xl">#</div>
                        <div>
                          <p className="text-white font-semibold">#{tag.name}</p>
                          <p className="text-gray-400 text-sm">{formatCount(tag.videosCount)} videos</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        ) : (
          /* Discover (no query) */
          <div className="space-y-6">
            {/* Trending searches */}
            {trending?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FaFire className="text-primary" />
                  <h3 className="text-white font-semibold">Trending</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {trending.map((term: string) => (
                    <button
                      key={term}
                      onClick={() => setQuery(term)}
                      className="bg-vibe-card border border-vibe-border text-white text-sm px-4 py-2 rounded-full hover:bg-white/10 transition-colors"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Trending hashtags */}
            {discover?.trendingHashtags?.length > 0 && (
              <div>
                <h3 className="text-white font-semibold mb-3">Popular hashtags</h3>
                <div className="grid grid-cols-2 gap-2">
                  {discover.trendingHashtags.slice(0, 8).map((tag: any) => (
                    <Link
                      key={tag.id}
                      to={`/explore?q=${tag.name}`}
                      className="bg-vibe-card border border-vibe-border rounded-xl p-3 hover:border-white/20 transition-colors"
                    >
                      <p className="text-white font-semibold text-sm">#{tag.name}</p>
                      <p className="text-gray-500 text-xs mt-1">{formatCount(tag.videosCount)} videos</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
