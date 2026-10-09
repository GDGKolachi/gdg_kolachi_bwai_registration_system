import { Controller, Get, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { EventsService } from './events.service';

// The claim link is universal (anyone holding it can claim), so the public
// event endpoints must not hand it out; admins read it from /admin/events.
function withoutCreditsSecrets<T extends Record<string, any>>(event: T) {
  const { credits_claim_url, credits_video_url, ...rest } = event;
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
