import { mkdir, unlink, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { randomUUID } from "node:crypto";
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MIN_DIMENSION = 100;
const MAX_INPUT_PIXELS = 16_000_000;
const UPLOAD_DIRECTORY = join(process.cwd(), "public", "uploads");
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export class ImageValidationError extends Error {}

export async function normalizeImage(file: File) {
  if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
    throw new ImageValidationError("Images must be between 1 byte and 5 MB.");
  }

  const input = Buffer.from(await file.arrayBuffer());
  const detected = await fileTypeFromBuffer(input);
  if (!detected || !ALLOWED_MIME_TYPES.has(detected.mime)) {
    throw new ImageValidationError("Only JPEG, PNG, and WebP images are accepted.");
  }

  try {
    const metadata = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
    if (!metadata.width || !metadata.height || metadata.width < MIN_DIMENSION || metadata.height < MIN_DIMENSION) {
      throw new ImageValidationError("Images must be at least 100 by 100 pixels.");
    }

    const output = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
      .rotate()
      .resize({ width: 2_000, height: 2_000, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
    return { filename: `${randomUUID()}.webp`, buffer: output };
  } catch (error) {
    if (error instanceof ImageValidationError) throw error;
    throw new ImageValidationError("The image could not be processed.");
  }
}

export async function saveImage(filename: string, buffer: Buffer) {
  await mkdir(UPLOAD_DIRECTORY, { recursive: true });
  await writeFile(join(UPLOAD_DIRECTORY, filename), buffer, { flag: "wx" });
  return `/uploads/${filename}`;
}

export async function deleteImage(publicPath: string) {
  const filename = basename(publicPath);
  if (publicPath !== `/uploads/${filename}`) return;
  await unlink(join(UPLOAD_DIRECTORY, filename)).catch(() => undefined);
}
