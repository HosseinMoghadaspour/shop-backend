import { getDb } from "../../db/connection.js";

export async function findProductPrices(goodId: number) {
  const db = await getDb();

  const result = await db
    .request()
    .input("goodId", goodId)
    .query(`
      SELECT
        gsp.RowID,
        gsp.Good_ID,
        gsp.SalePrice,
        gsp.ConsumerPrice,

        spt.RowID AS SalePriceTypeID,
        spt.RowName AS SalePriceTypeName

      FROM dbo.GoodSalePrice AS gsp

      INNER JOIN dbo.SalePriceType AS spt
        ON spt.RowID = gsp.SalePriceType_ID

      WHERE
        gsp.Good_ID = @goodId
        AND spt.IsActive = 1

      ORDER BY
        gsp.RowID DESC;
    `);

  return result.recordset;
}