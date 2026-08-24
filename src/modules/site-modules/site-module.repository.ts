import { prisma } from "../../lib/prisma.js";
import type { SiteModule } from "./site-module.types.js";

export async function findSiteModules(): Promise<SiteModule[]> {
  const modules = await prisma.siteModuleOrder.findMany({
    orderBy: [
      {
        SortOrder: "asc",
      },
      {
        RowID: "asc",
      },
    ],

    select: {
      RowID: true,
      Name: true,
      ISActive: true,
      SortOrder: true,
    },
  });

  return modules as SiteModule[];
}