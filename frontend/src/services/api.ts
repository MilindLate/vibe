// src/services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');
        const { data } = await axios.post('/api/users/refresh', { refreshToken });
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(original);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ─── API functions ────────────────────────────────────────────────────────────

export const authApi = {
  register: (data: any) => api.post('/users/register', data),
  login: (data: any) => api.post('/users/login', data),
  logout: (refreshToken: string) => api.post('/users/logout', { refreshToken }),
  getMe: () => api.get('/users/me'),
};

export const userApi = {
  getProfile: (username: string) => api.get(`/users/${username}`),
  updateProfile: (data: any) => api.patch('/users/me', data),
  updateAvatar: (file: File) => {
    const form = new FormData();
    form.append('avatar', file);
    return api.post('/users/me/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  searchUsers: (q: string, page = 1) => api.get(`/users/search?q=${encodeURIComponent(q)}&page=${page}`),
  blockUser: (userId: string) => api.post(`/users/${userId}/block`),
  unblockUser: (userId: string) => api.delete(`/users/${userId}/block`),
};

export const videoApi = {
  upload: (data: FormData, onProgress?: (pct: number) => void) =>
    api.post('/videos', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => onProgress?.(Math.round((e.loaded / (e.total || 1)) * 100)),
    }),
  getVideo: (id: string) => api.get(`/videos/${id}`),
  updateVideo: (id: string, data: any) => api.patch(`/videos/${id}`, data),
  deleteVideo: (id: string) => api.delete(`/videos/${id}`),
  likeVideo: (id: string) => api.post(`/videos/${id}/like`),
  unlikeVideo: (id: string) => api.delete(`/videos/${id}/like`),
  getTrending: (page = 1) => api.get(`/videos/trending?page=${page}`),
  getUserVideos: (userId: string, page = 1) => api.get(`/videos/user/${userId}?page=${page}`),
  getByHashtag: (tag: string, page = 1) => api.get(`/videos/hashtag/${encodeURIComponent(tag)}?page=${page}`),
};

export const feedApi = {
  getForYou: (page = 1) => api.get(`/feed/foryou?page=${page}&limit=10`),
  getFollowing: (page = 1) => api.get(`/feed/following?page=${page}&limit=10`),
  getDiscover: () => api.get('/feed/discover'),
};

export const socialApi = {
  follow: (userId: string) => api.post(`/social/${userId}/follow`),
  unfollow: (userId: string) => api.delete(`/social/${userId}/follow`),
  getFollowers: (userId: string, page = 1) => api.get(`/social/${userId}/followers?page=${page}`),
  getFollowing: (userId: string, page = 1) => api.get(`/social/${userId}/following?page=${page}`),
  addComment: (videoId: string, content: string, parentId?: string) =>
    api.post(`/social/videos/${videoId}/comments`, { content, parentId }),
  deleteComment: (commentId: string) => api.delete(`/social/comments/${commentId}`),
  getComments: (videoId: string, page = 1) => api.get(`/social/videos/${videoId}/comments?page=${page}`),
  likeComment: (commentId: string) => api.post(`/social/comments/${commentId}/like`),
  shareVideo: (videoId: string) => api.post(`/social/videos/${videoId}/share`),
  getSuggestedUsers: () => api.get('/social/suggested-users'),
};

export const searchApi = {
  search: (q: string, type = 'all', page = 1) =>
    api.get(`/search?q=${encodeURIComponent(q)}&type=${type}&page=${page}`),
  getTrending: () => api.get('/search/trending'),
  autocomplete: (q: string) => api.get(`/search/autocomplete?q=${encodeURIComponent(q)}`),
};

export const notificationApi = {
  getAll: (page = 1) => api.get(`/notifications?page=${page}`),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

export const messageApi = {
  getConversations: () => api.get('/messages/conversations'),
  createConversation: (participantIds: string[]) =>
    api.post('/messages/conversations', { participantIds }),
  getMessages: (conversationId: string, cursor?: string) =>
    api.get(`/messages/conversations/${conversationId}/messages${cursor ? `?cursor=${cursor}` : ''}`),
  sendMessage: (conversationId: string, content: string) =>
    api.post(`/messages/conversations/${conversationId}/messages`, { content }),
  markRead: (conversationId: string) =>
    api.post(`/messages/conversations/${conversationId}/read`),
};

export const analyticsApi = {
  trackView: (videoId: string, watchDuration: number, completionRate: number) =>
    api.post('/analytics/view', { videoId, watchDuration, completionRate }),
  getVideoAnalytics: (videoId: string) => api.get(`/analytics/video/${videoId}`),
  getProfileAnalytics: () => api.get('/analytics/profile'),
};

export const adminApi = {
  getStats: () => api.get('/admin/stats'),
  getUsers: () => api.get('/admin/users'),
  getVideos: () => api.get('/admin/videos'),
};
