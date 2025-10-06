const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const db = require('./db');
const bot = require('./bot');
const commands = require('./commands');
const cron = require('./cron');
const apiRoutes = require('./api/v1');
const { 
  sanitizeRequestBody, 
  sanitizeQueryParams, 
  sanitizeParams,
  rateLimitConfig,
  securityHeaders 
} = require('./middleware/sanitize');
const { 
  detectSuspiciousActivity,
  logSecurityEvent 
} = require('./middleware/auth');
const {
  logger,
  requestLogger,
  errorLogger,
  performanceMonitor,
  statsRecorder,
  getHealthData
} = require('./middleware/monitoring');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3100;

// Security Headers
app.use(helmet(securityHeaders));

// Monitoring Middleware
app.use(requestLogger);
app.use(performanceMonitor);
app.use(statsRecorder);

// Security Middleware
app.use(detectSuspiciousActivity);

// Input Sanitization
app.use(sanitizeRequestBody);
app.use(sanitizeQueryParams);
app.use(sanitizeParams);

  // CORS Configuration - Allow all origins for testing
const corsOptions = {
  origin: true, // Allow all origins for now
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  exposedHeaders: ['X-Total-Count', 'X-Page-Count']
};

app.use(cors(corsOptions));

// Rate Limiting
const generalLimiter = rateLimit(rateLimitConfig.general);
const adminLimiter = rateLimit(rateLimitConfig.admin);
const authLimiter = rateLimit(rateLimitConfig.auth);
const paymentLimiter = rateLimit(rateLimitConfig.payment);

app.use(generalLimiter); // Apply general rate limiting to all requests by default

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf.toString(); // Store raw body for potential signature verification
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from 'public' directory
app.use(express.static('public'));

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Badminton Bot API Documentation'
}));

// Health check endpoint
app.get('/health', (req, res) => {
  const healthData = getHealthData();
  res.json(healthData);
});

// API Stats endpoint - moved to v1

// API Routes with specific rate limiting
app.use('/api/v1/auth', authLimiter);
app.use('/api/v1/admin', adminLimiter);
app.use('/api/v1/payments', paymentLimiter);
app.use('/api/v1', apiRoutes); // New API routes

// Test endpoints - moved to v1

// Webhook verification endpoint
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const result = bot.verifyWebhook(mode, token, challenge);
  
  if (result) {
    res.status(200).send(result);
  } else {
    res.status(403).send('Forbidden');
  }
});

