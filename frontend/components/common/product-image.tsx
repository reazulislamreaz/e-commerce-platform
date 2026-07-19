'use client';

import Image, { type ImageProps } from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';

type ProductImageProps = Omit<ImageProps, 'onLoad'> & {
  containerClassName?: string;
  fade?: boolean;
};

/**
 * Aspect-stable product media with GPU-friendly opacity fade-in.
 * Parent should reserve space via aspect ratio or fixed dimensions.
 */
export function ProductImage({
  className,
  containerClassName,
  fade = true,
  alt,
  ...props
}: ProductImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <span className={cn('relative block overflow-hidden bg-[#e4e3e1]', containerClassName)}>
      <Image
        alt={alt}
        {...props}
        onLoad={() => setLoaded(true)}
        className={cn(
          fade && 'transition-opacity duration-300 ease-out motion-reduce:transition-none',
          fade ? (loaded ? 'opacity-100' : 'opacity-0') : undefined,
          className,
        )}
      />
    </span>
  );
}
