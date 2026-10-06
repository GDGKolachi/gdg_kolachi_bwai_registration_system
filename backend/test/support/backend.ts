import { ChildProcess, spawn } from 'node:child_process';
import { createHmac, randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from 'pg';
import request, { Response } from 'supertest';
import { COMPILED_MAIN } from './paths';

export type Role = 'super_admin' | 'organizer' | 'volunteer';
type Env = Record<string, string | undefined>;

export const ROOT_ADMIN = {
  email: 'root.admin@example.com',
  password: 'Root-Admin-Pass-2026!',
};

function dbSettings() {
  return {
    host: process.env.E2E_DB_HOST ?? 'localhost',
    port: Number(process.env.E2E_DB_PORT ?? 5432),
    user: process.env.E2E_DB_USER ?? 'postgres',
    password: process.env.E2E_DB_PASSWORD ?? 'postgres',
  };
}

export function uniqueTag() {
  return randomBytes(4).toString('hex');
}

let ipCounter = Math.floor(Math.random() * 1000) * 1000;
export function newClientIp() {
  ipCounter += 1;
  return `10.${(ipCounter >> 16) & 255}.${(ipCounter >> 8) & 255}.${ipCounter & 255}`;
}

export class Database {
  private constructor(
    readonly name: string,
    private client: Client,
  ) {}

  static async create(): Promise<Database> {
    const name = `e2e_${uniqueTag()}${uniqueTag()}`;
    const maintenance = new Client({
      ...dbSettings(),
      database: process.env.E2E_DB_MAINTENANCE_DB ?? 'postgres',
    });
    await maintenance.connect();
    await maintenance.query(`CREATE DATABASE "${name}" ENCODING 'UTF8'`);
    await maintenance.end();
    const client = new Client({ ...dbSettings(), database: name });
    await client.connect();
    return new Database(name, client);
  }

  async query<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
    const result = await this.client.query(sql, params);
    return result.rows as T[];
  }

  async drop() {
    await this.client.end().catch(() => undefined);
    const maintenance = new Client({
      ...dbSettings(),
      database: process.env.E2E_DB_MAINTENANCE_DB ?? 'postgres',
    });
    await maintenance.connect();
    await maintenance.query(
      `DROP DATABASE IF EXISTS "${this.name}" WITH (FORCE)`,
    );
    await maintenance.end();
  }
}

export class Http {
  constructor(
    protected baseUrl: string,
    protected token?: string,
    protected fixedIp?: string,
  ) {}

  get(path: string) {
    return this.send('get', path);
  }

  post(path: string, body: object = {}) {
    return this.send('post', path, body);
  }

  patch(path: string, body: object = {}) {
    return this.send('patch', path, body);
  }

  delete(path: string) {
    return this.send('delete', path);
  }

  async send(
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
    body?: object,
    forwardedFor?: string,
  ): Promise<Response> {
    let req = request(this.baseUrl)
      [method](`/api${path}`)
      .set('X-Forwarded-For', forwardedFor ?? this.fixedIp ?? newClientIp());
    if (this.token) req = req.set('Authorization', `Bearer ${this.token}`);
    if (body !== undefined) req = req.send(body);
    return req;
  }
}

export class AdminSession extends Http {
  constructor(
    baseUrl: string,
    readonly id: string,
    readonly email: string,
    readonly password: string,
    readonly role: Role,
    token: string,
  ) {
    super(baseUrl, token);
  }
}

export interface Boot {
  started: boolean;
  exitCode: number | null;
  output: () => string;
  backend?: Backend;
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as { port: number };
      server.close(() => resolve(port));
    });
  });
}

function backendEnv(
  db: Database,
  port: number,
  overrides: Env,
): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const key of Object.keys(env)) {
    if (
      /^(DB_|DATABASE_URL|ADMIN_|RESEND_|JWT_|PORT$|APP_URL|FRONTEND_URL)/.test(
        key,
      )
    ) {
      delete env[key];
    }
  }
  const settings = dbSettings();
  Object.assign(env, {
    DB_HOST: settings.host,
    DB_PORT: String(settings.port),
    DB_USER: settings.user,
    DB_PASSWORD: settings.password,
    DB_NAME: db.name,
    JWT_SECRET: 'e2e-jwt-secret-' + db.name,
    ADMIN_EMAIL: ROOT_ADMIN.email,
    ADMIN_PASSWORD: ROOT_ADMIN.password,
    RESEND_API_KEY: '',
    APP_URL: 'http://localhost:3000',
    FRONTEND_URL: 'http://localhost:5173',
    PORT: String(port),
  });
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete env[key];
    else env[key] = value;
  }
  return env;
}

