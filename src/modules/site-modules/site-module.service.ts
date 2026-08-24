import { findSiteModules } from "./site-module.repository.js";

export async function getSiteModules() {
  return findSiteModules();
}

export async function getActiveSiteModules() {
  const modules = await findSiteModules();

  return modules.filter((module) => module.ISActive);
}