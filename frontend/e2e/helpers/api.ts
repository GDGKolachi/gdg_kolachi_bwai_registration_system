import type { APIRequestContext } from '@playwright/test';

/** API origin (Nest uses global prefix /api). */
export function apiOrigin(): string {
  return process.env.PLAYWRIGHT_API_URL || 'http://localhost:3000';
}

export async function getFirstOpenWorkshopId(request: APIRequestContext): Promise<string | null> {
  const res = await request.get(`${apiOrigin()}/api/workshops`);
  if (!res.ok()) return null;
  const list = (await res.json()) as { id: string; status?: string }[];
  if (!Array.isArray(list)) return null;
  const open = list.find((w) => w.status === 'open');
  return open?.id ?? null;
}

export async function getFirstWorkshopId(request: APIRequestContext): Promise<string | null> {
  const res = await request.get(`${apiOrigin()}/api/workshops`);
  if (!res.ok()) return null;
  const list = (await res.json()) as { id: string }[];
  if (!Array.isArray(list) || list.length === 0) return null;
  return list[0].id;
}
