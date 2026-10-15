// src/components/admin/UsersPage.tsx
import { useEffect, useState } from 'react';
import { adminApi } from '../../services/api';
import { Loading } from '../common/Loading';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .getUsers()
      .then((res: any) => setUsers(res.data.data || []))
      .catch((err) => console.error('Admin users error', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading fullScreen={false} />;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary">Manage Users</h1>
      <div className="bg-vibe-card rounded-lg overflow-x-auto border border-vibe-border">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="bg-white/5 uppercase text-xs text-gray-400">
            <tr>
              <th className="p-3">Username</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Status</th>
              <th className="p-3">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-vibe-border">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-white/5">
                <td className="p-3 font-semibold text-white">@{u.username}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${u.role === 'ADMIN' ? 'bg-primary text-white' : 'bg-gray-700 text-gray-200'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${u.status === 'ACTIVE' ? 'bg-green-800 text-green-200' : 'bg-red-800 text-red-200'}`}>
                    {u.status}
                  </span>
                </td>
                <td className="p-3 text-gray-400">{new Date(u.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
