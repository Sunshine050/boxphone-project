/**
 * Script สำหรับเชื่อมต่อ User กับ Device และสร้าง Session
 * 
 * วิธีใช้งาน:
 * 1. Login เป็น Admin เพื่อได้ token
 * 2. รัน script นี้: node tools/connect-user-device.js
 */

const BASE_URL = process.env.BACKEND_URL || 'http://127.0.0.1:3031';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123456';

// Configuration
const DEVICE_SERIAL = process.env.DEVICE_SERIAL || 'usb_device_1769707650580'; // Device serial number
const USERNAME = process.env.USERNAME || null; // Username to connect (null = connect all USER role users)
const SESSION_PACKAGE = process.env.SESSION_PACKAGE || 'BASIC';
const SESSION_SECONDS = parseInt(process.env.SESSION_SECONDS || '3600'); // 1 hour default

let adminToken = null;

// Helper function to make API calls
async function apiCall(endpoint, method = 'GET', body = null, token = null) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return data;
  } catch (error) {
    console.error(`❌ API Error (${endpoint}):`, error.message);
    throw error;
  }
}

// Step 1: Login as Admin
async function loginAsAdmin() {
  console.log('🔐 Logging in as Admin...');
  try {
    const result = await apiCall('/auth/login', 'POST', {
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD,
    });

    adminToken = result.access_token;
    console.log('✅ Login successful');
    console.log(`   User: ${result.user.username} (${result.user.role})`);
    return result;
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    process.exit(1);
  }
}

// Step 2: Get all Users
async function getAllUsers() {
  console.log('\n📋 Fetching all users...');
  try {
    const users = await apiCall('/users', 'GET', null, adminToken);
    console.log(`✅ Found ${users.length} user(s)`);
    return users;
  } catch (error) {
    console.error('❌ Failed to fetch users:', error.message);
    return [];
  }
}

// Step 3: Get all Devices
async function getAllDevices() {
  console.log('\n📱 Fetching all devices...');
  try {
    const devices = await apiCall('/devices', 'GET', null, adminToken);
    console.log(`✅ Found ${devices.length} device(s)`);
    return devices;
  } catch (error) {
    console.error('❌ Failed to fetch devices:', error.message);
    return [];
  }
}

// Step 4: Find Device by Serial Number
function findDeviceBySerial(devices, serialNumber) {
  const device = devices.find(d => d.serial_number === serialNumber);
  if (device) {
    // Device ID might be in _id or id field
    const deviceId = device._id || device.id || device._id?.toString();
    console.log(`✅ Found device: ${device.name || device.serial_number}`);
    console.log(`   Device ID: ${deviceId}`);
    console.log(`   Serial: ${device.serial_number}`);
    console.log(`   Status: ${device.status}`);
    return { ...device, id: deviceId };
  }
  console.log(`❌ Device not found with serial: ${serialNumber}`);
  return null;
}

// Step 5: Connect User to Device
async function connectUserToDevice(userId, deviceId) {
  console.log(`\n🔗 Connecting User ${userId} to Device ${deviceId}...`);
  try {
    const result = await apiCall(`/users/${userId}/connect-device`, 'POST', {
      device_id: deviceId,
    }, adminToken);

    console.log(`✅ User connected to device successfully`);
    console.log(`   Status: ${result.user.status}`);
    return result;
  } catch (error) {
    console.error(`❌ Failed to connect user to device:`, error.message);
    return null;
  }
}

// Step 6: Create Session
async function createSession(userId, deviceId, packageName, totalSeconds) {
  console.log(`\n📝 Creating session...`);
  console.log(`   User ID: ${userId}`);
  console.log(`   Device ID: ${deviceId}`);
  console.log(`   Package: ${packageName}`);
  console.log(`   Duration: ${totalSeconds} seconds (${Math.floor(totalSeconds / 60)} minutes)`);

  try {
    const result = await apiCall('/sessions', 'POST', {
      user_id: userId,
      device_id: deviceId,
      package: packageName,
      total_seconds: totalSeconds,
    }, adminToken);

    console.log(`✅ Session created successfully`);
    console.log(`   Session ID: ${result.session.id}`);
    console.log(`   Status: ${result.session.status}`);
    console.log(`   Remaining: ${result.session.remaining_seconds} seconds`);
    return result;
  } catch (error) {
    console.error(`❌ Failed to create session:`, error.message);
    return null;
  }
}

