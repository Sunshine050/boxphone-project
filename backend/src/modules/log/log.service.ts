import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Cron } from '@nestjs/schedule';
import { Model, Types } from 'mongoose';
import { google } from 'googleapis';
import * as fs from 'fs';
import { AdminLog, LogLevel, LogType } from './admin-log.schema';

const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const APPEND_CHUNK = 400;

@Injectable()
export class LogService {
  private readonly logger = new Logger(LogService.name);

  constructor(
    @InjectModel(AdminLog.name) private logModel: Model<AdminLog>,
    private readonly configService: ConfigService,
  ) {}

  private normalizeType(type: string): LogType {
    if (Object.values(LogType).includes(type as LogType)) {
      return type as LogType;
    }
    return LogType.SESSION_STARTED;
  }

  private normalizeLevel(level: string): LogLevel {
    if (Object.values(LogLevel).includes(level as LogLevel)) {
      return level as LogLevel;
    }
    return LogLevel.INFO;
  }

  async createLog(data: {
    type: string;
    level: string;
    message: string;
    target_user_id?: string;
    target_device_id?: string;
    admin_username?: string;
    meta?: Record<string, any>;
  }) {
    const newLog = new this.logModel({
      ...data,
      type: this.normalizeType(data.type),
      level: this.normalizeLevel(data.level),
    });

    return newLog.save();
  }

  async findAll(type?: string) {
    const filter = type ? { type } : {};
    return this.logModel
      .find(filter)
      .sort({ createdAt: -1 })
      .populate('target_user_id', 'username name')
      .populate('target_device_id', 'name serial_number')
      .exec();
  }

  /** Google Sheets ID + service account credentials (JSON string or credentials file path). */
  private isSheetsConfigured(): boolean {
    const id = this.configService.get<string>('GOOGLE_SHEETS_SPREADSHEET_ID');
    return !!id && !!this.loadServiceAccountCredentials();
  }

  private loadServiceAccountCredentials(): Record<string, unknown> | null {
    const rawJson = this.configService.get<string>('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (rawJson?.trim()) {
      try {
        const parsed = JSON.parse(rawJson) as Record<string, unknown>;
        if (typeof parsed.private_key === 'string') {
          parsed.private_key = (parsed.private_key as string).replace(
            /\\n/g,
            '\n',
          );
        }
        return parsed;
      } catch {
        this.logger.error('GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON');
        return null;
      }
    }
    const path = this.configService.get<string>('GOOGLE_APPLICATION_CREDENTIALS');
    if (path?.trim() && fs.existsSync(path)) {
      try {
        return JSON.parse(fs.readFileSync(path, 'utf8')) as Record<
          string,
          unknown
        >;
      } catch (e) {
        this.logger.error(`Failed to read credentials file: ${path}`, e);
        return null;
      }
    }
    return null;
  }

  private getSpreadsheetId(): string {
    const id = this.configService.get<string>('GOOGLE_SHEETS_SPREADSHEET_ID');
    if (!id?.trim()) {
      throw new BadRequestException(
        'GOOGLE_SHEETS_SPREADSHEET_ID is not configured',
      );
    }
    return id.trim();
  }

  private getSheetTabName(): string {
    return (
      this.configService.get<string>('GOOGLE_SHEETS_TAB_NAME')?.trim() ||
      'Sheet1'
    );
  }

  private async getSheetsClient() {
    const creds = this.loadServiceAccountCredentials();
    if (!creds?.client_email || !creds.private_key) {
      throw new BadRequestException(
        'Google service account credentials are missing or invalid',
      );
    }
    const auth = new google.auth.JWT({
      email: creds.client_email as string,
      key: creds.private_key as string,
      scopes: [SHEETS_SCOPE],
    });
    await auth.authorize();
    return google.sheets({ version: 'v4', auth });
  }

  private logToRow(log: Record<string, unknown>): string[] {
    const createdAt = log.createdAt as Date | string | undefined;
    const iso =
      createdAt instanceof Date
        ? createdAt.toISOString()
        : createdAt
          ? new Date(createdAt).toISOString()
          : '';
    const tu = log.target_user_id as
      | { username?: string }
      | Types.ObjectId
      | undefined;
    const username =
      tu && typeof tu === 'object' && 'username' in tu
        ? String((tu as { username?: string }).username || '')
        : '';
    const td = log.target_device_id as
      | { name?: string }
      | Types.ObjectId
      | undefined;
    const deviceName =
      td && typeof td === 'object' && 'name' in td
        ? String((td as { name?: string }).name || '')
        : '';
    return [
      iso,
      String(log.type || ''),
      String(log.level || ''),
      String(log.message || ''),
      username,
      deviceName,
      String(log.admin_username || ''),
      JSON.stringify(log.meta ?? {}),
    ];
  }

