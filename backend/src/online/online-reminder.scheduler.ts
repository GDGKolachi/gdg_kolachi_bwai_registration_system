import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { OnlineService } from './online.service';

const TICK_INTERVAL_MS = 60_000;

/**
 * Once a minute, sends the "starting soon" email for any online event whose
 * reminder is due. The claim in OnlineService.sendReminder makes it safe to
 * run on several instances. Disable with ONLINE_REMINDER_WORKER_ENABLED=false.
 */
@Injectable()
export class OnlineReminderScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OnlineReminderScheduler.name);
  private timer: NodeJS.Timeout | null = null;
  private ticking = false;

  constructor(private readonly online: OnlineService) {}

  onModuleInit() {
    if (process.env.ONLINE_REMINDER_WORKER_ENABLED === 'false') {
      this.logger.log(
        'Online reminder worker disabled (ONLINE_REMINDER_WORKER_ENABLED=false)',
      );
      return;
    }
    this.timer = setInterval(() => {
      this.tick().catch((err: Error) =>
        this.logger.error(
          `Online reminder tick failed: ${err?.message ?? err}`,
        ),
      );
    }, TICK_INTERVAL_MS);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Public so tests can drive it without timers. Overlapping calls are skipped. */
  async tick(now = new Date()): Promise<number> {
    if (this.ticking) return 0;
    this.ticking = true;
    try {
      const due = await this.online.dueReminderEventIds(now);
      for (const id of due) {
        await this.online.sendReminder(id);
      }
      return due.length;
    } finally {
      this.ticking = false;
    }
  }
}
