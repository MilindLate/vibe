// src/components/admin/AnalyticsPage.tsx
import { useEffect, useState } from 'react';
import { adminApi } from '../../services/api';
import { Loading } from '../common/Loading';

export default function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .getStats()
      .then((res: any) => setStats(res.data.data))
      .catch((err) => console.error('Admin stats error', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading fullScreen={false} />;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary">Platform Analytics</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-vibe-card border border-vibe-border rounded-lg shadow">
          <p className="text-gray-400 text-sm font-medium">Registered Creators & Users</p>
          <p className="text-3xl font-extrabold text-white mt-2">{stats?.usersCount ?? 0}</p>
        </div>
        <div className="p-6 bg-vibe-card border border-vibe-border rounded-lg shadow">
          <p className="text-gray-400 text-sm font-medium">Published Reels & Videos</p>
          <p className="text-3xl font-extrabold text-white mt-2">{stats?.videosCount ?? 0}</p>
        </div>
        <div className="p-6 bg-vibe-card border border-vibe-border rounded-lg shadow">
          <p className="text-gray-400 text-sm font-medium">Platform Status</p>
          <p className="text-3xl font-extrabold text-green-400 mt-2">Operational</p>
        </div>
      </div>
    </div>
  );
}
