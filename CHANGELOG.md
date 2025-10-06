# 📝 Changelog - Payment Tracking & API System

## 🎉 Version 2.0 - Payment Tracking System (Oct 1, 2025)

### ✨ New Features

#### 1️⃣ **Session Status Management**
- ✅ Sessions có 2 trạng thái: `pending` và `completed`
- ✅ Khi `completed`, không cho phép vote thêm
- ✅ Hiển thị thông báo rõ ràng khi user vote vào session đã completed

#### 2️⃣ **Payment Tracking System**
- ✅ Tự động tạo payment records khi admin run `/complete`
- ✅ Track ai đã trả, ai chưa trả tiền
- ✅ Lưu thời gian thanh toán (`paidAt`)
- ✅ Admin có thể mark paid: `/paid <tên>`
- ✅ View payments: `/payments`

#### 3️⃣ **User Payment History**
- ✅ User xem lịch sử thanh toán: `/mystats`
- ✅ Hiển thị 30 ngày gần nhất
- ✅ Tổng đã trả, chưa trả
- ✅ Chi tiết từng session

#### 4️⃣ **Admin Commands**
Thêm 5 commands mới cho admin:

**Session Management:**
- `/createsession <ngày>` - Tạo session cho ngày cụ thể
  - Support: `today`, `tomorrow`, `YYYY-MM-DD`
- `/complete` - Hoàn thành session và tạo payment records

**Payment Management:**
- `/payments` - Xem danh sách thanh toán
- `/paid <tên>` - Đánh dấu đã thanh toán
- `/mystats` - User xem payment history của mình

#### 5️⃣ **REST API Endpoints**
Thêm 5 API endpoints mới:

- `GET /api/sessions` - List sessions (với pagination, filter by status)
- `GET /api/sessions/:id` - Chi tiết session (votes, payments, stats)
- `GET /api/sessions/:id/payments` - Payments của session
- `GET /api/users/:fbId/payments` - Payment history của user
- `GET /api/stats` - Overall statistics (sessions, payments, users, top participants)

#### 6️⃣ **Vote Protection**
- ✅ Check duplicate vote: "Bạn đã vote cho ngày X rồi!"
- ✅ Check session status: "Session này đã hoàn thành"
- ✅ Hiển thị ngày vote trong message

---

## 🗄️ Database Changes

### Updated `sessions` table:
```sql
ALTER TABLE sessions 
ADD COLUMN totalCost INTEGER DEFAULT 0,
ADD COLUMN status VARCHAR DEFAULT 'pending';
```

### New `payments` table:
```sql
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  sessionId INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
  userId INTEGER NOT NULL,
  userName VARCHAR NOT NULL,
  amount INTEGER NOT NULL,
  paid BOOLEAN DEFAULT false,
  paidAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  UNIQUE(sessionId, userId)
);
```

---

## 📊 Workflow Changes

### **Before (v1.0):**
```
1. Admin gửi vote
2. Users vote
3. Admin nhập court/shuttle
4. Admin /summary
5. ❌ No payment tracking
6. ❌ Manual tracking trong Excel
```

### **After (v2.0):**
```
1. Admin /createsession tomorrow
2. Admin gửi vote
3. Users vote
4. Admin nhập court/shuttle
5. Admin /summary (xem trước chi phí)
6. Admin /complete (tạo payment records)
7. ✅ Track payments: /payments
8. ✅ Mark paid: /paid <tên>
9. ✅ Users check: /mystats
10. ✅ Build dashboard với API
```

---

## 🔄 Migration Guide

### Step 1: Update Database Schema
```bash
docker-compose exec app npx prisma db push
```

### Step 2: Restart Application
```bash
docker-compose restart app
```

### Step 3: Test New Commands
```bash
# Test trong Messenger:
/createsession tomorrow
/complete
/payments
/paid Nguyễn Văn A
/mystats
```

### Step 4: Test API Endpoints
```bash
curl http://localhost:3100/api/sessions
curl http://localhost:3100/api/stats
```

---

## 📝 Breaking Changes

