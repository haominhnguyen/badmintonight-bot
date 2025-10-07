# 🏸 Badminton Bot - Messenger Bot Quản Lý Chia Tiền Cầu Lông

Hệ thống Messenger Bot tự động quản lý và chia tiền cho các buổi chơi cầu lông, với tính năng vote, tính toán chi phí và báo cáo chi tiết.

## 🎯 Tính năng chính

### 📱 Giao diện người dùng
- **Quick Replies & Buttons**: Menu trực quan, dễ sử dụng
- **Responsive**: Hoạt động tốt trên cả 1-1 và group chat
- **Không spam group**: Bot chỉ reply riêng cho user, không làm phiền người khác

### 🗳️ Vote & Tham gia
- **Admin post vote**: Admin gửi lệnh `/vote` trong group để bắt đầu vote
- **Vote trong group**: Mọi người nhấn chọn ngay trong group chat
- **Thống kê real-time**: Sau mỗi vote, nhận ngay số liệu tổng hợp
- **Vote hộ**: Có thể vote hộ cho người khác với tên và giới tính
- **Quản lý vote hộ**: Xem, sửa, xóa danh sách vote hộ của mình

### 💰 Quản lý chi phí (Admin)
- **Nhập số liệu**: `/court <số>` và `/shuttle <số>`
- **Tính toán tự động**: Hệ thống tự động tính tiền theo quy tắc:
  - Nữ: 40.000đ/lượt (cố định)
  - Nam: chia đều phần còn lại
  - Nếu không có nam: chia đều cho tất cả
- **Báo cáo chi tiết**: `/summary` - Xem tổng kết với danh sách chi tiết
- **Thống kê tổng quan**: `/stats` - Xem thống kê 30 ngày qua

### 🔒 Bảo mật & Audit
- **Phân quyền rõ ràng**: Admin và User có quyền khác nhau
- **Audit logs**: Ghi lại toàn bộ thao tác để kiểm tra
- **Privacy**: Mỗi người chỉ thấy tin nhắn riêng của mình

### ⏰ Tự động hóa
- **Cron scheduler**: Có thể tự động gửi tin nhắn vote vào giờ cố định (tùy chọn)

## 🏗️ Kiến trúc

- **Backend**: Node.js + Express
- **Database**: PostgreSQL với Prisma ORM
- **Bot**: Facebook Messenger Webhook
- **Container**: Docker + Docker Compose
- **Scheduler**: node-cron

## 📂 Cấu trúc dự án

```
badminton-bot/
├── src/
│   ├── index.js        # Express server & webhook
│   ├── bot.js          # Messenger bot logic
│   ├── compute.js      # Business logic tính tiền
│   ├── db.js           # Database operations
│   ├── commands.js     # Command handlers
│   └── cron.js         # Scheduler
├── prisma/
│   └── schema.prisma   # Database schema
├── Dockerfile
├── docker-compose.yml
├── package.json
└── README.md
```

## 🚀 Cài đặt và chạy

### 1. Clone repository

```bash
git clone <repository-url>
cd badminton-bot
```

### 2. Cài đặt dependencies

```bash
npm install
```

### 3. Cấu hình environment

```bash
cp env.example .env
```

Chỉnh sửa file `.env`:

```env
# Facebook Messenger Configuration
PAGE_ACCESS_TOKEN=your_page_access_token_here
VERIFY_TOKEN=your_verify_token_here
WEBHOOK_URL=https://your-domain.com/webhook
GROUP_IDS=group_id_1,group_id_2

# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/badminton_bot?schema=public"

# Server Configuration
PORT=3000
NODE_ENV=development

# Cron Configuration
VOTE_CRON_TIME="0 8 * * *"  # 8:00 AM daily
```

### 4. Chạy với Docker (Khuyến nghị)

```bash
# Build và chạy tất cả services
docker-compose up --build

# Chạy trong background
docker-compose up -d --build
```

### 5. Chạy thủ công

```bash
# Chạy database migration
npx prisma migrate dev

# Khởi động server
npm start

# Development mode
npm run dev
```

## 📱 Cách sử dụng

### 1. Thiết lập Facebook Messenger

