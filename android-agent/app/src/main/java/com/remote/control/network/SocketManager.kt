package com.remote.control.network

import android.os.Build
import android.util.Log
import com.remote.control.service.MyAccessibilityService
import io.socket.client.IO
import io.socket.client.Socket
import org.json.JSONObject
import java.net.URISyntaxException

class SocketManager private constructor() {

    private var socket: Socket? = null
    private val deviceId = "android_device_${Build.SERIAL}" // Simple unique ID

    fun connect(serverUrl: String) {
        try {
            socket = IO.socket(serverUrl)
            
            socket?.on(Socket.EVENT_CONNECT) {
                Log.d("SocketManager", "Connected to Server")
                registerDevice()
            }

            socket?.on("perform_action") { args ->
                val data = args[0] as JSONObject
                handleAction(data)
            }

            socket?.connect()
        } catch (e: URISyntaxException) {
            e.printStackTrace()
        }
    }

    private fun registerDevice() {
        val payload = JSONObject()
        payload.put("deviceId", deviceId)
        val info = JSONObject()
        info.put("model", Build.MODEL)
        info.put("sdk", Build.VERSION.SDK_INT)
        payload.put("info", info)
        
        socket?.emit("device_register", payload)
    }

    private fun handleAction(data: JSONObject) {
        val action = data.getString("action")
        Log.d("SocketManager", "Received action: $action")
        
        if (action == "click") {
            val x = data.getDouble("x").toFloat()
            val y = data.getDouble("y").toFloat()
            MyAccessibilityService.instance?.click(x, y)
        }
    }

    fun disconnect() {
        socket?.disconnect()
    }

    companion object {
        val instance = SocketManager()
    }
}
