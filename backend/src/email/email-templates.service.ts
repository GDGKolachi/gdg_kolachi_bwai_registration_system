import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailTemplate } from '../entities/email-template.entity';
import { EmailSetting } from '../entities/email-setting.entity';
import { renderEmail, RenderedEmail } from './templates/render';
import { CopyOverrides, mergeCopy } from './templates/copy';
import {
  EMAIL_DEFINITIONS,
  EMAIL_TYPES,
  EmailData,
  EmailType,
  isEmailType,
  SAMPLE_VARIANTS,
} from './templates/email-types';
import { DEFAULT_THEME, isThemeId, THEMES } from './templates/themes';
import type { ThemeId } from './templates/kit';

const CACHE_MS = 30_000;
const COPY_FIELDS = ['subject', 'heading', 'intro', 'cta_label'] as const;
const MAX_LENGTH = { subject: 200, heading: 200, intro: 4000, cta_label: 60 };

interface Config {
  theme: ThemeId;
  overrides: Partial<Record<EmailType, CopyOverrides>>;
}

/**
 * Where an email's look and words come from: the global theme (or the
 * event's own), with the admin's per-type copy on top of the built-in
 * defaults. Reads are cached for 30 s and dropped on every write, so a send
 * never waits on the database twice and an edit applies straight away.
 *
 * If the tables cannot be read, emails still go out with the defaults.
 */
@Injectable()
export class EmailTemplatesService {
  private readonly logger = new Logger(EmailTemplatesService.name);
  private cache: { at: number; config: Config } | null = null;

  constructor(
    @InjectRepository(EmailTemplate)
    private readonly templates: Repository<EmailTemplate>,
    @InjectRepository(EmailSetting)
    private readonly settings: Repository<EmailSetting>,
  ) {}

  private async config(): Promise<Config> {
    if (this.cache && Date.now() - this.cache.at < CACHE_MS)
      return this.cache.config;
    const config: Config = { theme: DEFAULT_THEME, overrides: {} };
    try {
      const [themeRow, rows] = await Promise.all([
        this.settings.findOne({ where: { key: 'theme' } }),
        this.templates.find(),
      ]);
      if (isThemeId(themeRow?.value)) config.theme = themeRow.value;
      for (const row of rows) {
        if (isEmailType(row.email_type)) {
          config.overrides[row.email_type] = {
            subject: row.subject,
            heading: row.heading,
            intro: row.intro,
            cta_label: row.cta_label,
          };
        }
      }
    } catch (err) {
      this.logger.error(
        `Could not load email templates, using defaults: ${(err as Error).message}`,
      );
    }
    this.cache = { at: Date.now(), config };
    return config;
  }

  private invalidate() {
    this.cache = null;
  }

  /** The event's own theme when it has a valid one, otherwise the global theme. */
  async themeFor(
    event?: { email_theme?: string | null } | null,
  ): Promise<ThemeId> {
    if (isThemeId(event?.email_theme)) return event.email_theme;
    return (await this.config()).theme;
  }

  /** What every send uses. `event` only decides the theme. */
  async render<T extends EmailType>(
    type: T,
    data: EmailData<T>,
    event?: { email_theme?: string | null } | null,
  ): Promise<RenderedEmail> {
    const config = await this.config();
    return renderEmail(type, data, {
      theme: await this.themeFor(event),
      overrides: config.overrides[type],
    });
  }

  // ------------------------------------------------------------ admin

  async list() {
    const config = await this.config();
    const rows = await this.templates.find();
    const meta = new Map(rows.map((r) => [r.email_type, r]));
    return {
      theme: config.theme,
      themes: Object.values(THEMES).map((t) => ({ id: t.id, name: t.name })),
      types: EMAIL_TYPES.map((type) => {
        const def = EMAIL_DEFINITIONS[type];
        const row = meta.get(type);
        return {
          type,
          name: def.name,
          description: def.description,
          cta: def.cta,
          variables: def.variables,
          variants: SAMPLE_VARIANTS[type] ?? [],
          defaults: def.defaults,
          overrides: row
            ? {
                subject: row.subject,
                heading: row.heading,
                intro: row.intro,
                cta_label: row.cta_label,
              }
            : null,
          customized: !!row && COPY_FIELDS.some((f) => row[f]?.trim()),
          updated_at: row?.updated_at ?? null,
        };
      }),
    };
  }

  async setTheme(theme: string, adminId: string | null) {
    if (!isThemeId(theme)) {
      throw new BadRequestException(
        `theme must be one of: ${Object.keys(THEMES).join(', ')}`,
      );
    }
    await this.settings.save({
      key: 'theme',
      value: theme,
      updated_by: adminId,
    });
    this.invalidate();
    return { theme };
  }

  private cleanCopy(copy: CopyOverrides | undefined): CopyOverrides {
    const out: CopyOverrides = {};
    for (const f of COPY_FIELDS) {
      const v = copy?.[f];
      if (v === undefined) continue;
      if (v !== null && typeof v !== 'string')
        throw new BadRequestException(`${f} must be text`);
      const trimmed = (v ?? '').trim();
      if (trimmed.length > MAX_LENGTH[f]) {
        throw new BadRequestException(
          `${f} is too long (max ${MAX_LENGTH[f]} characters)`,
        );
      }
      out[f] = trimmed || null;
    }
    return out;
  }

  private assertType(type: string): asserts type is EmailType {
    if (!isEmailType(type))
      throw new NotFoundException(`Unknown email type "${type}"`);
  }

  /** Saves the copy; a blank field goes back to the default. */
  async save(type: string, copy: CopyOverrides, adminId: string | null) {
    this.assertType(type);
    const clean = this.cleanCopy(copy);
    await this.templates.save({
      email_type: type,
      ...clean,
      updated_by: adminId,
    });
    this.invalidate();
    return (await this.list()).types.find((t) => t.type === type);
  }

  async reset(type: string) {
    this.assertType(type);
    await this.templates.delete({ email_type: type });
    this.invalidate();
    return (await this.list()).types.find((t) => t.type === type);
  }

  /**
   * Sample render for the editor. `copy` is the unsaved form; when it is
   * absent the saved copy is used. `theme` defaults to the global theme.
   */
  async preview(
    type: string,
    opts: { theme?: string | null; copy?: CopyOverrides; variant?: string },
  ) {
    this.assertType(type);
    const config = await this.config();
    const def = EMAIL_DEFINITIONS[type] as {
      sample(v?: string): EmailData<EmailType>;
    };
    const theme = isThemeId(opts.theme) ? opts.theme : config.theme;
    const overrides = opts.copy
      ? this.cleanCopy(opts.copy)
      : config.overrides[type];
    const rendered = renderEmail(type, def.sample(opts.variant), {
      theme,
      overrides,
    });
    return {
      ...rendered,
      copy: mergeCopy(EMAIL_DEFINITIONS[type].defaults, overrides),
    };
  }
}
