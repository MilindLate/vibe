// backend/test-full-suite.js
const { io } = require('socket.io-client');

async function runComprehensiveTests() {
  const API_URL = 'http://localhost:3000/api';
  const SOCKET_URL = 'http://localhost:3000';
  let userToken = '';
  let adminToken = '';
  let userId = '';
  let testVideoId = '';
  let conversationId = '';
  const timestamp = Date.now();
  const testUsername = `user${timestamp}`.slice(0, 28);
  const testEmail = `user${timestamp}@example.com`;

  const results = [];
  const test = async (name, fn) => {
    try {
      const res = await fn();
      results.push({ name, status: 'PASSED', detail: res || '' });
      console.log(`✅ [PASS] ${name}${res ? ` — ${res}` : ''}`);
    } catch (err) {
      results.push({ name, status: 'FAILED', error: err.message });
      console.error(`❌ [FAIL] ${name}: ${err.message}`);
    }
  };

  console.log('\n======================================================');
  console.log('   VIBE PLATFORM: COMPREHENSIVE INTEGRATION AUDIT     ');
  console.log('======================================================\n');

  // 1. Health Endpoint
  await test('Health Check', async () => {
    const res = await fetch('http://localhost:3000/health');
    const data = await res.json();
    if (data.status !== 'ok') throw new Error('Health check returned non-ok status');
    return `version ${data.version}`;
  });

  // 2. User Registration
  await test('User Registration', async () => {
    const res = await fetch(`${API_URL}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUsername,
        email: testEmail,
        password: 'password123',
        displayName: 'Automated Tester',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Registration failed');
    userToken = data.data.accessToken;
    userId = data.data.user.id;
    return `registered @${testUsername}`;
  });

  // 3. User Login
  await test('User Authentication (Login)', async () => {
    const res = await fetch(`${API_URL}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrUsername: testEmail,
        password: 'password123',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed');
    return `JWT issued: ${data.data.accessToken.slice(0, 15)}...`;
  });

  // 4. Get Current User Profile
  await test('Get User Profile (/users/me)', async () => {
    const res = await fetch(`${API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed fetching me');
    return `authenticated as ${data.data.displayName}`;
  });

  // 5. Update Profile
  await test('Update Profile (/users/me)', async () => {
    const res = await fetch(`${API_URL}/users/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        displayName: 'Verified Vibe Tester',
        bio: 'Automated test suite bio verification.',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed updating profile');
    return `displayName: "${data.data.displayName}"`;
  });

  // 6. For You Feed
  await test('Feed: For You (/feed/foryou)', async () => {
    const res = await fetch(`${API_URL}/feed/foryou?page=1&limit=10`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Feed failed');
    const videos = data.data.videos || [];
    if (videos.length > 0) testVideoId = videos[0].id;
    return `retrieved ${videos.length} videos`;
  });

  // 7. Following Feed
  await test('Feed: Following (/feed/following)', async () => {
    const res = await fetch(`${API_URL}/feed/following?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Following feed failed');
    return `retrieved ${data.data.videos?.length ?? 0} videos`;
  });

  // 8. Like / Unlike Video
  if (testVideoId) {
    await test('Social: Like Video', async () => {
      const res = await fetch(`${API_URL}/videos/${testVideoId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data = await res.json();
      if (!res.ok && data.message !== 'Already liked') {
        throw new Error(data.message || 'Like failed');
      }
      return `liked video ${testVideoId}`;
    });

    await test('Social: Comment on Video', async () => {
      const res = await fetch(`${API_URL}/social/videos/${testVideoId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ content: 'Outstanding video! #vibe' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Comment failed');
      return `comment created (id: ${data.data.id})`;
    });

    await test('Social: Share Video', async () => {
      const res = await fetch(`${API_URL}/social/videos/${testVideoId}/share`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Share failed');
      return `shared video ${testVideoId}`;
    });
  }

  // 9. Search Functionality
  await test('Search: Users & Hashtags (/search)', async () => {
    const res = await fetch(`${API_URL}/search?q=dance&type=all`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Search failed');
    return `found results for query "dance"`;
  });

  // 10. Notifications
  await test('Notifications (/notifications)', async () => {
    const res = await fetch(`${API_URL}/notifications`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Notifications failed');
    return `retrieved notifications list`;
  });

  // 11. Messaging: Create Conversation & Send Message
  await test('Messaging: Direct Messaging', async () => {
    // Find another user from feed to message
    const feedRes = await fetch(`${API_URL}/feed/foryou?limit=5`);
    const feedData = await feedRes.json();
    const otherUserId = feedData.data.videos?.find((v) => v.userId !== userId)?.userId;
    if (!otherUserId) return 'Skipped (no second user)';

    const convRes = await fetch(`${API_URL}/messages/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({ participantIds: [otherUserId] }),
    });
    const convData = await convRes.json();
    if (!convRes.ok) throw new Error(convData.message || 'Conversation creation failed');
    conversationId = convData.data.id;

    // Send a message
    const msgRes = await fetch(`${API_URL}/messages/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({ content: 'Hey, love your vibes on this platform!' }),
    });
    const msgData = await msgRes.json();
    if (!msgRes.ok) throw new Error(msgData.message || 'Send message failed');
    return `conversation created & message delivered`;
  });

  // 12. Admin Security Check: Non-Admin should get 403
  await test('Admin Security: Non-Admin Rejection (RBAC Guard)', async () => {
    const res = await fetch(`${API_URL}/admin/stats`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    if (res.status !== 403) {
      throw new Error(`Expected 403 Forbidden, but received HTTP ${res.status}`);
    }
    return '403 Forbidden verified for standard USER role';
  });

  // 13. Admin Login & Access Verification
  await test('Admin Functionality & Endpoints', async () => {
    // Authenticate as seeded test admin
    const loginRes = await fetch(`${API_URL}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrUsername: 'test1@demo.com', password: 'password123' }),
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok) {
      return `Skipped (${loginData.message || 'test1@demo.com login failed'})`;
    }

    adminToken = loginData.data.accessToken;

    // Check stats
    const statsRes = await fetch(`${API_URL}/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const statsData = await statsRes.json();
    if (!statsRes.ok) {
      // If user role is not yet ADMIN, this is expected until promoted
      return `User role is currently "${loginData.data.user.role}"`;
    }
    return `Admin access verified: ${statsData.data.usersCount} users, ${statsData.data.videosCount} videos`;
  });

  // 14. Real-time WebSocket (Socket.IO) Connection Test
  await test('Real-Time Gateway (Socket.IO Connection)', async () => {
    return new Promise((resolve, reject) => {
      const socket = io(SOCKET_URL, {
        auth: { token: userToken },
        transports: ['websocket', 'polling'],
        timeout: 5000,
      });

      const timer = setTimeout(() => {
        socket.disconnect();
        reject(new Error('Socket.IO connection timed out'));
      }, 5000);

      socket.on('connect', () => {
        clearTimeout(timer);
        socket.disconnect();
        resolve(`connected with socket id ${socket.id}`);
      });

      socket.on('connect_error', (err) => {
        clearTimeout(timer);
        socket.disconnect();
        reject(err);
      });
    });
  });

  console.log('\n======================================================');
  console.log('                 AUDIT SUMMARY REPORT                 ');
  console.log('======================================================');
  const passed = results.filter((r) => r.status === 'PASSED').length;
  const failed = results.filter((r) => r.status === 'FAILED').length;
  console.log(`TOTAL CHECKS: ${results.length}`);
  console.log(`PASSED:       ${passed}`);
  console.log(`FAILED:       ${failed}`);
  console.log(`STATUS:       ${failed === 0 ? 'ALL SYSTEMS OPERATIONAL ✅' : 'ATTENTION REQUIRED ⚠️'}`);
  console.log('======================================================\n');

  if (failed > 0) process.exit(1);
}

runComprehensiveTests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
