import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { JWT_SECRET } from "./server-secrets";

const SESSION_COOKIE = "hcw_session";
const SESSION_MAX_AGE = 60 * 60 * 12; // 12h — roughly one shift

function secret(): Uint8Array {
  const s = JWT_SECRET || process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(s);
}

export type SessionPayload = {
  sub: string; // user id
  email: string;
  role: string;
  name: string;
  hid?: string; // active hospital id
  hname?: string; // active hospital name (for display)
};

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret());
}

export async function verifySession(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Reads and verifies the session cookie, returning the raw payload. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

/**
 * Reads and verifies the session cookie, then loads the full user. The
 * returned object also carries the *active hospital* chosen at login
 * (`activeHospitalId`/`activeHospitalName`). It falls back to the user's own
 * hospital when the session has no active hospital (single-hospital users and
 * legacy sessions), so every screen has a hospital to scope by.
 */
export async function getCurrentUser() {
  const payload = await getSession();
  if (!payload) return null;
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: { specialty: true, hospital: true },
  });
  if (!user) return null;
  const activeHospitalId = payload.hid ?? user.hospitalId ?? null;
  const activeHospitalName = payload.hname ?? user.hospital?.name ?? null;
  return Object.assign(user, { activeHospitalId, activeHospitalName });
}

export { SESSION_COOKIE };
