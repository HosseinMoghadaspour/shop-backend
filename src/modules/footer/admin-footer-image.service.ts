import { unlink } from "node:fs/promises";
import path from "node:path";
import { processImage } from "../../shared/utils/image-processor.js";

import { prisma } from "../../lib/prisma.js";

const uploadDir = path.resolve(process.cwd(), "uploads", "footer");

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
  if (path.basename(filename) !== filename) return;

  const match = filename.match(/^([\w-]+)-(thumbnail|medium|large)\.webp$/);
  const filenames = match
    ? ["thumbnail", "medium", "large"].map((size) => `${match[1]}-${size}.webp`)
    : /^[\w-]+\.webp$/.test(filename)
      ? [filename]
      : [];

  await Promise.all(
    filenames.map((managedFilename) =>
      unlink(path.resolve(uploadDir, managedFilename)).catch(() => undefined),
    ),
  );
}
}

export async function uploadAdminFooterImage(
  fieldValue: string,
  file: File,
) {
  if (!isFooterImageField(fieldValue)) {
    throw new AdminFooterImageError("نوع تصویر معتبر نیست.");
  }

  const field = fieldValue;

  if (file.size <= 0) {
    throw new AdminFooterImageError("فایل تصویر خالی است.");
  }

  const input = Buffer.from(await file.arrayBuffer());
  let processed: Awaited<ReturnType<typeof processImage>>;
  try {
    processed = await processImage(input, {
      outputDir: uploadDir,
      quality: 84,
      maxInputSize: 8 * 1024 * 1024,
    });
  } catch (error) {
    throw new AdminFooterImageError(
      error instanceof Error ? error.message : "پردازش تصویر فوتر ناموفق بود.",
    );
  }

  const existing = await prisma.siteFooterData.findFirst({
    orderBy: { RowID: "desc" },
  });

  // لوگو و نمادهای فوتر از نسخه medium استفاده می‌کنند.
  const filename = processed.images.medium.filename;
  const url = `/uploads/footer/${filename}`;

  try {
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
    await Promise.all(
      Object.values(processed.images).map((image) =>
        unlink(image.path).catch(() => undefined),
      ),
    );
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
