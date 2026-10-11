/**
 * Normalize supported phone formats to the API's canonical account identifier.
 * Everything is compared in a canonical form so "0803 234 5678",
 * "+234 803 234 5678" and "2348032345678" all match.
 */
export function normalizePhone(input: string): string {
  const cleaned = input.trim().replace(/[\s\-().]/g, '');
  if (cleaned.startsWith('+')) return '+' + cleaned.slice(1).replace(/\D/g, '');
  const digits = cleaned.replace(/\D/g, '');
  if (digits.startsWith('234')) return '+' + digits;
  if (digits.startsWith('0')) return '+234' + digits.slice(1);
  return digits;
}

export function isValidPhone(input: string): boolean {
  return /^\+\d{10,15}$/.test(normalizePhone(input));
}

export function phonesMatch(a: string, b: string): boolean {
  const x = normalizePhone(a);
  return x !== '' && x === normalizePhone(b);
}

/** "+2348032345678" -> "+234 803 234 5678" for display and storage. */
export function formatPhone(input: string): string {
  const n = normalizePhone(input);
  const m = /^\+234(\d{3})(\d{3})(\d{4})$/.exec(n);
  return m ? `+234 ${m[1]} ${m[2]} ${m[3]}` : n;
}