### ⚠️ Behavior Changes:
1. **Vote protection:** Users không thể vote lại vào cùng 1 session
2. **Session locking:** Sau khi `/complete`, session locked (không vote được)
3. **Payment records:** Phải run `/complete` mới có payment records

### ✅ Backward Compatible:
- Tất cả existing commands vẫn hoạt động bình thường
- Existing sessions tự động có `status = 'pending'`
- Existing data không bị ảnh hưởng

---

## 🎯 Use Cases

### Use Case 1: Admin Workflow
```
Admin: /createsession tomorrow
Admin: /vote (gửi vào group)
[Users vote qua Messenger]
Admin: /court 2
Admin: /shuttle 3
Admin: /summary
Admin: /complete
Admin: /payments
Admin: /paid Nguyễn Văn A
Admin: /paid Trần Thị B
```

### Use Case 2: User Check Payment
```
User: /mystats
Bot: 📊 Thống kê của Nguyễn Văn A (30 ngày qua)
     💰 Tổng: 198,000đ
     ✅ Đã trả: 132,000đ (2/3 lần)
     ⏳ Chưa trả: 66,000đ
```

### Use Case 3: Dashboard Integration
```javascript
// Build React/Vue dashboard
fetch('/api/stats')
  .then(res => res.json())
  .then(data => {
    displayStats(data.data);
  });
```

---

## 🐛 Bug Fixes

1. ✅ Fixed: User có thể vote nhiều lần vào cùng session
2. ✅ Fixed: Không có cách track payment
3. ✅ Fixed: Admin không biết ai đã/chưa trả tiền
4. ✅ Fixed: User không biết lịch sử thanh toán của mình
5. ✅ Fixed: Không có API để integrate dashboard

---

## 🚀 Performance Improvements

1. ✅ Database indexes cho payments table
2. ✅ Pagination cho API endpoints
3. ✅ Optimized queries với Prisma includes
4. ✅ Aggregation queries cho stats

---

## 📚 Documentation

- ✅ `API.md` - Đầy đủ API documentation
- ✅ `CHANGELOG.md` - Version history và migration guide
- ✅ Updated `README.md` - Thêm payment tracking features
- ✅ Updated `/help` command - Show new commands

---

## 🔮 Future Roadmap

### Phase 1: Enhanced Payment (Current - v2.0) ✅
- ✅ Payment tracking
- ✅ Admin mark paid/unpaid
- ✅ User payment history
- ✅ REST API

### Phase 2: Automation (Next - v2.1)
- ⏳ Auto send payment reminders
- ⏳ QR code payment integration
- ⏳ Bank transfer tracking
- ⏳ Auto mark paid from bank webhook

### Phase 3: Analytics (v2.2)
- ⏳ Dashboard web app
- ⏳ Charts và graphs
- ⏳ Export Excel/PDF reports
- ⏳ Monthly/yearly statistics

### Phase 4: Advanced Features (v2.3)
- ⏳ Multi-group support
- ⏳ Recurring sessions (weekly schedule)
- ⏳ Member management
- ⏳ Role-based permissions

---

## 💡 Tips & Best Practices

### For Admin:
1. **Always run `/complete` after the game** - Để tạo payment records
2. **Use `/payments` to track** - Check ai đã/chưa trả
3. **Mark paid immediately** - `/paid <tên>` ngay khi nhận tiền
4. **Create session in advance** - `/createsession tomorrow` để có ngày chính xác

### For Users:
1. **Check your stats regularly** - `/mystats` để biết còn nợ bao nhiêu
2. **Vote only once** - Bot sẽ nhắc nếu vote lại
3. **Pay on time** - Để admin có thể mark paid

### For Developers:
1. **Use API for dashboards** - Build beautiful UI với React/Vue
2. **Set up monitoring** - Track API performance
3. **Add authentication** - Protect API endpoints
4. **Enable CORS** - Nếu frontend ở domain khác

---

## 🎊 Credits

Developed by: Badminton Bot Team
Version: 2.0
Release Date: October 1, 2025

---

## 📞 Support

**Issues?**
1. Check logs: `docker-compose logs app`
2. Verify database: `docker-compose exec app npx prisma db pull`
3. Test API: `curl http://localhost:3100/health`

**Questions?**
Read full documentation in `API.md`

