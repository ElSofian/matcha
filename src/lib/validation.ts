import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  password: z.string().min(8).max(256),
});

export const loginSchema = z.object({
  username: z.string().trim().min(1).max(50),
  password: z.string().min(1).max(256),
});

export const requestPasswordResetSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
});

export const confirmPasswordResetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(256),
});
