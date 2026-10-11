import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "../data/prisma.js";

const accessSecret = process.env.AUTH_ACCESS_SECRET ?? (process.env.NODE_ENV === "production" ? "" : "local-development-only-change-me-please-32chars");
if (!accessSecret) throw new Error("AUTH_ACCESS_SECRET must be set in production");

export interface AuthUser { id: string; phone: string; role: string; authVersion: number }
declare global { namespace Express { interface Request { authUser?: AuthUser } } }
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export function createAccessToken(user: AuthUser): string {
  return jwt.sign({ sub: user.id, phone: user.phone, role: user.role, ver: user.authVersion }, accessSecret, { expiresIn: "15m", issuer: "agriqora-api", audience: "agriqora-client" });
}
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) { res.status(401).json({ success: false, error: "Authentication required" }); return; }
  try {
    const payload = jwt.verify(header.slice(7), accessSecret, { issuer: "agriqora-api", audience: "agriqora-client" }) as jwt.JwtPayload;
    if (typeof payload.sub !== "string") throw new Error("Invalid token subject");
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.authVersion !== payload.ver) { res.status(401).json({ success: false, error: "Invalid or expired access token" }); return; }
    req.authUser = { id: user.id, phone: user.phone, role: user.role, authVersion: user.authVersion };
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) { res.status(401).json({ success: false, error: "Invalid or expired access token" }); return; }
    next(error);
  }
}
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.authUser) { res.status(401).json({ success: false, error: "Authentication required" }); return; }
    if (!roles.includes(req.authUser.role)) { res.status(403).json({ success: false, error: "You do not have permission to perform this action" }); return; }
    next();
  };
}
export function newRefreshToken() { return randomBytes(48).toString("base64url"); }

/** Protect private reads and every mutating API route; public reads remain available. */
export async function apiAuthorization(req: Request, res: Response, next: NextFunction) {
  if (["HEAD", "OPTIONS"].includes(req.method)) { next(); return; }
  if (req.method === "GET") {
    const readRolesByPath: Array<[RegExp, string[]]> = [
      [/^\/users$/, ["admin"]],
      [/^\/requests$/, ["buyer", "farmer", "admin"]],
      [/^\/notifications$/, ["buyer", "farmer", "admin"]],
      [/^\/records$/, ["farmer", "admin"]],
      [/^\/admin\/stats$/, ["admin"]],
    ];
    const readMatch = readRolesByPath.find(([pattern]) => pattern.test(req.path));
    if (!readMatch) { next(); return; }
    authenticate(req, res, (error?: any) => {
      if (error) { next(error); return; }
      requireRole(...readMatch[1])(req, res, next);
    });
    return;
  }
  if (req.path.startsWith("/auth/")) { next(); return; }
  const rolesByPath: Array<[RegExp, string[]]> = [
    [/^\/produce\/[^/]+\/anchor\/(?:prepare|confirm)$/, ["farmer"]],
    [/^\/produce(?:\/[^/]+)?$/, ["farmer", "admin"]],
    [/^\/requests$/, ["buyer", "admin"]],
    [/^\/requests\/[^/]+\/status$/, ["farmer", "admin"]],
    [/^\/traceability\/correct$/, ["admin"]],
    [/^\/users$/, ["admin"]],
    [/^\/users\/[^/]+\/verify$/, ["admin"]],
    [/^\/records$/, ["farmer", "admin"]],
    [/^\/community$/, ["admin"]],
  ];
  const match = rolesByPath.find(([pattern]) => pattern.test(req.path));
  if (!match) { res.status(403).json({ success: false, error: "This write endpoint is not enabled" }); return; }
  authenticate(req, res, (error?: any) => {
    if (error) { next(error); return; }
    requireRole(...match[1])(req, res, next);
  });
}
