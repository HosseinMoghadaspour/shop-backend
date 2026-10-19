import { prisma } from "../../lib/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";

export type AdminCategoryVisibility = "all" | "visible" | "hidden";

export interface AdminCategoryFilters {
  search?: string;
  visibility: AdminCategoryVisibility;
  page: number;
  limit: number;
}

export async function findAdminCategories(filters: AdminCategoryFilters) {
  const where: Prisma.GoodCategoryWhereInput = {
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
              ],
            },
          ],
        }
      : {}),
  };

  const skip = (filters.page - 1) * filters.limit;
  const [categories, total] = await Promise.all([
    prisma.goodCategory.findMany({
      where,
      select: {
        RowID: true,
        RowCode: true,
        RowName: true,
        GoodCategory_ID: true,
        IsActive: true,
        IsShowInOnlineShop: true,
        ShowOrder: true,
        OnlineCategoryImage: true,
        IconName: true,
      },
      orderBy: [
        { ShowOrder: "asc" },
        { RowName: "asc" },
        { RowID: "asc" },
      ],
      skip,
      take: filters.limit,
    }),
    prisma.goodCategory.count({ where }),
  ]);

  return {
    items: categories.map((category) => ({
      id: category.RowID,
      code: category.RowCode,
      name: category.RowName,
      parentId: category.GoodCategory_ID,
      isActive: category.IsActive,
      isVisible: category.IsShowInOnlineShop ?? false,
      sortOrder: category.ShowOrder ?? 0,
      image: category.OnlineCategoryImage,
      iconName: category.IconName,
    })),
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit),
    },
  };
}

export async function updateCategoryVisibility(id: number, isVisible: boolean) {
  const existing = await prisma.goodCategory.findUnique({
    where: { RowID: id },
    select: { RowID: true, IsActive: true },
  });

  if (!existing) return { kind: "not-found" as const };
  if (!existing.IsActive && isVisible) return { kind: "inactive" as const };

  const category = await prisma.goodCategory.update({
    where: { RowID: id },
    data: { IsShowInOnlineShop: isVisible },
    select: { RowID: true, IsShowInOnlineShop: true },
  });

  return {
    kind: "updated" as const,
    category: {
      id: category.RowID,
      isVisible: category.IsShowInOnlineShop ?? false,
    },
  };
}

export async function updateCategoryDisplayOrder(id: number, sortOrder: number) {
  const existing = await prisma.goodCategory.findUnique({
    where: { RowID: id },
    select: { RowID: true },
  });

  if (!existing) return null;

  const category = await prisma.goodCategory.update({
    where: { RowID: id },
    data: { ShowOrder: sortOrder },
    select: { RowID: true, ShowOrder: true },
  });

  return {
    id: category.RowID,
    sortOrder: category.ShowOrder ?? 0,
  };
}

export async function updateCategoryIcon(id: number, iconName: string | null) {
  const existing = await prisma.goodCategory.findUnique({
    where: { RowID: id },
    select: { RowID: true },
  });

  if (!existing) return null;

  const category = await prisma.goodCategory.update({
    where: { RowID: id },
    data: { IconName: iconName },
    select: { RowID: true, IconName: true },
  });

  return { id: category.RowID, iconName: category.IconName };
}
