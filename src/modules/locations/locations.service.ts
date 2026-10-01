import { prisma } from "../../lib/prisma.js";

export async function getProvinces() {
  const provinces = await prisma.province.findMany({
    where: { IsActive: true },
    select: {
      RowID: true,
      RowName: true,
    },
    orderBy: { RowName: "asc" },
  });

  return provinces.map((province) => ({
    id: Number(province.RowID),
    name: province.RowName,
  }));
}

export async function getCitiesByProvince(provinceId: number) {
  const province = await prisma.province.findFirst({
    where: {
      RowID: provinceId,
      IsActive: true,
    },
    select: { RowID: true },
  });

  if (!province) {
    return null;
  }

  const cities = await prisma.city.findMany({
    where: {
      IsActive: true,
      County: {
        is: {
          Province_ID: province.RowID,
          IsActive: true,
        },
      },
    },
    select: {
      RowID: true,
      RowName: true,
      County_ID: true,
    },
    orderBy: { RowName: "asc" },
  });

  return cities.map((city) => ({
    id: Number(city.RowID),
    name: city.RowName,
    countyId: city.County_ID === null ? null : Number(city.County_ID),
  }));
}
