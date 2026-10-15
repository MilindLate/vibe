const fs = require('fs');

async function runTests() {
  const API_URL = 'http://localhost:3000/api';
  let token = '';
  let videoId = '';
  const testEmail = `test_${Date.now()}@test.com`;

  console.log('--- STARTING E2E INTEGRATION TESTS ---');

  // 1. REGISTER
  try {
    const res = await fetch(`${API_URL}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: `user${Date.now()}`, email: testEmail, password: 'password123', displayName: 'Test User' })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Register failed');
    token = data.data.accessToken;
    console.log('✅ Register passed');
  } catch (err) { console.error('❌ Register failed:', err.message); }

  // 2. GET PROFILE
  try {
    const res = await fetch(`${API_URL}/users/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Profile failed');
    console.log('✅ Get Profile passed');
  } catch (err) { console.error('❌ Get Profile failed:', err.message); }

  // 2b. UPDATE PROFILE
  try {
    const res = await fetch(`${API_URL}/users/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ displayName: 'New Name', bio: 'This is my vibe' })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Update Profile failed');
    console.log('✅ Update Profile passed');
  } catch (err) { console.error('❌ Update Profile failed:', err.message); }

  // 3. GET FEED
  try {
    const res = await fetch(`${API_URL}/feed/foryou`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Feed failed');
    console.log(`✅ Get Feed passed (${data.data.videos.length} videos returned)`);
    if (data.data.videos.length > 0) {
      videoId = data.data.videos[0].id;
    }
  } catch (err) { console.error('❌ Get Feed failed:', err.message); }

  // 4. LIKE VIDEO
  if (videoId) {
    try {
      const res = await fetch(`${API_URL}/videos/${videoId}/like`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok && data.message !== 'Already liked') throw new Error(data.message || 'Like failed');
      console.log('✅ Like Video passed');
    } catch (err) { console.error('❌ Like Video failed:', err.message); }

    // 5. POST COMMENT
    try {
      const res = await fetch(`${API_URL}/social/videos/${videoId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ content: 'This is a test comment!' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Comment failed');
      console.log('✅ Post Comment passed');
    } catch (err) { console.error('❌ Post Comment failed:', err.message); }
  } else {
    console.warn('⚠️ Skipping Like & Comment tests (no video found)');
  }

  // 6. UPLOAD VIDEO (Multipart Form)
  try {
    const formData = new FormData();
    formData.append('title', 'Test Upload');
    formData.append('description', 'Test Description');
    // Using a dummy text file as video for testing the endpoint logic
    const blob = new Blob(['dummy content'], { type: 'video/mp4' });
    formData.append('video', blob, 'test.mp4');

    const res = await fetch(`${API_URL}/videos`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Upload failed');
    console.log('✅ Video Upload API passed');
  } catch (err) { console.error('❌ Video Upload API failed:', err.message); }

  console.log('--- E2E TESTS COMPLETED ---');
}

runTests();
