import { getDb } from "../../db/connection.js";
import type { Product } from "./product.types.js";

export interface ProductFilters {
  search?: string;
  categoryId?: number;
  brandId?: number;
  producerId?: number;
  minPrice?: number;
  maxPrice?: number;
  isSpecialSale?: boolean;
  amazingSale?: boolean;
  page: number;
  limit: number;
}

const productSelect = `
  SELECT
    RowID,
    Branch_ID,
    GoodCategory_ID,
    Main_MeasureUnit_ID,
    Default_MeasureUnit_ID,

    RowCode,
    RowName,
    RowNameEN,
    RowNameAlias,

    PurchasePrice,
    SalePrice,
    DiscountPrice,
    ConsumerPrice,

    IsActive,
    RowDesc,

    FirstStock,
    OrderPoint,

    IsHasSize,
    Warehouse_ID,

    Producers_ID,
    BrandID,

    IsShowInOnlineShop,
    BriefDescription,
    FullDescription,

    IsSpecialSale,
    AmazingSale,

    MinOrderSite,
    MaxOrderSite,
    MinSiteShow,

    width AS Width,
    height AS Height,
    Length,
    Weight,

    ShowInCofferMenu,
    ProfitFromConsumer

  FROM good
`;

function buildProductConditions(
  request: any,
  filters: ProductFilters
) {
  const conditions: string[] = [
    "IsActive = 1",
    "IsShowInOnlineShop = 1"
  ];

  if (filters.search) {
    conditions.push(`
      (
        RowName LIKE @search
        OR RowCode LIKE @search
        OR RowNameAlias LIKE @search
      )
    `);

    request.input("search", `%${filters.search}%`);
  }

  if (filters.categoryId !== undefined) {
    conditions.push("GoodCategory_ID = @categoryId");
    request.input("categoryId", filters.categoryId);
  }

  if (filters.brandId !== undefined) {
    conditions.push("BrandID = @brandId");
    request.input("brandId", filters.brandId);
  }

  if (filters.producerId !== undefined) {
    conditions.push("Producers_ID = @producerId");
    request.input("producerId", filters.producerId);
  }

  if (filters.minPrice !== undefined) {
    conditions.push("SalePrice >= @minPrice");
    request.input("minPrice", filters.minPrice);
  }

  if (filters.maxPrice !== undefined) {
    conditions.push("SalePrice <= @maxPrice");
    request.input("maxPrice", filters.maxPrice);
  }

  if (filters.isSpecialSale !== undefined) {
    conditions.push("IsSpecialSale = @isSpecialSale");
    request.input("isSpecialSale", filters.isSpecialSale);
  }

  if (filters.amazingSale !== undefined) {
    conditions.push("AmazingSale = @amazingSale");
    request.input("amazingSale", filters.amazingSale);
  }

  return conditions.join(" AND ");
}

export async function findProducts(filters: ProductFilters) {
  const db = await getDb();
  const request = db.request();

  const offset = (filters.page - 1) * filters.limit;

  const where = buildProductConditions(request, filters);

  request.input("offset", offset);
  request.input("limit", filters.limit);

  const result = await request.query(`
    ${productSelect}

    WHERE ${where}

    ORDER BY RowID DESC

    OFFSET @offset ROWS
    FETCH NEXT @limit ROWS ONLY;

    SELECT COUNT(*) AS total
    FROM good
    WHERE ${where};
  `);

  return {
    items: (result.recordsets as unknown as Product[][])[0] as Product[],
    total: Number(
      (result.recordsets as unknown as Array<Array<{ total: number }>>)[1][0]
        .total
    )
  };
}

export async function findProductById(
  id: number
): Promise<Product | null> {
  const db = await getDb();

  const result = await db
    .request()
    .input("id", id)
    .query(`
      ${productSelect}

      WHERE
        RowID = @id
        AND IsActive = 1
        AND IsShowInOnlineShop = 1
    `);

  return result.recordset[0] ?? null;
}

export async function findProductByCode(
  code: string
): Promise<Product | null> {
  const db = await getDb();

  const result = await db
    .request()
    .input("code", code)
    .query(`
      ${productSelect}

      WHERE
        RowCode = @code
        AND IsActive = 1
        AND IsShowInOnlineShop = 1
    `);

  return result.recordset[0] ?? null;
}