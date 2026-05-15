/**
 * USB Bridge Service for BoxPhone
 * 
 * เชื่อมต่อมือถือ Android ที่เสียบ USB ผ่านเสี่ยวเหว๋ย (Xiaowei)
 * กับ Backend Server ของ BoxPhone
 * 
 * วิธีใช้งาน:
 * 1. เสียบ USB เข้ากับมือถือและเปิด USB Debugging
 * 2. เปิดโปรแกรมเสี่ยวเหว๋ย (Xiaowei) และเชื่อมต่อมือถือ
 * 3. รันคำสั่ง: node tools/usb-bridge.js
 */

const { io } = require('socket.io-client');
const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration — ต้องตั้ง BACKEND_URL หรือ API_BASE_URL + DEVICE_SOCKET_SECRET ใน env
const BACKEND_URL = process.env.BACKEND_URL || process.env.API_BASE_URL || '';
const DEVICE_ID = process.env.DEVICE_ID || `usb_device_${Date.now()}`;
const DEVICE_SOCKET_SECRET = process.env.DEVICE_SOCKET_SECRET || '';
const STREAM_FPS = parseInt(process.env.STREAM_FPS || '5'); // Frames per second
const TEMP_DIR = path.join(__dirname, '..', 'temp');
const TEMP_SCREEN_FILE = path.join(TEMP_DIR, 'screen.png');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

if (!BACKEND_URL) {
  console.error('❌ Set BACKEND_URL or API_BASE_URL in env');
  process.exit(1);
}
if (!DEVICE_SOCKET_SECRET) {
  console.error('❌ Set DEVICE_SOCKET_SECRET in env to match backend .env');
  process.exit(1);
}
console.log('🚀 Starting USB Bridge Service for BoxPhone...');
console.log(`🔗 Backend URL: ${BACKEND_URL}`);
console.log(`📱 Device ID: ${DEVICE_ID}`);
console.log(`📺 Stream FPS: ${STREAM_FPS}`);

// Check ADB connection
function checkADBConnection() {
  try {
    const result = execSync('adb devices', { encoding: 'utf-8' });
    const devices = result.split('\n')
      .filter(line => line.trim() && !line.includes('List of devices'))
      .map(line => line.split('\t')[0])
      .filter(id => id);

    if (devices.length === 0) {
      console.error('❌ No Android devices found via ADB');
      console.log('💡 Make sure:');
      console.log('   1. USB Debugging is enabled on your phone');
      console.log('   2. USB cable is connected');
      console.log('   3. You have authorized USB debugging on your phone');
      process.exit(1);
    }

    console.log(`✅ Found ${devices.length} device(s): ${devices.join(', ')}`);
    return devices[0]; // Use first device
  } catch (error) {
    console.error('❌ ADB not found or not working:', error.message);
    console.log('💡 Make sure ADB is installed and in your PATH');
    process.exit(1);
  }
}

const connectedDevice = checkADBConnection();

// Get device info
function getDeviceInfo() {
  try {
    const model = execSync(`adb -s ${connectedDevice} shell getprop ro.product.model`, { encoding: 'utf-8' }).trim();
    const sdk = execSync(`adb -s ${connectedDevice} shell getprop ro.build.version.sdk`, { encoding: 'utf-8' }).trim();
    const serial = execSync(`adb -s ${connectedDevice} shell getprop ro.serialno`, { encoding: 'utf-8' }).trim();
    
    return {
      model: model || 'Unknown',
      sdk: parseInt(sdk) || 0,
      serial: serial || connectedDevice
    };
  } catch (error) {
    console.warn('⚠️ Could not get device info:', error.message);
    return {
      model: 'USB Device',
      sdk: 0,
      serial: connectedDevice
    };
  }
}

const deviceInfo = getDeviceInfo();
console.log(`📱 Device Info: ${deviceInfo.model} (SDK ${deviceInfo.sdk})`);

// Connect to Backend
console.log(`🔌 Attempting to connect to ${BACKEND_URL}...`);

const socket = io(BACKEND_URL, {
  transports: ['websocket', 'polling'], // Try both transports
  reconnection: true,
  reconnectionDelay: 2000,
  reconnectionAttempts: 10, // Increase attempts
  timeout: 30000, // 30 seconds timeout
  forceNew: true,
  autoConnect: true,
  auth: {
    deviceSecret: DEVICE_SOCKET_SECRET,
    deviceId: DEVICE_ID,
  },
  // Add path if needed (default is /socket.io/)
  // path: '/socket.io/'
});

socket.on('connect', () => {
  console.log('✅ Connected to Backend');
  console.log(`📡 Socket ID: ${socket.id}`);

  // Register as device
  socket.emit('device_register', {
    deviceId: DEVICE_ID,
    info: {
      model: deviceInfo.model,
      sdk: deviceInfo.sdk,
      serial: deviceInfo.serial,
      connection_type: 'USB',
      bridge: 'xiaowei'
    }
  });

  console.log(`📝 Registered device: ${DEVICE_ID}`);
  startStreaming();
});

socket.on('disconnect', (reason) => {
  console.log(`❌ Disconnected from Backend. Reason: ${reason}`);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
  console.error('❌ Error details:', error);
  console.log('💡 Make sure Backend is running on:', BACKEND_URL);
  console.log('💡 Try using: BACKEND_URL=http://127.0.0.1:3031 npm run usb-bridge');
});

