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

export async function getAddressByPersonId(personId: number) {
    const addresses = await prisma.orderDeliveryAddress.findMany({
        select: {
            RowID: true,
            Person_ID: true,
            DeliverToName: true,
            DeliverToMobileNumber: true,
            DeliverToPhoneNumber: true,
            Adrs: true,
            PostalCode: true,
            IsActive: true,
            City_ID: true,
        },
        where: {
            Person_ID: personId,
        },
    });

    const cityIds = addresses
        .map((address) => address.City_ID)
      .filter((id) => id !== null);

    if (cityIds.length === 0) {
        return addresses.map((address) => ({
            ...address,
            city: null,
            province: null,
        }));
    }

    const cities = await prisma.city.findMany({
        select: {
            RowID: true,
            RowName: true,
            County_ID: true,
        },
        where: {
            RowID: {
                in: cityIds,
            },
        },
    });

    const countyIds = cities
        .map((city) => city.County_ID)
        .filter((id) => id !== null);

    const countys = await prisma.county.findMany({
        select: {
            RowID: true,
            RowName: true,
        },
        where: {
            RowID: {
                in: countyIds,
            },
        },
    });

    const provinceIds = countys
    .map((county)=> county.RowID).filter((id) => id !== null);

     const provinces = await prisma.province.findMany({
        select: {
            RowID: true,
            RowName: true,
        },
        where: {
            RowID: {
                in: provinceIds,
            },
        },
    });

    return addresses.map((address) => {
        const city = cities.find(
            (item) => item.RowID === address.City_ID
        );

        const county = countys.find(
            (item) => item.RowID === city?.County_ID
        );

        const province = provinces.find(
            (item)=> item.RowID === county?.RowID
        )

        return {
            ...address,
            city: city
                ? {
                      id: city.RowID,
                      name: city.RowName,
                  }
                : null,
            county: county ? {
                id: county.RowID,
                name: county.RowName
            } : null,
            province: province
                ? {
                      id: province.RowID,
                      name: province.RowName,
                  }
                : null,
        };
    });
}
