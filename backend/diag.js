// Quick diagnostic script
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/vibe_db';
process.env.REDIS_URL = 'redis://localhost:6379';

async function test() {
  console.log('1. Testing Redis...');
  const Redis = require('ioredis');
  const r = new Redis('redis://localhost:6379', { lazyConnect: true, maxRetriesPerRequest: 1 });
  try {
    await r.connect();
    const pong = await r.ping();
    console.log('   Redis OK:', pong);
    await r.quit();
  } catch (e) {
    console.log('   Redis FAIL:', e.message);
  }

  console.log('2. Testing PostgreSQL...');
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    console.log('   Postgres OK');
    await prisma.$disconnect();
  } catch (e) {
    console.log('   Postgres FAIL:', e.message);
  }

  console.log('3. Testing app import...');
  try {
    const { app } = require('./src/app');
    console.log('   App OK:', typeof app);
  } catch (e) {
    console.log('   App FAIL:', e.message);
  }
}

test().catch(console.error);
