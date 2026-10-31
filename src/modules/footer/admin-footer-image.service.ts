import { randomUUID } from "node:crypto";
import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import sharp, { type Metadata } from "sharp";

import { prisma } from "../../lib/prisma.js";

const uploadDir = path.resolve(process.cwd(), "uploads", "footer");

const maxFileSize = 8 * 1024 * 1024;

const allowedFormats = new Set([
  "jpeg",
  "png",
  "webp",
  "avif",
]);

export type FooterImageField =
  | "LogoImageUrl"
  | "SiteIcon"
  | "EnamadImageUrl"
  | "ReziImageUrl";

export class AdminFooterImageError extends Error {}

function isFooterImageField(value: string): value is FooterImageField {
  return [
    "LogoImageUrl",
    "SiteIcon",
    "EnamadImageUrl",
    "ReziImageUrl",
  ].includes(value);
}

async function removeManagedFooterFile(url: string | null) {
  const prefix = "/uploads/footer/";

  if (!url?.startsWith(prefix)) return;

  const filename = url.slice(prefix.length);

  if (
    path.basename(filename) !== filename ||
    !/^[\w-]+\.webp$/.test(filename)
  ) {
    return;
  }

  await unlink(path.resolve(uploadDir, filename)).catch(() => undefined);
}

export async function uploadAdminFooterImage(
  fieldValue: string,
  file: File,
) {
  if (!isFooterImageField(fieldValue)) {
    throw new AdminFooterImageError("نوع تصویر معتبر نیست.");
  }

  const field = fieldValue;

  if (file.size <= 0 || file.size > maxFileSize) {
    throw new AdminFooterImageError(
      "حجم تصویر باید بیشتر از صفر و حداکثر ۸ مگابایت باشد.",
    );
  }

  const input = Buffer.from(await file.arrayBuffer());

let metadata: Metadata;

  try {
    metadata = await sharp(input, {
      limitInputPixels: 40_000_000,
      animated: false,
    }).metadata();
  } catch {
    throw new AdminFooterImageError("فایل انتخاب‌شده تصویر معتبر نیست.");
  }

  if (!metadata.format || !allowedFormats.has(metadata.format)) {
    throw new AdminFooterImageError(
      "فرمت تصویر باید JPEG، PNG، WebP یا AVIF باشد.",
    );
  }

  const existing = await prisma.siteFooterData.findFirst({
    orderBy: { RowID: "desc" },
  });

  await mkdir(uploadDir, { recursive: true });

  const filename = `${randomUUID()}.webp`;
  const absolutePath = path.join(uploadDir, filename);

  try {
    await sharp(input, {
      limitInputPixels: 40_000_000,
      animated: false,
    })
      .rotate()
      .resize({
        width: 1920,
        height: 1200,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({
        quality: 84,
        effort: 4,
      })
      .toFile(absolutePath);

    const url = `/uploads/footer/${filename}`;

    const data: Partial<Record<FooterImageField, string | null>> = {
      [field]: url,
    };

    const updated = existing
      ? await prisma.siteFooterData.update({
          where: { RowID: existing.RowID },
          data,
        })
      : await prisma.siteFooterData.create({
          data,
        });

    const oldUrl = existing?.[field] ?? null;

    await removeManagedFooterFile(oldUrl);

    return {
      RowID: updated.RowID,
      field,
      url,
    };
  } catch (error) {
    await unlink(absolutePath).catch(() => undefined);
    throw error;
  }
}

export async function deleteAdminFooterImage(fieldValue: string) {
  if (!isFooterImageField(fieldValue)) {
    throw new AdminFooterImageError("نوع تصویر معتبر نیست.");
  }

  const field = fieldValue;

  const existing = await prisma.siteFooterData.findFirst({
    orderBy: { RowID: "desc" },
  });

  if (!existing) {
    throw new AdminFooterImageError("اطلاعات فوتر پیدا نشد.");
  }

  const oldUrl = existing[field];

  if (!oldUrl) {
    return { field, url: null };
  }

  const data: Partial<Record<FooterImageField, string | null>> = {
    [field]: null,
  };

  await prisma.siteFooterData.update({
    where: { RowID: existing.RowID },
    data,
  });

  await removeManagedFooterFile(oldUrl);

  return {
    field,
    url: null,
  };
}