// Main function
async function main() {
  console.log('🚀 Starting User-Device Connection Script...');
  console.log(`🔗 Backend URL: ${BASE_URL}`);
  console.log(`📱 Target Device Serial: ${DEVICE_SERIAL}`);
  console.log(`👤 Target Username: ${USERNAME || 'ALL USERS'}`);
  console.log('');

  // Step 1: Login
  await loginAsAdmin();

  // Step 2: Get all Users
  const users = await getAllUsers();
  if (users.length === 0) {
    console.log('\n❌ No users found. Please create users first.');
    process.exit(1);
  }

  // Step 3: Get all Devices
  const devices = await getAllDevices();
  if (devices.length === 0) {
    console.log('\n❌ No devices found. Please wait for device registration.');
    process.exit(1);
  }

  // Step 4: Find Device
  const targetDevice = findDeviceBySerial(devices, DEVICE_SERIAL);
  if (!targetDevice) {
    console.log('\n❌ Target device not found. Available devices:');
    devices.forEach(d => {
      console.log(`   - ${d.serial_number} (${d.name || 'Unnamed'})`);
    });
    process.exit(1);
  }

  // Step 5: Create User if needed
async function createUser(username, password = 'password123', name = null) {
  console.log(`\n👤 Creating user: ${username}...`);
  try {
    const result = await apiCall('/users', 'POST', {
      name: name || username, // Use username as name if not provided
      username,
      password,
    }, adminToken);

    const userId = result.user?._id || result.user?.id || result.user?._id?.toString() || result._id || result.id;
    console.log(`✅ User created: ${username} (ID: ${userId})`);
    return { ...result.user, id: userId };
  } catch (error) {
    if (error.message.includes('already exists') || error.message.includes('duplicate')) {
      console.log(`⚠️  User ${username} already exists, skipping...`);
      // Try to find existing user
      const existingUsers = await getAllUsers();
      const existingUser = existingUsers.find(u => u.username === username);
      if (existingUser) {
        const userId = existingUser._id || existingUser.id || existingUser._id?.toString();
        return { ...existingUser, id: userId };
      }
    }
    console.error(`❌ Failed to create user:`, error.message);
    return null;
  }
}

  // Step 6: Filter Users
  console.log(`\n📋 Available users:`);
  users.forEach(u => {
    const userId = u._id || u.id || u._id?.toString();
    console.log(`   - ${u.username} (ID: ${userId}, Role: ${u.role})`);
  });

  let targetUsers = [];
  
  if (USERNAME) {
    // Find or create specific user
    let user = users.find(u => u.username === USERNAME);
    if (!user) {
      console.log(`\n👤 User '${USERNAME}' not found. Creating new user...`);
      user = await createUser(USERNAME);
      if (!user) {
        console.log(`\n❌ Failed to create user: ${USERNAME}`);
        process.exit(1);
      }
    }
    const userId = user._id || user.id || user._id?.toString();
    targetUsers = [{ ...user, id: userId }];
  } else {
    // Connect all USER role users (not admin)
    targetUsers = users
      .filter(u => u.role === 'USER')
      .map(u => {
        const userId = u._id || u.id || u._id?.toString();
        return { ...u, id: userId };
      });
    
    if (targetUsers.length === 0) {
      console.log(`\n⚠️  No USER role users found. Creating default user 'testuser'...`);
      const newUser = await createUser('testuser', 'password123', 'Test User');
      if (newUser) {
        targetUsers = [newUser];
      } else {
        console.log(`\n❌ No users to connect. Please create users first.`);
        process.exit(1);
      }
    }
  }

  if (targetUsers.length === 0) {
    console.log(`\n❌ No users found${USERNAME ? ` with username: ${USERNAME}` : ' (USER role)'}`);
    console.log(`\n💡 Available usernames:`);
    users.forEach(u => console.log(`   - ${u.username}`));
    process.exit(1);
  }

  console.log(`\n📋 Found ${targetUsers.length} user(s) to connect:`);
  targetUsers.forEach(u => {
    const userId = u._id || u.id || u._id?.toString();
    console.log(`   - ${u.username} (ID: ${userId})`);
  });

  // Step 7: Connect Users to Device
  console.log(`\n${'='.repeat(60)}`);
  console.log('🔗 CONNECTING USERS TO DEVICE');
  console.log('='.repeat(60));

  const connectedUsers = [];
  for (const user of targetUsers) {
    const userId = user._id || user.id || user._id?.toString();
    const result = await connectUserToDevice(userId, targetDevice.id);
    if (result) {
      connectedUsers.push({ ...user, id: userId });
    }
  }

  if (connectedUsers.length === 0) {
    console.log('\n❌ No users were connected. Exiting.');
    process.exit(1);
  }

  // Step 8: Create Sessions
  console.log(`\n${'='.repeat(60)}`);
  console.log('📝 CREATING SESSIONS');
  console.log('='.repeat(60));

  const createdSessions = [];
  for (const user of connectedUsers) {
    const userId = user._id || user.id || user._id?.toString();
    
    // Validate IDs are MongoDB ObjectId format
    if (!userId || userId.length !== 24) {
      console.error(`❌ Invalid User ID format: ${userId}`);
      continue;
    }
    if (!targetDevice.id || targetDevice.id.length !== 24) {
      console.error(`❌ Invalid Device ID format: ${targetDevice.id}`);
      continue;
    }
    
    const result = await createSession(
      userId,
      targetDevice.id,
      SESSION_PACKAGE,
      SESSION_SECONDS
    );
    if (result) {
      createdSessions.push(result);
    } else {
      console.log(`⚠️  Skipping session creation for user ${user.username} due to error`);
    }
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('✅ SUMMARY');
  console.log('='.repeat(60));
  console.log(`📱 Device: ${targetDevice.name || targetDevice.serial_number} (${targetDevice.id})`);
  console.log(`👥 Connected Users: ${connectedUsers.length}`);
  console.log(`📝 Created Sessions: ${createdSessions.length}`);
  console.log(`\n✅ Done!`);
}

// Run
main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
