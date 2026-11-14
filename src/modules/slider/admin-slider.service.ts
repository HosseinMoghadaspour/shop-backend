import { unlink } from "node:fs/promises";
import path from "node:path";
import { processImage } from "../../shared/utils/image-processor.js";
import { prisma } from "../../lib/prisma.js";

const uploadDir = path.resolve(process.cwd(), "uploads", "sliders");

export class AdminSliderError extends Error {}

export async function listAdminSliders() {
  return prisma.siteSlider.findMany({
    orderBy: { RowID: "desc" },
    select: {
      RowID: true,
      UrlImage: true,
      DescImage: true,
      DescBut: true,
      ButtonColor: true,
      UrlSend: true,
      Status: true,
      Type: true,
      Description: true,
    },
  });
}

export async function createAdminSlider(data: {
  DescImage: string | null;
  Description: string | null;
  DescBut: string | null;
  ButtonColor: string | null;
  UrlSend: string | null;
  Status: boolean;
}) {
  return prisma.siteSlider.create({
    data: {
      DescImage: data.DescImage,
      Description: data.Description,
      DescBut: data.DescBut,
      ButtonColor: data.ButtonColor,
      UrlSend: data.UrlSend,
      Status: false,
      Type: 1,
      UrlImage: null,
    },
    select: {
      RowID: true,
      UrlImage: true,
      DescImage: true,
      DescBut: true,
      ButtonColor: true,
      UrlSend: true,
      Status: true,
      Type: true,
      Description: true,
    },
  });
}

export async function updateAdminSlider(
  id: bigint,
  data: {
    DescImage: string | null;
    Description: string | null;
    DescBut: string | null;
    ButtonColor: string | null;
    UrlSend: string | null;
    Status: boolean;
  },
) {
  const existing = await prisma.siteSlider.findUnique({
    where: { RowID: id },
    select: { RowID: true, UrlImage: true },
  });
  if (!existing) return null;
  if (data.Status && !existing.UrlImage) {
    throw new AdminSliderError("برای فعال‌کردن اسلایدر ابتدا تصویر بارگذاری کنید.");
  }

  return prisma.siteSlider.update({
    where: { RowID: id },
    data,
    select: {
      RowID: true,
      UrlImage: true,
      DescImage: true,
      DescBut: true,
      ButtonColor: true,
      UrlSend: true,
      Status: true,
      Type: true,
      Description: true,
    },
  });
}

export async function uploadAdminSliderImage(id: bigint, file: File) {
  const existing = await prisma.siteSlider.findUnique({
    where: { RowID: id },
    select: { RowID: true, UrlImage: true },
  });
  if (!existing) throw new AdminSliderError("اسلایدر پیدا نشد.");
  if (file.size <= 0 || file.size > 8 * 1024 * 1024) {
    throw new AdminSliderError(
      "حجم تصویر باید بیشتر از صفر و حداکثر ۸ مگابایت باشد.",
    );
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
    throw new AdminSliderError(
      error instanceof Error ? error.message : "پردازش تصویر اسلایدر ناموفق بود.",
    );
  }

  // اسلایدر از نسخه بزرگ استفاده می‌کند.
  const filename = processed.images.large.filename;
  const url = `/uploads/sliders/${filename}`;
  try {
    const updated = await prisma.siteSlider.update({
      where: { RowID: id },
      data: { UrlImage: url },
      select: { RowID: true, UrlImage: true, Status: true },
    });
    await removeManagedSliderFile(existing.UrlImage);
    return updated;
  } catch (error) {
    await Promise.all(
      Object.values(processed.images).map((image) =>
        unlink(image.path).catch(() => undefined),
      ),
    );
    throw error;
  }
}

export async function deleteAdminSlider(id: bigint) {
  const existing = await prisma.siteSlider.findUnique({
    where: { RowID: id },
    select: { RowID: true, UrlImage: true },
  });
  if (!existing) return false;
  await prisma.siteSlider.delete({ where: { RowID: id } });
  await removeManagedSliderFile(existing.UrlImage);
  return true;
}

export async function removeManagedSliderFile(url: string | null) {
  const prefix = "/uploads/sliders/";
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
