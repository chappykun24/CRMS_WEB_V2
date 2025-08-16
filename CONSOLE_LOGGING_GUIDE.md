# 🔍 Console Logging Guide - Debug JSON Parsing Issues

## 🎯 **What This Guide Covers**

This guide explains how to use the comprehensive console logging I've added to all your API endpoints to debug the "Unexpected end of JSON input" error.

## 📋 **Console Logs Added to Each API**

### **1. Debug API (`/api/debug`)**
- 🔍 Request details (method, URL, headers, timestamp)
- 🔍 Environment variable checks
- 🔍 Response preparation and sending
- ❌ Error handling and stack traces

### **2. Login API (`/api/auth/login`)**
- 🔐 Request details and body parsing
- 🔐 Environment variable validation
- 🔐 Database connection attempts
- 🔐 User query execution
- 🔐 Password verification (bcrypt + fallback)
- 🔐 Response preparation and sending
- ❌ Error handling at each step

### **3. Health Check API (`/api/health`)**
- 🏥 Request details and validation
- 🏥 Environment variable checks
- 🏥 Database connection testing
- 🏥 Connection pool management
- ❌ Database connection failures

### **4. Users API (`/api/users`)**
- 👥 Request details and validation
- 👥 Environment variable checks
- 👥 Database query execution
- 👥 User data retrieval
- ❌ Query failures and permissions

### **5. Setup Passwords API (`/api/setup-passwords`)**
- 🔑 Request details and validation
- 🔑 Environment variable checks
- 🔑 User retrieval and password hashing
- 🔑 Database updates for each user
- ❌ Setup failures and database errors

## 🚀 **How to View Console Logs**

### **Option 1: Vercel Dashboard (Recommended)**
1. Go to your Vercel dashboard
2. Select your CRMS project
3. Go to **Functions** tab
4. Click on any API function (e.g., `/api/auth/login`)
5. View **Function Logs** section
6. Look for logs with emojis: 🔍 🔐 🏥 👥 🔑

### **Option 2: Vercel CLI**
```bash
# View logs for all functions
vercel logs

# View logs for specific function
vercel logs --function api/auth/login

# Follow logs in real-time
vercel logs --follow
```

### **Option 3: Debug Page Console**
- Visit: `https://your-app.vercel.app/debug.html`
- The page shows a console section with real-time logs
- Each API test will show detailed logging information

## 🔍 **What to Look For in Logs**

### **✅ Successful Flow:**
```
🔐 [LOGIN] Request received: { method: 'POST', url: '/api/auth/login' }
🔐 [LOGIN] Processing login request...
🔐 [LOGIN] Environment variables check: { missing: [] }
🔐 [LOGIN] Environment variables OK, connecting to database...
🔐 [LOGIN] Pool created, extracting request data...
🔐 [LOGIN] Login attempt for email: admin@university.edu
🔐 [LOGIN] Querying database for user...
🔐 [LOGIN] User found: { id: 1, name: 'Admin User', role: 'ADMIN' }
🔐 [LOGIN] User approved, checking password...
🔐 [LOGIN] Attempting bcrypt comparison...
🔐 [LOGIN] Bcrypt comparison result: true
✅ [LOGIN] Password valid, preparing success response...
✅ [LOGIN] Login successful for user: admin@university.edu
```

### **❌ Missing Environment Variables:**
```
🔐 [LOGIN] Environment variables check: { 
  missing: ['VITE_NEON_HOST', 'VITE_NEON_DATABASE'] 
}
❌ [LOGIN] Missing environment variables: ['VITE_NEON_HOST', 'VITE_NEON_DATABASE']
```

### **❌ Database Connection Failed:**
```
🔐 [LOGIN] Environment variables OK, connecting to database...
🔐 [LOGIN] Pool created, extracting request data...
❌ [LOGIN] Error occurred: connection to server at ep-xxx.neon.tech failed
```

### **❌ User Not Found:**
```
🔐 [LOGIN] Executing query with email: wrong@email.com
🔐 [LOGIN] Query result: { rowsFound: 0, userData: null }
❌ [LOGIN] User not found for email: wrong@email.com
```

## 🐛 **Common Issues & Solutions**

### **Issue 1: "Missing environment variables"**
**Logs show:** `missing: ['VITE_NEON_HOST', 'VITE_NEON_DATABASE']`
**Solution:** Set environment variables in Vercel dashboard

### **Issue 2: "Database connection failed"**
**Logs show:** `connection to server at ep-xxx.neon.tech failed`
**Solution:** Check Neon database credentials and network access

### **Issue 3: "User not found"**
**Logs show:** `Query result: { rowsFound: 0 }`
**Solution:** Verify user exists in database or run password setup

### **Issue 4: "Bcrypt comparison failed"**
**Logs show:** `Bcrypt comparison failed, trying fallback...`
**Solution:** Run password setup to set working passwords

## 🔧 **Debugging Steps**

### **Step 1: Check Environment Variables**
1. Test debug endpoint: `/api/debug`
2. Look for logs showing environment variable status
3. Fix any missing variables in Vercel dashboard

### **Step 2: Test Database Connection**
1. Test health endpoint: `/api/health`
2. Look for database connection logs
3. Verify Neon database is accessible

### **Step 3: Test User Authentication**
1. Test login endpoint: `/api/auth/login`
2. Look for user query and password verification logs
3. Run password setup if needed: `/api/setup-passwords`

### **Step 4: Check Response Formatting**
1. Look for logs showing response preparation
2. Verify JSON responses are properly formatted
3. Check for any errors in response sending

## 📊 **Log Format Reference**

### **Log Levels:**
- 🔍 **Info**: General information and flow
- ✅ **Success**: Successful operations
- ❌ **Error**: Errors and failures
- ⚠️ **Warning**: Warnings and fallbacks

### **Log Structure:**
```
[EMOJI] [ENDPOINT] Message: details
```

### **Example:**
```
🔐 [LOGIN] Environment variables check: { missing: [] }
✅ [LOGIN] Password valid, preparing success response...
❌ [LOGIN] Error occurred: connection failed
```

## 🎯 **Quick Debug Commands**

```bash
# Deploy with logging
vercel --prod

# View function logs
vercel logs --function api/auth/login

# Test specific endpoint
curl -X POST https://your-app.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@university.edu","password":"password123"}'
```

## 🔍 **Troubleshooting Tips**

1. **Start with debug endpoint** - It has no database dependencies
2. **Check environment variables first** - Most common cause of JSON errors
3. **Follow the log flow** - Each step should have a corresponding log
4. **Look for error patterns** - Similar errors across endpoints indicate system issues
5. **Use the debug page** - Visual interface shows all test results

---

**🎉 With these comprehensive logs, you'll be able to pinpoint exactly where your JSON parsing issues are occurring!**
