const { PrismaClient } = require('@prisma/client');

class Database {
  constructor() {
    this.prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });
  }

  async connect() {
    try {
      await this.prisma.$connect();
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  async disconnect() {
    await this.prisma.$disconnect();
  }

  // User operations
  async createOrUpdateUser(fbId, name, gender) {
    return await this.prisma.user.upsert({
      where: { fbId },
      update: { name, gender },
      create: { fbId, name, gender }
    });
  }

  async getUserByFbId(fbId) {
    return await this.prisma.user.findUnique({
      where: { fbId }
    });
  }

  // Session operations
  async createSession(playDate) {
    return await this.prisma.session.create({
      data: { playDate }
    });
  }

  async getCurrentSession() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await this.prisma.session.findFirst({
      where: {
        playDate: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        votes: {
          include: {
            user: true
          }
        }
      }
    });
  }

  async updateSessionCounts(sessionId, courtCount, shuttleCount) {
    return await this.prisma.session.update({
      where: { id: sessionId },
      data: { courtCount, shuttleCount }
    });
  }

  async markSessionComputed(sessionId) {
    return await this.prisma.session.update({
      where: { id: sessionId },
      data: { computed: true }
    });
  }

  // Vote operations
  async createVote(sessionId, userId, voteType) {
    return await this.prisma.vote.create({
      data: {
        sessionId,
        userId,
        voteType
      },
      include: {
        user: true
      }
    });
  }

  async getVotesBySession(sessionId) {
    return await this.prisma.vote.findMany({
      where: { sessionId },
      include: {
        user: true
      }
    });
  }

  // Audit log operations
  async createAuditLog(sessionId, action, payload) {
    return await this.prisma.auditLog.create({
      data: {
        sessionId,
        action,
        payload
      }
    });
  }

  async getAuditLogs(sessionId) {
    return await this.prisma.auditLog.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' }
    });
  }

  // Transaction wrapper for ACID compliance
  async transaction(operations) {
    return await this.prisma.$transaction(operations);
  }
}

module.exports = new Database();
