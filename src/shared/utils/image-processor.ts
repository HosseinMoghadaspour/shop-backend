
import sharp from "sharp";
import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const MAX_INPUT_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_FORMATS = ["jpeg", "png", "webp", "avif"] as const;

const IMAGE_SIZES = {
  thumbnail: 300,
  medium: 800,
  large: 1400,
} as const;

export type ImageSize = keyof typeof IMAGE_SIZES;

export interface ProcessedImage {
  size: ImageSize;
  filename: string;
  path: string;
  width: number;
  height: number;
  bytes: number;
}

export interface ProcessImageResult {
  id: string;
  format: "webp";
  images: Record<ImageSize, ProcessedImage>;
}

interface ProcessImageOptions {
  outputDir: string;
  quality?: number;
  maxInputSize?: number;
}

export async function processImage(
  input: Buffer,
  options: ProcessImageOptions,
): Promise<ProcessImageResult> {
  const {
    outputDir,
    quality = 80,
    maxInputSize = MAX_INPUT_SIZE,
  } = options;

  if (!Buffer.isBuffer(input) || input.length === 0) {
    throw new Error("تصویر معتبر نیست.");
  }

  if (input.length > maxInputSize) {
    throw new Error("حجم تصویر بیشتر از حد مجاز است.");
  }

  if (!Number.isInteger(quality) || quality < 1 || quality > 100) {
    throw new Error("کیفیت تصویر باید بین 1 تا 100 باشد.");
  }

  const metadata = await sharp(input, {
    failOn: "error",
    limitInputPixels: 40_000_000,
    animated: false,
  }).metadata();

  if (!metadata.format || !ALLOWED_FORMATS.includes(
    metadata.format as (typeof ALLOWED_FORMATS)[number],
  )) {
    throw new Error("فرمت تصویر پشتیبانی نمی‌شود.");
  }

  if (!metadata.width || !metadata.height) {
    throw new Error("ابعاد تصویر معتبر نیست.");
  }

  const imageId = randomUUID();
  const absoluteOutputDir = path.resolve(outputDir);

  await mkdir(absoluteOutputDir, { recursive: true });

  const images = {} as Record<ImageSize, ProcessedImage>;
  const createdFiles: string[] = [];

  try {
    for (const [size, width] of Object.entries(IMAGE_SIZES) as [
      ImageSize,
      number,
    ][]) {
      const filename = `${imageId}-${size}.webp`;
      const outputPath = path.join(absoluteOutputDir, filename);

      const result = await sharp(input, {
        failOn: "error",
        limitInputPixels: 40_000_000,
        animated: false,
      })
        .rotate()
        .resize({
          width,
          height: width,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({
          quality,
          effort: 4,
        })
        .toFile(outputPath);

      createdFiles.push(outputPath);

      images[size] = {
        size,
        filename,
        path: outputPath,
        width: result.width,
        height: result.height,
        bytes: result.size,
      };
    }

    return {
      id: imageId,
      format: "webp",
      images,
    };
  } catch (error) {
    await Promise.all(
      createdFiles.map((file) =>
        unlink(file).catch(() => undefined),
      ),
    );

    throw error;
  }
}
