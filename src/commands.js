const db = require('./db');
const { computeSession, generateSummaryReport } = require('./compute');

class CommandHandler {
  constructor() {
    this.commands = new Map();
    this.setupCommands();
  }

  setupCommands() {
    this.commands.set('court', this.handleCourtCommand.bind(this));
    this.commands.set('shuttle', this.handleShuttleCommand.bind(this));
    this.commands.set('summary', this.handleSummaryCommand.bind(this));
    this.commands.set('help', this.handleHelpCommand.bind(this));
    this.commands.set('stats', this.handleStatsCommand.bind(this));
    this.commands.set('reset', this.handleResetCommand.bind(this));
    this.commands.set('vote', this.handleVoteCommand.bind(this));
    this.commands.set('createsession', this.handleCreateSessionCommand.bind(this));
    this.commands.set('complete', this.handleCompleteSessionCommand.bind(this));
    this.commands.set('paid', this.handleMarkPaidCommand.bind(this));
    this.commands.set('payments', this.handlePaymentsCommand.bind(this));
    this.commands.set('mystats', this.handleMyStatsCommand.bind(this));
    this.commands.set('myvotes', this.handleMyVotesCommand.bind(this)); // Xem danh sách vote hộ
    this.commands.set('rename', this.handleRenameCommand.bind(this)); // Đổi tên người vote hộ
    this.commands.set('notgoing', this.handleNotGoingCommand.bind(this));
    this.commands.set('ipaid', this.handleIPaidCommand.bind(this)); // User báo đã chuyển tiền
  }

  /**
   * Xử lý lệnh từ tin nhắn
   */
  async handleCommand(senderId, command, args = [], groupId = null) {
    const handler = this.commands.get(command.toLowerCase());
    if (handler) {
      // Truyền groupId cho command /vote
      if (command.toLowerCase() === 'vote') {
        return await handler(senderId, args, groupId);
      }
      return await handler(senderId, args);
    } else {
      return {
        success: false,
        message: `Lệnh "${command}" không tồn tại. Sử dụng /help để xem danh sách lệnh.`
      };
    }
  }

