import { prisma } from "../../lib/prisma.js";
import type { ProductImage } from "./product-image.types.js";

export async function findProductImages(
  goodId: number,
): Promise<ProductImage[]> {
  const images = await prisma.goodImagesWeb.findMany({
    where: {
      Good_ID: goodId,
    },

    select: {
      RowID: true,
      ImageUrl: true,
      Alt: true,
      DefaultImage: true,
    },

    orderBy: [
      {
        DefaultImage: "desc",
      },
      {
        RowID: "asc",
      },
    ],
  });

  return images.map((image) => ({
    id: Number(image.RowID),
    url: image.ImageUrl,
    alt: image.Alt,
    isDefault: image.DefaultImage ?? false,
  }));
}