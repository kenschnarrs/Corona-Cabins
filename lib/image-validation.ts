const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export type ValidatedImage = { bytes: Buffer; contentType: string; extension: string };

function detectedType(bytes: Buffer): { contentType: string; extension: string } | null {
  if (bytes.length >= 12 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])))
    return { contentType: "image/png", extension: "png" };
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9)
    return { contentType: "image/jpeg", extension: "jpg" };
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP")
    return { contentType: "image/webp", extension: "webp" };
  return null;
}

export function validateImageUpload(dataUrl: unknown, declaredType: unknown): ValidatedImage {
  if (typeof dataUrl !== "string" || typeof declaredType !== "string" || !ALLOWED.has(declaredType))
    throw new Error("Use a JPEG, PNG, or WebP image.");
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match || match[1] !== declaredType) throw new Error("Invalid image payload.");
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new Error("Images must be 8 MB or smaller.");
  const detected = detectedType(bytes);
  if (!detected || detected.contentType !== declaredType) throw new Error("The file content does not match its image type.");
  return { bytes, ...detected };
}
