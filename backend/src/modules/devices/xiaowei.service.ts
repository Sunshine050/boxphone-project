import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

/**
 * Xiaowei (效卫) Service สำหรับดึงหน้าจอจาก BoxPhone Server
 * 
 * เอกสาร API: https://www.xiaowei.xin/help/70/349
 * 
 * ตามเอกสาร 8.1.1: เสี่ยวเหว๋ยใช้ WebSocket ที่ ws://127.0.0.1:22222/
 * 
 * ต้องตั้งค่า environment variables:
 * - XIAOWEI_WS_URL: WebSocket URL ของเสี่ยวเหว๋ย (เช่น ws://127.0.0.1:22222)
 * - XIAOWEI_API_URL: HTTP API URL (ถ้ามี, เช่น http://localhost:8080) - fallback
 * - XIAOWEI_API_KEY: API Key สำหรับ authentication (ถ้ามี)
 * - XIAOWEI_USERNAME: Username สำหรับ login (ถ้ามี)
 * - XIAOWEI_PASSWORD: Password สำหรับ login (ถ้ามี)
 */
@Injectable()
export class XiaoweiService {
  private readonly logger = new Logger(XiaoweiService.name);
  private readonly apiClient: AxiosInstance;
  private readonly apiUrl: string;
  private readonly apiKey?: string;
  private readonly username?: string;
  private readonly password?: string;

  constructor(private readonly configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('XIAOWEI_API_URL') || 'http://localhost:8080';
    this.apiKey = this.configService.get<string>('XIAOWEI_API_KEY');
    this.username = this.configService.get<string>('XIAOWEI_USERNAME');
    this.password = this.configService.get<string>('XIAOWEI_PASSWORD');

    // สร้าง Axios instance
    this.apiClient = axios.create({
      baseURL: this.apiUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
        ...(this.apiKey && { 'X-API-Key': this.apiKey }),
      },
    });

