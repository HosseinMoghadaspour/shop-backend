import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";

export type SiteBranch = {
  id: number;
  name: string;
  cityId: number;
  cityName: string;
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
    salePriceTypeId:
      row.SalePriceType_ID == null ? null : Number(row.SalePriceType_ID),
    latitude: row.Latitude == null ? null : Number(row.Latitude),
    longitude: row.Longitude == null ? null : Number(row.Longitude),
    isDefault: Boolean(row.IsDefault),
    distanceKm: row.DistanceKm == null ? null : Number(row.DistanceKm),
  };
}

/**
 * Customer-facing branches:
 * Branch is the source of branch identity. Only branches with an active
 * online-store configuration and an active accounting warehouse are
 * available for shopping.
 */
export async function listSiteBranches(
  cityId: number,
  latitude?: number,
  longitude?: number,
) {
  const hasCoordinates = latitude !== undefined && longitude !== undefined;

  const rows = await prisma.$queryRaw<BranchRow[]>(Prisma.sql`
    SELECT
      branch.RowID AS Branch_ID,
      branch.RowName AS BranchName,
      config.City_ID,
      city.RowName AS CityName,
      config.SalePriceType_ID,
      config.Latitude,
      config.Longitude,
      config.IsDefault,
      ${hasCoordinates
        ? Prisma.sql`CASE
            WHEN config.Latitude IS NULL OR config.Longitude IS NULL THEN NULL
            ELSE 6371.0 * 2 * ASIN(SQRT(
              POWER(SIN(RADIANS(config.Latitude - ${latitude!}) / 2), 2) +
              COS(RADIANS(${latitude!})) * COS(RADIANS(config.Latitude)) *
              POWER(SIN(RADIANS(config.Longitude - ${longitude!}) / 2), 2)
            ))
          END`
        : Prisma.sql`CAST(NULL AS FLOAT)`} AS DistanceKm
    FROM dbo.Branch branch
    LEFT JOIN dbo.SiteBranchConfig config
      ON config.Branch_ID = branch.RowID
    INNER JOIN dbo.City city
      ON city.RowID = config.City_ID
      AND city.IsActive = 1
    WHERE branch.IsActive = 1
      AND config.City_ID = ${cityId}
      AND config.IsActive = 1
      AND EXISTS (
        SELECT 1
        FROM dbo.Warehouse warehouse
        WHERE warehouse.RowID = config.Warehouse_ID
          AND warehouse.Branch_ID = branch.RowID
          AND warehouse.IsActive = 1
      )
    ORDER BY
      CASE
        WHEN ${hasCoordinates ? 1 : 0} = 1
          AND config.Latitude IS NOT NULL
          AND config.Longitude IS NOT NULL
        THEN 0 ELSE 1
      END,
      DistanceKm,
      config.IsDefault DESC,
      branch.RowName ASC
  `);

  return rows.map(mapBranch);
}

export async function listAllSiteBranchConfigs() {
  const rows = await prisma.$queryRaw<Array<{
    Branch_ID: number;
    BranchName: string;
    BranchDesc: string | null;
    BranchAddress: string | null;
    MainBranch: boolean | null;
    City_ID: number | null;
    CityName: string | null;
    SalePriceType_ID: number | null;
    Latitude: number | null;
    Longitude: number | null;
    IsDefault: boolean | null;
    IsConfigured: boolean;
  }>>(Prisma.sql`
    SELECT
      branch.RowID AS Branch_ID,
      branch.RowName AS BranchName,
      branch.RowDesc AS BranchDesc,
      branch.Address AS BranchAddress,
      branch.MainBranch,
      config.City_ID,
      city.RowName AS CityName,
      config.SalePriceType_ID,
      config.Latitude,
      config.Longitude,
      config.IsDefault,
      CAST(CASE WHEN config.Branch_ID IS NULL THEN 0 ELSE 1 END AS BIT) AS IsConfigured
    FROM dbo.Branch branch
    LEFT JOIN dbo.SiteBranchConfig config
      ON config.Branch_ID = branch.RowID
    LEFT JOIN dbo.City city
      ON city.RowID = config.City_ID
    WHERE branch.IsActive = 1
    ORDER BY
      CASE WHEN branch.MainBranch = 1 THEN 0 ELSE 1 END,
      branch.RowName
  `);

  return rows.map((row) => ({
    id: Number(row.Branch_ID),
    name: row.BranchName,
    description: row.BranchDesc,
    address: row.BranchAddress,
    isMainBranch: row.MainBranch == null ? false : Boolean(row.MainBranch),
    cityId: row.City_ID == null ? null : Number(row.City_ID),
    cityName: row.CityName,
    salePriceTypeId:
      row.SalePriceType_ID == null ? null : Number(row.SalePriceType_ID),
    latitude: row.Latitude == null ? null : Number(row.Latitude),
    longitude: row.Longitude == null ? null : Number(row.Longitude),
    isDefault: Boolean(row.IsDefault),
    isConfigured: Boolean(row.IsConfigured),
  }));
}

