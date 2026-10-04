import "server-only";
import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { mkdir, open, realpath, stat, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { z } from "zod";
import { coverFileSchema, coverIdsSchema, coverPath, MAX_COVER_BYTES } from "./cover-schema";

export class InvalidCoverError extends Error {}

export async function normalizeCover(raw: unknown) {
  const parsed = coverFileSchema.safeParse(raw);
  if (!parsed.success) throw new InvalidCoverError("Gunakan JPG, PNG atau WebP dengan ukuran maksimal 5 MB.");
  const file = parsed.data;
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.length !== file.size || bytes.length > MAX_COVER_BYTES) throw new Error("Invalid bytes.");
    const signature = file.type === "image/jpeg" ? bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
      : file.type === "image/png" ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP";
    if (!signature) throw new Error("Invalid signature.");
    // libvips can decode an APNG's first frame without reporting animation pages.
    if (file.type === "image/png") {
      let offset = 8;
      while (offset + 12 <= bytes.length) {
        const length = bytes.readUInt32BE(offset);
        if (offset + 12 + length > bytes.length) throw new Error("Invalid PNG chunk.");
        const chunk = bytes.subarray(offset + 4, offset + 8).toString();
        if (chunk === "acTL") throw new Error("Animated PNG is not supported.");
        offset += 12 + length;
        if (chunk === "IEND") break;
      }
    }
    const image = sharp(bytes, { limitInputPixels: 16000000, failOn: "warning" });
    const metadata = await image.metadata();
    const formats = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp" };
    if (metadata.format !== formats[file.type as keyof typeof formats] || !metadata.width || !metadata.height ||
      metadata.width > 8000 || metadata.height > 8000 || (metadata.pages ?? 1) > 1) throw new Error("Invalid format/dimensions.");
    // Decode/re-encode removes original metadata and ignores the supplied filename.
    return await image.rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  } catch { throw new InvalidCoverError("Gambar tidak valid. Gunakan gambar statis JPG, PNG atau WebP hingga 16 megapiksel."); }
}

function storageRoot() {
  const configured = process.env.PORTFOLIO_UPLOAD_DIR;
  if (configured && !path.isAbsolute(configured)) throw new Error("Upload directory must be absolute.");
  return configured ? path.resolve(configured) : path.resolve("storage/portfolio-covers");
}
async function privateDirectory(directory: string, create = false) {
  if (create) await mkdir(directory, { recursive: true, mode: 0o700 });
  if (await realpath(directory) !== directory || ((await stat(directory)).mode & 0o077) !== 0) throw new Error("Unsafe upload directory.");
}
async function filename(raw: unknown, create = false) {
  const ids = coverIdsSchema.parse(raw), root = storageRoot();
  await privateDirectory(root, create);
  const directory = path.join(root, ids.contentId);
  await privateDirectory(directory, create);
  return { file: path.join(directory, `${ids.assetId}.webp`), directory };
}
export async function storeCover(contentId: string, bytes: Buffer) {
  z.uuid().parse(contentId);
  const ids = { contentId, assetId: randomUUID() };
  const target = await filename(ids, true);
  const file = await open(target.file, "wx", 0o600);
  try {
    await file.writeFile(bytes); await file.sync();
  } catch (error) {
    await file.close(); await unlink(target.file); throw error;
  }
  await file.close();
  const directory = await open(target.directory, "r");
  try { await directory.sync(); } catch (error) { await unlink(target.file); throw error; } finally { await directory.close(); }
  const root = await open(storageRoot(), "r");
  try { await root.sync(); } catch (error) { await unlink(target.file); throw error; } finally { await root.close(); }
  return { ...ids, path: coverPath(ids.contentId, ids.assetId) };
}
export async function readCover(raw: unknown) {
  const target = await filename(raw);
  const file = await open(target.file, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const info = await file.stat();
    if (!info.isFile() || info.size > MAX_COVER_BYTES || (info.mode & 0o077) !== 0) throw new Error("Invalid cover file.");
    return await file.readFile();
  } finally { await file.close(); }
}
// Only called for a newly created asset whose database mutation did not commit.
export async function discardUncommittedCover(raw: unknown) {
  const target = await filename(raw);
  await unlink(target.file);
}
