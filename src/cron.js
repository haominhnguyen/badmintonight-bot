const cron = require('node-cron');
const bot = require('./bot');
const db = require('./db');

class CronScheduler {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
  }

  /**
   * Khởi động scheduler
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️ Cron scheduler is already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting cron scheduler...');

    // Lấy thời gian cron từ environment variable hoặc mặc định 8:00 AM
    const cronTime = process.env.VOTE_CRON_TIME || '0 8 * * *';
    
    // Tạo job gửi vote message hàng ngày
    const voteJob = cron.schedule(cronTime, async () => {
      await this.sendDailyVoteMessage();
    }, {
      scheduled: false,
      timezone: 'Asia/Ho_Chi_Minh'
    });

    this.jobs.set('dailyVote', voteJob);

    // Tạo job cleanup dữ liệu cũ (hàng tuần)
    const cleanupJob = cron.schedule('0 0 * * 0', async () => {
      await this.cleanupOldData();
    }, {
      scheduled: false,
      timezone: 'Asia/Ho_Chi_Minh'
    });

    this.jobs.set('weeklyCleanup', cleanupJob);

    // Khởi động tất cả jobs
    this.jobs.forEach((job, name) => {
      job.start();
      console.log(`✅ Started cron job: ${name}`);
    });

    console.log('✅ All cron jobs started successfully');
  }

  /**
   * Dừng scheduler
   */
  stop() {
    if (!this.isRunning) {
      console.log('⚠️ Cron scheduler is not running');
      return;
    }

    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`⏹️ Stopped cron job: ${name}`);
    });

    this.jobs.clear();
    this.isRunning = false;
    console.log('✅ Cron scheduler stopped');
  }

  /**
   * Gửi tin nhắn vote hàng ngày
   */
  async sendDailyVoteMessage() {
    try {
      console.log('📅 Sending daily vote message...');

      // Lấy danh sách group IDs từ environment variable
      const groupIds = this.getGroupIds();
      
      if (groupIds.length === 0) {
        console.log('⚠️ No group IDs configured for daily vote message');
        return;
      }

      // Gửi tin nhắn vote đến tất cả groups
      const promises = groupIds.map(groupId => 
        bot.sendVoteMessage(groupId).catch(error => {
          console.error(`❌ Error sending vote message to group ${groupId}:`, error);
        })
      );

      await Promise.allSettled(promises);

      // Lưu audit log
      await db.createAuditLog(null, 'DAILY_VOTE_SENT', {
        groupIds,
        timestamp: new Date().toISOString()
      });

      console.log('✅ Daily vote messages sent successfully');

    } catch (error) {
      console.error('❌ Error sending daily vote message:', error);
    }
  }

  /**
   * Cleanup dữ liệu cũ
   */
  async cleanupOldData() {
    try {
      console.log('🧹 Starting weekly cleanup...');

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Xóa sessions cũ hơn 30 ngày
      const deletedSessions = await db.prisma.session.deleteMany({
        where: {
          playDate: {
            lt: thirtyDaysAgo
          }
        }
      });

      // Xóa audit logs cũ hơn 90 ngày
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const deletedLogs = await db.prisma.auditLog.deleteMany({
        where: {
          createdAt: {
            lt: ninetyDaysAgo
          }
        }
      });

      // Lưu audit log cho cleanup
      await db.createAuditLog(null, 'WEEKLY_CLEANUP', {
        deletedSessions: deletedSessions.count,
        deletedLogs: deletedLogs.count,
        timestamp: new Date().toISOString()
      });

      console.log(`✅ Cleanup completed: ${deletedSessions.count} sessions, ${deletedLogs.count} logs deleted`);

    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }

  /**
   * Lấy danh sách group IDs từ environment variable
   */
  getGroupIds() {
    const groupIdsStr = process.env.GROUP_IDS || '';
    return groupIdsStr.split(',').filter(id => id.trim() !== '');
  }

  /**
   * Gửi tin nhắn vote ngay lập tức (cho testing)
   */
  async sendVoteNow() {
    console.log('🧪 Sending vote message now (manual trigger)...');
    await this.sendDailyVoteMessage();
  }

  /**
   * Lấy thông tin về các jobs đang chạy
   */
  getJobStatus() {
    const status = {};
    this.jobs.forEach((job, name) => {
      status[name] = {
        running: job.running,
        nextDate: job.nextDate(),
        lastDate: job.lastDate()
      };
    });
    return status;
  }

  /**
   * Thêm job tùy chỉnh
   */
  addCustomJob(name, cronExpression, task, options = {}) {
    if (this.jobs.has(name)) {
      throw new Error(`Job with name "${name}" already exists`);
    }

    const job = cron.schedule(cronExpression, task, {
      scheduled: false,
      timezone: 'Asia/Ho_Chi_Minh',
      ...options
    });

    this.jobs.set(name, job);
    
    if (this.isRunning) {
      job.start();
    }

    console.log(`✅ Added custom job: ${name}`);
    return job;
  }

  /**
   * Xóa job tùy chỉnh
   */
  removeCustomJob(name) {
    const job = this.jobs.get(name);
    if (job) {
      job.stop();
      this.jobs.delete(name);
      console.log(`✅ Removed custom job: ${name}`);
      return true;
    }
    return false;
  }
}

module.exports = new CronScheduler();
