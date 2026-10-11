/**
 * Base URL of the AgriQora API (the agriqora-api backend).
 *
 * Empty string = same origin, which is what the Vite dev/preview proxy uses.
 * Set VITE_API_URL at build time to point at a deployed server.
 */
export const API_URL: string = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');
