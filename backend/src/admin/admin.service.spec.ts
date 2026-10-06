import { Logger } from '@nestjs/common';
import { AdminService } from './admin.service';

Logger.overrideLogger(false);

function registration(overrides: Record<string, any> = {}): any {
  return {
    id: 'b6f1c2de-0000-4000-8000-000000000001',
    status: 'pending',
    acknowledged: false,
    qr_code_data: null as string | null,
    attendee: {
      name: 'محمد علی',
      email: 'ali@example.com',
      phone: '0300-1234567',
      cnic: '42101-1234567-1',
    },
    event: { title: 'Beyond Intelligence 2026', date: '2026-10-10', time: '12:00', venue: 'CEGA', is_online: false },
    ...overrides,
  };
}

function setup(reg: any, emailResult: { sent: boolean; error?: string }) {
  const saved: any[] = [];
  const registrationRepo = {
    findOne: jest.fn(async () => reg),
    save: jest.fn(async (r: any) => { saved.push({ ...r }); return r; }),
  };
  const emailService = {
    sendShortlistedEmail: jest.fn(async (..._args: any[]) => emailResult),
    sendReminderBatch: jest.fn(async (recipients: any[]) => ({ sent: recipients.length, failedIds: [] })),
  };
  const svc = new AdminService(null as any, registrationRepo as any, null as any, null as any, null as any, emailService as any);
  return { svc, saved, emailService };
}

describe('shortlisting', () => {
  it('puts only the registration id in the ticket QR code', async () => {
    const reg = registration();
    const { svc, emailService } = setup(reg, { sent: true });
    await svc.updateRegistrationStatus(reg.id, 'shortlisted');
    const qrData = emailService.sendShortlistedEmail.mock.calls[0][4];
    expect(JSON.parse(qrData)).toEqual({ registrationId: reg.id });
    expect(qrData).not.toContain('42101');
    expect(qrData).not.toContain('0300');
  });

  it('saves the shortlist only after the ticket email has gone out', async () => {
    const reg = registration();
    const { svc, saved } = setup(reg, { sent: true });
    await svc.updateRegistrationStatus(reg.id, 'shortlisted');
    expect(saved).toHaveLength(1);
    expect(saved[0].status).toBe('shortlisted');
  });

  it('leaves the person unshortlisted, with a reason, when the ticket email fails', async () => {
    const reg = registration();
    const { svc, saved } = setup(reg, { sent: false, error: 'You have reached your daily email sending quota' });
    await expect(svc.updateRegistrationStatus(reg.id, 'shortlisted')).rejects.toThrow(/did not send .*daily email sending quota/);
    expect(saved).toHaveLength(0);
  });

  it('still shortlists when no email provider is configured (local development)', async () => {
    const reg = registration();
    const { svc, saved } = setup(reg, { sent: false });
    await svc.updateRegistrationStatus(reg.id, 'shortlisted');
    expect(saved[0].status).toBe('shortlisted');
  });

  it('reports a failed email in a bulk shortlist without stopping the rest', async () => {
    const regs = Array.from({ length: 300 }, (_, i) => registration({ id: `reg-${i}` }));
    const registrationRepo = {
      findOne: jest.fn(async ({ where }: any) => ({ ...regs.find((r) => r.id === where.id), attendee: { ...regs[0].attendee } })),
      save: jest.fn(async (r: any) => r),
    };
    const emailService = {
      sendShortlistedEmail: jest.fn(async (_e: string, _n: string, _ev: any, id: string) =>
        id === 'reg-150' ? { sent: false, error: 'Invalid `to` field' } : { sent: true }),
    };
    const svc = new AdminService(null as any, registrationRepo as any, null as any, null as any, null as any, emailService as any);

    const result = await svc.bulkUpdateStatus(regs.map((r) => r.id), 'shortlisted');

    expect(result.succeeded).toHaveLength(299);
    expect(result.failed).toEqual([{ id: 'reg-150', error: expect.stringContaining('Invalid `to` field') }]);
  });
});

