import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  username: z.string().trim().min(3).max(50).regex(/^[A-Za-z0-9_-]+$/, "Unit ID may only contain letters, numbers, _ or -."),
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

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date.")
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), "Use a valid date.");

export const profileSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    birthDate: isoDateSchema.nullable(),
    gender: z.enum(["male", "female", "non_binary", "other"]).nullable(),
    sexualPreference: z.enum(["male", "female", "bisexual"]),
    bio: z.string().trim().max(500).nullable(),
    city: z.string().trim().min(1).max(255).nullable(),
    locationSource: z.enum(["unset", "precise", "approximate"]),
    latitude: z.number().min(-90).max(90).nullable(),
    longitude: z.number().min(-180).max(180).nullable(),
  })
  .superRefine((data, context) => {
    if (
      data.locationSource === "precise" &&
      (data.latitude === null || data.longitude === null)
    ) {
      context.addIssue({
        code: "custom",
        message: "Precise location requires latitude and longitude.",
        path: ["locationSource"],
      });
    }

    if (data.locationSource === "approximate" && !data.city) {
      context.addIssue({
        code: "custom",
        message: "An approximate location requires a city or neighbourhood.",
        path: ["city"],
      });
    }
  });

export const profileTagsSchema = z.object({
  tags: z
    .array(z.string().trim().toLowerCase().min(1).max(50).regex(/^[a-z0-9][a-z0-9 -]*$/))
    .max(10)
    .transform((tags) => [...new Set(tags)]),
});

export const relationshipActionSchema = z
  .object({
    action: z.enum(["like", "unlike", "block", "unblock", "report"]),
    reason: z.string().trim().max(500).optional(),
  })
  .superRefine((data, context) => {
    if (data.action !== "report" && data.reason !== undefined) {
      context.addIssue({ code: "custom", message: "A reason is only valid for a report.", path: ["reason"] });
    }
  });

export const emailChangeSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  currentPassword: z.string().min(1).max(256),
});
