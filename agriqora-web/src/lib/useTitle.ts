import { useEffect } from 'react';

/** Sets the browser tab title, e.g. "Learn | AgriQora". */
export function useTitle(title?: string): void {
  useEffect(() => {
    document.title = title ? `${title} | AgriQora` : 'AgriQora';
  }, [title]);
}
