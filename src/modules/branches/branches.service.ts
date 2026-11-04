import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";

export type SiteBranch = {
  id: number;
  name: string;
  cityId: number;
  cityName: string;
  warehouseId: number;
  salePriceTypeId: number | null;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
  distanceKm: number | null;
};

type BranchRow = {
  Branch_ID: number;
  BranchName: string;
  City_ID: number;
  CityName: string;
  Warehouse_ID: number;
  SalePriceType_ID: number | null;
  Latitude: number | null;
  Longitude: number | null;
  IsDefault: boolean;
  DistanceKm: number | null;
};

function mapBranch(row: BranchRow): SiteBranch {
  return {
    id: Number(row.Branch_ID),
    name: row.BranchName,
    cityId: Number(row.City_ID),
    cityName: row.CityName,
    warehouseId: Number(row.Warehouse_ID),
    salePriceTypeId: row.SalePriceType_ID == null ? null : Number(row.SalePriceType_ID),
    latitude: row.Latitude == null ? null : Number(row.Latitude),
    longitude: row.Longitude == null ? null : Number(row.Longitude),
    isDefault: Boolean(row.IsDefault),
    distanceKm: row.DistanceKm == null ? null : Number(row.DistanceKm),
  };
}

export async function listSiteBranches(cityId: number, latitude?: number, longitude?: number) {
  const hasCoordinates = latitude !== undefined && longitude !== undefined;
  const rows = await prisma.$queryRaw<BranchRow[]>(Prisma.sql`
    SELECT
      config.Branch_ID,
      branch.RowName AS BranchName,
      config.City_ID,
      city.RowName AS CityName,
      config.Warehouse_ID,
      config.SalePriceType_ID,
      config.Latitude,
      config.Longitude,
      config.IsDefault,
      ${hasCoordinates
        ? Prisma.sql`CASE WHEN config.Latitude IS NULL OR config.Longitude IS NULL THEN NULL ELSE
          6371.0 * 2 * ASIN(SQRT(
            POWER(SIN(RADIANS(config.Latitude - ${latitude!}) / 2), 2) +
            COS(RADIANS(${latitude!})) * COS(RADIANS(config.Latitude)) *
            POWER(SIN(RADIANS(config.Longitude - ${longitude!}) / 2), 2)
          )) END`
        : Prisma.sql`CAST(NULL AS FLOAT)`} AS DistanceKm
    FROM dbo.SiteBranchConfig config
    INNER JOIN dbo.Branch branch ON branch.RowID = config.Branch_ID
    INNER JOIN dbo.City city ON city.RowID = config.City_ID
    WHERE config.City_ID = ${cityId}
      AND city.IsActive = 1
      AND config.IsActive = 1
      AND branch.IsActive = 1
      AND EXISTS (
        SELECT 1 FROM dbo.Warehouse warehouse
        WHERE warehouse.RowID = config.Warehouse_ID
          AND warehouse.Branch_ID = config.Branch_ID
          AND warehouse.IsActive = 1
      )
    ORDER BY
      CASE WHEN ${hasCoordinates ? 1 : 0} = 1 AND config.Latitude IS NOT NULL AND config.Longitude IS NOT NULL THEN 0 ELSE 1 END,
      DistanceKm,
      config.IsDefault DESC,
      branch.RowName ASC
  `);
  return rows.map(mapBranch);
}

export async function listAllSiteBranchConfigs() {
  const rows = await prisma.$queryRaw<BranchRow[]>(Prisma.sql`
    SELECT
      config.Branch_ID,
      branch.RowName AS BranchName,
      config.City_ID,
      city.RowName AS CityName,
      config.Warehouse_ID,
      config.SalePriceType_ID,
      config.Latitude,
      config.Longitude,
      config.IsDefault,
      CAST(NULL AS FLOAT) AS DistanceKm
    FROM dbo.SiteBranchConfig config
    INNER JOIN dbo.Branch branch ON branch.RowID = config.Branch_ID
    INNER JOIN dbo.City city ON city.RowID = config.City_ID
    ORDER BY city.RowName, branch.RowName
  `);
  return rows.map(mapBranch);
}

