/**
 * MCP connection pool — keeps stdio/http connections alive across requests.
 * Caches connections + raw tool metadata per projectId.
 * The ToolSet (with per-request closures) is rebuilt cheaply on each request.
 */

import type { McpServerConfig } from "@/lib/types";
import {
  connectMcpServer,
  closeMcpConnection,
  listMcpTools,
  type McpConnection,
  type McpToolMeta,
} from "@/lib/mcp/client";

export type CachedMcpServer = {
  conn: McpConnection;
  serverId: string;
  tools: (McpToolMeta & { key: string })[];
};

type PoolEntry = {
  configSignature: string;
  servers: CachedMcpServer[];
  lastUsedMs: number;
};

const IDLE_TTL_MS = 10 * 60_000;
const HEALTH_TIMEOUT_MS = 4_000;

declare global {
  // eslint-disable-next-line no-var
  var __eggentMcpPool__: Map<string, PoolEntry> | undefined;
  // eslint-disable-next-line no-var
  var __eggentMcpPoolTimer__: NodeJS.Timeout | undefined;
}

function getPool(): Map<string, PoolEntry> {
  if (!globalThis.__eggentMcpPool__) {
    globalThis.__eggentMcpPool__ = new Map();
    startIdleSweep();
  }
  return globalThis.__eggentMcpPool__;
}

function startIdleSweep() {
  if (globalThis.__eggentMcpPoolTimer__) return;
  globalThis.__eggentMcpPoolTimer__ = setInterval(() => void sweepIdle(), 60_000);
  globalThis.__eggentMcpPoolTimer__.unref?.();
}

async function sweepIdle() {
  const pool = globalThis.__eggentMcpPool__;
  if (!pool) return;
  const now = Date.now();
  for (const [projectId, entry] of pool.entries()) {
    if (now - entry.lastUsedMs > IDLE_TTL_MS) {
      pool.delete(projectId);
      await closeServers(entry.servers);
    }
  }
}

async function closeServers(servers: CachedMcpServer[]) {
  for (const s of servers) {
    try { await closeMcpConnection(s.conn); } catch { /* ignore */ }
  }
}

function configSignature(servers: McpServerConfig[]): string {
  return JSON.stringify(
    servers.map((s) =>
      s.transport === "stdio"
        ? { id: s.id, command: s.command, args: s.args ?? [], env: s.env ?? {} }
        : { id: s.id, url: s.url, headers: s.headers ?? {} }
    )
  );
}

async function isAlive(conn: McpConnection): Promise<boolean> {
  try {
    await Promise.race([
      conn.client.listTools(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), HEALTH_TIMEOUT_MS)
      ),
    ]);
    return true;
  } catch {
    return false;
  }
}

async function buildEntry(
  servers: McpServerConfig[],
  signature: string
): Promise<PoolEntry | null> {
  const cached: CachedMcpServer[] = [];
  for (const server of servers) {
    const conn = await connectMcpServer(server);
    if (!conn) continue;
    const rawTools = await listMcpTools(conn.client);
    cached.push({
      conn,
      serverId: server.id,
      tools: rawTools.map((t) => ({
        serverId: server.id,
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
        key: `mcp_${server.id}_${t.name}`,
        conn,
      })),
    });
  }
  if (cached.length === 0) return null;
  return { configSignature: signature, servers: cached, lastUsedMs: Date.now() };
}

/** In-flight init promises to prevent duplicate starts for the same project */
const inflight = new Map<string, Promise<PoolEntry | null>>();

/**
 * Get cached server connections + tool metadata for a project.
 * Reconnects if config changed or connection is dead.
 */
export async function getPooledConnections(
  projectId: string,
  servers: McpServerConfig[]
): Promise<CachedMcpServer[] | null> {
  if (!servers.length) return null;
  const pool = getPool();
  const sig = configSignature(servers);

  const cached = pool.get(projectId);
  if (cached && cached.configSignature === sig) {
    // Health check first connection only (fast)
    const alive = await isAlive(cached.servers[0].conn);
    if (alive) {
      cached.lastUsedMs = Date.now();
      return cached.servers;
    }
    pool.delete(projectId);
    await closeServers(cached.servers);
  }

  // Deduplicate concurrent inits for same project
  const existing = inflight.get(projectId);
  if (existing) {
    const entry = await existing;
    return entry ? entry.servers : null;
  }

  const promise = buildEntry(servers, sig);
  inflight.set(projectId, promise);
  try {
    const entry = await promise;
    if (entry) {
      pool.set(projectId, entry);
      return entry.servers;
    }
    return null;
  } finally {
    inflight.delete(projectId);
  }
}

/** Call after user changes MCP server config in the UI. */
export async function invalidateMcpPool(projectId: string): Promise<void> {
  const pool = globalThis.__eggentMcpPool__;
  if (!pool) return;
  const entry = pool.get(projectId);
  if (entry) {
    pool.delete(projectId);
    await closeServers(entry.servers);
  }
}