describe('reminders', () => {
  it('replaces an old ticket that carried contact details and CNIC with one that carries only the id', async () => {
    const reg = registration({
      status: 'shortlisted',
      qr_code_data: JSON.stringify({ registrationId: 'x', name: 'n', email: 'e', phone: '0300-1234567', cnic: '42101-1234567-1' }),
    });
    const { svc, saved, emailService } = setup(reg, { sent: true });

    await svc.sendReminder([reg.id], '');

    const sentQr = emailService.sendReminderBatch.mock.calls[0][0][0].qrData;
    expect(JSON.parse(sentQr)).toEqual({ registrationId: reg.id });
    expect(saved[0].qr_code_data).toBe(sentQr);
  });

  it('sends no ticket for an online event', async () => {
    const reg = registration({ status: 'confirmed', event: { ...registration().event, is_online: true } });
    const { svc, emailService } = setup(reg, { sent: true });
    await svc.sendReminder([reg.id], '');
    expect(emailService.sendReminderBatch.mock.calls[0][0][0].qrData).toBe('');
  });
});

describe('check-in', () => {
  function checkinSetup(reg: any) {
    const registrationRepo = {
      findOne: jest.fn(async () => reg),
      save: jest.fn(async (r: any) => r),
    };
    const svc = new AdminService(null as any, registrationRepo as any, null as any, null as any, null as any, null as any);
    return svc;
  }

  it('leaves a person checked in when two devices check them in at the same moment', async () => {
    const reg = registration({ status: 'shortlisted', checked_in: false, checked_in_at: null });
    const svc = checkinSetup(reg);
    await Promise.all([svc.setCheckin(reg.id, true), svc.setCheckin(reg.id, true)]);
    expect(reg.checked_in).toBe(true);
    expect(reg.status).toBe('attended');
  });

  it('keeps the first check-in time when the same ticket is checked in again', async () => {
    const first = new Date('2026-10-10T07:05:00Z');
    const reg = registration({ status: 'attended', checked_in: true, checked_in_at: first });
    await checkinSetup(reg).setCheckin(reg.id, true);
    expect(reg.checked_in_at).toBe(first);
  });

  it('still flips the state when no state is sent, for check-in pages opened before the update', async () => {
    const reg = registration({ status: 'confirmed', checked_in: false, acknowledged: true });
    const svc = checkinSetup(reg);
    await svc.setCheckin(reg.id);
    expect(reg.checked_in).toBe(true);
    await svc.setCheckin(reg.id);
    expect(reg.checked_in).toBe(false);
  });

  it.each(['pending', 'rejected'])('refuses to check in a %s registration', async (status) => {
    const reg = registration({ status, checked_in: false });
    await expect(checkinSetup(reg).setCheckin(reg.id, true)).rejects.toThrow(`registration is "${status}"`);
    expect(reg.checked_in).toBe(false);
  });

  it('refuses to check in a deleted registration', async () => {
    const reg = registration({ status: 'shortlisted', checked_in: false, deleted_at: new Date() });
    await expect(checkinSetup(reg).setCheckin(reg.id, true)).rejects.toThrow('registration was deleted');
  });

  it('says a registration that does not exist was not found', async () => {
    await expect(checkinSetup(null).setCheckin('missing', true)).rejects.toThrow('Registration not found');
  });

  it('lets a shortlisted person whose confirmation window expired in (the scanner warns instead)', async () => {
    const reg = registration({ status: 'shortlisted', acknowledgement_expired: true, checked_in: false });
    await checkinSetup(reg).setCheckin(reg.id, true);
    expect(reg.status).toBe('attended');
  });

  it.each([
    [true, 'confirmed'],
    [false, 'shortlisted'],
  ])('undoing a check-in for someone with acknowledged=%s puts them back to %s', async (acknowledged, expected) => {
    const reg = registration({ status: 'attended', checked_in: true, checked_in_at: new Date(), acknowledged });
    await checkinSetup(reg).setCheckin(reg.id, false);
    expect(reg).toMatchObject({ status: expected, checked_in: false, checked_in_at: null });
  });
});
