import "./server-loader.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { chmod, mkdtemp, rm, stat, symlink } from "node:fs/promises";
import sharp from "sharp";
const { normalizeCover, storeCover, readCover, discardUncommittedCover, InvalidCoverError } = await import("../src/features/portfolio/cover-storage.ts");
const { coverPath, parseCoverPath, MAX_COVER_BYTES } = await import("../src/features/portfolio/cover-schema.ts");
const { contentInputSchema } = await import("../src/features/cms/schema.ts");
const image = () => sharp({ create: { width: 200, height: 100, channels: 3, background: "#08747a" } });

test("cover validates actual raster bytes, size and dimensions and outputs metadata-free WebP", async () => {
  for (const format of ["png", "jpeg", "webp"]) {
    const bytes = await image()[format]().withMetadata().toBuffer();
    const output = await normalizeCover(new File([bytes], "../../unsafe.html", { type: format === "jpeg" ? "image/jpeg" : "image/" + format }));
    const metadata = await sharp(output).metadata();
    assert.equal(metadata.format, "webp"); assert.equal(metadata.width, 200); assert.equal(metadata.height, 100);
    assert.equal(metadata.exif, undefined); assert.equal(metadata.icc, undefined);
  }
  const oversizedDimensions = await sharp({ create: { width: 8001, height: 1, channels: 3, background: "white" } }).png().toBuffer();
  const png = await image().png().toBuffer();
  // Insert a valid acTL chunk after IHDR to catch APNG first-frame decoders.
  const animation = Buffer.alloc(20); animation.writeUInt32BE(8); animation.write("acTL", 4); animation.writeUInt32BE(2, 8);
  let crc = 0xffffffff;
  for (const byte of animation.subarray(4, 16)) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); }
  animation.writeUInt32BE((crc ^ 0xffffffff) >>> 0, 16);
  const apng = Buffer.concat([png.subarray(0, 33), animation, png.subarray(33)]);
  const animatedWebp = await sharp(Buffer.concat([Buffer.alloc(300), Buffer.alloc(300, 255)]), { raw: { width: 10, height: 20, channels: 3, pageHeight: 10 } }).webp({ loop: 0, delay: [100, 100] }).toBuffer();
  assert.equal((await sharp(animatedWebp).metadata()).pages, 2);
  for (const file of [null, "fake", new File([], "empty.png", { type: "image/png" }),
    new File([Buffer.alloc(MAX_COVER_BYTES + 1)], "huge.png", { type: "image/png" }),
    new File(["<svg><script>alert(1)</script></svg>"], "evil.png", { type: "image/png" }),
    new File([await image().png().toBuffer()], "mismatch.jpg", { type: "image/jpeg" }),
    new File([oversizedDimensions], "wide.png", { type: "image/png" }),
    new File([apng], "animated.png", { type: "image/png" }),
    new File([animatedWebp], "animated.webp", { type: "image/webp" })]) await assert.rejects(() => normalizeCover(file), InvalidCoverError);
  const output = await normalizeCover(new File([await sharp({ create: { width: 2000, height: 1000, channels: 3, background: "white" } }).png().toBuffer()], "large.png", { type: "image/png" }));
  assert.equal((await sharp(output).metadata()).width, 1600);
});

test("cover paths are UUID-bound and storage rejects symlinks and unsafe permissions", async () => {
  const directory = await mkdtemp("/private/tmp/lunabiner-cover-tests-");
  const previous = process.env.PORTFOLIO_UPLOAD_DIR; process.env.PORTFOLIO_UPLOAD_DIR = directory;
  try {
    const contentId = randomUUID(), assetId = randomUUID();
    assert.deepEqual(parseCoverPath(coverPath(contentId, assetId)), { contentId, assetId });
    for (const path of ["/media/portfolio/1/2", "/media/portfolio/../secret", "/media/portfolio/" + contentId + "/" + assetId + "?x", "/images/sample.png"]) assert.equal(parseCoverPath(path), null);
    const stored = await storeCover(contentId, await image().webp().toBuffer());
    assert.equal((await stat(directory + "/" + contentId + "/" + stored.assetId + ".webp")).mode & 0o777, 0o600);
    const ids = { contentId: stored.contentId, assetId: stored.assetId };
    assert.equal((await sharp(await readCover(ids)).metadata()).format, "webp");
    await chmod(directory, 0o755); await assert.rejects(() => readCover(ids)); await chmod(directory, 0o700);
    await discardUncommittedCover(ids);
    await symlink(directory + "/missing", directory + "/" + contentId + "/" + stored.assetId + ".webp");
    await assert.rejects(() => readCover(ids));
    process.env.PORTFOLIO_UPLOAD_DIR = "relative-path"; await assert.rejects(() => storeCover(contentId, Buffer.from("test")));
  } finally {
    if (previous === undefined) delete process.env.PORTFOLIO_UPLOAD_DIR; else process.env.PORTFOLIO_UPLOAD_DIR = previous;
    assert.ok(directory.startsWith("/private/tmp/lunabiner-cover-tests-")); await rm(directory, { recursive: true });
  }
});

test("generic article/product contract cannot use uploaded portfolio media", () => {
  const text = { title: "Fixture", excerpt: "", body: "" }, id = randomUUID();
  const input = { kind: "ARTICLE", slug: "fixture", status: "DRAFT", translations: { id: text, en: text }, details: { image: coverPath(id, randomUUID()) } };
  assert.equal(contentInputSchema.safeParse(input).success, false);
  assert.equal(contentInputSchema.safeParse({ ...input, kind: "CASE_STUDY" }).success, true);
});
