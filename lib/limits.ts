// lib/limits.ts
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 Mo
export const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedMime = (typeof ALLOWED_MIME)[number];
