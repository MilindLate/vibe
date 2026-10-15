// src/components/admin/DashboardPage.tsx
import { useEffect, useState } from 'react';
import { adminApi } from '../../services/api';
import { Loading } from '../common/Loading';

export default function DashboardPage() {
  const [stats, setStats] = useState<{ usersCount: number; videosCount: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .getStats()
      .then((res: any) => {
        setStats(res.data.data);
      })
      .catch((err) => console.error('Admin stats error', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading fullScreen={false} />;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-vibe-card rounded shadow">
          <h2 className="text-xl font-semibold mb-2">Total Users</h2>
          <p className="text-4xl font-bold text-primary">{stats?.usersCount ?? 0}</p>
        </div>
        <div className="p-4 bg-vibe-card rounded shadow">
          <h2 className="text-xl font-semibold mb-2">Total Videos</h2>
          <p className="text-4xl font-bold text-primary">{stats?.videosCount ?? 0}</p>
        </div>
      </div>
    </div>
  );
}
