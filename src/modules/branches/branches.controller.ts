import type { Context } from "hono";
import { getAdminBranchOptions, listAllSiteBranchConfigs, listSiteBranches, saveSiteBranchConfig } from "./branches.service.js";

export async function getBranches(c: Context) {
  const cityId = Number(c.req.query("cityId"));
  const latitudeValue = c.req.query("latitude");
  const longitudeValue = c.req.query("longitude");
  const latitude = latitudeValue === undefined ? undefined : Number(latitudeValue);
  const longitude = longitudeValue === undefined ? undefined : Number(longitudeValue);
  if (!Number.isSafeInteger(cityId) || cityId <= 0) {
    return c.json({ success: false, message: "شناسه شهر معتبر نیست." }, 400);
  }
  if ((latitudeValue !== undefined && !Number.isFinite(latitude)) ||
      (longitudeValue !== undefined && !Number.isFinite(longitude)) ||
      ((latitudeValue === undefined) !== (longitudeValue === undefined))) {
    return c.json({ success: false, message: "مختصات جغرافیایی معتبر نیست." }, 400);
  }
  const branches = await listSiteBranches(cityId, latitude, longitude);
  const nearestBranchId = latitude !== undefined && longitude !== undefined && branches[0]?.distanceKm != null
    ? branches[0].id
    : null;
  const defaultBranchId = nearestBranchId ?? branches.find((branch) => branch.isDefault)?.id ?? null;
  return c.json({ success: true, data: branches, defaultBranchId });
}

export async function getAdminBranches(c: Context) {
  return c.json({ success: true, data: await listAllSiteBranchConfigs() });
}

export async function putAdminBranch(c: Context) {
  const branchId = Number(c.req.param("branchId"));
  if (!Number.isSafeInteger(branchId) || branchId <= 0) {
    return c.json({ success: false, message: "شناسه شعبه معتبر نیست." }, 400);
  }
  const body = await c.req.json().catch(() => null) as Record<string, unknown> | null;
  const cityId = Number(body?.cityId);
  const warehouseId = Number(body?.warehouseId);
  const salePriceTypeId = body?.salePriceTypeId == null ? null : Number(body.salePriceTypeId);
  const latitude = body?.latitude == null || body.latitude === "" ? null : Number(body.latitude);
  const longitude = body?.longitude == null || body.longitude === "" ? null : Number(body.longitude);
  const address = typeof body?.address === "string" ? body.address.trim() : null;
  if (address !== null && address.length > 500) {
    return c.json({ success: false, message: "آدرس شعبه نباید بیشتر از ۵۰۰ کاراکتر باشد." }, 400);
  }
  if (!Number.isSafeInteger(cityId) || cityId <= 0 ||
      !Number.isSafeInteger(warehouseId) || warehouseId <= 0 ||
      (salePriceTypeId !== null && (!Number.isSafeInteger(salePriceTypeId) || salePriceTypeId <= 0)) ||
      (latitude !== null && !Number.isFinite(latitude)) ||
      (longitude !== null && !Number.isFinite(longitude)) ||
      typeof body?.isActive !== "boolean" || typeof body?.isDefault !== "boolean") {
    return c.json({ success: false, message: "اطلاعات تنظیمات شعبه کامل یا معتبر نیست." }, 400);
  }
  try {
    await saveSiteBranchConfig({ branchId, cityId, warehouseId, salePriceTypeId, latitude, longitude,
      isActive: body.isActive, isDefault: body.isDefault, address });
    return c.json({ success: true, message: "تنظیمات شعبه ذخیره شد." });
  } catch (error) {
    return c.json({ success: false, message: error instanceof Error ? error.message : "ذخیره تنظیمات شعبه ناموفق بود." }, 400);
  }
}

export async function getAdminBranchSetupOptions(c: Context) {
  return c.json({ success: true, data: await getAdminBranchOptions() });
}
