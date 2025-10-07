# 🔐 Admin Panel - Hướng Dẫn Sử Dụng

## 📍 Truy Cập Admin Panel

**URL:** `https://your-domain.com/admin.html`

**Password:** `12345`

---

## 🎯 Các Chức Năng

### 1. 📅 Tạo Session

**Mục đích:** Tạo session mới cho ngày chơi cụ thể

**Cách sử dụng:**
1. Chọn ngày:
   - **Hôm nay:** Session cho ngày hiện tại
   - **Ngày mai:** Session cho ngày tiếp theo
   - **Chọn ngày khác:** Chọn date picker để chọn ngày cụ thể
2. Click **"Tạo Session"**

**Lưu ý:** 
- Mỗi ngày chỉ nên có 1 session
- Session tự động set thời gian là 18:00

---

### 2. 🏟️ Nhập Số Sân

**Mục đích:** Cập nhật số lượng sân cho session hiện tại

**Cách sử dụng:**
1. Nhập số sân (1-10)
2. Click **"Cập nhật"**

**Giá sân:** 
- Mặc định: 120,000đ/sân
- Có thể thay đổi trong file `compute.js`

---

### 3. 🏸 Nhập Số Cầu

**Mục đích:** Cập nhật số lượng cầu cho session hiện tại

**Cách sử dụng:**
1. Nhập số cầu (1-50)
2. Click **"Cập nhật"**

**Giá cầu:**
- Mặc định: 25,000đ/quả
- Có thể thay đổi trong file `compute.js`

---

### 4. 💰 Tính Toán Chi Phí

**Mục đích:** Tính toán chi phí và tạo payment records

**Cách sử dụng:**
1. Đảm bảo đã nhập đủ:
   - Số sân
   - Số cầu
   - Có người vote (qua Messenger bot)
2. Click **"Tính Toán"**

**Logic tính toán:**
- **Nữ đi:** 40,000đ/người (cố định)
- **Nam đi:** Chia đều (Chi phí - Tổng nữ) / Số nam
- **Không đi (Nam/Nữ):** Chỉ chia tiền sân, không chia cầu
- **Vote hộ:** Tiền tính vào người vote hộ, không phải người được vote hộ
- **Làm tròn:** Tất cả số tiền làm tròn lên hàng nghìn

**Output:**
- Báo cáo chi tiết hiển thị ngay trên màn hình
- Payment records tự động được tạo trong database
- **Mỗi lần tính:** Xóa payment cũ và tạo lại để đảm bảo đúng

---

### 5. ✅ Hoàn Thành Session

**Mục đích:** Đánh dấu session đã hoàn thành (không thể vote thêm)

**Cách sử dụng:**
1. Đảm bảo đã:
   - Tính toán chi phí
   - Thu đủ tiền
2. Click **"Hoàn Thành"**

**Lưu ý:**
- Sau khi hoàn thành, không ai có thể vote cho session này nữa
- Cần tạo session mới cho ngày tiếp theo

---

### 6. 💳 Đánh Dấu Đã Trả

**Mục đích:** Đánh dấu user đã thanh toán

**Cách sử dụng:**
1. Nhập tên user (có thể nhập một phần tên)
2. Click **"Đánh Dấu"**

**Ví dụ:**
- Tên đầy đủ: "Hào Minh Nguyễn"
- Có thể nhập: "Hào" hoặc "Minh" hoặc "Nguyễn"

**Lưu ý:**
- Tên không phân biệt hoa/thường
- Nếu có nhiều người trùng tên, sẽ mark người đầu tiên tìm thấy

---

### 7. 📋 Xem Thanh Toán

**Mục đích:** Xem danh sách payments của session hiện tại

**Cách sử dụng:**
1. Click **"Xem Danh Sách"**

**Output:**
```
✅ Hào Minh: 340,000đ
❌ Test User: 40,000đ
```

- ✅ = Đã trả
- ❌ = Chưa trả

---

### 8. 📊 Thống Kê Tổng Quan

**Mục đích:** Xem thống kê tổng quan hệ thống

**Cách sử dụng:**
1. Click **"Xem Thống Kê"**

**Output:**
- Tổng số sessions (hoàn thành/pending)
- Tổng số payments (đã trả/chưa trả)
- Tổng số users
- Top participants

---

### 9. 🔄 Reset Session

**Mục đích:** Xóa tất cả votes và proxy votes (NGUY HIỂM!)

**Cách sử dụng:**
1. Click **"Reset Session"**
2. Xác nhận trong popup

**⚠️ CẢNH BÁO:**
- Hành động này **KHÔNG THỂ HOÀN TÁC**
- Sẽ xóa:
  - Tất cả votes
  - Tất cả proxy votes
  - Tất cả payments
  - Reset số sân và số cầu về 0

**Khi nào dùng:**
- Khi nhập sai và cần làm lại từ đầu
- Khi test và cần clear data

---

## ⚡ Quick Actions

### 📊 Dashboard
- Quay về trang chủ
- Xem tổng quan sessions và payments

### 📋 Session Details
- Xem chi tiết session gần nhất
- Đánh dấu thanh toán trực tiếp

### 🔄 Refresh
- Tải lại trang admin panel

---

## 🔒 Bảo Mật

### Đăng Nhập
- Password mặc định: `12345`
- Session-based authentication
- Tự động đăng xuất khi đóng tab

### Thay Đổi Password
Để thay đổi password, edit file `/public/admin.html`:

```javascript
const ADMIN_PASSWORD = '12345'; // Đổi thành password mới
```

---

## 🚀 Workflow Chuẩn

### Trước Khi Chơi (1 ngày trước)
1. **Tạo Session** cho ngày chơi
2. Gửi link vote cho members qua group Messenger
3. Members vote qua Messenger bot

### Ngày Chơi (Sau khi chơi xong)
1. **Nhập số sân** đã chơi
2. **Nhập số cầu** đã dùng
3. **Tính toán chi phí**
4. Chia sẻ kết quả cho members
5. Thu tiền từng người
6. **Đánh dấu đã trả** khi nhận được tiền
7. Kiểm tra **Xem thanh toán** để đảm bảo đủ
8. **Hoàn thành session** khi thu đủ tiền

### Xem Thống Kê
- **Xem thanh toán:** Kiểm tra ai chưa trả
- **Thống kê tổng quan:** Xem tổng quan hệ thống
- Vào **Session Details** để xem chi tiết từng session

---

## 🆘 Troubleshooting

### Không đăng nhập được
- Kiểm tra password: `12345`
- Clear browser cache
- Thử incognito mode

### Không tìm thấy session
- Kiểm tra đã tạo session chưa
- Kiểm tra ngày session có đúng không
- Refresh trang

### Tính toán sai
1. Kiểm tra logic trong `compute.js`
2. Chạy lại **Tính toán chi phí**
3. Payments sẽ được tạo lại tự động

### Muốn làm lại từ đầu
1. Dùng **Reset Session**
2. Nhập lại số sân, số cầu
3. Tính toán lại

---

## 📞 Liên Hệ

Nếu có vấn đề hoặc cần hỗ trợ, liên hệ developer.

---

**Chúc quản lý hiệu quả! 🏸**