  /**
   * Xử lý lệnh /court
   */
  async handleCourtCommand(senderId, args) {
    try {
      if (args.length === 0) {
        return {
          success: false,
          message: 'Sử dụng: /court <số_lượng>\nVí dụ: /court 2'
        };
      }

      const count = parseInt(args[0]);
      if (isNaN(count) || count < 0) {
        return {
          success: false,
          message: 'Số lượng sân phải là số nguyên dương hoặc 0.'
        };
      }

      // Lấy hoặc tạo session hôm nay
      let session = await db.getCurrentSession();
      if (!session) {
        const today = new Date();
        today.setHours(18, 0, 0, 0);
        session = await db.createSession(today);
      }

      // Cập nhật số sân
      await db.updateSessionCounts(session.id, count, session.shuttleCount);

      // Lưu audit log
      await db.createAuditLog(session.id, 'COURT_UPDATED', {
        userId: senderId,
        count,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        message: `✅ Đã cập nhật số sân: ${count}`
      };

    } catch (error) {
      console.error('❌ Error in court command:', error);
      return {
        success: false,
        message: 'Có lỗi xảy ra khi cập nhật số sân.'
      };
    }
  }

  /**
   * Xử lý lệnh /shuttle
   */
  async handleShuttleCommand(senderId, args) {
    try {
      if (args.length === 0) {
        return {
          success: false,
          message: 'Sử dụng: /shuttle <số_lượng>\nVí dụ: /shuttle 10'
        };
      }

      const count = parseInt(args[0]);
      if (isNaN(count) || count < 0) {
        return {
          success: false,
          message: 'Số lượng cầu phải là số nguyên dương hoặc 0.'
        };
      }

      // Lấy hoặc tạo session hôm nay
      let session = await db.getCurrentSession();
      if (!session) {
        const today = new Date();
        today.setHours(18, 0, 0, 0);
        session = await db.createSession(today);
      }

      // Cập nhật số cầu
      await db.updateSessionCounts(session.id, session.courtCount, count);

      // Lưu audit log
      await db.createAuditLog(session.id, 'SHUTTLE_UPDATED', {
        userId: senderId,
        count,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        message: `✅ Đã cập nhật số cầu: ${count}`
      };

    } catch (error) {
      console.error('❌ Error in shuttle command:', error);
      return {
        success: false,
        message: 'Có lỗi xảy ra khi cập nhật số cầu.'
      };
    }
  }

  /**
   * Xử lý lệnh /summary
   */
  async handleSummaryCommand(senderId, args) {
    try {
      const session = await db.getCurrentSession();
      if (!session) {
        return {
          success: false,
          message: 'Chưa có session hôm nay.'
        };
      }

      // Tính toán chi phí
      const result = await computeSession(session.id);
      
      // Cập nhật thống kê vào database
      await db.prisma.session.update({
        where: { id: session.id },
        data: {
          totalCost: result.total,
          computed: true,
          updatedAt: new Date()
        }
      });

      // ✅ XÓA TẤT CẢ PAYMENT CŨ VÀ TẠO LẠI MỖI LẦN SUMMARY
      // Điều này đảm bảo payment luôn được tính lại khi có thay đổi
      await db.prisma.payment.deleteMany({
        where: { sessionId: session.id }
      });

      // Tạo lại payment records với số liệu mới nhất
      for (const participant of result.participants) {
        await db.prisma.payment.create({
          data: {
            sessionId: session.id,
            userId: participant.userId,
            userName: participant.name,
            amount: participant.amount,
            paid: false
          }
        });
      }

      const report = generateSummaryReport(result);

      // Lưu audit log
      await db.createAuditLog(session.id, 'SUMMARY_REQUESTED', {
        userId: senderId,
        totalCost: result.total,
        participantCount: result.participants.length,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        message: report
      };

    } catch (error) {
      console.error('❌ Error in summary command:', error);
      return {
        success: false,
        message: 'Có lỗi xảy ra khi tạo báo cáo.'
      };
    }
  }

  /**
   * Xử lý lệnh /notgoing
   * Admin: /notgoing <tên_người> - đánh dấu người khác không đi
   * User: /notgoing - đánh dấu chính mình không đi
   */
  async handleNotGoingCommand(senderId, args) {
    try {
      const user = await db.getUserByFbId(senderId);
      if (!user) {
        return {
          success: false,
          message: '❌ Vui lòng đăng ký thông tin trước khi sử dụng lệnh này.'
        };
      }

      let session = await db.getCurrentSession();
      if (!session) {
        return {
          success: false,
          message: '❌ Chưa có session hôm nay.'
        };
      }

      // Kiểm tra session status
      if (session.status === 'completed') {
        return {
          success: false,
          message: '❌ Session này đã hoàn thành. Vui lòng chờ session mới!'
        };
      }

      let targetUser = user;
      let targetName = user.name;

      // Nếu có args và user là admin, tìm người khác
      if (args.length > 0 && user.isAdmin) {
        const searchName = args.join(' ').trim();
        const foundUser = await db.prisma.user.findFirst({
          where: {
            name: {
              contains: searchName,
              mode: 'insensitive'
            }
          }
        });

        if (!foundUser) {
          return {
            success: false,
            message: `❌ Không tìm thấy người tên "${searchName}"`
          };
        }

        targetUser = foundUser;
        targetName = foundUser.name;
      } else if (args.length > 0 && !user.isAdmin) {
        return {
          success: false,
          message: '❌ Bạn chỉ có thể đánh dấu chính mình không đi. Sử dụng: /notgoing'
        };
      }

      // Kiểm tra xem đã vote chưa
      const existingVote = await db.prisma.vote.findFirst({
        where: {
          sessionId: session.id,
          userId: targetUser.id,
          voteType: 'VOTE_NO'
        }
      });

      if (existingVote) {
        const dateStr = session.playDate.toLocaleDateString('vi-VN');
        return {
          success: false,
          message: `✅ ${targetName} đã được đánh dấu không đi cho ngày ${dateStr} rồi!`
        };
      }

      // Xóa vote cũ nếu có (VOTE_YES)
      await db.prisma.vote.deleteMany({
        where: {
          sessionId: session.id,
          userId: targetUser.id,
          voteType: 'VOTE_YES'
        }
      });

      // Tạo vote mới
      await db.createVote(session.id, targetUser.id, 'VOTE_NO');

      // Lưu audit log
      await db.createAuditLog(session.id, 'VOTE_NO_CREATED', {
        userId: targetUser.id,
        userName: targetName,
        adminId: user.isAdmin ? senderId : null,
        adminName: user.isAdmin ? user.name : null,
        timestamp: new Date().toISOString()
      });

      const dateStr = session.playDate.toLocaleDateString('vi-VN');
      return {
        success: true,
        message: `✅ Đã đánh dấu ${targetName} không đi cho ngày ${dateStr}`
      };

    } catch (error) {
      console.error('❌ Error in notgoing command:', error);
      return {
        success: false,
        message: '❌ Có lỗi xảy ra khi xử lý lệnh.'
      };
    }
  }

  /**
   * Xử lý lệnh /help
   */
  async handleHelpCommand(senderId, args) {
    const user = await db.getUserByFbId(senderId);
    const isAdmin = user?.isAdmin || false;

    let helpText = `🏸 Badminton Bot - Hướng dẫn sử dụng:

📋 Các lệnh cơ bản:
• /help - Hiển thị hướng dẫn này
• /stats - Xem thống kê vote hiện tại
• /mystats - Xem lịch sử thanh toán của bạn
• /myvotes - Xem danh sách người bạn vote hộ 📝
• /rename <tên cũ> <tên mới> - Đổi tên người vote hộ ✏️
• /ipaid - Báo bạn đã chuyển tiền ✨
`;

    if (isAdmin) {
      helpText += `
👑 Các lệnh Admin - Session:
• /createsession <ngày> - Tạo session mới
  Ví dụ: /createsession today
  Ví dụ: /createsession tomorrow
  Ví dụ: /createsession 2025-10-05
• /vote [group_id] - Gửi tin nhắn vote vào group
• /court <số> - Cập nhật số sân
• /shuttle <số> - Cập nhật số cầu  
• /summary - Xem báo cáo chi tiết
• /complete - Hoàn thành session & tạo payment records
• /notgoing <tên> - Đánh dấu người khác không đi
• /reset - Reset session hiện tại

👑 Các lệnh Admin - Payment:
• /payments - Xem danh sách thanh toán
• /paid <tên> - Đánh dấu đã thanh toán
  Ví dụ: /paid Nguyễn Văn A
`;
    }

    helpText += `
👤 Lệnh User:
• /notgoing - Đánh dấu chính mình không đi
• /mystats - Xem lịch sử thanh toán của bạn

🎯 Cách sử dụng:
1. Admin tạo session: /createsession tomorrow
2. Admin gửi vote: /vote (trong group)
3. Mọi người vote qua Messenger
4. Admin nhập số sân: /court 2
5. Admin nhập số cầu: /shuttle 10
6. Admin tính toán: /summary
7. Admin hoàn thành: /complete
8. Admin track thanh toán: /payments
9. Admin đánh dấu đã trả: /paid <tên>

💰 Cách tính tiền:
• Nữ: 40.000đ/lượt (cố định)
• Nam: chia đều phần còn lại
• Nếu không có nam: chia đều cho tất cả

📊 Giá cố định:
• Sân: 220.000đ/sân
• Cầu: 25.000đ/cầu`;

    return {
      success: true,
      message: helpText
    };
  }

  /**
   * Xử lý lệnh /stats
   */
  async handleStatsCommand(senderId, args) {
    try {
      const { getStatistics } = require('./compute');
      
      // Lấy thống kê 30 ngày qua
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const stats = await getStatistics(startDate, endDate);

      const statsText = `📊 Thống kê 30 ngày qua:

🏸 Tổng số buổi: ${stats.totalSessions}
💰 Tổng chi phí: ${stats.totalCost.toLocaleString('vi-VN')}đ
👥 Tổng lượt tham gia: ${stats.totalParticipants}
👨 Nam: ${stats.maleParticipants} lượt
👩 Nữ: ${stats.femaleParticipants} lượt
📈 Trung bình/buổi: ${stats.averageCostPerSession.toLocaleString('vi-VN')}đ
👥 Trung bình người/buổi: ${stats.averageParticipantsPerSession}`;

      return {
        success: true,
        message: statsText
      };

    } catch (error) {
      console.error('❌ Error in stats command:', error);
      return {
        success: false,
        message: 'Có lỗi xảy ra khi lấy thống kê.'
      };
    }
  }

  /**
   * Xử lý lệnh /reset
   */
  async handleResetCommand(senderId, args) {
    try {
      const session = await db.getCurrentSession();
      if (!session) {
        return {
          success: false,
          message: 'Chưa có session hôm nay để reset.'
        };
      }

      // Xóa tất cả votes của session hôm nay
      await db.prisma.vote.deleteMany({
        where: { sessionId: session.id }
      });

      // Reset counts về 0
      await db.updateSessionCounts(session.id, 0, 0);

      // Lưu audit log
      await db.createAuditLog(session.id, 'SESSION_RESET', {
        userId: senderId,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        message: '✅ Đã reset session hôm nay. Tất cả votes và số liệu đã được xóa.'
      };

    } catch (error) {
      console.error('❌ Error in reset command:', error);
      return {
        success: false,
        message: 'Có lỗi xảy ra khi reset session.'
      };
    }
  }

  /**
   * Xử lý lệnh /vote - Admin gửi tin nhắn vote vào group
   */
  async handleVoteCommand(senderId, args, groupId = null) {
    try {
      // Kiểm tra quyền admin
      const user = await db.getUserByFbId(senderId);
      if (!user || !user.isAdmin) {
        return {
          success: false,
          message: '❌ Chỉ admin mới có thể sử dụng lệnh này.'
        };
      }

      // Lấy groupId từ args hoặc parameter
      const targetGroupId = args.length > 0 ? args[0] : groupId;
      
      if (!targetGroupId) {
        return {
          success: false,
          message: 'Sử dụng: /vote <group_id> hoặc gọi lệnh này trong group để gửi vote message.'
        };
      }

      // Gửi tin nhắn vote vào group
      const bot = require('./bot');
      await bot.sendVoteMessage(targetGroupId);

      // Lưu audit log
      await db.createAuditLog(null, 'VOTE_MESSAGE_SENT', {
        adminId: senderId,
        adminName: user.name,
        groupId: targetGroupId,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        message: '✅ Đã gửi tin nhắn vote vào group!',
        skipReply: true // Không reply lại vì đã gửi vào group rồi
      };

    } catch (error) {
      console.error('❌ Error in vote command:', error);
      return {
        success: false,
        message: 'Có lỗi xảy ra khi gửi vote message.'
      };
    }
  }

  /**
   * Xử lý lệnh /createsession - Tạo session cho ngày cụ thể
   */
  async handleCreateSessionCommand(senderId, args) {
    try {
      // Kiểm tra quyền admin
      const user = await db.getUserByFbId(senderId);
      if (!user || !user.isAdmin) {
        return {
          success: false,
          message: '❌ Chỉ admin mới có thể tạo session.'
        };
      }

      if (args.length === 0) {
        return {
          success: false,
          message: 'Sử dụng: /createsession <ngày>\nVí dụ:\n• /createsession today\n• /createsession tomorrow\n• /createsession 2025-10-05'
        };
      }

      // Parse ngày
      let playDate;
      const dateArg = args[0].toLowerCase();
      
      if (dateArg === 'today' || dateArg === 'hôm nay') {
        playDate = new Date();
      } else if (dateArg === 'tomorrow' || dateArg === 'mai') {
        playDate = new Date();
        playDate.setDate(playDate.getDate() + 1);
      } else {
        playDate = new Date(args[0]);
        if (isNaN(playDate.getTime())) {
          return {
            success: false,
            message: 'Ngày không hợp lệ. Sử dụng format: YYYY-MM-DD'
          };
        }
      }

      playDate.setHours(18, 0, 0, 0);

      // Tạo session
      const session = await db.createSession(playDate);

      // Lưu audit log
      await db.createAuditLog(session.id, 'SESSION_CREATED', {
        adminId: senderId,
        adminName: user.name,
        playDate: playDate.toISOString(),
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        message: `✅ Đã tạo session cho ngày ${playDate.toLocaleDateString('vi-VN')}`
      };

    } catch (error) {
      console.error('❌ Error in createsession command:', error);
      return {
        success: false,
        message: 'Có lỗi xảy ra khi tạo session.'
      };
    }
  }

  /**
   * Xử lý lệnh /complete - Hoàn thành session và tạo payment records
   */
  async handleCompleteSessionCommand(senderId, args) {
    try {
      // Kiểm tra quyền admin
      const user = await db.getUserByFbId(senderId);
      if (!user || !user.isAdmin) {
        return {
          success: false,
          message: '❌ Chỉ admin mới có thể hoàn thành session.'
        };
      }

      const session = await db.getCurrentSession();
      if (!session) {
        return {
          success: false,
          message: 'Chưa có session hôm nay.'
        };
      }

      if (session.status === 'completed') {
        return {
          success: false,
          message: 'Session này đã hoàn thành rồi.'
        };
      }

      // Tính toán chi phí
      const { computeSession } = require('./compute');
      const result = await computeSession(session.id);

      // Cập nhật session
      await db.prisma.session.update({
        where: { id: session.id },
        data: {
          status: 'completed',
          computed: true,
          totalCost: result.totalCost
        }
      });

      // Tạo payment records
      for (const participant of result.participants) {
        await db.prisma.payment.upsert({
          where: {
            sessionId_userId: {
              sessionId: session.id,
              userId: participant.userId
            }
          },
          create: {
            sessionId: session.id,
            userId: participant.userId,
            userName: participant.name,
            amount: participant.amount,
            paid: false
          },
          update: {
            amount: participant.amount
          }
        });
      }

      // Lưu audit log
      await db.createAuditLog(session.id, 'SESSION_COMPLETED', {
        adminId: senderId,
        adminName: user.name,
        totalCost: result.totalCost,
        participantCount: result.participants.length,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        message: `✅ Đã hoàn thành session!\n💰 Tổng chi phí: ${result.totalCost.toLocaleString('vi-VN')}đ\n👥 ${result.participants.length} người cần thanh toán`
      };

    } catch (error) {
      console.error('❌ Error in complete command:', error);
      return {
        success: false,
        message: 'Có lỗi xảy ra khi hoàn thành session.'
      };
    }
  }

  /**
   * Xử lý lệnh /paid - Đánh dấu user đã thanh toán
   */
  async handleMarkPaidCommand(senderId, args) {
    try {
      // Kiểm tra quyền admin
      const user = await db.getUserByFbId(senderId);
      if (!user || !user.isAdmin) {
        return {
          success: false,
          message: '❌ Chỉ admin mới có thể đánh dấu thanh toán.'
        };
      }

      if (args.length === 0) {
        return {
          success: false,
          message: 'Sử dụng: /paid <tên_người>\nVí dụ: /paid Nguyễn Văn A'
        };
      }

      const userName = args.join(' ');
      const session = await db.getCurrentSession();
      
      if (!session) {
        return {
          success: false,
          message: 'Chưa có session hôm nay.'
        };
      }

      // Tìm payment record
      const payment = await db.prisma.payment.findFirst({
        where: {
          sessionId: session.id,
          userName: {
            contains: userName,
            mode: 'insensitive'
          }
        }
      });

      if (!payment) {
        return {
          success: false,
          message: `Không tìm thấy payment record cho "${userName}"`
        };
      }

      // Đánh dấu đã trả
      await db.prisma.payment.update({
        where: { id: payment.id },
        data: {
          paid: true,
          paidAt: new Date()
        }
      });

      // Lưu audit log
      await db.createAuditLog(session.id, 'PAYMENT_MARKED', {
        adminId: senderId,
        adminName: user.name,
        paymentId: payment.id,
        userName: payment.userName,
        amount: payment.amount,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        message: `✅ Đã đánh dấu ${payment.userName} đã thanh toán ${payment.amount.toLocaleString('vi-VN')}đ`
      };

    } catch (error) {
      console.error('❌ Error in paid command:', error);
      return {
        success: false,
        message: 'Có lỗi xảy ra khi đánh dấu thanh toán.'
      };
    }
  }

  /**
   * Xử lý lệnh /payments - Xem danh sách payments
   */
  async handlePaymentsCommand(senderId, args) {
    try {
      const session = await db.getCurrentSession();
      if (!session) {
        return {
          success: false,
          message: 'Chưa có session hôm nay.'
        };
      }

      const payments = await db.prisma.payment.findMany({
        where: { sessionId: session.id },
        orderBy: { amount: 'desc' }
      });

      if (payments.length === 0) {
        return {
          success: false,
          message: 'Chưa có payment records. Hãy chạy /complete trước.'
        };
      }

      const paidCount = payments.filter(p => p.paid).length;
      const unpaidCount = payments.length - paidCount;
      const totalPaid = payments.filter(p => p.paid).reduce((sum, p) => sum + p.amount, 0);
      const totalUnpaid = payments.filter(p => !p.paid).reduce((sum, p) => sum + p.amount, 0);

      let message = `💰 Thanh toán cho ${session.playDate.toLocaleDateString('vi-VN')}\n`;
      message += `📊 Tổng quan: ${paidCount}/${payments.length} đã trả\n`;
      message += `✅ Đã thu: ${totalPaid.toLocaleString('vi-VN')}đ\n`;
      message += `⏳ Chưa thu: ${totalUnpaid.toLocaleString('vi-VN')}đ\n\n`;

      message += `📋 Chi tiết:\n`;
      payments.forEach(p => {
        const status = p.paid ? '✅' : '❌';
        message += `${status} ${p.userName}: ${p.amount.toLocaleString('vi-VN')}đ\n`;
      });

      return {
        success: true,
        message
      };

    } catch (error) {
      console.error('❌ Error in payments command:', error);
      return {
        success: false,
        message: 'Có lỗi xảy ra khi lấy danh sách payments.'
      };
    }
  }

  /**
   * Xử lý lệnh /mystats - User xem thống kê của mình
   */
  async handleMyStatsCommand(senderId, args) {
    try {
      const user = await db.getUserByFbId(senderId);
      if (!user) {
        return {
          success: false,
          message: 'Không tìm thấy thông tin user.'
        };
      }

      // Lấy payments 30 ngày qua
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const payments = await db.prisma.payment.findMany({
        where: {
          userId: user.id,
          createdAt: {
            gte: thirtyDaysAgo
          }
        },
        include: {
          session: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (payments.length === 0) {
        return {
          success: false,
          message: 'Bạn chưa có payment records nào trong 30 ngày qua.'
        };
      }

      const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
      const paidAmount = payments.filter(p => p.paid).reduce((sum, p) => sum + p.amount, 0);
      const unpaidAmount = totalAmount - paidAmount;
      const paidCount = payments.filter(p => p.paid).length;

      let message = `📊 Thống kê của ${user.name} (30 ngày qua)\n\n`;
      message += `💰 Tổng: ${totalAmount.toLocaleString('vi-VN')}đ\n`;
      message += `✅ Đã trả: ${paidAmount.toLocaleString('vi-VN')}đ (${paidCount}/${payments.length} lần)\n`;
      message += `⏳ Chưa trả: ${unpaidAmount.toLocaleString('vi-VN')}đ\n\n`;
      message += `📋 Chi tiết:\n`;

      payments.slice(0, 10).forEach(p => {
        const status = p.paid ? '✅' : '❌';
        const date = p.session.playDate.toLocaleDateString('vi-VN');
        message += `${status} ${date}: ${p.amount.toLocaleString('vi-VN')}đ\n`;
      });

      return {
        success: true,
        message
      };

    } catch (error) {
      console.error('❌ Error in mystats command:', error);
      return {
        success: false,
        message: 'Có lỗi xảy ra khi lấy thống kê.'
      };
    }
  }

  /**
   * Xử lý lệnh /myvotes - Xem danh sách người đã vote hộ
   */
  async handleMyVotesCommand(senderId, args) {
    try {
      const user = await db.getUserByFbId(senderId);
      if (!user) {
        return {
          success: false,
          message: '❌ Không tìm thấy user.'
        };
      }

      const session = await db.getCurrentSession();
      if (!session) {
        return {
          success: false,
          message: '❌ Chưa có session hôm nay.'
        };
      }

      // Lấy danh sách vote hộ của user
      const proxyVotes = await db.prisma.proxyVote.findMany({
        where: {
          sessionId: session.id,
          voterId: user.id
        },
        include: {
          targetUser: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      if (proxyVotes.length === 0) {
        return {
          success: true,
          message: `📋 Bạn chưa vote hộ ai trong session ${session.playDate.toLocaleDateString('vi-VN')}`
        };
      }

      // Tính tổng tiền phải trả cho tất cả người vote hộ
      const payment = await db.prisma.payment.findFirst({
        where: {
          sessionId: session.id,
          userId: user.id
        }
      });

      let message = `📋 Danh sách vote hộ của bạn:\n\n`;
      
      const males = proxyVotes.filter(pv => pv.targetUser.gender === 'male');
      const females = proxyVotes.filter(pv => pv.targetUser.gender === 'female');
      
      if (males.length > 0) {
        message += `👦 Nam (${males.length}):\n`;
        males.forEach((pv, index) => {
          message += `  ${index + 1}. ${pv.targetUser.name}\n`;
        });
        message += '\n';
      }
      
      if (females.length > 0) {
        message += `👧 Nữ (${females.length}):\n`;
        females.forEach((pv, index) => {
          message += `  ${index + 1}. ${pv.targetUser.name}\n`;
        });
      }

      if (payment) {
        message += `\n💰 Tổng tiền: ${payment.amount.toLocaleString('vi-VN')}đ`;
        message += payment.paid ? ' ✅ (Đã trả)' : ' ⏳ (Chưa trả)';
      }

      return {
        success: true,
        message: message
      };

    } catch (error) {
      console.error('❌ Error in myvotes command:', error);
      return {
        success: false,
        message: 'Có lỗi xảy ra khi lấy danh sách vote.'
      };
    }
  }

  /**
   * Xử lý lệnh /rename - Đổi tên người được vote hộ
   */
  async handleRenameCommand(senderId, args) {
    try {
      const user = await db.getUserByFbId(senderId);
      if (!user) {
        return {
          success: false,
          message: '❌ Không tìm thấy user.'
        };
      }

      if (args.length < 2) {
        return {
          success: false,
          message: 'Sử dụng: /rename <tên cũ> <tên mới>\nVí dụ: /rename "Nam 1" "Nguyễn Văn A"'
        };
      }

      const session = await db.getCurrentSession();
      if (!session) {
        return {
          success: false,
          message: '❌ Chưa có session hôm nay.'
        };
      }

      // Parse tên cũ và tên mới
      const fullArgs = args.join(' ');
      const match = fullArgs.match(/^["']?([^"']+)["']?\s+["']?([^"']+)["']?$/);
      
      let oldName, newName;
      if (match) {
        oldName = match[1].trim();
        newName = match[2].trim();
      } else {
        // Fallback: split by space, first is old name, rest is new name
        oldName = args[0];
        newName = args.slice(1).join(' ');
      }

      // Tìm tất cả vote hộ của user trong session này
      const proxyVotes = await db.prisma.proxyVote.findMany({
        where: {
          sessionId: session.id,
          voterId: user.id
        },
        include: {
          targetUser: true
        }
      });

      if (proxyVotes.length === 0) {
        return {
          success: false,
          message: `❌ Bạn chưa vote hộ ai trong session này.\n\nDùng /myvotes để xem danh sách.`
        };
      }

      // Tìm người có tên khớp (case-insensitive)
      const targetVote = proxyVotes.find(pv => 
        pv.targetUser.name.toLowerCase() === oldName.toLowerCase()
      );

      if (!targetVote) {
        const availableNames = proxyVotes.map(pv => pv.targetUser.name).join(', ');
        return {
          success: false,
          message: `❌ Không tìm thấy "${oldName}" trong danh sách vote hộ của bạn.\n\nCó: ${availableNames}\n\nDùng /myvotes để xem đầy đủ.`
        };
      }

      const targetUser = targetVote.targetUser;

      // Update tên
      await db.prisma.user.update({
        where: { id: targetUser.id },
        data: { name: newName }
      });

      // Log
      await db.createAuditLog(session.id, 'PROXY_USER_RENAMED', {
        voterId: user.id,
        voterName: user.name,
        oldName,
        newName,
        targetUserId: targetUser.id,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        message: `✅ Đã đổi tên "${oldName}" thành "${newName}"!\n\n💡 Giới tính vẫn giữ nguyên: ${targetUser.gender === 'male' ? '👦 Nam' : '👧 Nữ'}`
      };

    } catch (error) {
      console.error('❌ Error in rename command:', error);
      return {
        success: false,
        message: 'Có lỗi xảy ra khi đổi tên.'
      };
    }
  }

  /**
   * Xử lý lệnh /ipaid - User báo đã chuyển tiền
   */
  async handleIPaidCommand(senderId, args) {
    try {
      const user = await db.getUserByFbId(senderId);
      if (!user) {
        return {
          success: false,
          message: '❌ Không tìm thấy user.'
        };
      }

      const session = await db.getCurrentSession();
      if (!session) {
        return {
          success: false,
          message: '❌ Chưa có session hôm nay.'
        };
      }

      // Tìm payment của user
      const payment = await db.prisma.payment.findFirst({
        where: {
          sessionId: session.id,
          userId: user.id
        }
      });

      if (!payment) {
        return {
          success: false,
          message: '❌ Không tìm thấy payment cho bạn trong session này.'
        };
      }

      if (payment.paid) {
        return {
          success: true,
          message: `✅ Bạn đã được đánh dấu là đã trả ${payment.amount.toLocaleString('vi-VN')}đ rồi!`
        };
      }

      // Đánh dấu đã trả
      await db.prisma.payment.update({
        where: { id: payment.id },
        data: {
          paid: true,
          paidAt: new Date()
        }
      });

      // Tạo audit log
      await db.createAuditLog(session.id, 'USER_MARKED_PAID', {
        userId: user.id,
        userName: user.name,
        amount: payment.amount,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        message: `✅ Đã xác nhận bạn đã chuyển ${payment.amount.toLocaleString('vi-VN')}đ!\n\nAdmin sẽ kiểm tra và xác nhận. Cảm ơn bạn! 🙏`
      };

    } catch (error) {
      console.error('❌ Error in ipaid command:', error);
      return {
        success: false,
        message: 'Có lỗi xảy ra khi xử lý yêu cầu.'
      };
    }
  }

  /**
   * Lấy danh sách tất cả lệnh
   */
  getAvailableCommands() {
    return Array.from(this.commands.keys());
  }

  /**
   * Kiểm tra xem có phải lệnh hợp lệ không
   */
  isValidCommand(command) {
    return this.commands.has(command.toLowerCase());
  }
}

module.exports = new CommandHandler();
