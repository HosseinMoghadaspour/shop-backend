import { getDb } from "../../db/connection.js";

export async function findMainBranch() {
  const db = await getDb();

  const result = await db.request().query(`
    SELECT TOP 1
      RowID,
      RowName
    FROM dbo.Branch
    WHERE
      IsActive = 1
      AND ISNULL(MainBranch, 0) = 1
    ORDER BY RowID;
  `);

  return result.recordset[0] ?? null;
}

export async function findBranchPrice(
  goodId: number,
  branchId: number
) {
  const db = await getDb();

  const result = await db
    .request()
    .input("goodId", goodId)
    .input("branchId", branchId)
    .query(`
      SELECT TOP 1
        SalePrice,
        ConsumerPrice,
        BuyPrice,
        Mdate
      FROM dbo.GoodBranchPrice
      WHERE
        GID = @goodId
        AND BID = @branchId
      ORDER BY
        Mdate DESC,
        RowID DESC;
    `);

  return result.recordset[0] ?? null;
}

export async function findSalePrice(
  goodId: number,
  salePriceTypeId: number
) {
  const db = await getDb();

  const result = await db
    .request()
    .input("goodId", goodId)
    .input("salePriceTypeId", salePriceTypeId)
    .query(`
      SELECT TOP 1
        gsp.SalePrice,
        gsp.ConsumerPrice,
        gsp.RowDesc,
        spt.RowName AS PriceTypeName
      FROM dbo.GoodSalePrice AS gsp
      INNER JOIN dbo.SalePriceType AS spt
        ON spt.RowID = gsp.SalePriceType_ID
      WHERE
        gsp.Good_ID = @goodId
        AND gsp.SalePriceType_ID = @salePriceTypeId
        AND spt.IsActive = 1
      ORDER BY gsp.RowID DESC;
    `);

  return result.recordset[0] ?? null;
}