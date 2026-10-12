/**
 * Use Vite's local /api proxy in development. Production can override the API
 * origin at build time; the current Render API remains the deployment fallback.
 */
const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const defaultApiUrl = import.meta.env.DEV ? '' : 'https://agriqora-server.onrender.com';

export const API_URL = (configuredApiUrl || defaultApiUrl).replace(/\/+$/, '');
