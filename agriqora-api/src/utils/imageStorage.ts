/**
 * Image storage seam. MVP preserves data URLs and existing relative image paths.
 * Later replace persistImage with an object-storage upload and return its URL.
 */
export async function persistImage(image: string | undefined, fallback: string): Promise<string> {
  return image?.trim() || fallback;
}
