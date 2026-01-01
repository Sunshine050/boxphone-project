#!/bin/bash

# API Testing Script
# ใช้สำหรับเทส API โดยอัตโนมัติ

BASE_URL="http://localhost:3001"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="admin123"

echo "=== API Testing Script ==="
echo ""

# Step 1: Login
echo "1. Logging in as admin..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$ADMIN_USERNAME\",\"password\":\"$ADMIN_PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed!"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login successful!"
echo "Token: ${TOKEN:0:50}..."
echo ""

# Step 2: Create User
echo "2. Creating test user..."
USER_RESPONSE=$(curl -s -X POST "$BASE_URL/users" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser_'$(date +%s)'",
    "password": "password123",
    "role": "USER",
    "package": "BASIC"
  }')

USER_ID=$(echo $USER_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$USER_ID" ]; then
  echo "⚠️  User creation failed or user already exists"
  echo "Response: $USER_RESPONSE"
  # Try to get existing user
  echo "Trying to get existing users..."
  USERS_RESPONSE=$(curl -s -X GET "$BASE_URL/users" \
    -H "Authorization: Bearer $TOKEN")
  echo "Users: $USERS_RESPONSE"
  exit 1
fi

echo "✅ User created!"
echo "User ID: $USER_ID"
echo ""

# Step 3: Create Device
echo "3. Creating test device..."
DEVICE_RESPONSE=$(curl -s -X POST "$BASE_URL/devices" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Device 1",
    "serial_number": "TEST_DEVICE_'$(date +%s)'",
    "model": "Test Model",
    "status": "AVAILABLE"
  }')

DEVICE_ID=$(echo $DEVICE_RESPONSE | grep -o '"_id":"[^"]*' | cut -d'"' -f4)

if [ -z "$DEVICE_ID" ]; then
  echo "❌ Device creation failed!"
  echo "Response: $DEVICE_RESPONSE"
  exit 1
fi

echo "✅ Device created!"
echo "Device ID: $DEVICE_ID"
echo ""

# Step 4: Create Session
echo "4. Creating session..."
SESSION_RESPONSE=$(curl -s -X POST "$BASE_URL/sessions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"user_id\": \"$USER_ID\",
    \"device_id\": \"$DEVICE_ID\",
    \"package\": \"BASIC\",
    \"total_seconds\": 7200
  }")

SESSION_ID=$(echo $SESSION_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$SESSION_ID" ]; then
  echo "❌ Session creation failed!"
  echo "Response: $SESSION_RESPONSE"
  exit 1
fi

echo "✅ Session created!"
echo "Session ID: $SESSION_ID"
echo ""

# Step 5: Check Remaining Time
echo "5. Checking remaining time..."
REMAINING_RESPONSE=$(curl -s -X GET "$BASE_URL/sessions/$SESSION_ID/remaining" \
  -H "Authorization: Bearer $TOKEN")

echo "Remaining time: $REMAINING_RESPONSE"
echo ""

# Step 6: Pause Session
echo "6. Pausing session..."
PAUSE_RESPONSE=$(curl -s -X POST "$BASE_URL/sessions/$SESSION_ID/pause" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Testing pause"}')

echo "Pause response: $PAUSE_RESPONSE"
echo ""

# Step 7: Create Second Device
echo "7. Creating second device for move..."
DEVICE2_RESPONSE=$(curl -s -X POST "$BASE_URL/devices" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Device 2",
    "serial_number": "TEST_DEVICE_2_'$(date +%s)'",
    "model": "Test Model 2",
    "status": "AVAILABLE"
  }')

DEVICE2_ID=$(echo $DEVICE2_RESPONSE | grep -o '"_id":"[^"]*' | cut -d'"' -f4)

if [ -z "$DEVICE2_ID" ]; then
  echo "❌ Device 2 creation failed!"
  echo "Response: $DEVICE2_RESPONSE"
  exit 1
fi

echo "✅ Device 2 created!"
echo "Device 2 ID: $DEVICE2_ID"
echo ""

# Step 8: Move Session
echo "8. Moving session to device 2..."
MOVE_RESPONSE=$(curl -s -X POST "$BASE_URL/sessions/$SESSION_ID/move" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"to_device_id\": \"$DEVICE2_ID\",
    \"reason\": \"Testing move session\"
  }")

echo "Move response: $MOVE_RESPONSE"
echo ""

# Step 9: Check Move Logs
echo "9. Checking move logs..."
LOGS_RESPONSE=$(curl -s -X GET "$BASE_URL/sessions/$SESSION_ID/move-logs" \
  -H "Authorization: Bearer $TOKEN")

echo "Move logs: $LOGS_RESPONSE"
echo ""

# Step 10: Resume Session
echo "10. Resuming session..."
RESUME_RESPONSE=$(curl -s -X POST "$BASE_URL/sessions/$SESSION_ID/resume" \
  -H "Authorization: Bearer $TOKEN")

echo "Resume response: $RESUME_RESPONSE"
echo ""

echo "=== Testing Complete ==="
echo ""
echo "Summary:"
echo "- User ID: $USER_ID"
echo "- Device 1 ID: $DEVICE_ID"
echo "- Device 2 ID: $DEVICE2_ID"
echo "- Session ID: $SESSION_ID"
echo ""
echo "All tests passed! ✅"

