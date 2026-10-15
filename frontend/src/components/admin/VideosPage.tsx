// src/components/admin/VideosPage.tsx
import { useEffect, useState } from 'react';
import { adminApi } from '../../services/api';
import { Loading } from '../common/Loading';

export default function VideosPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .getVideos()
      .then((res: any) => setVideos(res.data.data || []))
      .catch((err) => console.error('Admin videos error', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading fullScreen={false} />;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary">Manage Videos</h1>
      <div className="bg-vibe-card rounded-lg overflow-x-auto border border-vibe-border">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="bg-white/5 uppercase text-xs text-gray-400">
            <tr>
              <th className="p-3">Title</th>
              <th className="p-3">Author</th>
              <th className="p-3">Views</th>
              <th className="p-3">Likes</th>
              <th className="p-3">Status</th>
              <th className="p-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-vibe-border">
            {videos.map((v) => (
              <tr key={v.id} className="hover:bg-white/5">
                <td className="p-3 font-semibold text-white max-w-xs truncate">{v.title || 'Untitled'}</td>
                <td className="p-3">@{v.user?.username}</td>
                <td className="p-3">{v.viewsCount ?? 0}</td>
                <td className="p-3">{v.likesCount ?? 0}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${v.status === 'ACTIVE' ? 'bg-green-800 text-green-200' : 'bg-yellow-800 text-yellow-200'}`}>
                    {v.status}
                  </span>
                </td>
                <td className="p-3 text-gray-400">{new Date(v.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
