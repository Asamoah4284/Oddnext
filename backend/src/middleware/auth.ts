import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { hasActiveVip, User, type UserDoc } from "../models/User.js";
import { HttpError } from "../utils/httpError.js";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  isVip: boolean;
  entitlements: string[];
  phone: string;
  vipExpiresAt: Date | null;
  vipActive: boolean;
};

export type AuthedRequest = Request & { user?: AuthUser };

type JwtPayload = { sub: string };

function toAuthUser(user: UserDoc): AuthUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    isVip: user.isVip,
    entitlements: user.entitlements ?? [],
    phone: user.phone ?? "",
    vipExpiresAt: user.vipExpiresAt ?? null,
    vipActive: hasActiveVip(user),
  };
}

function readToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    return header.slice(7);
  }
  return null;
}

export async function optionalAuth(
  req: AuthedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = readToken(req);
    if (!token) {
      next();
      return;
    }
    const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;
    const user = await User.findById(payload.sub);
    if (user) {
      req.user = toAuthUser(user);
    }
    next();
  } catch {
    next();
  }
}

export async function requireAuth(
  req: AuthedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = readToken(req);
    if (!token) {
      throw new HttpError(401, "Authentication required");
    }
    const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;
    const user = await User.findById(payload.sub);
    if (!user) {
      throw new HttpError(401, "Account no longer exists");
    }
    req.user = toAuthUser(user);
    next();
  } catch (err) {
    if (err instanceof HttpError) {
      next(err);
      return;
    }
    next(new HttpError(401, "Invalid or expired token"));
  }
}

export function requireAdmin(
  req: AuthedRequest,
  _res: Response,
  next: NextFunction
): void {
  if (!req.user || req.user.role !== "admin") {
    next(new HttpError(403, "Admin access required"));
    return;
  }
  next();
}

export { toAuthUser };
