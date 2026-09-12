import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { config } from "../config.js";
import { requireAuth, toAuthUser, type AuthedRequest } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { HttpError } from "../utils/httpError.js";

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(8).max(72),
});

const loginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1),
});

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

authRouter.post("/register", async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    const exists = await User.findOne({ email: body.email });
    if (exists) {
      throw new HttpError(409, "An account with this email already exists");
    }

    const password = await bcrypt.hash(body.password, 12);
    const user = await User.create({
      name: body.name,
      email: body.email,
      password,
    });

    res.status(201).json({
      token: signToken(user._id.toString()),
      user: toAuthUser(user),
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const user = await User.findOne({ email: body.email }).select("+password");
    if (!user) {
      throw new HttpError(401, "Invalid email or password");
    }

    const ok = await bcrypt.compare(body.password, user.password);
    if (!ok) {
      throw new HttpError(401, "Invalid email or password");
    }

    if (user.role !== "admin") {
      throw new HttpError(403, "Admin access only");
    }

    res.json({
      token: signToken(user._id.toString()),
      user: toAuthUser(user),
    });
  } catch (err) {
    next(err);
  }
});

authRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  res.json({ user: req.user });
});
