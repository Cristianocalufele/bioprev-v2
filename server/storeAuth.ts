import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { ensureStoreSchema, getStoreClient, isStoreConfigured, StoreError } from "./storeDatabase";

export type AdminRequest = Request & { storeAdminEmail?: string };

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const ephemeralSessionSecret = randomBytes(32).toString("hex");
let memoryPasscodeHash: string | null = null;

function configuredEnvPasscode(): string | undefined {
  return process.env.ADMIN_PASSCODE?.trim() || process.env.ADMIN_PASSWORD?.trim() || undefined;
}

function sessionSecret(): string {
  const explicit = process.env.ADMIN_SESSION_SECRET?.trim();
  if (explicit) return explicit;

  const envSeed = [
    process.env.ADMIN_PASSCODE?.trim(),
    process.env.ADMIN_PASSWORD?.trim(),
    process.env.TURSO_AUTH_TOKEN?.trim(),
    process.env.TURSO_DATABASE_URL?.trim(),
    process.env.CLOUDINARY_API_SECRET?.trim(),
  ]
    .filter(Boolean)
    .join("|");

  if (envSeed) {
    return createHmac("sha256", "bioprev-store-session-v1").update(envSeed).digest("hex");
  }

  return ephemeralSessionSecret;
}

function hashPasscode(passcode: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(passcode, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

function verifyPasscodeHash(passcode: string, storedHash: string): boolean {
  const [salt, expectedHex] = storedHash.split(":");
  if (!salt || !expectedHex) return false;
  const derived = scryptSync(passcode, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

async function getSavedPasscodeHash(): Promise<string | null> {
  if (isStoreConfigured()) {
    await ensureStoreSchema();
    const db = getStoreClient();
    const res = await db.execute("SELECT passcode_hash FROM store_admin_auth WHERE key = 'primary_admin'");
    const row = res.rows[0] as { passcode_hash?: unknown } | undefined;
    if (row?.passcode_hash) {
      return String(row.passcode_hash);
    }
    return null;
  }
  return memoryPasscodeHash;
}

async function savePasscodeHash(hash: string): Promise<boolean> {
  if (isStoreConfigured()) {
    await ensureStoreSchema();
    const db = getStoreClient();
    const res = await db.execute({
      sql: "INSERT INTO store_admin_auth (key, passcode_hash) VALUES ('primary_admin', ?) ON CONFLICT(key) DO NOTHING",
      args: [hash],
    });
    return res.rowsAffected > 0;
  }
  if (memoryPasscodeHash) return false;
  memoryPasscodeHash = hash;
  return true;
}

export async function getAdminAuthStatus(): Promise<{
  mode: "passcode";
  configured: boolean;
  needsSetup: boolean;
  usingSecretEnv: boolean;
}> {
  if (configuredEnvPasscode()) {
    return { mode: "passcode", configured: true, needsSetup: false, usingSecretEnv: true };
  }
  const saved = await getSavedPasscodeHash();
  return { mode: "passcode", configured: Boolean(saved), needsSetup: !saved, usingSecretEnv: false };
}

export function issueAdminToken(): string {
  const payload = Buffer.from(
    JSON.stringify({ sub: "store-admin", exp: Date.now() + TOKEN_TTL_MS }),
    "utf8",
  ).toString("base64url");
  const sig = createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyAdminToken(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payload, providedSig] = parts;
  if (!payload || !providedSig) return false;

  const expectedSig = createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  const providedBuf = Buffer.from(providedSig, "utf8");
  const expectedBuf = Buffer.from(expectedSig, "utf8");
  if (providedBuf.length !== expectedBuf.length || !timingSafeEqual(providedBuf, expectedBuf)) {
    return false;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { sub?: string; exp?: number };
    return parsed.sub === "store-admin" && typeof parsed.exp === "number" && parsed.exp > Date.now();
  } catch {
    return false;
  }
}

export async function setupInitialPasscode(passcode: string): Promise<string> {
  if (configuredEnvPasscode()) {
    throw new StoreError(
      "A senha de administrador já está definida nas variáveis de ambiente (Secrets).",
      409,
      "ADMIN_ALREADY_CONFIGURED",
    );
  }
  const hash = hashPasscode(passcode);
  const created = await savePasscodeHash(hash);
  if (!created) {
    throw new StoreError("A senha de administrador já foi definida.", 409, "ADMIN_ALREADY_CONFIGURED");
  }
  return issueAdminToken();
}

export async function verifyAdminPasscodeLogin(passcode: string): Promise<string> {
  const envPasscode = configuredEnvPasscode();
  if (envPasscode) {
    const a = Buffer.from(passcode, "utf8");
    const b = Buffer.from(envPasscode, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new StoreError("Senha incorrecta. Verifique e tente novamente.", 401, "INVALID_CREDENTIALS");
    }
    return issueAdminToken();
  }

  const savedHash = await getSavedPasscodeHash();
  if (!savedHash) {
    throw new StoreError("Defina primeiro a senha de administrador.", 409, "ADMIN_SETUP_REQUIRED");
  }
  if (!verifyPasscodeHash(passcode, savedHash)) {
    throw new StoreError("Senha incorrecta. Verifique e tente novamente.", 401, "INVALID_CREDENTIALS");
  }
  return issueAdminToken();
}

function assertAllowedOrigin(req: Request, res: Response): boolean {
  const origin = req.get("origin");
  if (origin && ["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    const requestHost = (req.get("x-forwarded-host") || req.get("host") || "").split(",")[0].trim().toLowerCase();
    try {
      if (new URL(origin).host.toLowerCase() !== requestHost) {
        res.status(403).json({ message: "Pedido de origem não autorizado.", code: "ORIGIN_NOT_ALLOWED" });
        return false;
      }
    } catch {
      res.status(403).json({ message: "Pedido de origem não autorizado.", code: "ORIGIN_NOT_ALLOWED" });
      return false;
    }
  }
  return true;
}

export async function requireStoreAdmin(req: Request, res: Response, next: NextFunction) {
  if (!assertAllowedOrigin(req, res)) return;

  const authHeader = req.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token || !verifyAdminToken(token)) {
    return res.status(401).json({
      message: "Inicie sessão com a senha de administrador para gerir a loja.",
      code: "AUTHENTICATION_REQUIRED",
    });
  }
  (req as AdminRequest).storeAdminEmail = process.env.ADMIN_EMAIL?.trim() || "admin@bioprev.ao";
  return next();
}
