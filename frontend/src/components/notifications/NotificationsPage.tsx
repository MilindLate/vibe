// src/components/notifications/NotificationsPage.tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { notificationApi } from '../../services/api';
import { formatTimeAgo } from '../../utils/formatters';
import { Loading } from '../common/Loading';
import { FaHeart, FaComment, FaUserPlus, FaAt } from 'react-icons/fa';

const icons: Record<string, React.ElementType> = {
  LIKE: FaHeart,
  COMMENT: FaComment,
  FOLLOW: FaUserPlus,
  FOLLOW_REQUEST: FaUserPlus,
  MENTION: FaAt,
};
const colors: Record<string, string> = {
  LIKE: 'text-primary', COMMENT: 'text-blue-400',
  FOLLOW: 'text-green-400', FOLLOW_REQUEST: 'text-yellow-400', MENTION: 'text-purple-400',
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationApi.getAll().then((r) => r.data.data),
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  if (isLoading) return <Loading fullScreen />;
  const notifications = data?.notifications || [];

  return (
    <div className="h-full overflow-y-auto bg-black">
      <div className="flex items-center justify-between p-4 border-b border-vibe-border sticky top-0 bg-black z-10">
        <h1 className="text-white text-xl font-bold">Notifications</h1>
        {notifications.some((n: any) => !n.isRead) && (
          <button
            onClick={() => markAllMutation.mutate()}
            className="text-primary text-sm font-medium"
          >
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <p>No notifications yet</p>
        </div>
      ) : (
        <div>
          {notifications.map((notif: any) => {
            const Icon = icons[notif.type] || FaHeart;
            const color = colors[notif.type] || 'text-primary';
            return (
              <div
                key={notif.id}
                className={`flex items-center gap-3 px-4 py-3 border-b border-vibe-border hover:bg-white/5 transition-colors ${!notif.isRead ? 'bg-white/3' : ''}`}
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={notif.actor?.avatarUrl || `https://ui-avatars.com/api/?name=${notif.actor?.displayName}&background=FE2C55&color=fff`}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className={`absolute -bottom-1 -right-1 bg-black rounded-full p-0.5 ${color}`}>
                    <Icon className="text-xs" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm">
                    <Link to={`/profile/${notif.actor?.username}`} className="font-semibold hover:underline">
                      {notif.actor?.displayName}
                    </Link>
                    {' '}
                    {notif.type === 'LIKE' && 'liked your video'}
                    {notif.type === 'COMMENT' && 'commented on your video'}
                    {notif.type === 'FOLLOW' && 'started following you'}
                    {notif.type === 'FOLLOW_REQUEST' && 'sent a follow request'}
                    {notif.type === 'MENTION' && 'mentioned you'}
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5">{formatTimeAgo(notif.createdAt)}</p>
                </div>
                {!notif.isRead && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
