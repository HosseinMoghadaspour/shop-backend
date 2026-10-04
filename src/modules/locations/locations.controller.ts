import type { Context } from "hono";
import {
  getCitiesByProvince,
  getProvinces,
  getAddressByPersonId
} from "./locations.service.js";

export async function listProvinces(c: Context) {
  const provinces = await getProvinces();

  return c.json({
    success: true,
    data: provinces,
  });
}

export async function listCitiesByProvince(c: Context) {
  const provinceId = Number(c.req.param("id"));

  if (!Number.isSafeInteger(provinceId) || provinceId <= 0) {
    return c.json(
      {
        success: false,
        error: {
          code: "INVALID_PROVINCE_ID",
          message: "شناسه استان نامعتبر است",
        },
      },
      400,
    );
  }

  const cities = await getCitiesByProvince(provinceId);

  if (cities === null) {
    return c.json(
      {
        success: false,
        error: {
          code: "PROVINCE_NOT_FOUND",
          message: "استان پیدا نشد",
        },
      },
      404,
    );
  }

  return c.json({
    success: true,
    data: cities,
  });

}

export async function listAddress(c:Context) {
  const personId = Number(c.req.param("id"));

  if (!Number.isSafeInteger(personId) || personId <= 0) {
    return c.json(
      {
        success: false,
        error: {
          code: "INVALID_PERSON_ID",
          message: "شناسه فرد نامعتبر است",
        },
      },
      400,
    );
  }

  const address = await getAddressByPersonId(personId);

  return c.json({
    success: true,
    data: address,
  });
}
