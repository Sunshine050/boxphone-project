import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as WebSocket from 'ws';

/**
 * Xiaowei WebSocket Service (Correct Spec Version)
 *
 * - Xiaowei ไม่มี requestId
 * - Response เป็น push
 * - Screenshot เป็น binary หรือ base64
 * - Device list push กลับมา
 */
@Injectable()
export class XiaoweiWebSocketService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(XiaoweiWebSocketService.name);

  private ws: WebSocket | null = null;
  private readonly wsUrl: string;

  // reconnect
  private reconnectTimer: NodeJS.Timeout | null = null;
  private readonly reconnectInterval = 5000;
  /** เมื่อ server ตอบ 200 = ไม่ใช่ WebSocket (อาจเป็น HTTP API) → ไม่ reconnect บ่อย */
  private wrongProtocolLogged = false;

  // device registry
  private devices = new Map<string, any>();

  // screenshot/preview: ต้องส่ง device.preview ก่อน เสี่ยวเหว๋ยถึงจะส่ง binary กลับมา
  private screenshotResolvers = new Map<string, (buffer: Buffer) => void>();
  /** serial ที่เราส่ง device.preview ล่าสุด — ใช้ผูก binary ที่ได้รับกับเครื่อง */
  private lastRequestedSerial: string | null = null;
  /** เก็บภาพล่าสุดต่อเครื่อง (base64 data URL) สำหรับ GET preview */
  private lastImageBySerial = new Map<string, string>();

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>('XIAOWEI_WS_URL');
    this.wsUrl = url ? (url.endsWith('/') ? url : `${url}/`) : '';
    if (this.wsUrl) this.logger.log(`Xiaowei WS URL: ${this.wsUrl}`);
    else this.logger.warn('XIAOWEI_WS_URL not set - set in .env to connect to Xiaowei API');
  }

  /* ================= lifecycle ================= */

  async onModuleInit() {
    if (!this.wsUrl) return;
    await this.connect();
  }

  onModuleDestroy() {
    this.disconnect();
  }

  /* ================= connection ================= */

  private async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.logger.log(`Connecting to Xiaowei WS...`);

        this.ws = new WebSocket(this.wsUrl);

        this.ws.on('open', () => {
          this.wrongProtocolLogged = false;
          this.logger.log('✅ Xiaowei WebSocket connected');
          this.clearReconnect();
          resolve();
        });

        this.ws.on('message', (data) => {
          if (Buffer.isBuffer(data)) {
            this.handleBinaryMessage(data);
          } else {
            this.handleJsonMessage(data.toString());
          }
        });

        this.ws.on('close', () => {
          this.logger.warn('❌ Xiaowei WS closed');
          this.scheduleReconnect();
        });

        this.ws.on('error', (err) => {
          const msg = err.message || '';
          if (msg.includes('200') || msg.includes('Unexpected server response')) {
            if (!this.wrongProtocolLogged) {
              this.wrongProtocolLogged = true;
              this.logger.warn(
                '⚠️ The server returned HTTP 200 (not WebSocket). This port is likely the HTTP API. Set XIAOWEI_WS_URL to the WebSocket port (e.g. ws://127.0.0.1:22222/) in .env and check Xiaowei settings.'
              );
            }
          } else {
            this.logger.error(`WS error: ${msg}`);
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  private disconnect() {
    this.clearReconnect();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    const interval = this.wrongProtocolLogged ? 60000 : this.reconnectInterval;
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      if (this.wrongProtocolLogged) return;
      this.logger.log('🔄 Reconnecting Xiaowei WS...');
      try {
        await this.connect();
      } catch {
        this.scheduleReconnect();
      }
    }, interval);
  }

  private clearReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /* ================= message handlers ================= */

  private handleJsonMessage(raw: string) {
    let msg: any;
    try {
      msg = JSON.parse(raw);
    } catch {
      this.logger.warn('Invalid JSON message');
      return;
    }

    /** รองรับหลายรูปแบบการตอบกลับรายการอุปกรณ์ */
    const extractDeviceList = (data: any): any[] => {
      if (Array.isArray(data)) return data;
      if (data && typeof data === 'object') {
        if (Array.isArray(data.list)) return data.list;
        if (Array.isArray(data.devices)) return data.devices;
        if (Array.isArray(data.data)) return data.data;
        if (Array.isArray(data.deviceList)) return data.deviceList;
      }
      return [];
    };

    const addDevice = (device: any) => {
      const serial = device?.serial ?? device?.onlySerial ?? device?.deviceId ?? device?.id;
      if (serial) {
        this.devices.set(String(serial), { ...device, serial: String(serial), onlySerial: device?.onlySerial ?? serial });
      }
    };

    /**
     * Device list: data เป็น array หรือ object ที่มี list/devices/data
     */
    const list = extractDeviceList(msg.data);
    if (list.length > 0) {
      list.forEach(addDevice);
      this.logger.log(`📱 Devices online: ${this.devices.size}`);
      return;
    }

    /** บันทึก raw เมื่อได้ code 10000 แต่ไม่มี device (ใช้ debug) */
    if (msg.code === 10000 && msg.data != null && !Array.isArray(msg.data)) {
      this.logger.debug(`WS response code=10000, data keys: ${Object.keys(msg.data || {}).join(', ')}`);
    }

    /**
     * ACK / status (ไม่มี data หรือ data ไม่ใช่รายการเครื่อง)
     */
    if (msg.code === 10000) {
      return;
    }

    if (msg.code === 10001) {
      const errorMsg = msg.message || 'กรุณาเปิดใช้งานสมาชิกภาพของคุณก่อนใช้งาน' || '请激活会员后使用';
      this.logger.error(
        `❌ Xiaowei requires account/device activation: ${errorMsg} (Code: 10001). ` +
        `Please check: 1) Login to Xiaowei, 2) Activate VIP/Membership, 3) Bind Device to Account`
      );
      return;
    }

    // แสดงรูปแบบข้อความที่เสี่ยวเหว๋ยส่งมา (ช่วย debug ตอน Sync ได้ 0 เครื่อง)
    this.logger.warn(
      `Xiaowei WS message (not device list): code=${msg.code}, keys=${Object.keys(msg).join(', ')}. ` +
      `Sample: ${raw.substring(0, 200)}${raw.length > 200 ? '...' : ''}`
    );
  }

  private handleBinaryMessage(buffer: Buffer) {
    /** ภาพหน้าจอจริงจะใหญ่ (มัก 40KB+); ขนาดต่ำกว่า MIN = อาจเป็น JSON/ข้อความจากเสี่ยวเหว๋ย ไม่ใช่ภาพ */
    const MIN_PREVIEW_BYTES = 5000;
    const serial = this.lastRequestedSerial;

    // binary เล็กมาก: ลองอ่านเป็น JSON/ข้อความ (สำหรับ debug)
    if (buffer.length < MIN_PREVIEW_BYTES) {
      try {
        const raw = buffer.toString('utf8');
        if (raw.trim().startsWith('{') || raw.trim().startsWith('[')) {
          const msg = JSON.parse(raw);
          const list = Array.isArray(msg) ? msg : (msg?.data ?? msg?.list ?? msg?.devices ?? msg?.deviceList);
          if (Array.isArray(list) && list.length > 0) {
            list.forEach((d: any) => {
              const s = d?.serial ?? d?.onlySerial ?? d?.deviceId ?? d?.id;
              if (s) this.devices.set(String(s), { ...d, serial: String(s) });
            });
            this.logger.log(`📱 Devices from binary JSON: ${this.devices.size}`);
            return;
          }
          if (serial && this.screenshotResolvers.has(serial)) {
            this.logger.warn(`[PREVIEW] Xiaowei sent small binary (${buffer.length} bytes), not image. Sample: ${raw.slice(0, 120)}...`);
          }
          return;
        }
      } catch {
        // ไม่ใช่ JSON
      }
      if (serial && this.screenshotResolvers.has(serial)) {
        this.logger.warn(`[PREVIEW] Ignoring small binary (${buffer.length} bytes) for ${serial} — waiting for real image (need >= ${MIN_PREVIEW_BYTES} bytes)`);
      }
      return;
    }

    // ขนาดใหญ่พอ = น่าจะเป็นภาพจริง
    if (serial && this.screenshotResolvers.has(serial)) {
      const resolve = this.screenshotResolvers.get(serial)!;
      this.screenshotResolvers.delete(serial);
      this.lastRequestedSerial = null;
      resolve(buffer);
      this.storePreviewImage(serial, buffer);
      this.logger.log(`[PREVIEW] Received image for ${serial}, ${buffer.length} bytes`);
      return;
    }
  }

  /** เก็บ buffer เป็น data URL ต่อ serial (JPEG/PNG ตาม signature) */
  private storePreviewImage(serial: string, buffer: Buffer): void {
    const base64 = buffer.toString('base64');
    const isPng =
      buffer.length >= 4 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47;
    const mime = isPng ? 'image/png' : 'image/jpeg';
    this.lastImageBySerial.set(serial, `data:${mime};base64,${base64}`);
  }

  /* ================= public APIs ================= */

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get device list (push-based)
   * ตามเอกสาร 8.1.1: action = ประเภทเหตุการณ์, devices = "ทั้งหมด"|"xxx,xxx", data = JSON (ตัวเลือก)
   * ฟังก์ชัน "รับรายการอุปกรณ์" = get device list → ใช้ action getDeviceList
   * ไม่ล้าง this.devices ก่อน — รายการอาจถูก push ตอน connect
   */
  async getDeviceList(): Promise<any[]> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    const countBefore = this.devices.size;

    // ตามเอกสาร: getDeviceList ใช้ "device" (เอกพจน์), ค่า "all" = ทั้งหมด
    this.ws.send(
      JSON.stringify({
        action: 'getDeviceList',
        device: 'all',
        data: {},
      }),
    );

    // รอคำตอบ JSON (อย่างน้อย 3 วินาที)
    await new Promise((r) => setTimeout(r, 3000));

    const list = Array.from(this.devices.values());
    if (list.length === 0) {
      this.logger.warn(
        `⚠️  No devices from Xiaowei (had ${countBefore} before request). ` +
        'Check: 1) Xiaowei open + API enabled, 2) VIP. Log shows binary only = list may use different action in your Xiaowei version.'
      );
    } else {
      this.logger.log(`📱 Device list: ${list.length} devices`);
    }

    return list;
  }

  /**
   * Preview/screenshot: ส่ง device.preview ก่อน แล้วถ้า 5 วินาทีไม่มี binary ค่อยลอง pushEvent (type 2)
   */
  async getScreenshot(serial: string): Promise<Buffer> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    return new Promise((resolve, reject) => {
      this.lastRequestedSerial = serial;
      this.screenshotResolvers.set(serial, (buf: Buffer) => {
        clearTimeout(timeout1);
        clearTimeout(timeout2);
        resolve(buf);
      });

      const send = (msg: object) => {
        this.ws!.send(JSON.stringify(msg));
        this.logger.log(`[PREVIEW] Sent for ${serial}: ${JSON.stringify(msg)}`);
      };

      send({ t: 'device.preview', id: serial });

      const timeout1 = setTimeout(() => {
        if (!this.screenshotResolvers.has(serial)) return;
        this.logger.warn(`[PREVIEW] No image after 5s, trying pushEvent (type 2) for ${serial}`);
        send({ action: 'pushEvent', devices: serial, data: { type: '2' } });
      }, 5000);

      const timeout2 = setTimeout(() => {
        timeout1 && clearTimeout(timeout1);
        if (this.screenshotResolvers.has(serial)) {
          this.screenshotResolvers.delete(serial);
          if (this.lastRequestedSerial === serial) this.lastRequestedSerial = null;
          reject(new Error('Screenshot timeout (Xiaowei did not send image)'));
        }
      }, 13000);
    });
  }

  /** ภาพล่าสุดต่อ serial (base64 data URL) — ใช้กับ GET /devices/:id/preview */
  getLastPreviewBase64(serial: string): string | null {
    return this.lastImageBySerial.get(serial) ?? null;
  }
}
