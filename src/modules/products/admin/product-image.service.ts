
import { randomUUID } from "node:crypto";
import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { prisma } from "../../../lib/prisma.js";


type ProcessedImage = {
  filename: string;
  url: string;
  alt: string;
};

const uploadDir = path.resolve(process.cwd(), "uploads", "products");
const maxFileSize = 8 * 1024 * 1024;
const maxFiles = 10;

const allowedFormats = new Set(["jpeg", "png", "webp", "avif"]);

export class ProductImageError extends Error {}

export async function uploadProductImages(
  productId: number,
  files: File[],
) {
  if (files.length === 0) {
    throw new ProductImageError("حداقل یک تصویر انتخاب کنید.");
  }

  if (files.length > maxFiles) {
    throw new ProductImageError("در هر درخواست حداکثر ۱۰ تصویر مجاز است.");
  }

  const product = await prisma.good.findUnique({
    where: { RowID: productId },
    select: { RowID: true, RowName: true },
  });

  if (!product) {
    throw new ProductImageError("کالا پیدا نشد.");
  }

  await mkdir(uploadDir, { recursive: true });

  const savedFiles: string[] = [];

  try {
const processed: ProcessedImage[] = [];

    // پردازش ترتیبی برای کنترل مصرف CPU و حافظه
    for (const file of files) {
      if (file.size <= 0 || file.size > maxFileSize) {
        throw new ProductImageError(
          "حجم هر تصویر باید بیشتر از صفر و حداکثر ۸ مگابایت باشد.",
        );
      }

      const input = Buffer.from(await file.arrayBuffer());
      const metadata = await sharp(input, {
        limitInputPixels: 40_000_000,
        animated: false,
      }).metadata();

      if (!metadata.format || !allowedFormats.has(metadata.format)) {
        throw new ProductImageError(
          "فرمت تصویر باید JPEG، PNG، WebP یا AVIF باشد.",
        );
      }

      const filename = `${randomUUID()}.webp`;
      const absolutePath = path.join(uploadDir, filename);

      await sharp(input, {
        limitInputPixels: 40_000_000,
        animated: false,
      })
        .rotate()
        .resize({
          width: 1600,
          height: 1600,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 82, effort: 4 })
        .toFile(absolutePath);

      savedFiles.push(absolutePath);

      processed.push({
        filename,
        url: `/uploads/products/${filename}`,
        alt: product.RowName,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const existingCount = await tx.goodImagesWeb.count({
        where: { Good_ID: productId },
      });

      const images = [];

      for (let index = 0; index < processed.length; index++) {
        const image = processed[index];

        images.push(
          await tx.goodImagesWeb.create({
            data: {
              Good_ID: productId,
              ImageUrl: image.url,
              Alt: image.alt,
              DefaultImage: existingCount === 0 && index === 0,
            },
            select: {
              RowID: true,
              ImageUrl: true,
              Alt: true,
              DefaultImage: true,
            },
          }),
        );
      }

      return images;
    });

    return result.map((image) => ({
      id: Number(image.RowID),
      url: image.ImageUrl,
      alt: image.Alt,
      isDefault: image.DefaultImage ?? false,
    }));
  } catch (error) {
    await Promise.all(
      savedFiles.map((filePath) =>
        unlink(filePath).catch(() => undefined),
      ),
    );

    throw error;
  }
}

export async function setDefaultProductImage(
  productId: number,
  imageId: bigint,
) {
  return prisma.$transaction(async (tx) => {
    const image = await tx.goodImagesWeb.findFirst({
      where: {
        RowID: imageId,
        Good_ID: productId,
      },
      select: { RowID: true },
    });

    if (!image) return false;

    await tx.goodImagesWeb.updateMany({
      where: { Good_ID: productId },
      data: { DefaultImage: false },
    });

    await tx.goodImagesWeb.update({
      where: { RowID: imageId },
      data: { DefaultImage: true },
    });

    return true;
  });
}

export async function deleteProductImage(
  productId: number,
  imageId: bigint,
) {
  const image = await prisma.goodImagesWeb.findFirst({
    where: {
      RowID: imageId,
      Good_ID: productId,
    },
    select: {
      RowID: true,
      ImageUrl: true,
      DefaultImage: true,
    },
  });

  if (!image) return false;

  const nextImage = image.DefaultImage
    ? await prisma.goodImagesWeb.findFirst({
        where: {
          Good_ID: productId,
          RowID: { not: imageId },
        },
        orderBy: { RowID: "asc" },
        select: { RowID: true },
      })
    : null;

  await prisma.$transaction(async (tx) => {
    await tx.goodImagesWeb.delete({
      where: { RowID: imageId },
    });

    if (nextImage) {
      await tx.goodImagesWeb.update({
        where: { RowID: nextImage.RowID },
        data: { DefaultImage: true },
      });
    }
  });

  // فقط فایل‌های مدیریت‌شده توسط همین سرویس حذف شوند.
  const prefix = "/uploads/products/";
  const url = image.ImageUrl;

  if (
    url?.startsWith(prefix) &&
    path.basename(url) === url.slice(prefix.length) &&
    /^[\w-]+\.webp$/.test(path.basename(url))
  ) {
    const filePath = path.resolve(uploadDir, path.basename(url));

    if (path.dirname(filePath) === uploadDir) {
      await unlink(filePath).catch(() => undefined);
    }
  }

  return true;
}