  private buildHeaderRow(): string[] {
    return [
      'createdAtISO',
      'type',
      'level',
      'message',
      'target_username',
      'device_name',
      'admin_username',
      'meta_json',
    ];
  }

  private async appendRowsToSheet(rows: string[][]): Promise<void> {
    if (rows.length === 0) return;
    const spreadsheetId = this.getSpreadsheetId();
    const tab = this.getSheetTabName();
    const range = `${tab}!A1`;
    const sheets = await this.getSheetsClient();

    for (let i = 0; i < rows.length; i += APPEND_CHUNK) {
      const chunk = rows.slice(i, i + APPEND_CHUNK);
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: chunk },
      });
    }
  }

  /**
   * Manual admin action: export all logs to Google Sheets (when configured), then delete from MongoDB.
   * If Google Sheets is not configured, still deletes all logs from the DB (no cloud backup).
   */
  async archiveAllLogsToSheetsAndClear(triggeredBy: string): Promise<{
    archived: number;
    cleared: boolean;
    sheetsBackupSkipped?: boolean;
  }> {
    const logs = await this.logModel
      .find({})
      .sort({ createdAt: 1 })
      .populate('target_user_id', 'username name')
      .populate('target_device_id', 'name serial_number')
      .lean()
      .exec();

    if (logs.length === 0) {
      return { archived: 0, cleared: true };
    }

    if (!this.isSheetsConfigured()) {
      this.logger.warn(
        `archiveAllLogsToSheetsAndClear: Google Sheets not configured — deleting ${logs.length} logs from DB only (by ${triggeredBy})`,
      );
      const ids = logs.map((l) => l._id);
      await this.logModel.deleteMany({ _id: { $in: ids } });
      return {
        archived: logs.length,
        cleared: true,
        sheetsBackupSkipped: true,
      };
    }

    const header = this.buildHeaderRow();
    const metaRow = [
      `[batch] manual archive`,
      new Date().toISOString(),
      `triggeredBy:${triggeredBy}`,
      '',
      '',
      '',
      '',
      '',
    ];
    const dataRows = logs.map((l) => this.logToRow(l as Record<string, unknown>));
    const allRows = [header, metaRow, ...dataRows];

    await this.appendRowsToSheet(allRows);

    const ids = logs.map((l) => l._id);
    await this.logModel.deleteMany({ _id: { $in: ids } });

    this.logger.log(
      `Archived ${logs.length} logs to Google Sheets and cleared DB (manual, by ${triggeredBy})`,
    );
    return { archived: logs.length, cleared: true };
  }

  /** First day of previous month UTC → first day of current month UTC. */
  private getPreviousMonthUtcRange(): { start: Date; end: Date } {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
    return { start, end };
  }

  /**
   * Monthly job: archive logs from the **previous calendar month** to Sheets, then remove them from DB.
   * Runs at 03:00 UTC on the 1st of each month.
   */
  @Cron('0 0 3 1 * *')
  async monthlyArchivePreviousMonth(): Promise<void> {
    if (!this.isSheetsConfigured()) {
      this.logger.warn(
        'monthlyArchivePreviousMonth skipped: Google Sheets not configured',
      );
      return;
    }

    const { start, end } = this.getPreviousMonthUtcRange();
    const logs = await this.logModel
      .find({ createdAt: { $gte: start, $lt: end } })
      .sort({ createdAt: 1 })
      .populate('target_user_id', 'username name')
      .populate('target_device_id', 'name serial_number')
      .lean()
      .exec();

    if (logs.length === 0) {
      this.logger.log(
        `monthlyArchivePreviousMonth: no logs between ${start.toISOString()} and ${end.toISOString()}`,
      );
      return;
    }

    const label = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`;
    const header = this.buildHeaderRow();
    const metaRow = [
      `[batch] monthly`,
      new Date().toISOString(),
      `periodUTC:${start.toISOString()}..${end.toISOString()}`,
      label,
      '',
      '',
      '',
      '',
    ];
    const dataRows = logs.map((l) => this.logToRow(l as Record<string, unknown>));
    await this.appendRowsToSheet([header, metaRow, ...dataRows]);

    const ids = logs.map((l) => l._id);
    await this.logModel.deleteMany({ _id: { $in: ids } });

    this.logger.log(
      `monthlyArchivePreviousMonth: archived ${logs.length} logs for ${label}`,
    );
  }
}
