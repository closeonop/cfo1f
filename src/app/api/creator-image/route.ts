const maxBytes = 4_000_000;
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const assetId = "[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}";
const post = new RegExp(`^/image/authenticated/s--[A-Za-z0-9_-]{8}--/c_limit,f_auto,q_auto,w_(?:200|800|1600)/v[0-9]{1,16}/creator-${assetId}\\.(?:jpg|png|webp)$`);
const avatar = new RegExp(`^/image/authenticated/s--[A-Za-z0-9_-]{8}--/c_fill,f_auto,g_auto,h_200,q_auto,w_200/v[0-9]{1,16}/creator-avatar-${assetId}\\.(?:jpg|png|webp)$`);

export async function GET(request: Request) {
  const cloud = process.env.CREATOR_MEDIA_CLOUD_NAME;
  const raw = new URL(request.url).searchParams.get("src");
  if (!cloud || !/^[a-zA-Z0-9_-]+$/.test(cloud) || !raw || raw.length > 300) {
    return new Response(null, { status: 404 });
  }
  const prefix = `https://res.cloudinary.com/${cloud}`;
  const path = raw.slice(prefix.length);
  if (!raw.startsWith(prefix) || (!post.test(path) && !avatar.test(path))) {
    return new Response(null, { status: 404 });
  }

  try {
    // The signed path grants access to this specific Cloudinary transformation.
    const upstream = await fetch(prefix + path, {
      headers: { Accept: "image/webp,image/png,image/jpeg" },
      redirect: "error", cache: "no-store", signal: AbortSignal.timeout(8000),
    });
    const type = upstream.headers.get("content-type") ?? "";
    const length = Number(upstream.headers.get("content-length"));
    if (!upstream.ok || !imageTypes.has(type) || length > maxBytes || !upstream.body) {
      await upstream.body?.cancel();
      return new Response(null, { status: upstream.status === 401 || upstream.status === 404 ? 404 : 502 });
    }
    let transferred = 0;
    const stream = upstream.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        transferred += chunk.byteLength;
        if (transferred > maxBytes) controller.error(new Error("Image response is too large."));
        else controller.enqueue(chunk);
      },
    }));
    return new Response(stream, {
      headers: { "Content-Type": type, "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
