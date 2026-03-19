import { Injectable, Logger } from '@nestjs/common';

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

interface AttemptRecord {
  count: number;
  lastAttempt: number;
  lockedUntil: number | null;
}

@Injectable()
export class LoginAttemptService {
  private readonly logger = new Logger(LoginAttemptService.name);
  private readonly attempts = new Map<string, AttemptRecord>();

  private makeKey(ip: string, username: string): string {
    const safeUser = username.replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 64);
    return `${ip}:${safeUser}`;
  }

  isLocked(ip: string, username: string): boolean {
    const record = this.attempts.get(this.makeKey(ip, username));
    if (!record?.lockedUntil) return false;
    if (Date.now() >= record.lockedUntil) {
      this.attempts.delete(this.makeKey(ip, username));
      return false;
    }
    return true;
  }

  getRemainingLockSeconds(ip: string, username: string): number {
    const record = this.attempts.get(this.makeKey(ip, username));
    if (!record?.lockedUntil) return 0;
    return Math.max(0, Math.ceil((record.lockedUntil - Date.now()) / 1000));
  }

  recordFailure(ip: string, username: string): void {
    const key = this.makeKey(ip, username);
    const record = this.attempts.get(key) || { count: 0, lastAttempt: 0, lockedUntil: null };

    record.count += 1;
    record.lastAttempt = Date.now();

    if (record.count >= MAX_ATTEMPTS) {
      record.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
      this.logger.warn(`[LOCKOUT] ip=${ip} locked for ${LOCKOUT_DURATION_MS / 1000}s after ${record.count} failures`);
    }

    this.attempts.set(key, record);
  }

  recordSuccess(ip: string, username: string): void {
    this.attempts.delete(this.makeKey(ip, username));
  }

  /** Periodic cleanup of expired records (call from a cron or on each check) */
  cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.attempts.entries()) {
      if (record.lockedUntil && now >= record.lockedUntil) {
        this.attempts.delete(key);
      } else if (now - record.lastAttempt > LOCKOUT_DURATION_MS * 2) {
        this.attempts.delete(key);
      }
    }
  }
}
