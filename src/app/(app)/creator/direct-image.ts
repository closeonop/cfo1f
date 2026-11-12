import { api } from "@/lib/api";

type Reservation = { id: string; url: string; fields: Record<string, string> };
export const imageTypes = "image/jpeg,image/png,image/webp";

export function validImage(file: File) {
  return file.size > 0 && file.size <= 2_000_000 && imageTypes.split(",").includes(file.type);
}

export function reserveImage(path: string, file: File, alt?: string) {
  return api<Reservation>(`${path}/sign`, {
    method: "POST", body: { mime: file.type, bytes: file.size, ...(alt === undefined ? {} : { alt }) },
  });
}

export async function uploadDirect(reservation: Reservation, file: File) {
  const data = new FormData();
  for (const [key, value] of Object.entries(reservation.fields)) data.set(key, value);
  data.set("file", file);
  const response = await fetch(reservation.url, {
    method: "POST", body: data, credentials: "omit", redirect: "error", signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error("Cloudinary rejected the image. Check its format and size.");
}

export function completeImage(path: string, id: string) {
  return api(`${path}/${encodeURIComponent(id)}/complete`, { method: "POST" });
}
