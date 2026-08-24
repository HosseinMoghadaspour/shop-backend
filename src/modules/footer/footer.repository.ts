import { prisma } from "../../lib/prisma.js";
import type { Footer } from "./footer.types.js";

export async function getFooter(): Promise<Footer | null> {
  const footer = await prisma.siteFooterData.findFirst({
    orderBy: {
      RowID: "desc",
    },

    select: {
      RowID: true,

      AboutText: true,
      Address: true,

      Phone1: true,
      Phone2: true,

      InstagramHandle: true,
      TelegramHandle: true,
      WhatsAppHandle: true,
      EtaHandle: true,
      Rubikahandle: true,

      LogoImageUrl: true,
      EnamadImageUrl: true,
      ReziImageUrl: true,
      SamandehiUrl: true,
      DragahUrl: true,

      LinkContactUs: true,
      LinkAboutUs: true,
      LinkFAQ: true,
      LinkArticles: true,

      Copyright: true,
      SiteIcon: true,
      SiteName: true,
    },
  });

  return footer as Footer | null;
}