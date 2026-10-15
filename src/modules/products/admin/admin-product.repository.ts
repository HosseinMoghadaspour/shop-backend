
import { prisma } from "../../../lib/prisma.js";
import { Prisma } from "../../../generated/prisma/client.js";

export interface AdminProductFilters {
  search?: string;
  visibility: "all" | "visible" | "hidden";
  page: number;
  limit: number;
}

export async function findAdminProducts(filters: AdminProductFilters) {
  const where: Prisma.GoodWhereInput = {
    ...(filters.visibility === "visible"
      ? { IsShowInOnlineShop: true }
      : filters.visibility === "hidden"
        ? {
            OR: [
              { IsShowInOnlineShop: false },
              { IsShowInOnlineShop: null },
            ],
          }
        : {}),
    ...(filters.search
      ? {
          AND: [
            {
              OR: [
                { RowName: { contains: filters.search } },
                { RowCode: { contains: filters.search } },
                { RowNameAlias: { contains: filters.search } },
                { SiteName: { contains: filters.search } },
              ],
            },
          ],
        }
      : {}),
  };

  const skip = (filters.page - 1) * filters.limit;

  const [products, total] = await Promise.all([
    prisma.good.findMany({
      where,
      select: {
        RowID: true,
        RowCode: true,
        RowName: true,
        RowNameEN: true,
        RowNameAlias: true,
        SalePrice: true,
        DiscountPrice: true,
        IsActive: true,
        IsShowInOnlineShop: true,
      },
      orderBy: { RowID: "desc" },
      skip,
      take: filters.limit,
    }),
    prisma.good.count({ where }),
  ]);

  const ids = products.map((product) => product.RowID);

  const images = ids.length
    ? await prisma.goodImagesWeb.findMany({
        where: { Good_ID: { in: ids } },
        select: {
          RowID: true,
          Good_ID: true,
          ImageUrl: true,
          DefaultImage: true,
          Alt: true,
        },
        orderBy: [
          { DefaultImage: "desc" },
          { RowID: "asc" },
        ],
      })
    : [];

  const imagesByProduct = new Map<number, typeof images>();

  for (const image of images) {
    if (image.Good_ID == null) continue;

    const current = imagesByProduct.get(image.Good_ID) ?? [];
    current.push(image);
    imagesByProduct.set(image.Good_ID, current);
  }

  return {
    items: products.map((product) => ({
      id: product.RowID,
      code: product.RowCode,
      name: product.RowName,
      nameEn: product.RowNameEN,
      alias: product.RowNameAlias,
      salePrice: Number(product.SalePrice ?? 0),
      discountPrice:
        product.DiscountPrice == null
          ? null
          : Number(product.DiscountPrice),
      isActive: product.IsActive,
      isVisible: product.IsShowInOnlineShop ?? false,
      images: (imagesByProduct.get(product.RowID) ?? []).map((image) => ({
        id: Number(image.RowID),
        url: image.ImageUrl,
        alt: image.Alt,
        isDefault: image.DefaultImage ?? false,
      })),
    })),
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit),
    },
  };
}

export async function updateAdminProductVisibility(
  productId: number,
  isVisible: boolean,
) {
  const existing = await prisma.good.findUnique({
    where: { RowID: productId },
    select: { RowID: true },
  });

  if (!existing) return null;

  return prisma.good.update({
    where: { RowID: productId },
    data: { IsShowInOnlineShop: isVisible },
    select: {
      RowID: true,
      IsShowInOnlineShop: true,
    },
  });
}
