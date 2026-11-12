
import { prisma } from "../../../lib/prisma.js";
import { Prisma } from "../../../generated/prisma/client.js";

export interface AdminProductFilters {
  search?: string;
  visibility: "all" | "visible" | "hidden";
  page: number;
  limit: number;
  branchId: number;
}

export async function findAdminProducts(filters: AdminProductFilters) {
  const branchConfigs = await prisma.$queryRaw<Array<{
    Branch_ID: number;
    Warehouse_ID: number;
    WarehouseName: string;
  }>>(Prisma.sql`
    SELECT
      branch.RowID AS Branch_ID,
      config.Warehouse_ID,
      warehouse.RowName AS WarehouseName
    FROM dbo.Branch branch
    INNER JOIN dbo.SiteBranchConfig config
      ON config.Branch_ID = branch.RowID
    INNER JOIN dbo.Warehouse warehouse
      ON warehouse.RowID = config.Warehouse_ID
      AND warehouse.IsActive = 1
    WHERE branch.RowID = ${filters.branchId}
      AND branch.IsActive = 1
      AND config.IsActive = 1
      AND config.Warehouse_ID IS NOT NULL
  `);

  const branchConfig = branchConfigs[0];
  if (!branchConfig) {
    throw new Error("شعبه انتخاب‌شده فعال نیست یا انبار فعالی برای آن تعیین نشده است.");
  }

  const where: Prisma.GoodWhereInput = {
    Branch_ID: filters.branchId,
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
    branch: {
      id: Number(branchConfig.Branch_ID),
      warehouseId: Number(branchConfig.Warehouse_ID),
      warehouseName: branchConfig.WarehouseName,
    },
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
  branchId: number,
) {
  const existing = await prisma.good.findUnique({
    where: { RowID: productId, Branch_ID: branchId },
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
