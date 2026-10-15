const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing old bulk data...');
  // Optional: We can delete old data if we want, but let's just upsert

  console.log('Creating 15 users...');
  const passwordHash = await bcrypt.hash('password123', 10);
  
  const names = [
    'Alice', 'Bob', 'Charlie', 'Diana', 'Eve',
    'Frank', 'Grace', 'Heidi', 'Ivan', 'Judy',
    'Mallory', 'Oscar', 'Peggy', 'Trent', 'Victor'
  ];

  const videosSource = ['vid1.mp4', 'vid2.mp4', 'vid3.mp4', 'vid4.mp4', 'vid5.mp4'];
  const hashtagsSource = ['funny', 'dance', 'comedy', 'tech', 'vlog', 'daily', 'life', 'art', 'music'];

  // Create hashtags
  for (const tag of hashtagsSource) {
    await prisma.hashtag.upsert({ where: { name: tag }, update: {}, create: { id: tag, name: tag } });
  }

  for (let i = 0; i < 15; i++) {
    const name = names[i];
    const username = name.toLowerCase() + i;
    const email = `${username}@example.com`;

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        id: `bulk-user-${i}`,
        username,
        email,
        passwordHash,
        displayName: `${name} Creator`,
        avatarUrl: `https://ui-avatars.com/api/?name=${name}&background=random&size=128`,
        bio: `Hi, I am ${name}! Enjoy my vibes.`,
        role: 'USER',
      },
    });

    // Create 1-2 videos per user
    const numVideos = Math.floor(Math.random() * 2) + 1;
    for (let v = 0; v < numVideos; v++) {
      const vidFile = videosSource[Math.floor(Math.random() * videosSource.length)];
      const tag1 = hashtagsSource[Math.floor(Math.random() * hashtagsSource.length)];
      const tag2 = hashtagsSource[Math.floor(Math.random() * hashtagsSource.length)];
      
      const tagsToCreate = [];
      if (tag1 === tag2) {
        tagsToCreate.push({ hashtag: { connect: { name: tag1 } } });
      } else {
        tagsToCreate.push({ hashtag: { connect: { name: tag1 } } });
        tagsToCreate.push({ hashtag: { connect: { name: tag2 } } });
      }

      await prisma.video.upsert({
        where: { id: `bulk-video-${i}-${v}` },
        update: {},
        create: {
          id: `bulk-video-${i}-${v}`,
          user: { connect: { id: user.id } },
          title: `${name}'s awesome vlog part ${v + 1}`,
          description: `Just dropping some #${tag1} vibes here! #${tag2}`,
          videoUrl: `http://localhost:3000/uploads/videos/${vidFile}`,
          thumbnailUrl: `https://picsum.photos/seed/${i}${v}/400/700`, // Random placeholder thumbnail
          duration: Math.floor(Math.random() * 30) + 10,
          status: 'ACTIVE',
          viewsCount: Math.floor(Math.random() * 10000),
          likesCount: Math.floor(Math.random() * 500),
          commentsCount: Math.floor(Math.random() * 50),
          sharesCount: Math.floor(Math.random() * 20),
          hashtags: {
            create: tagsToCreate
          }
        }
      });
    }
    console.log(`Created user ${name} with videos`);
  }

  console.log('15 Users and their videos seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
