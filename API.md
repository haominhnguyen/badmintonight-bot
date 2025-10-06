# 📚 Badminton Bot API Documentation

## 🌐 Base URL
```
http://localhost:3100
```

---

## 📋 REST API Endpoints

### 1. GET `/api/sessions`
Lấy danh sách tất cả sessions

**Query Parameters:**
- `limit` (optional, default: 10) - Số lượng records
- `offset` (optional, default: 0) - Vị trí bắt đầu
- `status` (optional) - Filter theo status: `pending` hoặc `completed`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "playDate": "2025-10-05T18:00:00.000Z",
      "courtCount": 2,
      "shuttleCount": 3,
      "totalCost": 660000,
      "computed": true,
      "status": "completed",
      "createdAt": "2025-10-01T10:00:00.000Z",
      "updatedAt": "2025-10-01T15:00:00.000Z",
      "_count": {
        "votes": 10,
        "payments": 10
      }
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

**Examples:**
```bash
# Lấy 10 sessions đầu tiên
curl http://localhost:3100/api/sessions

# Lấy sessions với pagination
curl http://localhost:3100/api/sessions?limit=20&offset=10

# Chỉ lấy completed sessions
curl http://localhost:3100/api/sessions?status=completed

# Chỉ lấy pending sessions
curl http://localhost:3100/api/sessions?status=pending
```

---

### 2. GET `/api/sessions/:id`
Lấy chi tiết 1 session cụ thể

**Path Parameters:**
- `id` (required) - Session ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "playDate": "2025-10-05T18:00:00.000Z",
    "courtCount": 2,
    "shuttleCount": 3,
    "totalCost": 660000,
    "computed": true,
    "status": "completed",
    "votes": [
      {
        "id": 1,
        "sessionId": 1,
        "userId": 1,
        "voteType": "VOTE_YES",
        "createdAt": "2025-10-01T10:00:00.000Z",
        "user": {
          "id": 1,
          "fbId": "123456",
          "name": "Nguyễn Văn A",
          "gender": "male"
        }
      }
    ],
    "proxyVotes": [
      {
        "id": 1,
        "sessionId": 1,
        "voterId": 1,
        "targetUserId": 2,
        "voteType": "VOTE_YES",
        "voter": {
          "id": 1,
          "fbId": "123456",
          "name": "Nguyễn Văn A"
        },
        "targetUser": {
          "id": 2,
          "name": "Nam 1",
          "gender": "male"
        }
      }
    ],
    "payments": [
      {
        "id": 1,
        "sessionId": 1,
        "userId": 1,
        "userName": "Nguyễn Văn A",
        "amount": 66000,
        "paid": true,
        "paidAt": "2025-10-01T16:00:00.000Z"
      }
    ],
    "stats": {
      "totalVotes": 10,
      "yesVotes": 8,
      "noVotes": 2,
      "proxyVotes": 3,
      "totalPaid": 528000,
      "totalUnpaid": 132000,
      "paymentCompletionRate": "80.0"
    }
  }
}
```

**Examples:**
```bash
# Lấy chi tiết session ID = 1
curl http://localhost:3100/api/sessions/1
```

---

### 3. GET `/api/sessions/:id/payments`
Lấy danh sách payments của 1 session

**Path Parameters:**
- `id` (required) - Session ID

**Query Parameters:**
- `paid` (optional) - Filter theo trạng thái: `true` (đã trả) hoặc `false` (chưa trả)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "sessionId": 1,
      "userId": 1,
      "userName": "Nguyễn Văn A",
      "amount": 66000,
      "paid": true,
      "paidAt": "2025-10-01T16:00:00.000Z",
      "createdAt": "2025-10-01T15:00:00.000Z",
      "updatedAt": "2025-10-01T16:00:00.000Z"
    }
  ],
  "summary": {
    "total": 660000,
    "paid": 528000,
    "unpaid": 132000,
    "count": 10,
    "paidCount": 8,
    "unpaidCount": 2
  }
}
```

**Examples:**
```bash
# Lấy tất cả payments của session 1
curl http://localhost:3100/api/sessions/1/payments

# Chỉ lấy payments đã trả
curl http://localhost:3100/api/sessions/1/payments?paid=true

# Chỉ lấy payments chưa trả
curl http://localhost:3100/api/sessions/1/payments?paid=false
```

---

### 4. GET `/api/users/:fbId/payments`
Lấy lịch sử thanh toán của 1 user

**Path Parameters:**
- `fbId` (required) - Facebook User ID

