"use client";

import { useState, type ComponentProps } from "react";

export type CloudImageData = {
  id: string; alt: string; width: number; height: number; small: string; medium: string; large: string;
};

export function CloudImage({ image }: { image: CloudImageData }) {
  const sources = new Map([[Math.min(image.width, 1600), image.large],
    [Math.min(image.width, 800), image.medium], [Math.min(image.width, 200), image.small]]);
  return <ResilientImage key={image.medium} src={image.medium} srcSet={[...sources].map(([width, url]) => `${url} ${width}w`).join(", ")}
    sizes="(max-width: 768px) 92vw, 720px" alt={image.alt} width={image.width} height={image.height}
    loading="lazy" className="h-auto max-h-[70vh] w-full rounded-2xl border bg-card object-contain" />;
}

export function ResilientImage({ src, srcSet, alt, ...props }: ComponentProps<"img"> & { src: string; alt: string }) {
  const [fallback, setFallback] = useState<string>();
  const [failed, setFailed] = useState(false);
  if (failed) {
    return alt ? <p className="rounded-xl border p-3 text-sm text-muted-foreground">Image could not load · {alt}</p> : null;
  }
  // eslint-disable-next-line @next/next/no-img-element -- signed Cloudinary URLs are already sized.
  return <img {...props} alt={alt} src={fallback ?? src} srcSet={fallback ? undefined : srcSet}
    onError={(event) => {
      if (fallback) setFailed(true);
      else setFallback(`/api/creator-image?src=${encodeURIComponent(event.currentTarget.currentSrc || src)}`);
    }} />;
}
