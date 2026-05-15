package com.remote.control.ui

import android.os.Bundle
import android.content.Intent
import android.provider.Settings
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.remote.control.R
import com.remote.control.network.SocketManager

class MainActivity : AppCompatActivity() {

    private lateinit var statusText: TextView
    private lateinit var btnAccessibility: Button
    private lateinit var connectionStatus: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        statusText = findViewById(R.id.statusText)
        btnAccessibility = findViewById(R.id.btnAccessibility)
        connectionStatus = findViewById(R.id.connectionStatus)

        btnAccessibility.setOnClickListener {
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
            startActivity(intent)
        }

        // Connect to Backend (ใช้ IP เครื่องคอมคุณ และ Port 3001)
        SocketManager.instance.connect("http://10.30.102.205:3001") { isConnected ->
            runOnUiThread {
                if (isConnected) {
                    connectionStatus.text = "Connection: Connected"
                    connectionStatus.setTextColor(android.graphics.Color.parseColor("#27ae60")) // สีเขียว
                } else {
                    connectionStatus.text = "Connection: Failed (Check IP/Port)"
                    connectionStatus.setTextColor(android.graphics.Color.parseColor("#e74c3c")) // สีแดง
                }
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        SocketManager.instance.disconnect()
    }
}