**Query Parameters:**
- `limit` (optional, default: 30) - Số lượng records

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "fbId": "123456",
      "name": "Nguyễn Văn A",
      "gender": "male"
    },
    "payments": [
      {
        "id": 1,
        "sessionId": 1,
        "userId": 1,
        "userName": "Nguyễn Văn A",
        "amount": 66000,
        "paid": true,
        "paidAt": "2025-10-01T16:00:00.000Z",
        "session": {
          "id": 1,
          "playDate": "2025-10-05T18:00:00.000Z",
          "status": "completed",
          "totalCost": 660000
        }
      }
    ],
    "summary": {
      "total": 198000,
      "paid": 132000,
      "unpaid": 66000,
      "count": 3,
      "paidCount": 2,
      "unpaidCount": 1
    }
  }
}
```

**Examples:**
```bash
# Lấy payment history của user
curl http://localhost:3100/api/users/123456/payments

# Lấy 50 payments gần nhất
curl http://localhost:3100/api/users/123456/payments?limit=50
```

---

### 5. GET `/api/overview`
Lấy thống kê tổng quan của hệ thống (sessions, payments, users)

**Response:**
```json
{
  "success": true,
  "data": {
    "sessions": {
      "total": 25,
      "completed": 20,
      "pending": 5,
      "recent": 8
    },
    "payments": {
      "total": 250,
      "paid": 200,
      "unpaid": 50,
      "totalRevenue": 13200000,
      "totalOutstanding": 3300000,
      "collectionRate": "80.0"
    },
    "users": {
      "total": 30,
      "male": 20,
      "female": 10
    },
    "topParticipants": [
      {
        "user": {
          "id": 1,
          "name": "Nguyễn Văn A",
          "gender": "male"
        },
        "participationCount": 15
      }
    ]
  }
}
```

**Examples:**
```bash
# Lấy thống kê tổng quan
curl http://localhost:3100/api/overview
```

**Note:** Endpoint `/api/stats` vẫn tồn tại cho compute statistics (backward compatible)

---

## 🤖 Bot Commands (Messenger)

### Commands cho tất cả Users:

#### `/help`
Hiển thị hướng dẫn sử dụng

#### `/stats`
Xem thống kê vote hiện tại của session

#### `/mystats`
Xem lịch sử thanh toán cá nhân (30 ngày qua)

---

### Commands cho Admin:

#### Session Management:

**`/createsession <ngày>`**
Tạo session mới cho ngày cụ thể
```
/createsession today
/createsession tomorrow
/createsession 2025-10-05
```

**`/vote [group_id]`**
Gửi tin nhắn vote vào group
```
/vote                 # Trong 1-1 chat
/vote 123456789       # Chỉ định group ID
```

**`/court <số>`**
Cập nhật số sân
```
/court 2
```

**`/shuttle <số>`**
Cập nhật số cầu
```
/shuttle 3
```

**`/summary`**
Xem báo cáo chi tiết và tính toán chi phí

**`/complete`**
Hoàn thành session và tạo payment records
- Session status → `completed`
- Tạo payment records cho tất cả participants
- Không cho phép vote thêm vào session này

**`/reset`**
Reset session hiện tại (xóa tất cả votes)

#### Payment Management:

**`/payments`**
Xem danh sách thanh toán của session hiện tại
- Hiển thị ai đã trả, ai chưa trả
- Tổng đã thu, chưa thu

**`/paid <tên>`**
Đánh dấu user đã thanh toán
```
/paid Nguyễn Văn A
```

---

## 🔄 Workflow Example

### 1️⃣ Admin tạo session mới:
```
Admin: /createsession tomorrow
Bot: ✅ Đã tạo session cho ngày 05/10/2025
```

### 2️⃣ Admin gửi vote vào group:
```
Admin: /vote (trong group chat)
Bot → Group: Quick replies [Tham gia] [Không tham gia]
```

### 3️⃣ Users vote qua Messenger:
```
User 1: Click [Tham gia]
Bot → User 1 (private): ✅ Bạn đã vote tham gia cho ngày 05/10/2025!
```

### 4️⃣ Admin nhập thông tin sân/cầu:
```
Admin: /court 2
Admin: /shuttle 3
```

### 5️⃣ Admin tính toán:
```
Admin: /summary
Bot: 📊 Báo cáo chi tiết...
     💰 Tổng chi phí: 660,000đ
```

### 6️⃣ Admin hoàn thành session:
```
Admin: /complete
Bot: ✅ Đã hoàn thành session!
     💰 Tổng chi phí: 660,000đ
     👥 10 người cần thanh toán
```

### 7️⃣ Admin track thanh toán:
```
Admin: /payments
Bot: 💰 Thanh toán cho 05/10/2025
     📊 Tổng quan: 0/10 đã trả
     ✅ Đã thu: 0đ
     ⏳ Chưa thu: 660,000đ
     
     📋 Chi tiết:
     ❌ Nguyễn Văn A: 66,000đ
     ❌ Trần Thị B: 40,000đ
     ...
