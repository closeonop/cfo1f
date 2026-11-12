export type CloudImageData = {
  id: string; alt: string; width: number; height: number; small: string; medium: string; large: string;
};

export function CloudImage({ image }: { image: CloudImageData }) {
  const sources = new Map([[Math.min(image.width, 1600), image.large],
    [Math.min(image.width, 800), image.medium], [Math.min(image.width, 200), image.small]]);
  // eslint-disable-next-line @next/next/no-img-element -- Cloudinary negotiates format with the browser.
  return <img src={image.medium} srcSet={[...sources].map(([width, url]) => `${url} ${width}w`).join(", ")}
    sizes="(max-width: 768px) 92vw, 720px" alt={image.alt} width={image.width} height={image.height}
    loading="lazy" className="h-auto max-h-[70vh] w-full rounded-2xl border bg-card object-contain" />;
}
