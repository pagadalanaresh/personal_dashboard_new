import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Include at least one uppercase letter")
    .regex(/[0-9]/, "Include at least one number"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Include at least one uppercase letter")
    .regex(/[0-9]/, "Include at least one number"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export const positionSchema = z.enum(["SHORT", "LONG"]).default("SHORT");
export const marketSchema = z.enum(["NSE", "US"]).default("NSE");

export const holdingSchema = z.object({
  symbol: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, "Symbol is required")
    .max(20, "Symbol looks too long"),
  name: z.string().trim().min(1, "Company name is required").max(120),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  avgCostBasis: z.coerce.number().positive("Cost basis must be greater than 0"),
  position: positionSchema,
  market: marketSchema,
  buyDate: z.coerce.date().optional(),
  notes: z.string().max(500, "Notes must be 500 characters or fewer").optional(),
});

export const transactionSchema = z.object({
  symbol: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, "Symbol is required")
    .max(20, "Symbol looks too long"),
  name: z.string().trim().min(1, "Company name is required").max(120),
  type: z.enum(["BUY", "SELL"]),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  price: z.coerce.number().positive("Price must be greater than 0"),
  position: positionSchema,
  market: marketSchema,
  date: z.coerce.date().optional(),
});

// Blank number inputs arrive as "" from the form, which z.coerce.number()
// would otherwise turn into 0 — failing .positive() even though the field
// is optional. Treat "" (and null) as "not provided" before coercing.
const optionalPositivePrice = (message: string) =>
  z.preprocess(
    (value) => (value === "" || value == null ? undefined : value),
    z.coerce.number().positive(message).optional()
  );

// The section select uses a "none" sentinel for "no section" (native
// <select>/Radix Select can't carry a real null value) — treat that the
// same as blank/omitted and resolve to null either way.
const optionalSectionId = z.preprocess(
  (value) => (value === "" || value === "none" || value == null ? null : value),
  z.string().nullable()
);

export const watchlistSchema = z.object({
  symbol: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, "Symbol is required")
    .max(20, "Symbol looks too long"),
  name: z.string().trim().min(1, "Company name is required").max(120),
  buyPrice: optionalPositivePrice("Buy price must be greater than 0"),
  targetPrice: optionalPositivePrice("Target price must be greater than 0"),
  stopLoss: optionalPositivePrice("Stop loss must be greater than 0"),
  position: positionSchema,
  market: marketSchema,
  sectionId: optionalSectionId,
  notes: z.string().max(500, "Notes must be 500 characters or fewer").optional(),
});

export const watchlistSectionSchema = z.object({
  name: z.string().trim().min(1, "Section name is required").max(50, "Keep it under 50 characters"),
  market: marketSchema,
});

export const notesSchema = z.object({
  notes: z.string().max(500, "Notes must be 500 characters or fewer"),
});

export type NotesInput = z.infer<typeof notesSchema>;
export type Position = z.output<typeof positionSchema>;
export type Market = z.output<typeof marketSchema>;

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
// Output type (post-coercion, numbers) — what the API and onSubmit callbacks receive.
export type HoldingInput = z.output<typeof holdingSchema>;
// Input type (pre-coercion) — what the form fields actually hold before validation.
export type HoldingFormValues = z.input<typeof holdingSchema>;

export type TransactionInput = z.output<typeof transactionSchema>;
export type TransactionFormValues = z.input<typeof transactionSchema>;

export type WatchlistInput = z.output<typeof watchlistSchema>;
export type WatchlistFormValues = z.input<typeof watchlistSchema>;

export type WatchlistSectionInput = z.infer<typeof watchlistSectionSchema>;

// Full-account backup format (export/import). Holdings/transactions/watchlist
// items carry every field needed to recreate them byte-for-byte; watchlist
// items reference their section by name (not id) since ids from the
// exporting account won't exist on import — sections are matched/created by
// name+market on the way in.
const accountHoldingSchema = z.object({
  symbol: z.string().trim().toUpperCase().min(1).max(20),
  name: z.string().trim().min(1).max(120),
  quantity: z.coerce.number().positive(),
  avgCostBasis: z.coerce.number().positive(),
  position: positionSchema,
  market: marketSchema,
  notes: z.string().max(500).nullable().optional(),
  createdAt: z.coerce.date().optional(),
});

const accountTransactionSchema = z.object({
  symbol: z.string().trim().toUpperCase().min(1).max(20),
  name: z.string().trim().min(1).max(120),
  type: z.enum(["BUY", "SELL"]),
  quantity: z.coerce.number().positive(),
  price: z.coerce.number().positive(),
  position: positionSchema,
  market: marketSchema,
  date: z.coerce.date().optional(),
  notes: z.string().max(500).nullable().optional(),
});

const accountWatchlistSectionSchema = z.object({
  name: z.string().trim().min(1).max(50),
  market: marketSchema,
  sortOrder: z.coerce.number().int().optional(),
});

const accountWatchlistItemSchema = z.object({
  symbol: z.string().trim().toUpperCase().min(1).max(20),
  name: z.string().trim().min(1).max(120),
  buyPrice: z.coerce.number().positive().nullable().optional(),
  targetPrice: z.coerce.number().positive().nullable().optional(),
  stopLoss: z.coerce.number().positive().nullable().optional(),
  position: positionSchema,
  market: marketSchema,
  notes: z.string().max(500).nullable().optional(),
  section: z.string().trim().min(1).max(50).nullable().optional(),
});

export const accountImportSchema = z.object({
  version: z.number().int().optional(),
  exportedAt: z.string().optional(),
  account: z.object({ name: z.string().optional(), email: z.string().optional() }).optional(),
  holdings: z.array(accountHoldingSchema).default([]),
  transactions: z.array(accountTransactionSchema).default([]),
  watchlistSections: z.array(accountWatchlistSectionSchema).default([]),
  watchlistItems: z.array(accountWatchlistItemSchema).default([]),
});

export type AccountImportInput = z.infer<typeof accountImportSchema>;

export const adminUpdateUserSchema = z.object({
  name: z.string().trim().min(2, "Enter a full name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  role: z.enum(["USER", "ADMIN"]),
  // Blank means "leave the current password unchanged" — only validated
  // for strength when the admin is actually setting a new one.
  password: z
    .union([
      z.literal(""),
      z
        .string()
        .min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Include at least one uppercase letter")
        .regex(/[0-9]/, "Include at least one number"),
    ])
    .optional(),
});

export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;
