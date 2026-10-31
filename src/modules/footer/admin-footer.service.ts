
import { prisma } from "../../lib/prisma.js";
import type { Footer } from "./footer.types.js";

export type FooterUpdateInput = Partial<Omit<Footer, "RowID">>;

export async function getAdminFooter(): Promise<Footer | null> {
  const footer = await prisma.siteFooterData.findFirst({
    orderBy: {
      RowID: "desc",
    },
  });

  return footer as Footer | null;
}

export async function updateAdminFooter(data: FooterUpdateInput) {
  const existing = await prisma.siteFooterData.findFirst({
    orderBy: {
      RowID: "desc",
    },
    select: {
      RowID: true,
    },
  });

  if (existing) {
    return prisma.siteFooterData.update({
      where: {
        RowID: existing.RowID,
      },
      data,
    });
  }

  return prisma.siteFooterData.create({
    data,
  });
}
