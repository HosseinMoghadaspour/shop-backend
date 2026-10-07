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
        where: {
            Person_ID: personId,
            IsActive: true,
        },

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

            City: {
                select: {
                    RowID: true,
                    RowName: true,

                    County: {
                        select: {
                            RowID: true,
                            RowName: true,

                            Province: {
                                select: {
                                    RowID: true,
                                    RowName: true,
                                },
                            },
                        },
                    },
                },
            },
        },
    });

    return addresses.map((address) => ({
        id: Number(address.RowID),

        personId: address.Person_ID,

        recipient: {
            name: address.DeliverToName,
            mobile: address.DeliverToMobileNumber,
            phone: address.DeliverToPhoneNumber,
        },

        address: address.Adrs,

        postalCode: address.PostalCode,

        isActive: address.IsActive,

        cityId: address.City_ID
            ? Number(address.City_ID)
            : null,

        city: address.City
            ? {
                  id: Number(address.City.RowID),
                  name: address.City.RowName,
              }
            : null,

        county: address.City?.County
            ? {
                  id: Number(address.City.County.RowID),
                  name: address.City.County.RowName,
              }
            : null,

        province: address.City?.County?.Province
            ? {
                  id: Number(
                      address.City.County.Province.RowID
                  ),
                  name: address.City.County.Province.RowName,
              }
            : null,
    }));
}
