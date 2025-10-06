const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function initDatabase() {
  try {
    console.log('🚀 Initializing database...');

    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    // Create sample users for testing
    const sampleUsers = [
      {
        fbId: 'test_user_1',
        name: 'Nguyễn Văn A',
        gender: 'male'
      },
      {
        fbId: 'test_user_2', 
        name: 'Trần Thị B',
        gender: 'female'
      },
      {
        fbId: 'test_user_3',
        name: 'Lê Văn C',
        gender: 'male'
      }
    ];

    console.log('👥 Creating sample users...');
    for (const user of sampleUsers) {
      await prisma.user.upsert({
        where: { fbId: user.fbId },
        update: user,
        create: user
      });
    }
    console.log('✅ Sample users created');

    // Create sample session for today
    const today = new Date();
    today.setHours(18, 0, 0, 0);

    console.log('🏸 Creating sample session...');
    const session = await prisma.session.create({
      data: {
        playDate: today,
        courtCount: 0,
        shuttleCount: 0,
        computed: false
      }
    });
    console.log('✅ Sample session created');

    // Create sample votes
    const users = await prisma.user.findMany();
    console.log('🗳️ Creating sample votes...');
    
    for (let i = 0; i < users.length; i++) {
      await prisma.vote.create({
        data: {
          sessionId: session.id,
          userId: users[i].id,
          voteType: 'VOTE_YES'
        }
      });
    }
    console.log('✅ Sample votes created');

    // Create audit log
    await prisma.auditLog.create({
      data: {
        sessionId: session.id,
        action: 'DATABASE_INITIALIZED',
        payload: {
          sampleUsers: sampleUsers.length,
          sampleVotes: users.length,
          timestamp: new Date().toISOString()
        }
      }
    });

    console.log('✅ Database initialization completed successfully');
    console.log('\n📊 Summary:');
    console.log(`- Users: ${users.length}`);
    console.log(`- Sessions: 1`);
    console.log(`- Votes: ${users.length}`);
    console.log(`- Audit logs: 1`);

  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run initialization
if (require.main === module) {
  initDatabase()
    .then(() => {
      console.log('🎉 Database initialization completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database initialization failed:', error);
      process.exit(1);
    });
}

module.exports = { initDatabase };
