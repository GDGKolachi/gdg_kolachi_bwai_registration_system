/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument -- untyped request user */
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsEmail, IsIn, IsObject, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ORGANIZER_ROLES } from '../common/enums/admin-role.enum';
import { EmailTemplatesService } from './email-templates.service';
import { EmailService } from './email.service';
import { THEMES } from './templates/themes';
import type { CopyOverrides } from './templates/copy';

class ThemeDto {
  @IsIn(Object.keys(THEMES))
  theme: string;
}

class CopyDto {
  @IsOptional() @IsString() subject?: string | null;
  @IsOptional() @IsString() heading?: string | null;
  @IsOptional() @IsString() intro?: string | null;
  @IsOptional() @IsString() cta_label?: string | null;
}

class PreviewDto {
  @IsOptional() @IsIn(Object.keys(THEMES)) theme?: string;
  @IsOptional() @IsObject() copy?: CopyOverrides;
  @IsOptional() @IsString() variant?: string;
}

class TestDto extends PreviewDto {
  @IsEmail({}, { message: 'Enter a valid email address' })
  email: string;
}

/**
 * Admin editor for email copy and theme. Organizers and super admins only,
 * the same people who can create events and send emails; volunteers cannot.
 */
@Controller('admin/email-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ORGANIZER_ROLES)
export class EmailTemplatesController {
  constructor(
    private readonly templates: EmailTemplatesService,
    private readonly email: EmailService,
  ) {}

  @Get()
  list() {
    return this.templates.list();
  }

  @Put('settings')
  setTheme(@Body() dto: ThemeDto, @Req() req: any) {
    return this.templates.setTheme(dto.theme, req.user?.id ?? null);
  }

  @Put(':type')
  save(@Param('type') type: string, @Body() dto: CopyDto, @Req() req: any) {
    return this.templates.save(type, dto, req.user?.id ?? null);
  }

  @Delete(':type')
  reset(@Param('type') type: string) {
    return this.templates.reset(type);
  }

  @Post(':type/preview')
  @HttpCode(200)
  preview(@Param('type') type: string, @Body() dto: PreviewDto) {
    return this.templates.preview(type, dto);
  }

  /** Renders the sample (with the unsaved copy, if given) and sends it to one address, subject prefixed [TEST]. */
  @Post(':type/test')
  @HttpCode(200)
  async test(@Param('type') type: string, @Body() dto: TestDto) {
    const rendered = await this.templates.preview(type, dto);
    const result = await this.email.sendRendered(
      dto.email.trim(),
      rendered,
      `[TEST] ${rendered.subject}`,
    );
    return {
      ...result,
      to: dto.email.trim(),
      subject: `[TEST] ${rendered.subject}`,
    };
  }
}
