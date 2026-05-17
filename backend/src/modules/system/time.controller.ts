import { Controller, Get } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";

/**
 * Public time endpoint — lets browsers compute an offset between client clock
 * and server clock so session countdowns don't drift when the user's machine
 * clock is wrong.
 *
 * Frontends are expected to:
 *   1. Call GET /time once on app start (and periodically)
 *   2. offset = response.epoch_ms - Date.now()  (capture round-trip half if needed)
 *   3. Replace Date.now() with (Date.now() + offset) wherever absolute time matters
 */
@Controller()
export class TimeController {
  @Get("time")
  @SkipThrottle()
  getServerTime() {
    const now = new Date();
    return {
      now: now.toISOString(),
      epoch_ms: now.getTime(),
    };
  }
}
