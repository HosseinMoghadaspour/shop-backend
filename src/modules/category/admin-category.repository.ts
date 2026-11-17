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
        ? { OR: [{ IsShowInOnlineShop: false }, { IsShowInOnlineShop: null }] }
        : {}),
    ...(filters.search
      ? {
          OR: [
            { RowName: { contains: filters.search } },
            { RowCode: { contains: filters.search } },
          ],
        }
      : {}),
  };

  const skip = (filters.page - 1) * filters.limit;
  const [categories, total, hierarchyOverrides, categoryNames] = await Promise.all([
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
      orderBy: [{ ShowOrder: "asc" }, { RowName: "asc" }, { RowID: "asc" }],
      skip,
      take: filters.limit,
    }),
    prisma.goodCategory.count({ where }),
    prisma.siteCategoryConfig.findMany({
      select: { Category_ID: true, ParentCategory_ID: true },
    }),
    prisma.goodCategory.findMany({
      select: { RowID: true, RowName: true },
    }),
  ]);

  const overrideMap = new Map(
    hierarchyOverrides.map((item) => [item.Category_ID, item.ParentCategory_ID]),
  );
  const nameMap = new Map(categoryNames.map((item) => [item.RowID, item.RowName]));

  return {
    items: categories.map((category) => {
      const parentId = overrideMap.has(category.RowID)
        ? overrideMap.get(category.RowID) ?? null
        : category.GoodCategory_ID;
      return {
        id: category.RowID,
        code: category.RowCode,
        name: category.RowName,
        parentId,
        parentName: parentId ? nameMap.get(parentId) ?? null : null,
        isActive: category.IsActive,
        isVisible: category.IsShowInOnlineShop ?? false,
        sortOrder: category.ShowOrder ?? 0,
        image: category.OnlineCategoryImage,
        iconName: category.IconName,
      };
    }),
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

export async function updateCategoryParent(id: number, parentId: number | null) {
  const categories = await prisma.goodCategory.findMany({
    where: { IsActive: true },
    select: { RowID: true, GoodCategory_ID: true },
  });
  const category = categories.find((item) => item.RowID === id);
  if (!category) return { kind: "category-not-found" as const };

  if (parentId !== null) {
    const parent = categories.find((item) => item.RowID === parentId);
    if (!parent) return { kind: "parent-not-found" as const };
    if (parentId === id) return { kind: "self-parent" as const };
  }

  const overrides = await prisma.siteCategoryConfig.findMany({
    select: { Category_ID: true, ParentCategory_ID: true },
  });
  const overrideMap = new Map(overrides.map((item) => [item.Category_ID, item.ParentCategory_ID]));
  const parentMap = new Map(categories.map((item) => [
    item.RowID,
    overrideMap.has(item.RowID)
      ? overrideMap.get(item.RowID) ?? null
      : item.GoodCategory_ID ?? null,
  ]));

  let cursor = parentId;
  const visited = new Set<number>();
  while (cursor !== null && cursor !== undefined) {
    if (cursor === id) return { kind: "cycle" as const };
    if (visited.has(cursor)) return { kind: "existing-cycle" as const };
    visited.add(cursor);
    cursor = parentMap.get(cursor) ?? null;
  }

  await prisma.siteCategoryConfig.upsert({
    where: { Category_ID: id },
    create: { Category_ID: id, ParentCategory_ID: parentId, UpdatedAt: new Date() },
    update: { ParentCategory_ID: parentId, UpdatedAt: new Date() },
  });

  return {
    kind: "updated" as const,
    category: {
      id,
      parentId,
      parentName: parentId === null ? null : categories.find((item) => item.RowID === parentId)?.RowName ?? null,
    },
  };
}
