import { Controller, Get, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { EventsService } from './events.service';

// The claim link is universal (anyone holding it can claim), so the public
// event endpoints must not hand it out; admins read it from /admin/events.
// The meeting link and details go only to seated attendees (emails and their
// personal join page), and the reminder bookkeeping is admin-only.
const PRIVATE_FIELDS = [
  'credits_claim_url',
  'credits_video_url',
  'meeting_url',
  'meeting_details',
  'meeting_reminder_sent_at',
  'meeting_reminder_sent_count',
];

function withoutCreditsSecrets<T extends Record<string, any>>(event: T) {
  const rest: Record<string, any> = { ...event };
  for (const field of PRIVATE_FIELDS) delete rest[field];
  return rest;
}

@Throttle({ default: { ttl: 60000, limit: 100 } })
@Controller('events')
export class EventsController {
  constructor(private eventsService: EventsService) {}

  @Get()
  async findAll() {
    return (await this.eventsService.findAll()).map(withoutCreditsSecrets);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return withoutCreditsSecrets(await this.eventsService.findOne(id));
  }
}
