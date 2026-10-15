const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Creating test accounts...');
  
  const passwordHash = await bcrypt.hash('password123', 10);
  
  // Test Account 1
  const test1 = await prisma.user.upsert({
    where: { email: 'test1@demo.com' },
    update: {},
    create: {
      id: 'test-user-1',
      username: 'testuser1',
      email: 'test1@demo.com',
      passwordHash,
      displayName: 'Test User One',
      avatarUrl: 'http://localhost:3000/uploads/avatars/avatar.jpg',
      bio: 'I am a test account created for QA',
      role: 'USER',
    },
  });

  // Test Account 2
  const test2 = await prisma.user.upsert({
    where: { email: 'test2@demo.com' },
    update: {},
    create: {
      id: 'test-user-2',
      username: 'testuser2',
      email: 'test2@demo.com',
      passwordHash,
      displayName: 'Test User Two',
      avatarUrl: 'http://localhost:3000/uploads/avatars/avatar.jpg',
      bio: 'I am the second test account',
      role: 'USER',
    },
  });

  console.log('Seeding videos...');

  // Ensure hashtags exist
  await prisma.hashtag.upsert({ where: { name: 'test' }, update: {}, create: { id: 'test', name: 'test' } });
  await prisma.hashtag.upsert({ where: { name: 'qa' }, update: {}, create: { id: 'qa', name: 'qa' } });
  await prisma.hashtag.upsert({ where: { name: 'automation' }, update: {}, create: { id: 'automation', name: 'automation' } });

  // Video 1
  await prisma.video.upsert({
    where: { id: 'test-video-1' },
    update: {},
    create: {
      id: 'test-video-1',
      user: { connect: { id: test1.id } },
      title: 'Sample Video 1',
      description: 'This is the first test video.',
      videoUrl: 'http://localhost:3000/uploads/videos/sample1.mp4',
      thumbnailUrl: 'http://localhost:3000/uploads/thumbnails/sample1.jpg',
      duration: 10,
      status: 'ACTIVE',
      hashtags: {
        create: [
          { hashtag: { connect: { name: 'test' } } },
          { hashtag: { connect: { name: 'qa' } } }
        ]
      }
    }
  });

  // Video 2
  await prisma.video.upsert({
    where: { id: 'test-video-2' },
    update: {},
    create: {
      id: 'test-video-2',
      user: { connect: { id: test2.id } },
      title: 'Sample Video 2',
      description: 'This is the second test video.',
      videoUrl: 'http://localhost:3000/uploads/videos/sample2.mp4',
      thumbnailUrl: 'http://localhost:3000/uploads/thumbnails/sample2.jpg',
      duration: 10,
      status: 'ACTIVE',
      hashtags: {
        create: [
          { hashtag: { connect: { name: 'test' } } },
          { hashtag: { connect: { name: 'automation' } } }
        ]
      }
    }
  });

  console.log('Test accounts and videos seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
