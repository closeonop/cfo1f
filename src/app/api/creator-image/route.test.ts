import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const image = "https://res.cloudinary.com/test_cloud/image/authenticated/s--Abc123_---/c_limit,f_auto,q_auto,w_800/v123/creator-43d7ee5c-117c-4f11-8aa8-199d24992e51.jpg";
const request = (src: string) => new Request(`https://portal.test/api/creator-image?src=${encodeURIComponent(src)}`, {
  headers: { Cookie: "refresh=test", Authorization: "Bearer test" },
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("signed creator image delivery", () => {
  it("streams only the expected image without forwarding portal credentials", async () => {
    vi.stubEnv("CREATOR_MEDIA_CLOUD_NAME", "test_cloud");
    const fetchMock = vi.fn().mockResolvedValue(new Response(new Uint8Array([255, 216]), {
      headers: { "Content-Type": "image/jpeg", "Content-Length": "2", "Set-Cookie": "foreign=value" },
    }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await GET(request(image));
    expect(response.status).toBe(200);
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([255, 216]);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(image, expect.objectContaining({
      headers: { Accept: "image/webp,image/png,image/jpeg" }, redirect: "error",
    }));
  });

  it("rejects non-creator paths and never serves upstream HTML", async () => {
    vi.stubEnv("CREATOR_MEDIA_CLOUD_NAME", "test_cloud");
    const fetchMock = vi.fn().mockResolvedValue(new Response("<html/>", { headers: { "Content-Type": "text/html" } }));
    vi.stubGlobal("fetch", fetchMock);
    for (const invalid of [image.replace("test_cloud", "other_cloud"), image + "?x=1", image.replace("w_800", "w_4000")]) {
      expect((await GET(request(invalid))).status).toBe(404);
    }
    expect(fetchMock).not.toHaveBeenCalled();
    expect((await GET(request(image))).status).toBe(502);
  });
});
