import { prisma } from "../../lib/prisma.js";
import type {
  CategoryRecord,
  CategorySummary,
} from "./category.types.js";

export async function findCategories(): Promise<CategoryRecord[]> {
  const categories = await prisma.goodCategory.findMany({
    where: {
      IsActive: true,
      IsShowInOnlineShop: true,
    },

    select: {
      RowID: true,
      RowCode: true,
      RowName: true,
      URL: true,
      GoodCategory_ID: true,
      ShowOrder: true,
      OnlineCategoryImage: true,
      IconName: true
    },

    orderBy: [
      {
        ShowOrder: "asc",
      },
      {
        RowID: "asc",
      },
    ],
  });

  return categories.map((category) => ({
    id: category.RowID,
    code: category.RowCode,
    name: category.RowName,
    url: category.URL,
    parentId: category.GoodCategory_ID ?? 0,
    sortOrder: category.ShowOrder ?? 999999,
    onlineCategoryImage: category.OnlineCategoryImage,
    iconName: category.IconName
  }));
}

export async function findCategoryById(
  id: number,
): Promise<CategorySummary | null> {
  const category = await prisma.goodCategory.findFirst({
    where: {
      RowID: id,
      IsActive: true,
      IsShowInOnlineShop: true,
    },

    select: {
      RowID: true,
      RowCode: true,
      RowName: true,
      URL: true,
      OnlineCategoryImage: true,
      IconName: true
    },
  });

  if (!category) {
    return null;
  }

  return {
    id: category.RowID,
    code: category.RowCode,
    name: category.RowName,
    url: category.URL,
    onlineCategoryImage: category.OnlineCategoryImage,
    iconName: category.IconName
  };
}