async function waitUntilServing(
  url: string,
  child: ChildProcess,
  timeoutMs: number,
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) return false;
    const status = await fetch(`${url}/api/event-types`).then(
      (res) => res.status,
      () => 0,
    );
    if (status === 200) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

export async function bootBackend(
  db: Database,
  overrides: Env = {},
): Promise<Boot> {
  const port = await freePort();
  const env = backendEnv(db, port, overrides);
  const cwd = mkdtempSync(join(tmpdir(), 'e2e-backend-'));
  const child = spawn(process.execPath, [COMPILED_MAIN], {
    cwd,
    env,
    stdio: 'pipe',
  });
  let output = '';
  child.stdout!.on('data', (d) => (output += d.toString()));
  child.stderr!.on('data', (d) => (output += d.toString()));
  const exited = new Promise<number | null>((resolve) =>
    child.once('exit', (code) => resolve(code)),
  );
  const url = `http://127.0.0.1:${port}`;
  const started = await waitUntilServing(url, child, 60_000);
  const cleanup = () => rmSync(cwd, { recursive: true, force: true });
  if (!started) {
    if (child.exitCode === null) child.kill();
    const exitCode = await exited;
    cleanup();
    return { started, exitCode, output: () => output };
  }
  const backend = new Backend(db, url, env.JWT_SECRET!, overrides, async () => {
    child.kill();
    await exited;
    cleanup();
  });
  return { started, exitCode: null, output: () => output, backend };
}

export async function startBackend(overrides: Env = {}): Promise<Backend> {
  const db = await Database.create();
  const boot = await bootBackend(db, overrides);
  if (!boot.backend) {
    await db.drop();
    throw new Error(
      `The backend did not start:\n${boot.output().slice(-4000)}`,
    );
  }
  return boot.backend;
}

function base64url(value: object) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

export class Backend {
  readonly anonymous: Http;
  private rootSession?: AdminSession;
  private successors: Backend[] = [];

  constructor(
    readonly db: Database,
    readonly url: string,
    private jwtSecret: string,
    private overrides: Env,
    private kill: () => Promise<void>,
  ) {
    this.anonymous = new Http(url);
  }

  fromClientIp(ip: string) {
    return new Http(this.url, undefined, ip);
  }

  withToken(token: string) {
    return new Http(this.url, token);
  }

  login(email: string, password: string, forwardedFor?: string) {
    return this.anonymous.send(
      'post',
      '/auth/login',
      { email, password },
      forwardedFor,
    );
  }

  async signIn(email: string, password: string): Promise<AdminSession> {
    const res = await this.login(email, password);
    if (res.status !== 200 && res.status !== 201) {
      throw new Error(
        `Sign-in for ${email} failed with ${res.status}: ${JSON.stringify(res.body)}`,
      );
    }
    const { access_token, user } = res.body;
    return new AdminSession(
      this.url,
      user.id,
      user.email,
      password,
      user.role,
      access_token,
    );
  }

  async rootAdmin(): Promise<AdminSession> {
    this.rootSession ??= await this.signIn(
      ROOT_ADMIN.email,
      ROOT_ADMIN.password,
    );
    return this.rootSession;
  }

  async givenAdmin(role: Role, name = `Test ${role}`): Promise<AdminSession> {
    const root = await this.rootAdmin();
    const email = `${role.replace('_', '.')}.${uniqueTag()}@example.com`;
    const password = `Pass-${uniqueTag()}-${uniqueTag()}`;
    const res = await root.post('/admin/users', {
      email,
      password,
      name,
      role,
    });
    if (res.status !== 201) {
      throw new Error(
        `Creating a ${role} failed with ${res.status}: ${JSON.stringify(res.body)}`,
      );
    }
    return this.signIn(email, password);
  }

  tokenFor(claims: Record<string, unknown>) {
    const now = Math.floor(Date.now() / 1000);
    const header = base64url({ alg: 'HS256', typ: 'JWT' });
    const payload = base64url({ iat: now, exp: now + 3600, ...claims });
    const signature = createHmac('sha256', this.jwtSecret)
      .update(`${header}.${payload}`)
      .digest('base64url');
    return `${header}.${payload}.${signature}`;
  }

  async adminAccounts() {
    return this.db.query<{ email: string; role: string }>(
      'SELECT email, role FROM admins ORDER BY email',
    );
  }

  async restart(): Promise<Boot> {
    await this.kill();
    const boot = await bootBackend(this.db, this.overrides);
    if (boot.backend) this.successors.push(boot.backend);
    return boot;
  }

  async stop() {
    await this.kill();
    for (const successor of this.successors) await successor.stop();
  }

  async shutdown() {
    await this.stop();
    await this.db.drop();
  }
}
