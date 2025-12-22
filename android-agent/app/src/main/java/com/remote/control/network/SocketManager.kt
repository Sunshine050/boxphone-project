package com.remote.control.network

import android.util.Log
import io.socket.client.IO
import io.socket.client.Socket
import org.json.JSONObject
import java.net.URISyntaxException

object SocketManager {
    private const val TAG = "SocketManager"
    private const val SERVER_URL = "http://192.168.1.100:3001" // Change to your server IP
    
    private var socket: Socket? = null

    fun connect() {
        try {
            val opts = IO.Options()
            opts.forceNew = true
            opts.reconnection = true
            
            socket = IO.socket(SERVER_URL, opts)
            
            socket?.on(Socket.EVENT_CONNECT) {
                Log.d(TAG, "Connected to server")
                registerDevice()
            }
            
            socket?.on(Socket.EVENT_DISCONNECT) {
                Log.d(TAG, "Disconnected")
            }
            
            socket?.on("perform_action") { args ->
                val data = args[0] as JSONObject
                val action = data.getString("action")
                Log.d(TAG, "Received action: $action")
                // Forward to AccessibilityService via EventBus or Broadcast calls
            }

            socket?.connect()
            
        } catch (e: URISyntaxException) {
            Log.e(TAG, "Invalid URI", e)
        }
    }

    private fun registerDevice() {
        val payload = JSONObject()
        payload.put("deviceId", "android_device_1") // Should be unique ID (IMEI/UUID)
        socket?.emit("device_register", payload)
    }

    fun sendScreenFrame(jpegData: ByteArray) {
        if (socket?.connected() == true) {
            val payload = JSONObject()
            payload.put("deviceId", "android_device_1")
            payload.put("image", jpegData)
            socket?.emit("stream_data", payload) // Careful: Binary via JSON is slow, better use raw emission
        }
    }
    
    fun disconnect() {
        socket?.disconnect()
        socket?.off()
    }
}
