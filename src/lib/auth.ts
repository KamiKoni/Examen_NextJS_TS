import crypto from "node:crypto";

import jwt, { type SignOptions } from "jsonwebtoken";
import { cookies } from "next/headers";

import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from "@/lib/constants";
import { getEnv } from "@/lib/env";

// Token payloads are kept intentionally small so cookies only carry identity and session data.
export interface AccessTokenPayload {
  sub: string;
  email: string;
  name: string;
  role: string;
}

export interface RefreshTokenPayload {
  sub: string;
  sessionId: string;
}

function signToken(payload: object, secret: string, expiresIn: SignOptions["expiresIn"]) {
  return jwt.sign(payload, secret, {
    expiresIn,
    issuer: "clockhub",
  });
}

export function signAccessToken(payload: AccessTokenPayload) {
  const env = getEnv();

  return signToken(
    payload,
    env.JWT_ACCESS_SECRET,
    env.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"],
  );
}

export function signRefreshToken(payload: RefreshTokenPayload) {
  const env = getEnv();

  return signToken(
    payload,
    env.JWT_REFRESH_SECRET,
    env.JWT_REFRESH_EXPIRES_IN as SignOptions["expiresIn"],
  );
}

export function verifyAccessToken(token: string) {
  const env = getEnv();
  return jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: "clockhub" }) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string) {
  const env = getEnv();
  return jwt.verify(token, env.JWT_REFRESH_SECRET, { issuer: "clockhub" }) as RefreshTokenPayload;
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export async function setAuthCookies(accessToken: string, refreshToken: string) {
  const store = await cookies();

  // Access and refresh cookies intentionally use different lifetimes.
  store.set(ACCESS_COOKIE_NAME, accessToken, cookieOptions(60 * 15));
  store.set(REFRESH_COOKIE_NAME, refreshToken, cookieOptions(60 * 60 * 24 * 7));
}

export async function clearAuthCookies() {
  const store = await cookies();
  store.delete(ACCESS_COOKIE_NAME);
  store.delete(REFRESH_COOKIE_NAME);
}
