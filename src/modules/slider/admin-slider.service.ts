import { randomUUID } from "node:crypto";
import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { prisma } from "../../lib/prisma.js";

const uploadDir = path.resolve(process.cwd(), "uploads", "sliders");
const maxFileSize = 8 * 1024 * 1024;
const allowedFormats = new Set(["jpeg", "png", "webp", "avif"]);

export class AdminSliderError extends Error {}

export async function listAdminSliders() {
  return prisma.siteSlider.findMany({
    orderBy: { RowID: "desc" },
    select: {
      RowID: true,
      UrlImage: true,
      DescImage: true,
      DescBut: true,
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
  UrlSend: string | null;
  Status: boolean;
}) {
  return prisma.siteSlider.create({
    data: {
      DescImage: data.DescImage,
      Description: data.Description,
      DescBut: data.DescBut,
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
  if (file.size <= 0 || file.size > maxFileSize) {
    throw new AdminSliderError("حجم تصویر باید بیشتر از صفر و حداکثر ۸ مگابایت باشد.");
  }

  const input = Buffer.from(await file.arrayBuffer());
  const metadata = await sharp(input, { limitInputPixels: 40_000_000, animated: false }).metadata();
  if (!metadata.format || !allowedFormats.has(metadata.format)) {
    throw new AdminSliderError("فرمت تصویر باید JPEG، PNG، WebP یا AVIF باشد.");
  }

  await mkdir(uploadDir, { recursive: true });
  const filename = `${randomUUID()}.webp`;
  const absolutePath = path.join(uploadDir, filename);
  await sharp(input, { limitInputPixels: 40_000_000, animated: false })
    .rotate()
    .resize({ width: 1920, height: 1200, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 84, effort: 4 })
    .toFile(absolutePath);

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
    await unlink(absolutePath).catch(() => undefined);
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
  if (path.basename(filename) !== filename || !/^[\w-]+\.webp$/.test(filename)) return;
  await unlink(path.resolve(uploadDir, filename)).catch(() => undefined);
}
