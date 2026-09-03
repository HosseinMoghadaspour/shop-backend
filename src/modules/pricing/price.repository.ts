import { getDb } from "../../db/connection.js";

export interface BranchPriceRecord {
  goodId: number;
  branchId: number;
  salePrice: number | null;
  consumerPrice: number | null;
  mdate: Date | null;
}

export interface SalePriceRecord {
  goodId: number;
  salePriceTypeId: number;
  salePriceTypeName: string;
  salePrice: number | null;
  consumerPrice: number | null;
  branchId: number | null;
}

export async function findMainBranch(): Promise<{ id: number; name: string } | null> {
  const db = await getDb();
  const result = await db.request().query(`
    SELECT TOP 1 RowID, RowName
    FROM dbo.Branch
    WHERE IsActive = 1 AND ISNULL(MainBranch, 0) = 1
    ORDER BY RowID;
  `);

  const row = result.recordset[0];
  return row ? { id: Number(row.RowID), name: String(row.RowName) } : null;
}

export async function findBranchPrice(
  goodId: number,
  branchId: number,
): Promise<BranchPriceRecord | null> {
  const db = await getDb();
  const result = await db
    .request()
    .input("goodId", goodId)
    .input("branchId", branchId)
    .query(`
      SELECT TOP 1
        GID AS GoodId,
        BID AS BranchId,
        SalePrice,
        ConsumerPrice,
        Mdate
      FROM dbo.GoodBranchPrice
      WHERE GID = @goodId AND BID = @branchId
      ORDER BY Mdate DESC, RowID DESC;
    `);

  const row = result.recordset[0];
  if (!row) return null;

  return {
    goodId: Number(row.GoodId),
    branchId: Number(row.BranchId),
    salePrice: row.SalePrice == null ? null : Number(row.SalePrice),
    consumerPrice: row.ConsumerPrice == null ? null : Number(row.ConsumerPrice),
    mdate: row.Mdate ?? null,
  };
}

export async function findBranchPrices(
  goodIds: number[],
  branchId: number,
): Promise<BranchPriceRecord[]> {
  if (goodIds.length === 0) return [];

  const db = await getDb();
  const request = db.request().input("branchId", branchId);
  const params = goodIds.map((id, index) => {
    const name = `goodId${index}`;
    request.input(name, id);
    return `@${name}`;
  });

  const result = await request.query(`
    WITH Latest AS (
      SELECT
        GID AS GoodId,
        BID AS BranchId,
        SalePrice,
        ConsumerPrice,
        Mdate,
        ROW_NUMBER() OVER (
          PARTITION BY GID
          ORDER BY Mdate DESC, RowID DESC
        ) AS rn
      FROM dbo.GoodBranchPrice
      WHERE BID = @branchId
        AND GID IN (${params.join(", ")})
    )
    SELECT GoodId, BranchId, SalePrice, ConsumerPrice, Mdate
    FROM Latest
    WHERE rn = 1;
  `);

  return result.recordset.map((row) => ({
    goodId: Number(row.GoodId),
    branchId: Number(row.BranchId),
    salePrice: row.SalePrice == null ? null : Number(row.SalePrice),
    consumerPrice: row.ConsumerPrice == null ? null : Number(row.ConsumerPrice),
    mdate: row.Mdate ?? null,
  }));
}

export async function findSalePrice(
  goodId: number,
  salePriceTypeId: number,
): Promise<SalePriceRecord | null> {
  const db = await getDb();
  const result = await db
    .request()
    .input("goodId", goodId)
    .input("salePriceTypeId", salePriceTypeId)
    .query(`
      SELECT TOP 1
        gsp.Good_ID AS GoodId,
        gsp.SalePriceType_ID AS SalePriceTypeId,
        spt.RowName AS SalePriceTypeName,
        gsp.SalePrice,
        gsp.ConsumerPrice,
        spt.BranchID
      FROM dbo.GoodSalePrice AS gsp
      INNER JOIN dbo.SalePriceType AS spt
        ON spt.RowID = gsp.SalePriceType_ID
      WHERE gsp.Good_ID = @goodId
        AND gsp.SalePriceType_ID = @salePriceTypeId
        AND spt.IsActive = 1;
    `);

  const row = result.recordset[0];
  if (!row) return null;

  return {
    goodId: Number(row.GoodId),
    salePriceTypeId: Number(row.SalePriceTypeId),
    salePriceTypeName: String(row.SalePriceTypeName),
    salePrice: row.SalePrice == null ? null : Number(row.SalePrice),
    consumerPrice: row.ConsumerPrice == null ? null : Number(row.ConsumerPrice),
    branchId: row.BranchID == null ? null : Number(row.BranchID),
  };
}

export async function findSalePrices(
  goodIds: number[],
  salePriceTypeId: number,
): Promise<SalePriceRecord[]> {
  if (goodIds.length === 0) return [];

  const db = await getDb();
  const request = db.request().input("salePriceTypeId", salePriceTypeId);
  const params = goodIds.map((id, index) => {
    const name = `goodId${index}`;
    request.input(name, id);
    return `@${name}`;
  });

  const result = await request.query(`
    SELECT
      gsp.Good_ID AS GoodId,
      gsp.SalePriceType_ID AS SalePriceTypeId,
      spt.RowName AS SalePriceTypeName,
      gsp.SalePrice,
      gsp.ConsumerPrice,
      spt.BranchID
    FROM dbo.GoodSalePrice AS gsp
    INNER JOIN dbo.SalePriceType AS spt
      ON spt.RowID = gsp.SalePriceType_ID
    WHERE gsp.SalePriceType_ID = @salePriceTypeId
      AND spt.IsActive = 1
      AND gsp.Good_ID IN (${params.join(", ")});
  `);

  return result.recordset.map((row) => ({
    goodId: Number(row.GoodId),
    salePriceTypeId: Number(row.SalePriceTypeId),
    salePriceTypeName: String(row.SalePriceTypeName),
    salePrice: row.SalePrice == null ? null : Number(row.SalePrice),
    consumerPrice: row.ConsumerPrice == null ? null : Number(row.ConsumerPrice),
    branchId: row.BranchID == null ? null : Number(row.BranchID),
  }));
}
