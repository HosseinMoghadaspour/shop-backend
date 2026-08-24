import { prisma } from "../../lib/prisma.js";
import type { Slider } from "./slider.types.js";

async function findByType(type: number): Promise<Slider[] > {
  const sliders = await prisma.siteSlider.findMany({
    where: {
      Status: true,
      Type: type,
    },

    orderBy: {
      RowID: "asc",
    },

    select: {
      RowID: true,
      UrlImage: true,
      DescImage: true,
      DescBut: true,
      UrlSend: true,
      Status: true,
      Type: true,
      Description: true,
    },
  });

  return sliders;
}

export async function findActiveSliders(): Promise<Slider[]> {
  return findByType(1);
}

export async function findActiveBanners(): Promise<Slider[]> {
  return findByType(2);
}