1. Tạo Facebook App tại [Facebook Developers](https://developers.facebook.com/)
2. Thêm Messenger product
3. Tạo Page Access Token
4. Cấu hình Webhook URL: `https://your-domain.com/webhook`
5. Verify Token: sử dụng token trong `.env`

### 2. Sử dụng bot

#### 👥 Vote trong Group (Khuyến nghị)

**Admin bắt đầu vote:**
```
1. Gửi lệnh /vote trong group
2. Bot post tin nhắn vote với Quick Replies
3. Mọi người nhấn chọn "Tôi tham gia" hoặc "Không tham gia"
4. Bot reply RIÊNG cho từng người với thống kê real-time
5. Group chat KHÔNG bị spam ✅
```

**User vote:**
- Nhấn nút "Tôi tham gia" → Nhận thống kê riêng
- Nhấn nút "Không tham gia" → Nhận xác nhận riêng
- Hoặc gửi text: "tham gia", "đi chơi", "có" → Vote YES
- Hoặc gửi text: "không", "no" → Vote NO

#### 💬 Chat 1-1 với Bot

**🏸 Tham gia hôm nay:**
1. Gửi "menu" hoặc "start" cho bot
2. Chọn "🏸 Tham gia hôm nay"
3. Bot hỏi giới tính (nếu chưa có)
4. Chọn Nam/Nữ → Xác nhận tham gia

**➕ Vote hộ:**
1. Chọn "➕ Vote hộ"
2. Nhập tên người muốn vote hộ
3. Chọn giới tính
4. Nhận xác nhận: "✅ [Tên] - Giới tính: [Nam/Nữ]"

**📋 Quản lý vote hộ:**
1. Chọn "📋 Danh sách của tôi"
2. Xem danh sách vote hộ (Carousel)
3. Có nút "✏️ Đổi giới tính" và "🗑 Xóa" cho từng người

**📊 Xem tổng kết:**
- Chọn "📊 Tổng kết"
- Xem báo cáo chi tiết với format đẹp

#### ⚙️ Admin Commands

```bash
/vote              # Gửi tin nhắn vote vào group
/court <số>        # Nhập số sân (vd: /court 2)
/shuttle <số>      # Nhập số cầu (vd: /shuttle 10)
/summary           # Xem báo cáo chi tiết
/stats             # Xem thống kê 30 ngày qua
/reset             # Reset session hôm nay
/help              # Xem hướng dẫn
```

### 3. Workflow hoàn chỉnh

```
1. 📱 Admin gửi /vote trong group
   → Mọi người nhấn chọn ngay trong group

2. 📊 Mỗi người nhận thống kê riêng
   "✅ Bạn đã tham gia! Tổng: 5 người..."

3. 🏸 Sau buổi chơi:
   Admin: /court 2
   Admin: /shuttle 10

4. 💰 Xem kết quả:
   Admin: /summary
   → Bot tính tiền và thông báo ai trả bao nhiêu

5. 📋 Cleanup:
   Bot tự động cleanup dữ liệu cũ hàng tuần
```

## 💰 Quy tắc tính tiền

- **Sân**: 220.000đ/sân
- **Cầu**: 25.000đ/cầu
- **Nữ**: 40.000đ/lượt (cố định)
- **Nam**: Chia đều phần còn lại
- **Không có nam**: Chia đều cho tất cả

### Ví dụ tính toán

```
Sân: 2 × 220k = 440k
Cầu: 10 × 25k = 250k
Tổng: 690k

Tham gia: 2 nam, 2 nữ
Nữ: 2 × 40k = 80k
Nam: (690k - 80k) ÷ 2 = 305k/người
```

## 🗄️ Database Schema

### Users
- Lưu thông tin người dùng Facebook
- Gender để phân biệt nam/nữ

### Sessions
- Mỗi ngày một session
- Lưu số sân, cầu, trạng thái tính toán

### Votes
- Lưu tất cả votes của người dùng
- Hỗ trợ vote nhiều lần

### AuditLogs
- Ghi lại toàn bộ thao tác
- Hỗ trợ kiểm tra và debug

## 🔧 API Endpoints

### Webhook
- `GET /webhook` - Verify webhook
- `POST /webhook` - Nhận tin nhắn từ Messenger

### API
- `GET /health` - Health check
- `GET /api/sessions` - Lấy danh sách sessions
- `GET /api/sessions/:id` - Lấy chi tiết session
- `GET /api/stats` - Thống kê tổng quan
- `GET /api/cron/status` - Trạng thái cron jobs
- `POST /api/cron/vote-now` - Gửi vote message ngay

## 🐳 Docker

### Build image
```bash
docker build -t badminton-bot .
```

### Run container
```bash
docker run -p 3000:3000 --env-file .env badminton-bot
```

### Docker Compose
```bash
# Development
docker-compose up --build

# Production
docker-compose -f docker-compose.prod.yml up -d
```

## 🔍 Monitoring & Logs

### Health Check
```bash
curl http://localhost:3000/health
```

### Logs
```bash
# Docker logs
docker-compose logs -f app

# Application logs
tail -f logs/app.log
```

### Database
```bash
# Prisma Studio
npx prisma studio

# Database shell
docker-compose exec postgres psql -U badminton_user -d badminton_bot
```

## 🚨 Troubleshooting

### Lỗi thường gặp

1. **Webhook verification failed**
   - Kiểm tra VERIFY_TOKEN trong `.env`
   - Đảm bảo webhook URL đúng

2. **Database connection failed**
   - Kiểm tra DATABASE_URL
   - Đảm bảo PostgreSQL đang chạy

3. **Cron jobs không chạy**
   - Kiểm tra VOTE_CRON_TIME format
   - Xem logs để debug

4. **Bot không gửi tin nhắn**
   - Kiểm tra PAGE_ACCESS_TOKEN
   - Kiểm tra GROUP_IDS

### Debug mode

```bash
# Enable debug logs
DEBUG=* npm start

# Check cron status
curl http://localhost:3000/api/cron/status
```

## 📈 Performance

- **Database**: Sử dụng connection pooling
- **Caching**: Cache kết quả tính toán
- **Rate limiting**: Giới hạn API calls
- **Monitoring**: Health checks và metrics

## 🔒 Security

- **Environment variables**: Tất cả secrets trong `.env`
- **Input validation**: Validate tất cả inputs
- **SQL injection**: Sử dụng Prisma ORM
- **Rate limiting**: Giới hạn webhook calls

## 🤝 Contributing

1. Fork repository
2. Tạo feature branch
3. Commit changes
4. Push to branch
5. Tạo Pull Request

## 📄 License

MIT License - xem file LICENSE để biết thêm chi tiết.

## 📞 Support

Nếu gặp vấn đề, vui lòng tạo issue trên GitHub hoặc liên hệ qua email.

---

**Lưu ý**: Đây là dự án demo, trong production cần thêm các tính năng bảo mật và monitoring.
