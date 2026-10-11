import type { ProduceCategory } from '../lib/types';
import { imageSrc, placeholderImage } from '../lib/format';

interface ProduceImageProps {
  src: string | undefined;
  alt: string;
  category?: ProduceCategory | string;
  className?: string;
  priority?: boolean;
  width?: number;
  height?: number;
}

/** Listing photo with lazy loading and a graceful fallback if the file is missing. */
export function ProduceImage({ src, alt, category, className = '', priority, width = 400, height = 300 }: ProduceImageProps) {
  return (
    <img
      src={imageSrc(src, category)}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      onError={(e) => {
        const img = e.currentTarget;
        if (img.dataset.fallback) return;
        img.dataset.fallback = '1';
        img.src = placeholderImage(category);
      }}
      className={`bg-sand object-cover ${className}`}
    />
  );
}
