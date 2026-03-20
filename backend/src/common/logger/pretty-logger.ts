import { ConsoleLogger, LogLevel } from '@nestjs/common';

/* ─── ANSI colours ─── */
const R = '\x1B[0m';       // reset
const DIM = '\x1B[2m';
const BOLD = '\x1B[1m';
const C: Record<string, string> = {
  log:     '\x1B[32m',  // green
  warn:    '\x1B[33m',  // yellow
  error:   '\x1B[31m',  // red
  debug:   '\x1B[36m',  // cyan
  verbose: '\x1B[35m',  // magenta
};

const LABEL: Record<string, string> = {
  log:     ' LOG ',
  warn:    'WARN ',
  error:   'ERROR',
  debug:   'DEBUG',
  verbose: ' VRB ',
};

/* ─── Separator helpers ─── */
const SEP = `${DIM}${'─'.repeat(72)}${R}`;

/**
 * PrettyLogger — แทน NestJS default ConsoleLogger
 *
 * รูปแบบ:
 *   HH:mm:ss  LEVEL  Context                   Message
 *   03:25:30   LOG   Bootstrap                 Starting application...
 *   03:25:30  WARN   XiaoweiWebSocketService   XIAOWEI_WS_URL not set
 */
export class PrettyLogger extends ConsoleLogger {
  /* แสดง separator line ก่อน group สำคัญ */
  separator() {
    process.stdout.write(SEP + '\n');
  }

  private stamp(): string {
    return new Date().toTimeString().slice(0, 8);
  }

  private line(level: LogLevel, message: unknown, ctx?: string): string {
    const color = C[level] ?? R;
    const label = LABEL[level] ?? level.padEnd(5).toUpperCase();
    const context = (ctx ?? (this as any).context ?? '').slice(0, 30).padEnd(30);
    const msg = typeof message === 'object' ? JSON.stringify(message) : String(message);
    return `${DIM}${this.stamp()}${R}  ${color}${BOLD}${label}${R}  ${DIM}${context}${R}  ${msg}`;
  }

  override log(message: unknown, context?: string) {
    if (!this.isLevelEnabled('log')) return;
    process.stdout.write(this.line('log', message, context) + '\n');
  }

  override warn(message: unknown, context?: string) {
    if (!this.isLevelEnabled('warn')) return;
    process.stdout.write(this.line('warn', message, context) + '\n');
  }

  override error(message: unknown, stackOrCtx?: string, context?: string) {
    if (!this.isLevelEnabled('error')) return;
    // NestJS ส่ง (message, stack, context) หรือ (message, context)
    const hasStack = stackOrCtx && stackOrCtx.includes('\n');
    const ctx = hasStack ? context : stackOrCtx;
    process.stdout.write(this.line('error', message, ctx) + '\n');
    if (hasStack) {
      process.stdout.write(`${DIM}         ${stackOrCtx}${R}\n`);
    }
  }

  override debug(message: unknown, context?: string) {
    if (!this.isLevelEnabled('debug')) return;
    process.stdout.write(this.line('debug', message, context) + '\n');
  }

  override verbose(message: unknown, context?: string) {
    if (!this.isLevelEnabled('verbose')) return;
    process.stdout.write(this.line('verbose', message, context) + '\n');
  }
}
