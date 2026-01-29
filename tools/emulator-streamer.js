const { io } = require('socket.io-client');
const { execSync } = require('child_process');
const fs = require('fs');

const BACKEND_URL = 'http://localhost:3031';
const DEVICE_ID = 'android_device_1';

console.log('🚀 Starting Emulator Streamer...');
console.log(`🔗 Connecting to ${BACKEND_URL}`);

const socket = io(BACKEND_URL, {
    transports: ['websocket']
});

socket.on('connect', () => {
    console.log('✅ Connected to backend');

    // Register as device
    socket.emit('device_register', {
        deviceId: DEVICE_ID,
        info: {
            model: 'Emulator (ADB Bridge)',
            sdk: 33
        }
    });

    startStreaming();
});

socket.on('disconnect', () => {
    console.log('❌ Disconnected from backend');
});

socket.on('perform_action', (data) => {
    console.log('🖱️ Received action:', data);
    if (data.action === 'click') {
        // Convert 0-100% to pixels
        // Assume 1080x1920 or get from adb
        const x = Math.floor((data.x / 100) * 1080);
        const y = Math.floor((data.y / 100) * 1920);
        try {
            execSync(`adb shell input tap ${x} ${y}`);
        } catch (err) {
            console.error('Failed to execute tap:', err.message);
        }
    }
});

async function startStreaming() {
    console.log('📺 Starting screen stream...');

    setInterval(() => {
        try {
            // Capture screen via ADB
            // We use a temporary file to be fast-ish
            execSync('adb shell screencap -p /sdcard/screen.png');
            execSync('adb pull /sdcard/screen.png ./temp_screen.png');

            const imageBuffer = fs.readFileSync('./temp_screen.png');

            socket.emit('stream_data', {
                deviceId: DEVICE_ID,
                image: imageBuffer
            });

        } catch (err) {
            // console.error('Streaming error:', err.message);
        }
    }, 200); // 5 FPS for demo stability
}