export async function saveSiteBranchConfig(input: {
  branchId: number;
  cityId: number;
  warehouseId: number;
  salePriceTypeId: number | null;
  latitude: number | null;
  longitude: number | null;
  isActive: boolean;
  isDefault: boolean;
}) {
  if ((input.latitude === null) !== (input.longitude === null)) {
    throw new Error("طول و عرض جغرافیایی باید هر دو وارد شوند.");
  }
  if (input.latitude !== null && (input.latitude < -90 || input.latitude > 90)) {
    throw new Error("عرض جغرافیایی معتبر نیست.");
  }
  if (input.longitude !== null && (input.longitude < -180 || input.longitude > 180)) {
    throw new Error("طول جغرافیایی معتبر نیست.");
  }

  const valid = await prisma.$queryRaw<Array<{ Branch_ID: number }>>(Prisma.sql`
    SELECT branch.RowID AS Branch_ID
    FROM dbo.Branch branch
    INNER JOIN dbo.City city ON city.RowID = ${input.cityId} AND city.IsActive = 1
    INNER JOIN dbo.Warehouse warehouse
      ON warehouse.RowID = ${input.warehouseId}
      AND warehouse.Branch_ID = branch.RowID
      AND warehouse.IsActive = 1
    WHERE branch.RowID = ${input.branchId} AND branch.IsActive = 1
  `);
  if (!valid.length) throw new Error("شعبه، شهر یا انبار انتخاب‌شده معتبر نیست.");

  if (input.salePriceTypeId !== null) {
    const validPriceType = await prisma.$queryRaw<Array<{ RowID: bigint }>>(Prisma.sql`
      SELECT RowID
      FROM dbo.SalePriceType
      WHERE RowID = ${input.salePriceTypeId}
        AND IsActive = 1
        AND (BranchID IS NULL OR BranchID = ${input.branchId})
    `);
    if (!validPriceType.length) {
      throw new Error("نوع قیمت انتخاب‌شده فعال نیست یا به شعبه دیگری تعلق دارد.");
    }
  }

  const isDefault = input.isActive && input.isDefault;

  await prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.$executeRaw(Prisma.sql`
        UPDATE dbo.SiteBranchConfig SET IsDefault = 0 WHERE City_ID = ${input.cityId}
      `);
    }
    await tx.$executeRaw(Prisma.sql`
      IF EXISTS (SELECT 1 FROM dbo.SiteBranchConfig WHERE Branch_ID = ${input.branchId})
        UPDATE dbo.SiteBranchConfig
        SET City_ID = ${input.cityId}, Warehouse_ID = ${input.warehouseId},
            SalePriceType_ID = ${input.salePriceTypeId}, Latitude = ${input.latitude},
            Longitude = ${input.longitude}, IsActive = ${input.isActive}, IsDefault = ${isDefault}
        WHERE Branch_ID = ${input.branchId}
      ELSE
        INSERT INTO dbo.SiteBranchConfig
          (Branch_ID, City_ID, Warehouse_ID, SalePriceType_ID, Latitude, Longitude, IsActive, IsDefault)
        VALUES
          (${input.branchId}, ${input.cityId}, ${input.warehouseId}, ${input.salePriceTypeId},
           ${input.latitude}, ${input.longitude}, ${input.isActive}, ${isDefault})
    `);
  });
}


export async function getAdminBranchOptions() {
  const rows = await prisma.$queryRaw<Array<{
    branchId: number;
    branchName: string;
    warehouseId: number;
    warehouseName: string;
    configuredWarehouseId: number | null;
    cityId: bigint | null;
    cityName: string | null;
    provinceId: bigint | null;
    salePriceTypeId: number | null;
    latitude: number | null;
    longitude: number | null;
    isActive: boolean | null;
    isDefault: boolean | null;
  }>>(Prisma.sql`
    SELECT
      branch.RowID AS branchId,
      branch.RowName AS branchName,
      warehouse.RowID AS warehouseId,
      warehouse.RowName AS warehouseName,
      config.Warehouse_ID AS configuredWarehouseId,
      config.City_ID AS cityId,
      city.RowName AS cityName,
      county.Province_ID AS provinceId,
      config.SalePriceType_ID AS salePriceTypeId,
      config.Latitude AS latitude,
      config.Longitude AS longitude,
      config.IsActive AS isActive,
      config.IsDefault AS isDefault
    FROM dbo.Branch branch
    INNER JOIN dbo.Warehouse warehouse
      ON warehouse.Branch_ID = branch.RowID AND warehouse.IsActive = 1
    LEFT JOIN dbo.SiteBranchConfig config ON config.Branch_ID = branch.RowID
    LEFT JOIN dbo.City city ON city.RowID = config.City_ID
    LEFT JOIN dbo.County county ON county.RowID = city.County_ID
    WHERE branch.IsActive = 1
    ORDER BY branch.RowName, warehouse.RowName
  `);
  return rows.map((row) => ({
    ...row,
    branchId: Number(row.branchId),
    warehouseId: Number(row.warehouseId),
    configuredWarehouseId: row.configuredWarehouseId == null ? null : Number(row.configuredWarehouseId),
    cityId: row.cityId == null ? null : Number(row.cityId),
    provinceId: row.provinceId == null ? null : Number(row.provinceId),
    salePriceTypeId: row.salePriceTypeId == null ? null : Number(row.salePriceTypeId),
    latitude: row.latitude == null ? null : Number(row.latitude),
    longitude: row.longitude == null ? null : Number(row.longitude),
  }));
}