```

### 8️⃣ Admin đánh dấu đã trả:
```
Admin: /paid Nguyễn Văn A
Bot: ✅ Đã đánh dấu Nguyễn Văn A đã thanh toán 66,000đ
```

### 9️⃣ User check payment history:
```
User: /mystats
Bot: 📊 Thống kê của Nguyễn Văn A (30 ngày qua)
     💰 Tổng: 198,000đ
     ✅ Đã trả: 132,000đ (2/3 lần)
     ⏳ Chưa trả: 66,000đ
```

---

## 🔐 Session Status Flow

```
┌─────────┐
│ pending │ ◄── Mới tạo, đang vote
└────┬────┘
     │
     │ /complete
     ▼
┌───────────┐
│ completed │ ◄── Đã hoàn thành, không cho vote thêm
└───────────┘
```

**Pending:**
- Users có thể vote
- Admin có thể update court/shuttle
- Chưa có payment records

**Completed:**
- Không cho vote thêm
- Đã tạo payment records
- Track thanh toán

---

## 💡 Key Features

### ✅ Vote Protection:
- Check xem user đã vote chưa
- Không cho vote vào session đã `completed`
- Hiển thị thông báo rõ ràng: "Bạn đã vote cho ngày X rồi!"

### ✅ Gender Management:
- Chỉ hỏi giới tính 1 lần
- Tự động lấy name/gender từ Facebook
- Hiển thị tên user trong message: "[Tên User] hãy chọn giới tính?"

### ✅ Proxy Voting:
- Chọn số lượng Nam/Nữ (1-5)
- Auto generate names: "Nam 1", "Nam 2", "Nữ 1", "Nữ 2"
- Không cần nhập tên thủ công

### ✅ Payment Tracking:
- Track ai đã/chưa trả tiền
- History 30 ngày qua
- Admin mark paid/unpaid
- API để integrate dashboard

### ✅ Private Replies:
- Bot chỉ reply private cho user
- Không spam group
- Thống kê chỉ gửi sau khi vote xong

---

## 🎯 Use Cases

### Use Case 1: Dashboard Integration
Bạn có thể build 1 web dashboard để:
- Hiển thị sessions và payments
- Track thanh toán real-time
- Export báo cáo Excel/PDF

```javascript
// Example: Fetch sessions for dashboard
fetch('http://localhost:3100/api/sessions?status=completed&limit=20')
  .then(res => res.json())
  .then(data => {
    console.log('Completed sessions:', data.data);
  });
```

### Use Case 2: Payment Reminder System
Tạo cronjob để gửi reminder cho users chưa trả:

```javascript
// Example: Find unpaid payments
fetch('http://localhost:3100/api/sessions/1/payments?paid=false')
  .then(res => res.json())
  .then(data => {
    data.data.forEach(payment => {
      // Send reminder to payment.userName
      console.log(`Remind ${payment.userName} to pay ${payment.amount}đ`);
    });
  });
```

### Use Case 3: Monthly Report
Tạo báo cáo tháng:

```javascript
// Example: Get overview stats
fetch('http://localhost:3100/api/overview')
  .then(res => res.json())
  .then(data => {
    console.log('Total revenue:', data.data.payments.totalRevenue);
    console.log('Top participants:', data.data.topParticipants);
  });
```

---

## 🚀 Testing

### Test Health Check:
```bash
curl http://localhost:3100/health
```

### Test API:
```bash
# Sessions
curl http://localhost:3100/api/sessions

# Session detail
curl http://localhost:3100/api/sessions/1

# Payments
curl http://localhost:3100/api/sessions/1/payments

# User payments
curl http://localhost:3100/api/users/YOUR_FB_ID/payments

# Overview stats
curl http://localhost:3100/api/overview

# Compute stats (existing)
curl http://localhost:3100/api/stats
```

---

## 📝 Notes

1. **Timestamp Format:** Tất cả timestamps đều theo UTC (ISO 8601)
2. **Currency:** Tất cả amounts tính bằng VNĐ (integer, không decimal)
3. **Pagination:** Default limit = 10, max = 100
4. **Error Handling:** All endpoints return `{ success: false, error: "message" }` on error
5. **CORS:** Nếu cần access từ frontend, thêm CORS middleware vào Express

---

## 🛠️ Future Enhancements

1. **Authentication:** Thêm API key hoặc JWT authentication
2. **Webhooks:** Gửi webhook khi có payment mới
3. **Export:** API để export Excel/PDF reports
4. **Notifications:** Push notification cho users chưa trả
5. **Analytics:** Thêm charts và graphs cho dashboard
6. **QR Code:** Generate QR code cho payment links

---

## 📞 Support

Nếu có vấn đề, check:
1. Docker logs: `docker-compose logs app`
2. Database connection: `docker-compose exec app npx prisma db pull`
3. Health check: `curl http://localhost:3100/health`

