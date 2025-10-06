# 🎯 Badminton Bot - Flow Diagram

## 📱 Luồng sử dụng chính

### 1. 🏸 Tham gia hôm nay

```
User → Bot: "menu" hoặc tin nhắn bất kỳ
Bot → User: Menu chính với Quick Replies
User → Bot: Chọn "🏸 Tham gia hôm nay"
Bot → User: Kiểm tra giới tính

IF chưa có giới tính:
  Bot → User: "Bạn là Nam hay Nữ?" (Quick Replies)
  User → Bot: Chọn "👦 Nam" hoặc "👧 Nữ"
  Bot → DB: Cập nhật gender
  Bot → DB: Tạo vote VOTE_YES
  Bot → User: "✅ [Tên] (👦/👧) đã tham gia hôm nay!"

ELSE đã có giới tính:
  Bot → DB: Tạo vote VOTE_YES
  Bot → User: "✅ [Tên] (👦/👧) đã tham gia hôm nay!"
```

### 2. ➕ Vote hộ

```
User → Bot: Chọn "➕ Vote hộ"
Bot → User: "Vui lòng nhập tên người bạn muốn vote hộ:"
User → Bot: Nhập tên (text)
Bot → User: "Giới tính của [Tên] là gì?" (Quick Replies)
User → Bot: Chọn "👦 Nam" hoặc "👧 Nữ"

Bot → DB: Tìm/tạo target user
Bot → DB: Tạo proxy vote
Bot → User: "✅ Đã thêm [Tên] (👦/👧) vào danh sách hôm nay"
```

### 3. 📋 Danh sách của tôi

```
User → Bot: Chọn "📋 Danh sách của tôi"
Bot → DB: Query proxy votes của user
Bot → User: Carousel với danh sách vote hộ

Mỗi item trong carousel:
- Title: Tên người
- Subtitle: Giới tính
- Buttons: "✏️ Đổi giới tính" | "🗑 Xóa"

User → Bot: Chọn action
IF "Đổi giới tính":
  Bot → User: "Đổi giới tính cho [Tên]?" (Quick Replies)
  User → Bot: Chọn giới tính mới
  Bot → DB: Cập nhật gender
  Bot → User: "✅ Đã đổi giới tính của [Tên] thành [Giới tính]"

IF "Xóa":
  Bot → DB: Xóa proxy vote
  Bot → User: "✅ Đã xóa vote cho [Tên]"
```

### 4. 📊 Tổng kết

```
User → Bot: Chọn "📊 Tổng kết"
Bot → DB: Query session + votes + proxy votes
Bot → DB: Tính toán chi phí
Bot → User: Báo cáo chi tiết

Format:
🏸 Kết quả ngày [Ngày]:
📊 Chi phí:
- Sân: X × 220k = XXXđ
- Cầu: Y × 25k = YYYđ
💰 Tổng: ZZZđ

👥 Tham gia:
- Nam: X lượt × XXXđ
- Nữ: Y lượt × 40kđ
```

## 🔄 JSON Examples

### Quick Replies - Menu chính

```json
{
  "recipient": { "id": "<PSID>" },
  "message": {
    "text": "🏸 **Badminton Bot**\n\nBạn muốn làm gì?",
    "quick_replies": [
      { "content_type": "text", "title": "🏸 Tham gia hôm nay", "payload": "JOIN_YES" },
      { "content_type": "text", "title": "➕ Vote hộ", "payload": "ADDVOTE_START" },
      { "content_type": "text", "title": "📋 Danh sách của tôi", "payload": "MYVOTES" },
      { "content_type": "text", "title": "📊 Tổng kết", "payload": "SUMMARY" }
    ]
  }
}
```

### Quick Replies - Chọn giới tính

```json
{
  "recipient": { "id": "<PSID>" },
  "message": {
    "text": "Bạn là Nam hay Nữ?",
    "quick_replies": [
      { "content_type": "text", "title": "👦 Nam", "payload": "SET_GENDER|male" },
      { "content_type": "text", "title": "👧 Nữ", "payload": "SET_GENDER|female" }
    ]
  }
}
```

### Generic Template - Danh sách vote hộ

```json
{
  "recipient": { "id": "<PSID>" },
  "message": {
    "attachment": {
      "type": "template",
      "payload": {
        "template_type": "generic",
        "elements": [
          {
            "title": "Nguyễn Văn A",
            "subtitle": "Giới tính: 👦 Nam",
            "buttons": [
              { "type": "postback", "title": "✏️ Đổi giới tính", "payload": "CHANGE_GENDER|Nguyễn Văn A" },
              { "type": "postback", "title": "🗑 Xóa", "payload": "REMOVEVOTE|Nguyễn Văn A" }
            ]
          },
          {
            "title": "Trần Thị B",
            "subtitle": "Giới tính: 👧 Nữ",
            "buttons": [
              { "type": "postback", "title": "✏️ Đổi giới tính", "payload": "CHANGE_GENDER|Trần Thị B" },
              { "type": "postback", "title": "🗑 Xóa", "payload": "REMOVEVOTE|Trần Thị B" }
            ]
          }
        ]
      }
    }
  }
}
```

## 🗄️ Database Operations

### Vote tham gia
```sql
INSERT INTO votes (sessionId, userId, voteType) VALUES (?, ?, 'VOTE_YES');
```

### Vote hộ
```sql
INSERT INTO proxy_votes (sessionId, voterId, targetUserId, voteType) VALUES (?, ?, ?, 'YES');
```

### Cập nhật giới tính
```sql
UPDATE users SET gender = ? WHERE id = ?;
```

### Query danh sách vote hộ
```sql
SELECT pv.*, u.name, u.gender 
FROM proxy_votes pv 
JOIN users u ON pv.targetUserId = u.id 
WHERE pv.sessionId = ? AND pv.voterId = ?;
```

## 🎯 Payload Mapping

| Payload | Action | Handler |
|---------|--------|---------|
| `JOIN_YES` | Tham gia hôm nay | `handleJoinYes()` |
| `JOIN_NO` | Không tham gia | `handleJoinNo()` |
| `ADDVOTE_START` | Bắt đầu vote hộ | `handleAddVoteStart()` |
| `MYVOTES` | Xem danh sách vote hộ | `handleMyVotes()` |
| `SUMMARY` | Xem tổng kết | `handleSummary()` |
| `SET_GENDER\|male` | Đặt giới tính Nam | `handleSetGender()` |
| `SET_GENDER\|female` | Đặt giới tính Nữ | `handleSetGender()` |
| `ADDVOTE\|Tên\|male` | Vote hộ Nam | `handleAddVote()` |
| `ADDVOTE\|Tên\|female` | Vote hộ Nữ | `handleAddVote()` |
| `CHANGE_GENDER\|Tên` | Đổi giới tính | `handleChangeGender()` |
| `REMOVEVOTE\|Tên` | Xóa vote hộ | `handleRemoveVote()` |

## ✅ Ưu điểm của Flow mới

1. **Trực quan**: Chỉ cần bấm nút, không cần nhớ command
2. **Minh bạch**: Tất cả thao tác đều được ghi log
3. **Linh hoạt**: Có thể vote hộ, đổi giới tính, xóa vote
4. **User-friendly**: Giao diện đẹp với Quick Replies và Carousel
5. **Scalable**: Dễ dàng thêm tính năng mới

## 🔧 Admin Functions

Admin vẫn có thể sử dụng command để:
- `/court X` - Nhập số sân
- `/shuttle Y` - Nhập số cầu  
- `/logs` - Xem logs
- `/reset` - Reset session

Hoặc sử dụng menu admin với giao diện trực quan.
