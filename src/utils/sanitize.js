/**
 * Centralized input sanitization utilities for Fluxia
 */

/** Trim whitespace from a string. Returns "" if not a string. */
export const trim = (v) => (typeof v === "string" ? v.trim() : "");

/** Strip all non-digit characters. Useful for RNC, phone, numeric IDs. */
export const digitsOnly = (v) => String(v ?? "").replace(/[^0-9]/g, "");

/** Remove HTML/script tags to prevent stored XSS. */
export const stripHtml = (v) => trim(v).replace(/<[^>]*>/g, "");

/** Sanitize a free-text name: trimmed, no HTML tags, max 200 chars. */
export const sanitizeName = (v) => stripHtml(v).substring(0, 200);

/** Sanitize an RNC: digits only, 9 or 11 chars expected. */
export const sanitizeRNC = (v) => digitsOnly(v).substring(0, 11);

/** Sanitize a Telegram chat ID: digits only (can be negative). */
export const sanitizeTelegramId = (v) => String(v ?? "").replace(/[^0-9-]/g, "").substring(0, 20);

/** Sanitize a Google Drive folder ID: alphanumeric + dash/underscore. */
export const sanitizeDriveId = (v) => trim(v).replace(/[^a-zA-Z0-9_-]/g, "").substring(0, 100);

/** Sanitize an OpenAI API key: no whitespace, starts with 'sk-'. */
export const sanitizeApiKey = (v) => trim(v).replace(/\s/g, "").substring(0, 256);

/** Sanitize a prompt/textarea: trimmed, no HTML, max 4000 chars. */
export const sanitizePrompt = (v) => stripHtml(v).substring(0, 4000);

/** Sanitize a URL param plan value — must be one of the known plans. */
export const sanitizePlan = (v) => {
    const valid = ["basic", "pro", "premium"];
    const lower = String(v ?? "").toLowerCase().trim();
    return valid.includes(lower) ? lower : null;
};

/** Sanitize a UUID (Supabase user ID): must match UUID v4 pattern. */
export const sanitizeUUID = (v) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const s = trim(v);
    return uuidRegex.test(s) ? s : null;
};
