import { prisma } from "../../lib/prisma.js";
import type { Product } from "./product.types.js";

export interface ProductFilters {
  search?: string;
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  isSpecialSale?: boolean;
  amazingSale?: boolean;
  page: number;
  limit: number;
}

/**
 * فیلدهایی که برای API عمومی محصولات لازم داریم.
 *
 * اطلاعات مالی حساس مثل:
 * - PurchasePrice
 * - CostOfGood
 * - ProducerPrice
 *
 * عمداً از اینجا خارج شده‌اند.
 */
const productSelect = {
  RowID: true,
  Branch_ID: true,

  GoodCategory_ID: true,
  Main_MeasureUnit_ID: true,
  Default_MeasureUnit_ID: true,

  RowCode: true,
  RowName: true,
  RowNameEN: true,
  RowNameAlias: true,

  SalePrice: true,
  DiscountPrice: true,
  ConsumerPrice: true,

  IsActive: true,
  RowDesc: true,

  FirstStock: true,
  OrderPoint: true,

  IsHasSize: true,
  Warehouse_ID: true,

  Producers_ID: true,
  BrandID: true,

  IsShowInOnlineShop: true,

  BriefDescription: true,
  FullDescription: true,

  IsSpecialSale: true,
  AmazingSale: true,

  MinOrderSite: true,
  MaxOrderSite: true,
  MinSiteShow: true,

  width: true,
  height: true,
  Length: true,
  Weight: true,

  ShowInCofferMenu: true,
  ProfitFromConsumer: true,

  MDate: true
} as const;

/**
 * شرط عمومی محصولات سایت
 */
function buildProductWhere(filters: ProductFilters) {
  return {
    IsActive: true,

    // فقط کالاهایی که برای فروشگاه آنلاین فعال هستند
    IsShowInOnlineShop: true,

    ...(filters.search
      ? {
          OR: [
            {
              RowName: {
                contains: filters.search
              }
            },
            {
              RowCode: {
                contains: filters.search
              }
            },
            {
              RowNameAlias: {
                contains: filters.search
              }
            },
            {
              SiteName: {
                contains: filters.search
              }
            }
          ]
        }
      : {}),

    ...(filters.categoryId !== undefined
      ? {
          GoodCategory_ID: filters.categoryId
        }
      : {}),

    ...(filters.minPrice !== undefined ||
    filters.maxPrice !== undefined
      ? {
          SalePrice: {
            ...(filters.minPrice !== undefined
              ? {
                  gte: filters.minPrice
                }
              : {}),

            ...(filters.maxPrice !== undefined
              ? {
                  lte: filters.maxPrice
                }
              : {})
          }
        }
      : {}),

    ...(filters.isSpecialSale !== undefined
      ? {
          IsSpecialSale: filters.isSpecialSale
        }
      : {}),

    ...(filters.amazingSale !== undefined
      ? {
          AmazingSale: filters.amazingSale
        }
      : {})
  };
}

/**
 * لیست محصولات با:
 * - pagination
 * - search
 * - category
 * - price range
 * - special sale
 * - amazing sale
 */
export async function findProducts(filters: ProductFilters) {
  const skip = (filters.page - 1) * filters.limit;

  const where = buildProductWhere(filters);

  const [items, total] = await Promise.all([
    prisma.good.findMany({
      where,

      select: productSelect,

      orderBy: {
        RowID: "desc"
      },

      skip,
      take: filters.limit
    }),

    prisma.good.count({
      where
    })
  ]);

  return {
    items: items,
    total
  };
}

/**
 * دریافت یک محصول بر اساس ID
 */
export async function findProductById(
  id: number
): Promise<Product | null> {
  const product = await prisma.good.findFirst({
    where: {
      RowID: id,
      IsActive: true,
      IsShowInOnlineShop: true
    },

    select: productSelect
  });

  return product as Product | null;
}

/**
 * دریافت محصول بر اساس کد کالا
 */
export async function findProductByCode(
  code: string
): Promise<Product | null> {
  const product = await prisma.good.findFirst({
    where: {
      RowCode: code,
      IsActive: true,
      IsShowInOnlineShop: true
    },

    select: productSelect
  });

  return product as Product | null;
}

/**
 * کالاهای فروش ویژه / شگفت‌انگیز
 */
export async function getAmazingProducts(
  limit = 12
) {
  return prisma.good.findMany({
    where: {
      IsActive: true,
      IsShowInOnlineShop: true,
      AmazingSale: true
    },

    select: productSelect,

    orderBy: {
      RowID: "desc"
    },

    take: limit
  });
}

/**
 * کالاهای جدید
 */
export async function getNewProducts(
  limit = 12
) {
  return prisma.good.findMany({
    where: {
      IsActive: true,
      IsShowInOnlineShop: true,

      // فقط کالاهایی که تاریخ ثبت/تغییر دارند
      MDate: {
        not: null
      }
    },

    select: productSelect,

    orderBy: [
      {
        MDate: "desc"
      },
      {
        RowID: "desc"
      }
    ],

    take: limit
  });
}