socket.on('reconnect_attempt', (attemptNumber) => {
  console.log(`🔄 Reconnection attempt ${attemptNumber}...`);
});

socket.on('reconnect', (attemptNumber) => {
  console.log(`✅ Reconnected after ${attemptNumber} attempts`);
});

socket.on('reconnect_failed', () => {
  console.error('❌ Reconnection failed. Please check Backend connection.');
});

// Handle control actions from Backend
socket.on('perform_action', (data) => {
  console.log('🖱️ Received action:', data.action);
  
  try {
    if (data.action === 'click' && data.x !== undefined && data.y !== undefined) {
      // Get screen size
      const screenSize = getScreenSize();
      if (!screenSize) {
        console.error('❌ Could not get screen size');
        return;
      }

      // Convert percentage to pixels (if needed)
      let x = data.x;
      let y = data.y;
      
      // If coordinates are in percentage (0-100), convert to pixels
      if (data.x <= 100 && data.y <= 100) {
        x = Math.floor((data.x / 100) * screenSize.width);
        y = Math.floor((data.y / 100) * screenSize.height);
      }

      // Execute tap via ADB
      execSync(`adb -s ${connectedDevice} shell input tap ${x} ${y}`);
      console.log(`✅ Tapped at (${x}, ${y})`);
      
    } else if (data.action === 'swipe' && data.x !== undefined && data.y !== undefined) {
      // Swipe action
      const screenSize = getScreenSize();
      if (!screenSize) return;

      let x1 = data.x;
      let y1 = data.y;
      let x2 = data.x2 || x1;
      let y2 = data.y2 || y1;
      const duration = data.duration || 300;

      // Convert percentage to pixels if needed
      if (x1 <= 100) {
        x1 = Math.floor((x1 / 100) * screenSize.width);
        y1 = Math.floor((y1 / 100) * screenSize.height);
        x2 = Math.floor((x2 / 100) * screenSize.width);
        y2 = Math.floor((y2 / 100) * screenSize.height);
      }

      execSync(`adb -s ${connectedDevice} shell input swipe ${x1} ${y1} ${x2} ${y2} ${duration}`);
      console.log(`✅ Swiped from (${x1}, ${y1}) to (${x2}, ${y2})`);
      
    } else if (data.action === 'type' && data.text) {
      // Type text
      const escapedText = data.text.replace(/ /g, '%s').replace(/&/g, '\\&');
      execSync(`adb -s ${connectedDevice} shell input text "${escapedText}"`);
      console.log(`✅ Typed: ${data.text}`);
    }
  } catch (error) {
    console.error('❌ Failed to execute action:', error.message);
  }
});

// Get screen size
function getScreenSize() {
  try {
    const result = execSync(`adb -s ${connectedDevice} shell wm size`, { encoding: 'utf-8' });
    const match = result.match(/(\d+)x(\d+)/);
    if (match) {
      return {
        width: parseInt(match[1]),
        height: parseInt(match[2])
      };
    }
  } catch (error) {
    console.warn('⚠️ Could not get screen size:', error.message);
  }
  return null;
}

// Start streaming screen
let streamingInterval = null;
function startStreaming() {
  console.log('📺 Starting screen stream...');
  console.log(`⏱️  Streaming at ${STREAM_FPS} FPS (${1000 / STREAM_FPS}ms interval)`);

  const interval = 1000 / STREAM_FPS;

  streamingInterval = setInterval(() => {
    try {
      // Capture screen via ADB
      // Method 1: Using screencap (faster but requires file transfer)
      execSync(`adb -s ${connectedDevice} shell screencap -p /sdcard/screen.png`, { stdio: 'ignore' });
      execSync(`adb -s ${connectedDevice} pull /sdcard/screen.png "${TEMP_SCREEN_FILE}"`, { stdio: 'ignore' });

      if (fs.existsSync(TEMP_SCREEN_FILE)) {
        const imageBuffer = fs.readFileSync(TEMP_SCREEN_FILE);
        
        // Send to Backend
        socket.emit('stream_data', {
          deviceId: DEVICE_ID,
          image: imageBuffer
        });

        // Clean up temp file
        try {
          fs.unlinkSync(TEMP_SCREEN_FILE);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    } catch (error) {
      // Silently handle streaming errors (device might be disconnected)
      if (error.message.includes('device not found')) {
        console.error('❌ Device disconnected!');
        stopStreaming();
      }
    }
  }, interval);
}

function stopStreaming() {
  if (streamingInterval) {
    clearInterval(streamingInterval);
    streamingInterval = null;
    console.log('⏹️  Stopped streaming');
  }
}

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  stopStreaming();
  socket.disconnect();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down...');
  stopStreaming();
  socket.disconnect();
  process.exit(0);
});

// Cleanup temp files on exit
process.on('exit', () => {
  try {
    if (fs.existsSync(TEMP_SCREEN_FILE)) {
      fs.unlinkSync(TEMP_SCREEN_FILE);
    }
  } catch (e) {
    // Ignore
  }
});

console.log('💡 Press Ctrl+C to stop');
