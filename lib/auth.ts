import { randomBytes, pbkdf2Sync, createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const SESSION_COOKIE = "skripsi_session";
const SECRET = process.env.SESSION_SECRET || "dev-secret-bimbingan-skripsi";

export type SessionPayload = { id: number; role: string; name: string };

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 100000, 32, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const check = pbkdf2Sync(password, salt, 100000, 32, "sha256").toString("hex");
  const a = Buffer.from(check, "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("hex");
}

export function createSessionToken(p: SessionPayload): string {
  const payload = Buffer.from(JSON.stringify(p)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token: string): SessionPayload | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof p.id !== "number" || typeof p.role !== "string") return null;
    return p;
  } catch {
    return null;
  }
}

export function setSessionCookie(p: SessionPayload) {
  cookies().set(SESSION_COOKIE, createSessionToken(p), {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearSessionCookie() {
  cookies().delete(SESSION_COOKIE);
}

export function getSession(): SessionPayload | null {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return readSessionToken(token);
}

export async function requireUser(roles?: string[]) {
  const s = getSession();
  if (!s) return { error: 401 as const, message: "Belum login" };
  if (roles && !roles.includes(s.role))
    return { error: 403 as const, message: "Akses ditolak" };
  const user = await prisma.user.findUnique({ where: { id: s.id } });
  if (!user) return { error: 401 as const, message: "Sesi tidak valid" };
  return { user, session: s };
}

export const STAGES = ["proposal", "seminar", "sidang", "lulus"] as const;
export const STAGE_LABEL: Record<string, string> = {
  proposal: "Proposal",
  seminar: "Seminar",
  sidang: "Sidang",
  lulus: "Lulus",
};
export const STAGE_STATUS_LABEL: Record<string, string> = {
  draft: "Draf",
  submitted: "Diajukan",
  approved: "Disetujui",
  revision: "Revisi",
};
export const BAB_LABEL: Record<number, string> = {
  1: "Bab 1 — Pendahuluan",
  2: "Bab 2 — Tinjauan Pustaka",
  3: "Bab 3 — Metodologi",
  4: "Bab 4 — Hasil",
  5: "Bab 5 — Penutup",
};
