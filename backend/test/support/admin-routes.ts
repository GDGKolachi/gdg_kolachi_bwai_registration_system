import { randomUUID } from 'node:crypto';
import { Backend, Http } from './backend';

type Method = 'get' | 'post' | 'patch' | 'delete';

export interface Route {
  method: Method;
  path: string;
  label: string;
}

export async function adminRoutes(backend: Backend): Promise<Route[]> {
  const res = await fetch(`${backend.url}/api/docs-json`);
  const doc = (await res.json()) as {
    paths: Record<string, Record<string, unknown>>;
  };
  const routes: Route[] = [];
  for (const [path, operations] of Object.entries(doc.paths)) {
    if (!path.startsWith('/api/admin/')) continue;
    for (const method of Object.keys(operations) as Method[]) {
      routes.push({ method, path, label: `${method.toUpperCase()} ${path}` });
    }
  }
  if (routes.length < 40) {
    throw new Error(
      `Only ${routes.length} admin routes found in /api/docs-json`,
    );
  }
  return routes;
}

export async function statusOn(client: Http, route: Route): Promise<number> {
  const path = route.path
    .replace(/^\/api/, '')
    .replace(/\{[^}]+\}/g, () => randomUUID());
  const res = await client.send(
    route.method,
    path,
    route.method === 'get' ? undefined : {},
  );
  return res.status;
}

export async function routesWhere(
  client: Http,
  routes: Route[],
  predicate: (status: number) => boolean,
): Promise<string[]> {
  const matching: string[] = [];
  for (const route of routes) {
    if (predicate(await statusOn(client, route))) matching.push(route.label);
  }
  return matching.sort();
}
