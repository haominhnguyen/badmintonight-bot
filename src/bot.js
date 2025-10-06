const axios = require('axios');
const db = require('./db');

class MessengerBot {
  constructor() {
    this.pageAccessToken = process.env.PAGE_ACCESS_TOKEN;
    this.verifyToken = process.env.VERIFY_TOKEN;
    this.apiUrl = 'https://graph.facebook.com/v18.0/me/messages';
  }

  /**
   * Xác thực webhook
   */
  verifyWebhook(mode, token, challenge) {
    if (mode === 'subscribe' && token === this.verifyToken) {
      console.log('✅ Webhook verified');
      return challenge;
    } else {
      console.log('❌ Webhook verification failed');
      return null;
    }
  }

  /**
   * Gửi tin nhắn text
   */
  async sendTextMessage(recipientId, messageText) {
    try {
      const response = await axios.post(this.apiUrl, {
        recipient: { id: recipientId },
        message: { text: messageText }
      }, {
        params: { access_token: this.pageAccessToken }
      });

      console.log('✅ Message sent:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error sending message:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Gửi tin nhắn với quick replies
   */
  async sendQuickReplies(recipientId, messageText, quickReplies) {
    try {
      const response = await axios.post(this.apiUrl, {
        recipient: { id: recipientId },
        message: {
          text: messageText,
          quick_replies: quickReplies
        }
      }, {
        params: { access_token: this.pageAccessToken }
      });

      console.log('✅ Quick reply message sent:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error sending quick reply message:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Gửi tin nhắn với buttons
   */
  async sendButtons(recipientId, messageText, buttons) {
    try {
      const response = await axios.post(this.apiUrl, {
        recipient: { id: recipientId },
        message: {
          attachment: {
            type: 'template',
            payload: {
              template_type: 'button',
              text: messageText,
              buttons: buttons
            }
          }
        }
      }, {
        params: { access_token: this.pageAccessToken }
      });

      console.log('✅ Button message sent:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error sending button message:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Gửi tin nhắn với generic template
   */
  async sendGenericTemplate(recipientId, elements) {
    try {
      const response = await axios.post(this.apiUrl, {
        recipient: { id: recipientId },
        message: {
          attachment: {
            type: 'template',
            payload: {
              template_type: 'generic',
              elements: elements
            }
          }
        }
      }, {
        params: { access_token: this.pageAccessToken }
      });

      console.log('✅ Generic template sent:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error sending generic template:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Gửi tin nhắn vote buổi sáng
   */
  async sendVoteMessage(groupId) {
    const quickReplies = [
      {
        content_type: 'text',
        title: 'Tôi tham gia',
        payload: 'VOTE_YES'
      },
      {
        content_type: 'text',
        title: 'Không tham gia',
        payload: 'VOTE_NO'
      }
    ];

    const message = '🏸 Ai đi tối nay?\n\nHãy chọn để tham gia hoặc không tham gia:';
    
    return await this.sendQuickReplies(groupId, message, quickReplies);
  }

  /**
   * Gửi menu chính - Flow mới
   */
  async sendMainMenu(recipientId, isAdmin = false) {
    const quickReplies = [
      {
        content_type: 'text',
        title: '🏸 Tham gia hôm nay',
        payload: 'JOIN_YES'
      },
      {
        content_type: 'text',
        title: '➕ Vote hộ',
        payload: 'ADDVOTE_START'
      },
      {
        content_type: 'text',
        title: '📋 Danh sách của tôi',
        payload: 'MYVOTES'
      },
      {
        content_type: 'text',
        title: '📊 Tổng kết',
        payload: 'SUMMARY'
      }
    ];

    if (isAdmin) {
      quickReplies.push({
        content_type: 'text',
        title: '⚙️ Quản lý admin',
        payload: 'ADMIN_MENU'
      });
    }

    const message = '🏸 **Badminton Bot**\n\nBạn muốn làm gì?';
    
    return await this.sendQuickReplies(recipientId, message, quickReplies);
  }

  /**
   * Gửi menu admin
   */
  async sendAdminMenu(recipientId) {
    const buttons = [
      {
        type: 'postback',
        title: '🏟️ Nhập số sân',
        payload: 'ADMIN_COURT'
      },
      {
        type: 'postback',
        title: '🏸 Nhập số cầu',
        payload: 'ADMIN_SHUTTLE'
      },
      {
        type: 'postback',
        title: '👥 Vote hộ người khác',
        payload: 'ADMIN_PROXY_VOTE'
      },
      {
        type: 'postback',
        title: '📋 Xem logs',
        payload: 'ADMIN_LOGS'
      },
      {
        type: 'postback',
        title: '🔄 Reset hôm nay',
        payload: 'ADMIN_RESET'
      },
      {
        type: 'postback',
        title: '⬅️ Quay lại',
        payload: 'MAIN_MENU'
      }
    ];

    const message = '⚙️ **Menu Quản Trị**\n\nChọn chức năng quản lý:';
    
    return await this.sendButtons(recipientId, message, buttons);
  }

  /**
   * Gửi menu chọn giới tính - Flow mới
   */
  async sendGenderMenu(recipientId, userName = null, targetName = null) {
    const quickReplies = [
      {
        content_type: 'text',
        title: '👦 Nam',
        payload: targetName ? `SET_GENDER|${targetName}|male` : 'SET_GENDER|male'
      },
      {
        content_type: 'text',
        title: '👧 Nữ',
        payload: targetName ? `SET_GENDER|${targetName}|female` : 'SET_GENDER|female'
      }
    ];

    // Nếu vote cho người khác
    if (targetName) {
      const message = `Giới tính của ${targetName} là gì?`;
      return await this.sendQuickReplies(recipientId, message, quickReplies);
    }
    
    // Nếu vote cho bản thân
    const displayName = userName || 'Bạn';
    const message = `${displayName} hãy chọn giới tính?`;
    
    return await this.sendQuickReplies(recipientId, message, quickReplies);
  }

  /**
   * Gửi menu vote hộ
   */
  async sendAddVoteMenu(recipientId) {
    const quickReplies = [
      {
        content_type: 'text',
        title: '➕ Vote hộ',
        payload: 'ADDVOTE_START'
      },
      {
        content_type: 'text',
        title: '📋 Danh sách của tôi',
        payload: 'MYVOTES'
      },
      {
        content_type: 'text',
        title: '📊 Tổng kết',
        payload: 'SUMMARY'
      },
      {
        content_type: 'text',
        title: '⬅️ Quay lại',
        payload: 'MAIN_MENU'
      }
    ];

    const message = 'Bạn muốn làm gì?';
    
    return await this.sendQuickReplies(recipientId, message, quickReplies);
  }

  /**
   * Gửi danh sách vote hộ của user - Carousel
   */
  async sendMyVotesCarousel(recipientId, votes) {
    if (votes.length === 0) {
      await this.sendTextMessage(recipientId, 'Bạn chưa vote hộ ai hôm nay.');
      return;
    }

    const elements = votes.map(vote => ({
      title: vote.targetUser.name,
      subtitle: `Giới tính: ${vote.targetUser.gender === 'male' ? '👦 Nam' : '👧 Nữ'}`,
      buttons: [
        {
          type: 'postback',
          title: '✏️ Đổi giới tính',
          payload: `CHANGE_GENDER|${vote.targetUser.name}`
        },
        {
          type: 'postback',
          title: '🗑 Xóa',
          payload: `REMOVEVOTE|${vote.targetUser.name}`
        }
      ]
    }));

    // Chia thành chunks 10 elements mỗi lần
    const chunks = [];
    for (let i = 0; i < elements.length; i += 10) {
      chunks.push(elements.slice(i, i + 10));
    }

    // Gửi chunk đầu tiên
    if (chunks.length > 0) {
      await this.sendGenericTemplate(recipientId, chunks[0]);
    }

    // Gửi các chunk còn lại
    for (let i = 1; i < chunks.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Delay 1s
      await this.sendGenericTemplate(recipientId, chunks[i]);
    }

    // Gửi nút quay lại
    const backButton = [{
      type: 'postback',
      title: '⬅️ Quay lại menu chính',
      payload: 'MAIN_MENU'
    }];

    await this.sendButtons(recipientId, 'Danh sách vote hộ của bạn:', backButton);
  }

  /**
   * Gửi danh sách người dùng để vote hộ
   */
  async sendUserListForProxyVote(recipientId, users) {
    const elements = users.map(user => ({
      title: `${user.name} (${user.gender === 'male' ? '👨' : '👩'})`,
      subtitle: `FB ID: ${user.fbId}`,
      buttons: [
        {
          type: 'postback',
          title: '✅ Vote tham gia',
          payload: `PROXY_VOTE_YES_${user.id}`
        },
        {
          type: 'postback',
          title: '❌ Vote không tham gia',
          payload: `PROXY_VOTE_NO_${user.id}`
        }
      ]
    }));

    // Chia thành các chunk 10 elements mỗi lần
    const chunks = [];
    for (let i = 0; i < elements.length; i += 10) {
      chunks.push(elements.slice(i, i + 10));
    }

    // Gửi chunk đầu tiên
    if (chunks.length > 0) {
      await this.sendGenericTemplate(recipientId, chunks[0]);
    }

    // Gửi các chunk còn lại
    for (let i = 1; i < chunks.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Delay 1s
      await this.sendGenericTemplate(recipientId, chunks[i]);
    }

    // Gửi nút quay lại
    const backButton = [{
      type: 'postback',
      title: '⬅️ Quay lại menu admin',
      payload: 'ADMIN_MENU'
    }];

    await this.sendButtons(recipientId, 'Chọn người để vote hộ:', backButton);
  }

  /**
   * Gửi menu nhập số sân
   */
  async sendCourtInputMenu(recipientId) {
    const quickReplies = [
      { content_type: 'text', title: '0 sân', payload: 'COURT_0' },
      { content_type: 'text', title: '1 sân', payload: 'COURT_1' },
      { content_type: 'text', title: '2 sân', payload: 'COURT_2' },
      { content_type: 'text', title: '3 sân', payload: 'COURT_3' },
      { content_type: 'text', title: '4 sân', payload: 'COURT_4' },
      { content_type: 'text', title: '5 sân', payload: 'COURT_5' }
    ];

    const message = '🏟️ **Nhập số sân**\n\nChọn số sân đã chơi hôm nay:';
    
    return await this.sendQuickReplies(recipientId, message, quickReplies);
  }

  /**
   * Gửi menu nhập số cầu
   */
  async sendShuttleInputMenu(recipientId) {
    const quickReplies = [
      { content_type: 'text', title: '0 cầu', payload: 'SHUTTLE_0' },
      { content_type: 'text', title: '5 cầu', payload: 'SHUTTLE_5' },
      { content_type: 'text', title: '10 cầu', payload: 'SHUTTLE_10' },
      { content_type: 'text', title: '15 cầu', payload: 'SHUTTLE_15' },
      { content_type: 'text', title: '20 cầu', payload: 'SHUTTLE_20' },
      { content_type: 'text', title: '25 cầu', payload: 'SHUTTLE_25' }
    ];

    const message = '🏸 **Nhập số cầu**\n\nChọn số cầu đã sử dụng hôm nay:';
    
    return await this.sendQuickReplies(recipientId, message, quickReplies);
  }

  /**
   * Xử lý tin nhắn đến
   */
  async handleMessage(event) {
    try {
      const senderId = event.sender.id;
      const message = event.message;

      if (!message) return;

      // Lưu thông tin user nếu chưa có
      await this.ensureUserExists(senderId, event.sender);

      // Xử lý text message
      if (message.text) {
        await this.handleTextMessage(senderId, message.text);
      }

      // Xử lý quick reply
      if (message.quick_reply) {
        await this.handleQuickReply(senderId, message.quick_reply);
      }

    } catch (error) {
      console.error('❌ Error handling message:', error);
      await this.sendTextMessage(event.sender.id, 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau.');
    }
  }

  /**
   * Xử lý postback
   */
  async handlePostback(senderId, payload) {
    try {
      const user = await db.getUserByFbId(senderId);
      if (!user) {
        await this.sendTextMessage(senderId, 'Vui lòng đăng ký thông tin trước khi sử dụng.');
        return;
      }

      switch (payload) {
        case 'MAIN_MENU':
          await this.sendMainMenu(senderId, user.isAdmin);
          break;

        case 'ADMIN_MENU':
          if (user.isAdmin) {
            await this.sendAdminMenu(senderId);
          } else {
            await this.sendTextMessage(senderId, 'Bạn không có quyền truy cập menu admin.');
          }
          break;

        // Flow mới - Tham gia
        case 'JOIN_YES':
          await this.handleJoinYes(senderId, user);
          break;

        case 'JOIN_NO':
          await this.handleJoinNo(senderId, user);
          break;

        // Flow mới - Vote hộ
        case 'ADDVOTE_START':
          await this.handleAddVoteStart(senderId);
          break;

        case 'MYVOTES':
          await this.handleMyVotes(senderId, user);
          break;

        case 'SUMMARY':
          await this.handleSummary(senderId);
          break;

        // Admin functions
        case 'ADMIN_COURT':
          if (user.isAdmin) {
            await this.sendCourtInputMenu(senderId);
          } else {
            await this.sendTextMessage(senderId, 'Bạn không có quyền thực hiện chức năng này.');
          }
          break;

        case 'ADMIN_SHUTTLE':
          if (user.isAdmin) {
            await this.sendShuttleInputMenu(senderId);
          } else {
            await this.sendTextMessage(senderId, 'Bạn không có quyền thực hiện chức năng này.');
          }
          break;

        case 'ADMIN_PROXY_VOTE':
          if (user.isAdmin) {
            await this.handleProxyVoteMenu(senderId);
          } else {
            await this.sendTextMessage(senderId, 'Bạn không có quyền thực hiện chức năng này.');
          }
          break;

        case 'ADMIN_LOGS':
          if (user.isAdmin) {
            await this.handleViewLogs(senderId);
          } else {
            await this.sendTextMessage(senderId, 'Bạn không có quyền thực hiện chức năng này.');
          }
          break;

        case 'ADMIN_RESET':
          if (user.isAdmin) {
            await this.handleResetToday(senderId);
          } else {
            await this.sendTextMessage(senderId, 'Bạn không có quyền thực hiện chức năng này.');
          }
          break;

        // Vote hộ - chọn giới tính
        case 'PROXY_GENDER_MALE':
          await this.sendQuantityMenu(senderId, 'MALE');
          break;
        
        case 'PROXY_GENDER_FEMALE':
          await this.sendQuantityMenu(senderId, 'FEMALE');
          break;
        
        case 'PROXY_GENDER_BOTH':
          // Chọn số lượng nam trước
          await this.sendTextMessage(senderId, '👦 Bước 1/2: Chọn số lượng Nam');
          await this.sendQuantityMenu(senderId, 'MALE_BOTH');
          break;

        default:
          // Xử lý các payload động
          if (payload.startsWith('SET_GENDER|')) {
            const parts = payload.split('|');
            if (parts.length === 2) {
              // SET_GENDER|male hoặc SET_GENDER|female
              await this.handleSetGender(senderId, user, parts[1]);
            } else if (parts.length === 3) {
              // SET_GENDER|Name|male hoặc SET_GENDER|Name|female
              await this.handleSetGenderForTarget(senderId, user, parts[1], parts[2]);
            }
          } else if (payload.startsWith('PROXY_QTY_')) {
            // Parse payload: PROXY_QTY_MALE_5 hoặc PROXY_QTY_FEMALE_3 hoặc PROXY_QTY_MALE_BOTH_2 hoặc PROXY_QTY_FEMALE_BOTH_2_3
            const parts = payload.split('_');
            console.log('PROXY_QTY payload parts:', parts);
            
            if (parts[2] === 'MALE' && parts[3] === 'BOTH') {
              // Đã chọn số lượng nam, giờ chọn số lượng nữ
              const maleCount = parseInt(parts[4]);
              await this.sendTextMessage(senderId, `✅ Đã chọn ${maleCount} Nam\n\n👧 Bước 2/2: Chọn số lượng Nữ`);
              await this.sendQuantityMenu(senderId, `FEMALE_BOTH_${maleCount}`);
            } else if (parts[2] === 'FEMALE' && parts[3] === 'BOTH') {
              // Đã chọn cả 2: nam và nữ
              // Payload format: PROXY_QTY_FEMALE_BOTH_<maleCount>_<femaleCount>
              const maleCount = parseInt(parts[4]);
              const femaleCount = parseInt(parts[5]);
              console.log(`Creating bulk proxy vote: ${maleCount} males, ${femaleCount} females`);
              await this.handleBulkProxyVote(senderId, user, maleCount, femaleCount);
            } else {
              // Chỉ chọn 1 giới tính: PROXY_QTY_MALE_3 hoặc PROXY_QTY_FEMALE_2
              const gender = parts[2]; // MALE hoặc FEMALE
              const count = parseInt(parts[3]);
              console.log(`Creating single gender proxy vote: ${gender} ${count}`);
              if (gender === 'MALE') {
                await this.handleBulkProxyVote(senderId, user, count, 0);
              } else {
                await this.handleBulkProxyVote(senderId, user, 0, count);
              }
            }
          } else if (payload.startsWith('ADDVOTE|')) {
            const parts = payload.split('|');
            const targetName = parts[1];
            const gender = parts[2];
            await this.handleAddVote(senderId, user, targetName, gender);
          } else if (payload.startsWith('CHANGE_GENDER|')) {
            const targetName = payload.split('|')[1];
            await this.handleChangeGender(senderId, user, targetName);
          } else if (payload.startsWith('REMOVEVOTE|')) {
            const targetName = payload.split('|')[1];
            await this.handleRemoveVote(senderId, user, targetName);
          } else if (payload.startsWith('COURT_')) {
            const count = parseInt(payload.split('_')[1]);
            await this.handleCourtInput(senderId, count);
          } else if (payload.startsWith('SHUTTLE_')) {
            const count = parseInt(payload.split('_')[1]);
            await this.handleShuttleInput(senderId, count);
          } else if (payload.startsWith('PROXY_VOTE_')) {
            const parts = payload.split('_');
            const voteType = parts[2]; // YES or NO
            const userId = parseInt(parts[3]);
            await this.handleProxyVote(senderId, userId, voteType);
          } else {
            console.log('Unknown postback payload:', payload);
            await this.sendTextMessage(senderId, 'Chức năng chưa được hỗ trợ.');
          }
      }

    } catch (error) {
      console.error('❌ Error handling postback:', error);
      await this.sendTextMessage(senderId, 'Có lỗi xảy ra khi xử lý yêu cầu.');
    }
  }

  /**
   * Xử lý tin nhắn text
   */
  async handleTextMessage(senderId, text) {
    const lowerText = text.toLowerCase().trim();

    // Kiểm tra các từ khóa đặc biệt
    if (lowerText.includes('menu') || lowerText.includes('menu chính')) {
      const user = await db.getUserByFbId(senderId);
      await this.sendMainMenu(senderId, user?.isAdmin || false);
    } else if (lowerText.includes('help') || lowerText.includes('hướng dẫn')) {
      await this.sendHelpMessage(senderId);
    } else if (lowerText.includes('start') || lowerText.includes('bắt đầu')) {
      const user = await db.getUserByFbId(senderId);
      await this.sendMainMenu(senderId, user?.isAdmin || false);
    } else {
      // Tin nhắn không nhận diện - không làm gì (đã có menu từ quick reply)
      // Không cần reply để tránh spam
    }
  }

  /**
   * Xử lý vote hộ khi nhập tên
   */
  async handleVoteHoTen(senderId, user, targetName) {
    try {
      // Kiểm tra xem tên có hợp lệ không (ít nhất 2 ký tự)
      if (targetName.length < 2) {
        await this.sendTextMessage(senderId, 'Tên phải có ít nhất 2 ký tự. Vui lòng nhập lại:');
        return;
      }

      // Kiểm tra xem tên có chứa ký tự đặc biệt không
      if (!/^[a-zA-ZÀ-ỹ\s]+$/.test(targetName)) {
        await this.sendTextMessage(senderId, 'Tên chỉ được chứa chữ cái và khoảng trắng. Vui lòng nhập lại:');
        return;
      }

      // Gửi menu chọn giới tính cho người được vote hộ
      await this.sendGenderMenu(senderId, null, targetName);

    } catch (error) {
      console.error('❌ Error handling vote ho ten:', error);
      await this.sendTextMessage(senderId, 'Có lỗi xảy ra khi xử lý tên.');
    }
  }

  /**
   * Xử lý quick reply
   */
  async handleQuickReply(senderId, quickReply) {
    const payload = quickReply.payload;
    
    // Xử lý quick reply giống như postback
    await this.handlePostback(senderId, payload);
  }

  /**
   * Xử lý vote
   */
  async handleVote(senderId, voteType) {
    try {
      // Lấy hoặc tạo session hôm nay
      let session = await db.getCurrentSession();
      if (!session) {
        const today = new Date();
        today.setHours(18, 0, 0, 0); // 6 PM today
        session = await db.createSession(today);
      }

      // Lấy user
      const user = await db.getUserByFbId(senderId);
      if (!user) {
        await this.sendTextMessage(senderId, 'Vui lòng đăng ký thông tin trước khi vote.');
        return;
      }

      // Tạo vote
      await db.createVote(session.id, user.id, voteType);

      // Lưu audit log
      await db.createAuditLog(session.id, 'VOTE_CREATED', {
        userId: user.id,
        userName: user.name,
        voteType,
        timestamp: new Date().toISOString()
      });

      const response = voteType === 'VOTE_YES' 
        ? `✅ ${user.name} đã tham gia!` 
        : `❌ ${user.name} không tham gia.`;
      
      await this.sendTextMessage(senderId, response);

    } catch (error) {
      console.error('❌ Error handling vote:', error);
      await this.sendTextMessage(senderId, 'Có lỗi xảy ra khi xử lý vote. Vui lòng thử lại.');
    }
  }

  /**
   * Xử lý lệnh /court
   */
  async handleCourtCommand(senderId, text) {
    try {
      const count = parseInt(text.split(' ')[1]);
      if (isNaN(count) || count < 0) {
        await this.sendTextMessage(senderId, 'Sử dụng: /court <số_lượng>\nVí dụ: /court 2');
        return;
      }

      let session = await db.getCurrentSession();
      if (!session) {
        const today = new Date();
        today.setHours(18, 0, 0, 0);
        session = await db.createSession(today);
      }

      await db.updateSessionCounts(session.id, count, session.shuttleCount);

      // Lưu audit log
      await db.createAuditLog(session.id, 'COURT_UPDATED', {
        count,
        timestamp: new Date().toISOString()
      });

      await this.sendTextMessage(senderId, `✅ Đã cập nhật số sân: ${count}`);

    } catch (error) {
      console.error('❌ Error handling court command:', error);
      await this.sendTextMessage(senderId, 'Có lỗi xảy ra khi cập nhật số sân.');
    }
  }

  /**
   * Xử lý lệnh /shuttle
   */
  async handleShuttleCommand(senderId, text) {
    try {
      const count = parseInt(text.split(' ')[1]);
      if (isNaN(count) || count < 0) {
        await this.sendTextMessage(senderId, 'Sử dụng: /shuttle <số_lượng>\nVí dụ: /shuttle 10');
        return;
      }

      let session = await db.getCurrentSession();
      if (!session) {
        const today = new Date();
        today.setHours(18, 0, 0, 0);
        session = await db.createSession(today);
      }

      await db.updateSessionCounts(session.id, session.courtCount, count);

      // Lưu audit log
      await db.createAuditLog(session.id, 'SHUTTLE_UPDATED', {
        count,
        timestamp: new Date().toISOString()
      });

      await this.sendTextMessage(senderId, `✅ Đã cập nhật số cầu: ${count}`);

    } catch (error) {
      console.error('❌ Error handling shuttle command:', error);
      await this.sendTextMessage(senderId, 'Có lỗi xảy ra khi cập nhật số cầu.');
    }
  }

  /**
   * Xử lý lệnh /summary
   */
  async handleSummaryCommand(senderId) {
    try {
      const session = await db.getCurrentSession();
      if (!session) {
        await this.sendTextMessage(senderId, 'Chưa có session hôm nay.');
        return;
      }

      const { computeSession, generateSummaryReport } = require('./compute');
      const result = await computeSession(session.id);
      const report = generateSummaryReport(result);

      await this.sendTextMessage(senderId, report);

    } catch (error) {
      console.error('❌ Error handling summary command:', error);
      await this.sendTextMessage(senderId, 'Có lỗi xảy ra khi tạo báo cáo.');
    }
  }

  /**
   * Xử lý lệnh /help
   */
  async handleHelpCommand(senderId) {
    const helpText = `🏸 Badminton Bot - Hướng dẫn sử dụng:

📋 Các lệnh có sẵn:
• /court <số> - Cập nhật số sân
• /shuttle <số> - Cập nhật số cầu  
• /summary - Xem báo cáo chi tiết
• /help - Hiển thị hướng dẫn này

🎯 Cách sử dụng:
1. Vote tham gia bằng nút "Tôi tham gia"
2. Admin nhập số sân: /court 2
3. Admin nhập số cầu: /shuttle 10
4. Admin xem kết quả: /summary

💰 Cách tính tiền:
• Nữ: 40.000đ/lượt (cố định)
• Nam: chia đều phần còn lại
• Nếu không có nam: chia đều cho tất cả`;

    await this.sendTextMessage(senderId, helpText);
  }

  /**
   * Lấy thông tin user từ Facebook Graph API
   */
  async getUserInfoFromFacebook(userId) {
    try {
      const response = await axios.get(`https://graph.facebook.com/${userId}`, {
        params: {
          fields: 'name,gender',
          access_token: this.pageAccessToken
        }
      });
      
      return {
        name: response.data.name,
        gender: response.data.gender === 'female' ? 'female' : 'male'
      };
    } catch (error) {
      console.error('❌ Error fetching user info from Facebook:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Đảm bảo user tồn tại trong database
   */
  async ensureUserExists(senderId, senderInfo) {
    try {
      const existingUser = await db.getUserByFbId(senderId);
      
      if (!existingUser) {
        // Lấy thông tin từ Facebook Graph API
        const fbUserInfo = await this.getUserInfoFromFacebook(senderId);
        
        const userName = fbUserInfo?.name || senderInfo?.name || `User_${senderId}`;
        const gender = fbUserInfo?.gender || senderInfo?.gender || 'male';
        
        // Tạo user mới với thông tin từ Facebook
        await db.createOrUpdateUser(
          senderId,
          userName,
          gender
        );
        console.log(`✅ Created new user: ${userName} (gender: ${gender})`);
      } else if (existingUser && existingUser.name.startsWith('User_')) {
        // Nếu user có tên mặc định (User_ID) → cập nhật với tên thật từ Facebook
        const fbUserInfo = await this.getUserInfoFromFacebook(senderId);
        if (fbUserInfo?.name) {
          await db.prisma.user.update({
            where: { id: existingUser.id },
            data: { 
              name: fbUserInfo.name,
              gender: fbUserInfo.gender
            }
          });
          console.log(`✅ Updated user: ${fbUserInfo.name} (gender: ${fbUserInfo.gender})`);
        }
      }
    } catch (error) {
      console.error('❌ Error ensuring user exists:', error);
    }
  }

  // ==================== FLOW MỚI - CÁC PHƯƠNG THỨC XỬ LÝ ====================

  /**
   * Xử lý tham gia hôm nay - Flow mới
   */
  async handleJoinYes(senderId, user) {
    try {
      // Kiểm tra xem đã có giới tính THẬT chưa (không phải mặc định)
      const hasRealGender = user.gender && user.updatedAt > user.createdAt;
      
      if (!hasRealGender) {
        // Chưa set giới tính thật, hỏi lần đầu
        await this.sendGenderMenu(senderId, user.name);
        return;
      }

      // Đã có giới tính, thực hiện tham gia
      let session = await db.getCurrentSession();
      if (!session) {
        const today = new Date();
        today.setHours(18, 0, 0, 0);
        session = await db.createSession(today);
      }

      // Kiểm tra session status
      if (session.status === 'completed') {
        await this.sendTextMessage(senderId, '❌ Session này đã hoàn thành. Vui lòng chờ session mới!');
        return;
      }

      // Kiểm tra xem đã vote chưa
      const existingVote = await db.prisma.vote.findFirst({
        where: {
          sessionId: session.id,
          userId: user.id,
          voteType: 'VOTE_YES'
        }
      });

      if (existingVote) {
        const dateStr = session.playDate.toLocaleDateString('vi-VN');
        await this.sendTextMessage(senderId, `✅ Bạn đã vote tham gia cho ngày ${dateStr} rồi!`);
        return;
      }

      // Tạo vote
      await db.createVote(session.id, user.id, 'VOTE_YES');

      // Lưu audit log
      await db.createAuditLog(session.id, 'USER_JOINED', {
        userId: user.id,
        userName: user.name,
        gender: user.gender,
        timestamp: new Date().toISOString()
      });

      const genderText = user.gender === 'male' ? '👦 Nam' : '👧 Nữ';
      await this.sendTextMessage(senderId, `✅ ${user.name} (${genderText}) đã tham gia hôm nay!`);

    } catch (error) {
      console.error('❌ Error handling join yes:', error);
      await this.sendTextMessage(senderId, 'Có lỗi xảy ra khi tham gia.');
    }
  }

  /**
   * Xử lý không tham gia hôm nay
   */
  async handleJoinNo(senderId, user) {
    try {
      const session = await db.getCurrentSession();
      if (!session) {
        await this.sendTextMessage(senderId, 'Chưa có session hôm nay.');
        return;
      }

      // Xóa vote tham gia nếu có
      await db.prisma.vote.deleteMany({
        where: {
          sessionId: session.id,
          userId: user.id,
          voteType: 'VOTE_YES'
        }
      });

      // Lưu audit log
      await db.createAuditLog(session.id, 'USER_LEFT', {
        userId: user.id,
        userName: user.name,
        timestamp: new Date().toISOString()
      });

      await this.sendTextMessage(senderId, `❌ ${user.name} đã rút tên khỏi buổi chơi hôm nay.`);

    } catch (error) {
      console.error('❌ Error handling join no:', error);
      await this.sendTextMessage(senderId, 'Có lỗi xảy ra khi rút tên.');
    }
  }

  /**
   * Xử lý bắt đầu vote hộ
   */
  async handleAddVoteStart(senderId) {
    const quickReplies = [
      {
        content_type: 'text',
        title: '👦 Vote hộ Nam',
        payload: 'PROXY_GENDER_MALE'
      },
      {
        content_type: 'text',
        title: '👧 Vote hộ Nữ',
        payload: 'PROXY_GENDER_FEMALE'
      },
      {
        content_type: 'text',
        title: '👥 Vote hộ Cả 2',
        payload: 'PROXY_GENDER_BOTH'
      }
    ];

    await this.sendQuickReplies(senderId, '❓ Bạn muốn vote hộ cho ai?', quickReplies);
  }
  
  /**
   * Gửi menu chọn số lượng
   */
  async sendQuantityMenu(senderId, gender) {
    const quickReplies = [
      { content_type: 'text', title: '1 người', payload: `PROXY_QTY_${gender}_1` },
      { content_type: 'text', title: '2 người', payload: `PROXY_QTY_${gender}_2` },
      { content_type: 'text', title: '3 người', payload: `PROXY_QTY_${gender}_3` },
      { content_type: 'text', title: '4 người', payload: `PROXY_QTY_${gender}_4` },
      { content_type: 'text', title: '5 người', payload: `PROXY_QTY_${gender}_5` }
    ];

    // Determine gender text for display
    let genderText = 'Nam';
    if (gender.startsWith('FEMALE')) {
      genderText = 'Nữ';
    } else if (gender === 'MALE') {
      genderText = 'Nam';
    }
    
    await this.sendQuickReplies(senderId, `❓ Số lượng ${genderText}:`, quickReplies);
  }

  /**
   * Xử lý xem danh sách vote hộ của mình
   */
  async handleMyVotes(senderId, user) {
    try {
      const session = await db.getCurrentSession();
      if (!session) {
        await this.sendTextMessage(senderId, 'Chưa có session hôm nay.');
        return;
      }

      const votes = await db.prisma.proxyVote.findMany({
        where: {
          sessionId: session.id,
          voterId: user.id
        },
        include: {
          targetUser: true
        }
      });

      await this.sendMyVotesCarousel(senderId, votes);

    } catch (error) {
      console.error('❌ Error handling my votes:', error);
      await this.sendTextMessage(senderId, 'Có lỗi xảy ra khi lấy danh sách vote hộ.');
    }
  }

  /**
   * Xử lý xem tổng kết
   */
  async handleSummary(senderId) {
    try {
      const session = await db.getCurrentSession();
      if (!session) {
        await this.sendTextMessage(senderId, 'Chưa có session hôm nay.');
        return;
      }

      const { computeSession, generateSummaryReport } = require('./compute');
      const result = await computeSession(session.id);
      const report = generateSummaryReport(result);

      await this.sendTextMessage(senderId, report);

    } catch (error) {
      console.error('❌ Error handling summary:', error);
      await this.sendTextMessage(senderId, 'Có lỗi xảy ra khi tạo báo cáo.');
    }
  }

  /**
   * Xử lý đặt giới tính cho bản thân
   */
  async handleSetGender(senderId, user, gender) {
    try {
      await db.prisma.user.update({
        where: { id: user.id },
        data: { gender }
      });

      // Lưu audit log
      await db.createAuditLog(null, 'GENDER_CHANGED', {
        userId: user.id,
        userName: user.name,
        oldGender: user.gender,
        newGender: gender,
        timestamp: new Date().toISOString()
      });

      const genderText = gender === 'male' ? '👦 Nam' : '👧 Nữ';
      await this.sendTextMessage(senderId, `✅ ${user.name} - Giới tính: ${genderText}\n\nĐã cập nhật thông tin thành công!`);

      // Sau khi đặt giới tính, tự động tham gia
      await this.handleJoinYes(senderId, { ...user, gender });

    } catch (error) {
      console.error('❌ Error handling set gender:', error);
      await this.sendTextMessage(senderId, 'Có lỗi xảy ra khi đặt giới tính.');
    }
  }

  /**
   * Xử lý đặt giới tính cho người khác (vote hộ)
   */
  async handleSetGenderForTarget(senderId, user, targetName, gender) {
    try {
      // Tìm user theo tên
      const targetUser = await db.prisma.user.findFirst({
        where: { name: targetName }
      });

      if (!targetUser) {
        await this.sendTextMessage(senderId, `Không tìm thấy người tên "${targetName}".`);
        return;
      }

      // Cập nhật giới tính
      await db.prisma.user.update({
        where: { id: targetUser.id },
        data: { gender }
      });

      // Lưu audit log
      await db.createAuditLog(null, 'GENDER_CHANGED_FOR_TARGET', {
        voterId: user.id,
        voterName: user.name,
        targetUserId: targetUser.id,
        targetUserName: targetUser.name,
        oldGender: targetUser.gender,
        newGender: gender,
        timestamp: new Date().toISOString()
      });

      const genderText = gender === 'male' ? '👦 Nam' : '👧 Nữ';
      await this.sendTextMessage(senderId, `✅ ${targetName} - Giới tính: ${genderText}\n\nĐã cập nhật thông tin thành công!`);

    } catch (error) {
      console.error('❌ Error handling set gender for target:', error);
      await this.sendTextMessage(senderId, 'Có lỗi xảy ra khi đổi giới tính.');
    }
  }

  /**
   * Xử lý vote hộ
   */
  async handleAddVote(senderId, user, targetName, gender) {
    try {
      const session = await db.getCurrentSession();
      if (!session) {
        const today = new Date();
        today.setHours(18, 0, 0, 0);
        session = await db.createSession(today);
      }

      // Tìm hoặc tạo target user
      let targetUser = await db.prisma.user.findFirst({
        where: { name: targetName }
      });

      if (!targetUser) {
        // Tạo user mới với tên và giới tính
        targetUser = await db.prisma.user.create({
          data: {
            fbId: `proxy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: targetName,
            gender: gender
          }
        });
      } else {
        // Cập nhật giới tính nếu khác
        if (targetUser.gender !== gender) {
          await db.prisma.user.update({
            where: { id: targetUser.id },
            data: { gender }
          });
        }
      }

      // Xóa vote cũ nếu có
      await db.prisma.proxyVote.deleteMany({
        where: {
          sessionId: session.id,
          targetUserId: targetUser.id
        }
      });

      // Tạo vote mới
      await db.prisma.proxyVote.create({
        data: {
          sessionId: session.id,
          voterId: user.id,
          targetUserId: targetUser.id,
          voteType: 'YES'
        }
      });

      // Lưu audit log
      await db.createAuditLog(session.id, 'PROXY_VOTE_CREATED', {
        voterId: user.id,
        voterName: user.name,
        targetUserId: targetUser.id,
        targetUserName: targetUser.name,
        gender,
        timestamp: new Date().toISOString()
      });

      const genderText = gender === 'male' ? '👦 Nam' : '👧 Nữ';
      await this.sendTextMessage(senderId, `✅ Đã thêm ${targetName} (${genderText}) vào danh sách hôm nay`);

    } catch (error) {
      console.error('❌ Error handling add vote:', error);
      await this.sendTextMessage(senderId, 'Có lỗi xảy ra khi vote hộ.');
    }
  }

  /**
   * Xử lý đổi giới tính cho người đã vote hộ
   */
  async handleChangeGender(senderId, user, targetName) {
    try {
      const session = await db.getCurrentSession();
      if (!session) {
        await this.sendTextMessage(senderId, 'Chưa có session hôm nay.');
        return;
      }

      // Tìm target user
      const targetUser = await db.prisma.user.findFirst({
        where: { name: targetName }
      });

      if (!targetUser) {
        await this.sendTextMessage(senderId, `Không tìm thấy người tên "${targetName}".`);
        return;
      }

      // Kiểm tra xem có phải do user này vote hộ không
      const proxyVote = await db.prisma.proxyVote.findFirst({
        where: {
          sessionId: session.id,
          voterId: user.id,
          targetUserId: targetUser.id
        }
      });

      if (!proxyVote) {
        await this.sendTextMessage(senderId, `Bạn chưa vote hộ cho ${targetName}.`);
        return;
      }

      // Gửi menu chọn giới tính
      await this.sendGenderMenu(senderId, null, targetName);

    } catch (error) {
      console.error('❌ Error handling change gender:', error);
      await this.sendTextMessage(senderId, 'Có lỗi xảy ra khi đổi giới tính.');
    }
  }

  /**
   * Xử lý vote hộ hàng loạt
   */
  async handleBulkProxyVote(senderId, user, maleCount, femaleCount) {
    try {
      let session = await db.getCurrentSession();
      if (!session) {
        const today = new Date();
        today.setHours(18, 0, 0, 0);
        session = await db.createSession(today);
      }

      // Kiểm tra session status
      if (session.status === 'completed') {
        await this.sendTextMessage(senderId, '❌ Session này đã hoàn thành. Vui lòng chờ session mới!');
        return;
      }

      let createdCount = 0;
      const createdUsers = [];

      // Tạo users nam
      for (let i = 1; i <= maleCount; i++) {
        const name = `Nam ${i}`;
        let targetUser = await db.prisma.user.findFirst({
          where: { name }
        });

        if (!targetUser) {
          targetUser = await db.prisma.user.create({
            data: {
              fbId: `proxy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name,
              gender: 'male'
            }
          });
        }

        // Tạo proxy vote
        await db.prisma.proxyVote.deleteMany({
          where: {
            sessionId: session.id,
            targetUserId: targetUser.id
          }
        });

        await db.prisma.proxyVote.create({
          data: {
            sessionId: session.id,
            voterId: user.id,
            targetUserId: targetUser.id,
            voteType: 'VOTE_YES'
          }
        });

        createdUsers.push({ name, gender: 'male' });
        createdCount++;
      }

      // Tạo users nữ
      for (let i = 1; i <= femaleCount; i++) {
        const name = `Nữ ${i}`;
        let targetUser = await db.prisma.user.findFirst({
          where: { name }
        });

        if (!targetUser) {
          targetUser = await db.prisma.user.create({
            data: {
              fbId: `proxy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name,
              gender: 'female'
            }
          });
        }

        // Tạo proxy vote
        await db.prisma.proxyVote.deleteMany({
          where: {
            sessionId: session.id,
            targetUserId: targetUser.id
          }
        });

        await db.prisma.proxyVote.create({
          data: {
            sessionId: session.id,
            voterId: user.id,
            targetUserId: targetUser.id,
            voteType: 'VOTE_YES'
          }
        });

        createdUsers.push({ name, gender: 'female' });
        createdCount++;
      }

      // Lưu audit log
      await db.createAuditLog(session.id, 'BULK_PROXY_VOTE_CREATED', {
        voterId: user.id,
        voterName: user.name,
        maleCount,
        femaleCount,
        totalCount: createdCount,
        timestamp: new Date().toISOString()
      });

      // Tạo message thông báo
      let message = `✅ Đã thêm ${createdCount} người vào danh sách:\n\n`;
      
      const males = createdUsers.filter(u => u.gender === 'male');
      const females = createdUsers.filter(u => u.gender === 'female');
      
      if (males.length > 0) {
        message += `👦 Nam: ${males.map(u => u.name).join(', ')}\n`;
      }
      if (females.length > 0) {
        message += `👧 Nữ: ${females.map(u => u.name).join(', ')}`;
      }

      await this.sendTextMessage(senderId, message);

    } catch (error) {
      console.error('❌ Error handling bulk proxy vote:', error);
      await this.sendTextMessage(senderId, 'Có lỗi xảy ra khi vote hộ hàng loạt.');
    }
  }

  /**
   * Xử lý xóa vote hộ
   */
  async handleRemoveVote(senderId, user, targetName) {
    try {
      const session = await db.getCurrentSession();
      if (!session) {
        await this.sendTextMessage(senderId, 'Chưa có session hôm nay.');
        return;
      }

      // Tìm target user
      const targetUser = await db.prisma.user.findFirst({
        where: { name: targetName }
      });

      if (!targetUser) {
        await this.sendTextMessage(senderId, `Không tìm thấy người tên "${targetName}".`);
        return;
      }

      // Xóa vote hộ
      const deletedVote = await db.prisma.proxyVote.deleteMany({
        where: {
          sessionId: session.id,
          voterId: user.id,
          targetUserId: targetUser.id
        }
      });

      if (deletedVote.count === 0) {
        await this.sendTextMessage(senderId, `Bạn chưa vote hộ cho ${targetName}.`);
        return;
      }

      // Lưu audit log
      await db.createAuditLog(session.id, 'PROXY_VOTE_REMOVED', {
        voterId: user.id,
        voterName: user.name,
        targetUserId: targetUser.id,
        targetUserName: targetUser.name,
        timestamp: new Date().toISOString()
      });

      await this.sendTextMessage(senderId, `✅ Đã xóa vote cho ${targetName}`);

    } catch (error) {
      console.error('❌ Error handling remove vote:', error);
      await this.sendTextMessage(senderId, 'Có lỗi xảy ra khi xóa vote.');
    }
  }
}

module.exports = new MessengerBot();