export async function saveSiteBranchConfig(input: {
  branchId: number;
  cityId: number;
  salePriceTypeId: number | null;
  latitude: number | null;
  longitude: number | null;
  isActive: boolean;
  isDefault: boolean;
  address?: string | null;
}) {
  if ((input.latitude === null) !== (input.longitude === null)) {
    throw new Error("طول و عرض جغرافیایی باید هر دو وارد شوند.");
  }
  if (
    input.latitude !== null &&
    (input.latitude < -90 || input.latitude > 90)
  ) {
    throw new Error("عرض جغرافیایی معتبر نیست.");
  }
  if (
    input.longitude !== null &&
    (input.longitude < -180 || input.longitude > 180)
  ) {
    throw new Error("طول جغرافیایی معتبر نیست.");
  }

  const validBranch = await prisma.$queryRaw<Array<{ Branch_ID: number }>>(
    Prisma.sql`
      SELECT branch.RowID AS Branch_ID
      FROM dbo.Branch branch
      INNER JOIN dbo.City city
        ON city.RowID = ${input.cityId}
        AND city.IsActive = 1
      WHERE branch.RowID = ${input.branchId}
        AND branch.IsActive = 1
    `,
  );

  if (!validBranch.length) {
    throw new Error("شعبه یا شهر انتخاب‌شده معتبر نیست.");
  }

  // Warehouse remains an internal accounting dependency only. Preserve the
  // current active mapping, or select an active warehouse for this branch
  // automatically; it is never selected or managed in the admin UI.
  const warehouseRows = await prisma.$queryRaw<
    Array<{ Warehouse_ID: number }>
  >(Prisma.sql`
    SELECT TOP (1) warehouse.RowID AS Warehouse_ID
    FROM dbo.Warehouse warehouse
    LEFT JOIN dbo.SiteBranchConfig config
      ON config.Branch_ID = ${input.branchId}
    WHERE warehouse.Branch_ID = ${input.branchId}
      AND warehouse.IsActive = 1
    ORDER BY
      CASE WHEN warehouse.RowID = config.Warehouse_ID THEN 0 ELSE 1 END,
      warehouse.RowID
  `);

  const warehouseId = warehouseRows[0]?.Warehouse_ID;
  if (warehouseId == null) {
    throw new Error(
      "برای این شعبه در سیستم حسابداری انبار فعالی تعریف نشده است.",
    );
  }

  if (input.salePriceTypeId !== null) {
    const validPriceType = await prisma.$queryRaw<Array<{ RowID: bigint }>>(
      Prisma.sql`
        SELECT RowID
        FROM dbo.SalePriceType
        WHERE RowID = ${input.salePriceTypeId}
          AND IsActive = 1
          AND (BranchID IS NULL OR BranchID = ${input.branchId})
      `,
    );

    if (!validPriceType.length) {
      throw new Error(
        "نوع قیمت انتخاب‌شده فعال نیست یا به شعبه دیگری تعلق دارد.",
      );
    }
  }

  const isDefault = input.isActive && input.isDefault;

  await prisma.$transaction(async (tx) => {
    if (input.address !== undefined) {
      await tx.$executeRaw(Prisma.sql`
        UPDATE dbo.Branch
        SET RowDesc = ${input.address}
        WHERE RowID = ${input.branchId}
      `);
    }

    if (isDefault) {
      await tx.$executeRaw(Prisma.sql`
        UPDATE dbo.SiteBranchConfig
        SET IsDefault = 0
        WHERE City_ID = ${input.cityId}
      `);
    }

    await tx.$executeRaw(Prisma.sql`
      IF EXISTS (
        SELECT 1
        FROM dbo.SiteBranchConfig
        WHERE Branch_ID = ${input.branchId}
      )
        UPDATE dbo.SiteBranchConfig
        SET
          City_ID = ${input.cityId},
          Warehouse_ID = ${warehouseId},
          SalePriceType_ID = ${input.salePriceTypeId},
          Latitude = ${input.latitude},
          Longitude = ${input.longitude},
          IsActive = ${input.isActive},
          IsDefault = ${isDefault},
          UpdatedAt = SYSUTCDATETIME()
        WHERE Branch_ID = ${input.branchId}
      ELSE
        INSERT INTO dbo.SiteBranchConfig
          (Branch_ID, City_ID, Warehouse_ID, SalePriceType_ID, Latitude, Longitude, IsActive, IsDefault)
        VALUES
          (${input.branchId}, ${input.cityId}, ${warehouseId}, ${input.salePriceTypeId},
           ${input.latitude}, ${input.longitude}, ${input.isActive}, ${isDefault})
    `);
  });
}

export async function getAdminBranchOptions() {
  const rows = await prisma.$queryRaw<Array<{
    branchId: number;
    branchName: string;
    description: string | null;
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
      branch.RowDesc AS description,
      config.City_ID AS cityId,
      city.RowName AS cityName,
      county.Province_ID AS provinceId,
      config.SalePriceType_ID AS salePriceTypeId,
      config.Latitude AS latitude,
      config.Longitude AS longitude,
      config.IsActive AS isActive,
      config.IsDefault AS isDefault
    FROM dbo.Branch branch
    LEFT JOIN dbo.SiteBranchConfig config
      ON config.Branch_ID = branch.RowID
    LEFT JOIN dbo.City city
      ON city.RowID = config.City_ID
    LEFT JOIN dbo.County county
      ON county.RowID = city.County_ID
    WHERE branch.IsActive = 1
    ORDER BY branch.RowName
  `);

  return rows.map((row) => ({
    ...row,
    branchId: Number(row.branchId),
    cityId: row.cityId == null ? null : Number(row.cityId),
    provinceId: row.provinceId == null ? null : Number(row.provinceId),
    salePriceTypeId:
      row.salePriceTypeId == null ? null : Number(row.salePriceTypeId),
    latitude: row.latitude == null ? null : Number(row.latitude),
    longitude: row.longitude == null ? null : Number(row.longitude),
  }));
}
