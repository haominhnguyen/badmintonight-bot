# Gmail Notifications Setup Guide

## 📧 **Gmail App Password Setup**

### **1. Enable 2-Factor Authentication**
1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Click on **Security** in the left sidebar
3. Under **Signing in to Google**, click **2-Step Verification**
4. Follow the setup process to enable 2FA

### **2. Generate App Password**
1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Click on **Security** in the left sidebar
3. Under **Signing in to Google**, click **App passwords**
4. Select **Mail** as the app
5. Select **Other (Custom name)** as the device
6. Enter "GitHub Actions" as the name
7. Click **Generate**
8. **Copy the 16-character password** (you won't see it again!)

### **3. GitHub Secrets Setup**
1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Add these secrets:

#### **Required Secrets:**
- `GMAIL_USERNAME`: `haonmdotdev@gmail.com`
- `GMAIL_APP_PASSWORD`: `[16-character app password from step 2]`

#### **Example:**
```
GMAIL_USERNAME=haonmdotdev@gmail.com
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop
```

### **4. Test Notifications**
1. Push to `main` branch
2. Check your Gmail inbox for notifications
3. You should receive emails for:
   - ✅ **Deployment Success**
   - ❌ **Deployment Failure**
   - ⚠️ **Rollback Executed**

## 🔧 **Notification Types**

### **Success Notification:**
```
Subject: 🚀 Badminton Bot Deployment Success
To: haonmdotdev@gmail.com
Body: Badminton Bot has been successfully deployed to production!
```

### **Failure Notification:**
```
Subject: ❌ Badminton Bot Deployment Failed
To: haonmdotdev@gmail.com
Body: Badminton Bot deployment has failed!
```

### **Rollback Notification:**
```
Subject: ⚠️ Badminton Bot Rollback Executed
To: haonmdotdev@gmail.com
Body: Badminton Bot has been rolled back to the previous version
```

## 🚨 **Troubleshooting**

### **Common Issues:**

#### **1. "Authentication failed"**
- ✅ Check if 2FA is enabled
- ✅ Verify app password is correct
- ✅ Ensure GMAIL_USERNAME is correct

#### **2. "SMTP connection failed"**
- ✅ Check if GMAIL_APP_PASSWORD is correct
- ✅ Verify server settings (smtp.gmail.com:587)
- ✅ Check if account is not locked

#### **3. "No emails received"**
- ✅ Check spam folder
- ✅ Verify email address is correct
- ✅ Check GitHub Actions logs for errors

### **Debug Steps:**
1. Check GitHub Actions logs
2. Verify secrets are set correctly
3. Test with a simple email first
4. Check Gmail security settings

## 📱 **Mobile Setup**
- Enable Gmail notifications on your phone
- Add haonmdotdev@gmail.com to your contacts
- Set up VIP notifications for important emails

## 🔒 **Security Notes**
- App passwords are more secure than regular passwords
- Never share your app password
- Regenerate if compromised
- Use different passwords for different services

---

**✅ Setup Complete!** You'll now receive email notifications for all deployment events.