    // Log initialization status
    if (this.apiKey) {
      this.logger.log(`Xiaowei Service initialized - API URL: ${this.apiUrl} (with API Key)`);
    } else {
      this.logger.log(`Xiaowei Service initialized - API URL: ${this.apiUrl} (no authentication)`);
      this.logger.warn('⚠️  XIAOWEI_API_KEY not set - API calls will be made without authentication');
    }
  }

  /**
   * ดึงหน้าจอจากเสี่ยวเหว๋ยตาม device serial number
   * ตามเอกสาร 8.2.4. ภาพหน้าจอ (Screenshot)
   * 
   * @param serialNumber Serial number ของ device (เช่น "276b135d13217ece" หรือ "ea85356a")
   * @returns Buffer ของภาพหน้าจอ (PNG format)
   */
  async getScreenshot(serialNumber: string): Promise<Buffer> {
    try {
      this.logger.debug(`Fetching screenshot for device: ${serialNumber}`);

      // ตามเอกสารเสี่ยวเหว๋ย 8.2.4. ภาพหน้าจอ (Screenshot)
      // API endpoint: POST /api/screenshot
      // Request body: { serial: "device_serial" }
      // Response: PNG image binary

      let response;
      try {
        // วิธีที่ 1: POST /api/screenshot (ตามเอกสาร 8.2.4)
        response = await this.apiClient.post(
          '/api/screenshot',
          { serial: serialNumber },
          { 
            responseType: 'arraybuffer',
            headers: {
              'Content-Type': 'application/json',
            }
          }
        );
      } catch (error: any) {
        // ถ้าไม่ได้ ลองวิธีที่ 2: GET /api/screenshot?serial={serial}
        try {
          this.logger.debug(`Trying GET method for screenshot: ${serialNumber}`);
          response = await this.apiClient.get('/api/screenshot', {
            params: { serial: serialNumber },
            responseType: 'arraybuffer',
          });
        } catch (error2: any) {
          // ถ้าไม่ได้ ลองวิธีที่ 3: GET /api/devices/{serial}/screenshot
          try {
            this.logger.debug(`Trying device-specific endpoint for screenshot: ${serialNumber}`);
            response = await this.apiClient.get(`/api/devices/${serialNumber}/screenshot`, {
              responseType: 'arraybuffer',
            });
          } catch (error3: any) {
            this.logger.error(`All screenshot methods failed for ${serialNumber}`);
            this.logger.error(`Method 1 (POST): ${error?.message || 'unknown'}`);
            this.logger.error(`Method 2 (GET with params): ${error2?.message || 'unknown'}`);
            this.logger.error(`Method 3 (GET device-specific): ${error3?.message || 'unknown'}`);
            throw new Error(`Failed to fetch screenshot: ${error?.message || error2?.message || error3?.message || 'All methods failed'}`);
          }
        }
      }

      // ตรวจสอบว่า response เป็น image หรือไม่
      if (!response.data || response.data.length === 0) {
        throw new Error('Empty response from screenshot API');
      }

      const imageBuffer = Buffer.from(response.data, 'binary');
      
      // ตรวจสอบว่าเป็น PNG image หรือไม่ (PNG signature: 89 50 4E 47)
      if (imageBuffer.length < 4 || imageBuffer[0] !== 0x89 || imageBuffer[1] !== 0x50 || imageBuffer[2] !== 0x4E || imageBuffer[3] !== 0x47) {
        // อาจจะเป็น JSON error response
        try {
          const errorJson = JSON.parse(imageBuffer.toString('utf-8'));
          throw new Error(errorJson.message || `API Error: ${errorJson.code || 'unknown'}`);
        } catch (parseError) {
          // ไม่ใช่ JSON ก็เป็น binary data ที่ไม่ใช่ PNG
          this.logger.warn(`Response might not be a valid PNG image for device ${serialNumber}`);
        }
      }

      this.logger.debug(`Screenshot fetched successfully for device: ${serialNumber}, size: ${imageBuffer.length} bytes`);
      
      return imageBuffer;
    } catch (error: any) {
      this.logger.error(`Failed to fetch screenshot for device ${serialNumber}: ${error.message}`);
      if (error.response) {
        this.logger.error(`API Response Status: ${error.response.status}`);
        this.logger.error(`API Response Data: ${JSON.stringify(error.response.data)}`);
      }
      throw new Error(`Failed to fetch screenshot: ${error.message}`);
    }
  }

  /**
   * ดึงหน้าจอจากหลายเครื่องพร้อมกัน
   * 
   * @param serialNumbers Array ของ serial numbers
   * @returns Map<serialNumber, Buffer> ของภาพหน้าจอ
   */
  async getScreenshots(serialNumbers: string[]): Promise<Map<string, Buffer>> {
    const results = new Map<string, Buffer>();
    
    // ดึงพร้อมกัน (parallel)
    const promises = serialNumbers.map(async (serial) => {
      try {
        const screenshot = await this.getScreenshot(serial);
        results.set(serial, screenshot);
      } catch (error) {
        this.logger.warn(`Failed to fetch screenshot for ${serial}, skipping...`);
        // ไม่ throw error เพื่อให้เครื่องอื่นๆ ยังดึงได้
      }
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * ดึงรายการอุปกรณ์จากเสี่ยวเหว๋ย
   * ตามเอกสาร 8.2.1. รายการ: เรียกดูรายการอุปกรณ์
   * 
   * @returns Array ของ device information
   */
  async getDeviceList(): Promise<any[]> {
    try {
      this.logger.debug('Fetching device list from Xiaowei');
      
      // ตามเอกสาร 8.2.1: GET /api/devices หรือ POST /api/devices
      let response;
      try {
        response = await this.apiClient.get('/api/devices');
      } catch (error) {
        try {
          response = await this.apiClient.post('/api/devices', {});
        } catch (error2) {
          throw new Error(`Failed to fetch device list: ${error?.message || error2?.message}`);
        }
      }

      // ตรวจสอบ response format ตามเอกสาร
      // { code: 10000, message: "SUCCESS", data: [...] }
      if (response.data && response.data.code === 10000 && response.data.data) {
        return response.data.data;
      } else if (Array.isArray(response.data)) {
        return response.data;
      } else {
        this.logger.warn('Unexpected device list response format');
        return [];
      }
    } catch (error: any) {
      this.logger.error(`Failed to fetch device list: ${error.message}`);
      throw error;
    }
  }

  /**
   * ตรวจสอบว่าเสี่ยวเหว๋ย API พร้อมใช้งานหรือไม่
   */
  async healthCheck(): Promise<boolean> {
    try {
      // ลองเรียก device list endpoint (ตามเอกสาร 8.2.1)
      const devices = await this.getDeviceList();
      this.logger.log(`Xiaowei API is healthy - Found ${devices.length} devices`);
      return true;
    } catch (error) {
      // ถ้าไม่ได้ ลองเรียก health endpoint
      try {
        await this.apiClient.get('/api/health', { timeout: 5000 });
        return true;
      } catch (error2) {
        this.logger.warn('Xiaowei API health check failed');
        return false;
      }
    }
  }
}
