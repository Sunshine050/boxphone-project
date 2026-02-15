import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebSocket as WS } from 'ws';

/**
 * Xiaowei WebSocket Service สำหรับเชื่อมต่อกับเสี่ยวเหว๋ยผ่าน WebSocket
 * 
 * ตามเอกสาร 8.1.1: ที่อยู่คำขอ API = ws://127.0.0.1:22222/
 * 
 * Request format:
 * {
 *   "action": "pushEvent",  // ประเภทเหตุการณ์
 *   "device": "all" | "xxx,xxx",  // หมายเลขประจำเครื่อง
 *   "data": {}  // พารามิเตอร์คำขอ (JSON)
 * }
 * 
 * Response format:
 * {
 *   "code": 10000,  // 10000 = สำเร็จ
 *   "message": "SUCCESS",
 *   "data": {}  // ข้อมูลที่ส่งคืน
 * }
 */
@Injectable()
export class XiaoweiWebSocketService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(XiaoweiWebSocketService.name);
  private ws: WS | null = null;
  private readonly wsUrl: string;
  private readonly reconnectInterval = 5000; // 5 seconds
  private reconnectTimer: NodeJS.Timeout | null = null;
  private messageQueue: Array<{ request: any; resolve: (value: any) => void; reject: (error: any) => void }> = [];
  private requestIdCounter = 0;
  private pendingRequests = new Map<number, { resolve: (value: any) => void; reject: (error: any) => void }>();

  constructor(private readonly configService: ConfigService) {
    // ใช้ WebSocket URL จาก environment หรือ default
    this.wsUrl = this.configService.get<string>('XIAOWEI_WS_URL') || 'ws://127.0.0.1:22222';
    this.logger.log(`Xiaowei WebSocket Service initialized - WS URL: ${this.wsUrl}`);
  }

 async onModuleInit() {
  if (process.env.DISABLE_XIAOWEI_WS === 'true') {
    this.logger.warn('🚫 Xiaowei WebSocket is disabled by env (onModuleInit)');
    return;
  }

  try {
    await this.connect();
  } catch (err) {
    this.logger.error('Xiaowei WS initial connect failed', err);
  }
}


  async onModuleDestroy() {
    this.disconnect();
  }

  /**
   * เชื่อมต่อ WebSocket
   */
  private async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.logger.log(`Connecting to Xiaowei WebSocket: ${this.wsUrl}`);
        
        this.ws = new WS(this.wsUrl);

        this.ws.on('open', () => {
          this.logger.log('✅ Connected to Xiaowei WebSocket');
          this.clearReconnectTimer();
          resolve();
        });

        this.ws.on('message', (data: Buffer | string) => {
          try {
            const message = JSON.parse(data.toString());
            this.handleMessage(message);
          } catch (error: any) {
            this.logger.error(`Failed to parse WebSocket message: ${error.message}`);
          }
        });

        this.ws.on('error', (error: Error) => {
          this.logger.error(`WebSocket error: ${error.message}`);
          reject(error);
        });

        this.ws.on('close', () => {
          this.logger.warn('WebSocket connection closed');
          this.scheduleReconnect();
        });
      } catch (error: any) {
        this.logger.error(`Failed to create WebSocket connection: ${error.message}`);
        reject(error);
      }
    });
  }

  /**
   * จัดการ message ที่ได้รับ
   */
  private handleMessage(message: any): void {
    // ตามเอกสาร: Response format = { code: 10000, message: "SUCCESS", data: ... }
    // ถ้า code = 10000 = สำเร็จ
    
    // ถ้ามี requestId ให้ resolve/reject pending request
    if (message.requestId !== undefined) {
      const pending = this.pendingRequests.get(message.requestId);
      if (pending) {
        if (message.code === 10000) {
          pending.resolve(message.data || message);
        } else if (message.code === 10001) {
          // 10001 = ต้อง activate membership/VIP
          const errorMsg = message.message || '请激活会员后使用';
          pending.reject(new Error(`Xiaowei requires VIP activation: ${errorMsg} (Code: ${message.code})`));
        } else {
          pending.reject(new Error(message.message || `Request failed with code ${message.code}`));
        }
        this.pendingRequests.delete(message.requestId);
        return;
      }
    }

    // ถ้าไม่มี requestId แต่มี code = response ที่ไม่มี requestId
    // ลอง resolve request แรกที่ pending (FIFO - First In First Out)
    if (message.code !== undefined && this.pendingRequests.size > 0) {
      const firstKey = Array.from(this.pendingRequests.keys())[0];
      const firstPending = this.pendingRequests.get(firstKey);
      if (firstPending) {
        if (message.code === 10000) {
          firstPending.resolve(message.data || message);
        } else if (message.code === 10001) {
          const errorMsg = message.message || '请激活会员后使用';
          firstPending.reject(new Error(`Xiaowei error: ${errorMsg} (Code: ${message.code})`));
        } else {
          firstPending.reject(new Error(message.message || `Request failed with code ${message.code}`));
        }
        this.pendingRequests.delete(firstKey);
        return;
      }
    }

    // ถ้าไม่มี requestId อาจเป็น push message
    this.logger.debug(`Received WebSocket message: ${JSON.stringify(message)}`);
  }

  /**
   * ส่ง request ผ่าน WebSocket
   */
  private async sendRequest(action: string, device: string, data: any = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== 1) { // 1 = OPEN
        reject(new Error('WebSocket is not connected'));
        return;
      }

      // ตามเอกสาร 8.1.1: Request format = { action, device, data }
      // ไม่ต้องใส่ requestId (เสี่ยวเหว๋ยไม่รองรับ)
      const request = {
        action,
        device,
        data,
      };
      
      // ใช้ requestId เฉพาะสำหรับ tracking response (ไม่ส่งไปใน request)
      const requestId = ++this.requestIdCounter;

      this.pendingRequests.set(requestId, { resolve, reject });

      // ตั้ง timeout 10 วินาที
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Request timeout'));
        }
      }, 10000);

      try {
        this.ws.send(JSON.stringify(request));
        this.logger.debug(`Sent WebSocket request: ${JSON.stringify(request)}`);
      } catch (error: any) {
        this.pendingRequests.delete(requestId);
        reject(error);
      }
    });
  }

  /**
   * กำหนดเวลา reconnect
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      this.logger.log('Attempting to reconnect to Xiaowei WebSocket...');
      try {
        await this.connect();
      } catch (error) {
        this.scheduleReconnect();
      }
    }, this.reconnectInterval);
  }

  /**
   * ล้าง reconnect timer
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * ตัดการเชื่อมต่อ
   */
  private disconnect(): void {
    this.clearReconnectTimer();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * ดึงรายการอุปกรณ์
   * ตามเอกสาร 8.2.1: action = "getDeviceList" หรือตามเอกสาร
   */
  async getDeviceList(): Promise<any[]> {
    try {
      this.logger.debug('Fetching device list via WebSocket');
      
      // ลองหลาย action names ที่เป็นไปได้ (ตามเอกสาร 8.2.1)
      // อาจเป็น "getDeviceList", "deviceList", "list", หรือตามที่เอกสารระบุ
      const actions = ['getDeviceList', 'deviceList', 'listDevices', 'getDevices', 'list'];
      
      for (const action of actions) {
        try {
          const response = await this.sendRequest(action, 'all', {});
          
          // ตรวจสอบ response format
          if (Array.isArray(response)) {
            return response;
          } else if (response && Array.isArray(response.data)) {
            return response.data;
          } else if (response && response.code === 10000 && Array.isArray(response.data)) {
            return response.data;
          }
        } catch (error) {
          this.logger.debug(`Action ${action} failed, trying next...`);
          continue;
        }
      }

      throw new Error('All device list actions failed');
    } catch (error: any) {
      this.logger.error(`Failed to fetch device list: ${error.message}`);
      throw error;
    }
  }

  /**
   * ดึงหน้าจอ
   * ตามเอกสาร 8.2.4: action = "screenshot"
   */
  async getScreenshot(serial: string): Promise<Buffer> {
    try {
      this.logger.debug(`Fetching screenshot for device: ${serial}`);
      
      const response = await this.sendRequest('screenshot', serial, {});
      
      // Response อาจเป็น base64 string หรือ binary data
      if (typeof response === 'string') {
        // ถ้าเป็น base64
        return Buffer.from(response, 'base64');
      } else if (response.data) {
        // ถ้าเป็น object ที่มี data field
        if (typeof response.data === 'string') {
          return Buffer.from(response.data, 'base64');
        } else if (Buffer.isBuffer(response.data)) {
          return response.data;
        }
      }

      throw new Error('Unexpected screenshot response format');
    } catch (error: any) {
      this.logger.error(`Failed to fetch screenshot: ${error.message}`);
      throw error;
    }
  }

  /**
   * ตรวจสอบว่าเชื่อมต่ออยู่หรือไม่
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === 1; // 1 = OPEN
  }
}
