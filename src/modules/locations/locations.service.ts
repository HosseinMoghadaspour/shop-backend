import { prisma } from "../../lib/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";

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
            Latitude: true,
            Longitude: true,

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

    const geoRows = addresses.length ? await prisma.$queryRaw<Array<{ Address_ID: bigint; Latitude: number; Longitude: number }>>(Prisma.sql`SELECT Address_ID, Latitude, Longitude FROM dbo.SiteAddressGeo WHERE Address_ID IN (${Prisma.join(addresses.map((address) => address.RowID))})`) : [];
    const geoByAddress = new Map(geoRows.map((row) => [Number(row.Address_ID), row]));

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
        latitude: geoByAddress.get(Number(address.RowID))?.Latitude == null ? null : Number(geoByAddress.get(Number(address.RowID))!.Latitude),
        longitude: geoByAddress.get(Number(address.RowID))?.Longitude == null ? null : Number(geoByAddress.get(Number(address.RowID))!.Longitude),

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


export async function createAddressForPerson(personId: number, input: {
  cityId: number;
  deliverToName: string;
  deliverToMobileNumber: string;
  deliverToPhoneNumber?: string;
  Adrs: string;
  PostalCode?: string;
  RowDesc?: string;
  latitude?: number | null;
  longitude?: number | null;
}) {
  const city = await prisma.city.findFirst({
    where: { RowID: BigInt(input.cityId), IsActive: true },
    select: { RowID: true, County: { select: { Province_ID: true } } },
  });
  if (!city?.County?.Province_ID) {
    throw new Error("شهر انتخاب‌شده معتبر نیست.");
  }
  if (!input.deliverToName.trim() || !input.deliverToMobileNumber.trim() || !input.Adrs.trim()) {
    throw new Error("نام تحویل‌گیرنده، موبایل و آدرس الزامی است.");
  }
  if ((input.latitude == null) !== (input.longitude == null)) {
    throw new Error("طول و عرض جغرافیایی باید هر دو ثبت شوند.");
  }
  if (input.latitude != null && (!Number.isFinite(input.latitude) || input.latitude < -90 || input.latitude > 90)) {
    throw new Error("عرض جغرافیایی معتبر نیست.");
  }
  if (input.longitude != null && (!Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180)) {
    throw new Error("طول جغرافیایی معتبر نیست.");
  }
  return prisma.$transaction(async (tx) => {
    const address = await tx.orderDeliveryAddress.create({
      data: {
        Person: { connect: { RowID: personId } },
        Province: { connect: { RowID: city.County.Province_ID } },
        City: { connect: { RowID: city.RowID } },
        DeliverToName: input.deliverToName.trim(),
        DeliverToMobileNumber: input.deliverToMobileNumber.trim(),
        DeliverToPhoneNumber: input.deliverToPhoneNumber?.trim() || null,
        Adrs: input.Adrs.trim(),
        PostalCode: input.PostalCode?.trim() || null,
        RowDesc: input.RowDesc?.trim() || null,
        FDateInsert: new Intl.DateTimeFormat("fa-IR-u-nu-latn", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()).replaceAll("-", "/"),
        FTimeInsert: new Date().toTimeString().slice(0, 5),
      },
      select: { RowID: true },
    });
    if (input.latitude != null && input.longitude != null) {
      await tx.$executeRaw(Prisma.sql`INSERT INTO dbo.SiteAddressGeo (Address_ID, Latitude, Longitude) VALUES (${address.RowID}, ${input.latitude}, ${input.longitude})`);
    }
    return address;
  });
}
