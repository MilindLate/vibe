// backend/prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Hash password
  const passwordHash = await bcrypt.hash('password123', 12);

  // Create sample users
  const users = await Promise.all([
    prisma.user.upsert({
      where: { username: 'demo_creator' },
      create: {
        username: 'demo_creator',
        email: 'creator@demo.com',
        passwordHash,
        displayName: 'Demo Creator',
        bio: '🎥 Creating awesome content every day!',
        isVerified: true,
        role: 'CREATOR',
        followersCount: 15000,
        followingCount: 200,
      },
      update: {},
    }),
    prisma.user.upsert({
      where: { username: 'demo_user' },
      create: {
        username: 'demo_user',
        email: 'user@demo.com',
        passwordHash,
        displayName: 'Demo User',
        bio: 'Just here to watch cool videos ✨',
        followersCount: 42,
        followingCount: 300,
      },
      update: {},
    }),
    prisma.user.upsert({
      where: { username: 'admin' },
      create: {
        username: 'admin',
        email: 'admin@demo.com',
        passwordHash,
        displayName: 'Admin',
        role: 'ADMIN',
        isVerified: true,
      },
      update: {},
    }),
  ]);

  console.log(`Created ${users.length} users`);

  // Create hashtags
  const tags = ['funny', 'dance', 'food', 'travel', 'fitness', 'music', 'coding', 'art', 'pets', 'education'];
  await Promise.all(
    tags.map((name) =>
      prisma.hashtag.upsert({
        where: { name },
        create: { name, videosCount: Math.floor(Math.random() * 5000) + 100 },
        update: {},
      })
    )
  );

  console.log(`Created ${tags.length} hashtags`);
  console.log('✅ Seed complete!');
  console.log('\nDemo credentials:');
  console.log('  Email: creator@demo.com  Password: password123');
  console.log('  Email: user@demo.com     Password: password123');
  console.log('  Email: admin@demo.com    Password: password123');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