// Webhook message endpoint
app.post('/webhook', async (req, res) => {
  try {
    const body = req.body;

    // Kiểm tra xem có phải là tin nhắn từ Facebook không
    if (body.object === 'page') {
      // Xử lý từng entry
      for (const entry of body.entry) {
        const webhookEvent = entry.messaging[0];
        
        if (webhookEvent) {
          await handleWebhookEvent(webhookEvent);
        }
      }
      
      res.status(200).send('EVENT_RECEIVED');
    } else {
      res.status(404).send('Not Found');
    }
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Xử lý webhook event
async function handleWebhookEvent(webhookEvent) {
  try {
    const senderId = webhookEvent.sender.id;
    const recipientId = webhookEvent.recipient.id;

    // Kiểm tra xem có phải tin nhắn trong group không
    const isGroupMessage = webhookEvent.message?.is_echo === false && 
                          recipientId !== senderId;

    // Nếu là tin nhắn trong group, chỉ xử lý vote và reply riêng cho user
    if (isGroupMessage) {
      console.log(`📨 Group message detected from ${senderId}`);
      // Chỉ xử lý vote, không reply trong group
      if (webhookEvent.message) {
        await handleGroupMessage(webhookEvent);
      }
      return; // Không xử lý thêm
    }

    // Xử lý tin nhắn 1-1 bình thường
    if (webhookEvent.message) {
      await handleMessage(webhookEvent);
    }
    
    // Xử lý postback
    if (webhookEvent.postback) {
      await handlePostback(webhookEvent);
    }

  } catch (error) {
    console.error('❌ Error handling webhook event:', error);
  }
}

// Xử lý tin nhắn group (chỉ vote, reply riêng cho user)
async function handleGroupMessage(event) {
  const senderId = event.sender.id;
  const recipientId = event.recipient.id; // Group ID
  const message = event.message;

  if (!message) return;

  // Lưu thông tin user nếu chưa có
  await bot.ensureUserExists(senderId, event.sender);

  // Xử lý commands (admin)
  if (message.text && message.text.startsWith('/')) {
    const parts = message.text.split(' ');
    const command = parts[0].substring(1); // Bỏ dấu /
    const args = parts.slice(1);

    // Chỉ xử lý lệnh /vote trong group
    if (command.toLowerCase() === 'vote') {
      const result = await commands.handleCommand(senderId, command, args, recipientId);
      // Không cần reply vì đã gửi vào group
      if (!result.skipReply) {
        await bot.sendTextMessage(senderId, result.message);
      }
      return;
    }
  }

  // Xử lý vote commands
  if (message.text) {
    const text = message.text.toLowerCase().trim();
    
    // Kiểm tra các lệnh vote
    if (text.includes('tham gia') || text.includes('đi chơi') || 
        text === 'có' || text === 'yes') {
      await handleGroupVote(senderId, 'VOTE_YES');
    } else if (text.includes('không') || text === 'no') {
      await handleGroupVote(senderId, 'VOTE_NO');
    }
  }

  // Xử lý quick reply vote
  if (message.quick_reply) {
    const payload = message.quick_reply.payload;
    if (payload === 'VOTE_YES' || payload === 'VOTE_NO') {
      await handleGroupVote(senderId, payload);
    }
  }
}

// Xử lý vote từ group (gửi reply riêng cho user)
async function handleGroupVote(senderId, voteType) {
  try {
    // Lấy hoặc tạo session hôm nay
    let session = await db.getCurrentSession();
    if (!session) {
      const today = new Date();
      today.setHours(18, 0, 0, 0);
      session = await db.createSession(today);
    }

    // Lấy user
    const user = await db.getUserByFbId(senderId);
    if (!user) {
      // Gửi tin nhắn riêng cho user
      await bot.sendTextMessage(senderId, 'Vui lòng đăng ký thông tin trước khi vote.');
      return;
    }

    // Tạo hoặc cập nhật vote
    await db.createVote(session.id, user.id, voteType);

    // Lưu audit log
    await db.createAuditLog(session.id, 'VOTE_CREATED', {
      userId: user.id,
      userName: user.name,
      voteType,
      timestamp: new Date().toISOString()
    });

    // Lấy thống kê hiện tại
    const stats = await getVoteStats(session.id);
    
    // Gửi tin nhắn riêng cho user với thống kê
    const voteText = voteType === 'VOTE_YES' ? 'tham gia' : 'không tham gia';
    const message = `✅ Bạn đã ${voteText}!\n\n📊 Thống kê hiện tại:\n👥 Tổng: ${stats.total} người\n✅ Tham gia: ${stats.yes} người\n❌ Không tham gia: ${stats.no} người`;
    
    await bot.sendTextMessage(senderId, message);

  } catch (error) {
    console.error('❌ Error handling group vote:', error);
    await bot.sendTextMessage(senderId, 'Có lỗi xảy ra khi xử lý vote. Vui lòng thử lại.');
  }
}

// Lấy thống kê vote
async function getVoteStats(sessionId) {
  const votes = await db.prisma.vote.findMany({
    where: { sessionId },
    include: { user: true }
  });

  const yesVotes = votes.filter(v => v.voteType === 'VOTE_YES');
  const noVotes = votes.filter(v => v.voteType === 'VOTE_NO');

  return {
    total: votes.length,
    yes: yesVotes.length,
    no: noVotes.length,
    yesUsers: yesVotes.map(v => v.user.name),
    noUsers: noVotes.map(v => v.user.name)
  };
}

// Xử lý tin nhắn
async function handleMessage(event) {
  const senderId = event.sender.id;
  const message = event.message;

  if (!message) return;

  // Kiểm tra user có tồn tại chưa
  const existingUser = await db.getUserByFbId(senderId);
  const isNewUser = !existingUser;

  // Lưu thông tin user nếu chưa có
  await bot.ensureUserExists(senderId, event.sender);

  // Nếu là user mới, hiển thị menu lần đầu
  if (isNewUser && message.text && !message.quick_reply) {
    const user = await db.getUserByFbId(senderId);
    await bot.sendTextMessage(senderId, `Xin chào! 👋`);
    await bot.sendMainMenu(senderId, user?.isAdmin || false);
    return;
  }

  // Xử lý text message
  if (message.text) {
    await handleTextMessage(senderId, message.text);
  }

  // Xử lý quick reply
  if (message.quick_reply) {
    await handleQuickReply(senderId, message.quick_reply);
  }
}

// Xử lý tin nhắn text
async function handleTextMessage(senderId, text) {
  const lowerText = text.toLowerCase().trim();

  // Kiểm tra xem có phải là command không
  if (lowerText.startsWith('/')) {
    const parts = text.split(' ');
    const command = parts[0].substring(1); // Bỏ dấu /
    const args = parts.slice(1);

    const result = await commands.handleCommand(senderId, command, args);
    await bot.sendTextMessage(senderId, result.message);
  } else {
    // Xử lý tin nhắn từ bot.js
    await bot.handleTextMessage(senderId, text);
  }
}

// Xử lý quick reply
async function handleQuickReply(senderId, quickReply) {
  const payload = quickReply.payload;
  await bot.handleQuickReply(senderId, quickReply);
}

// Xử lý postback
async function handlePostback(event) {
  const senderId = event.sender.id;
  const payload = event.postback.payload;
  await bot.handlePostback(senderId, payload);
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  
  try {
    // Dừng cron jobs
    cron.stop();
    
    // Đóng database connection
    await db.disconnect();
    
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  
  try {
    cron.stop();
    await db.disconnect();
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

// Error handling middleware
app.use(errorLogger);
app.use((error, req, res, next) => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    ip: req.ip
  });
  
  // Log security event for errors
  logSecurityEvent('UNHANDLED_ERROR', req, { 
    error: error.message, 
    stack: error.stack 
  });
  
  res.status(error.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    code: error.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
    requestId: req.requestId
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Khởi động server
async function startServer() {
  try {
    // Kết nối database
    await db.connect();
    
    // Khởi động cron scheduler
    cron.start();
    
    // Khởi động server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Webhook URL: http://localhost:${PORT}/webhook`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      console.log(`🔐 Admin Panel: http://localhost:${PORT}/admin.html`);
      console.log(`📊 API Stats: http://localhost:${PORT}/api/stats`);
      console.log(`🔒 Security: Helmet, CORS, Rate Limiting enabled`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Khởi động server
startServer();
