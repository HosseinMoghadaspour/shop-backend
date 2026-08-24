import { prisma } from "../../lib/prisma.js";
import type { ProducerSummary } from "./producer.types.js";

export async function findProducerById(
  id: bigint,
): Promise<ProducerSummary | null> {
  const producer = await prisma.producers.findFirst({
    where: {
      RowID: id,
      IsActive: true,
    },

    select: {
      RowID: true,
      RowName: true,
      BriefDescription: true,
      ProducerImage: true,
    },
  });

  if (!producer) {
    return null;
  }

  return {
    id: producer.RowID,
    name: producer.RowName,
    image: producer.ProducerImage,
    briefDescription: producer.BriefDescription,
  };
}