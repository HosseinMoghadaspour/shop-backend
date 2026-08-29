import { prisma } from "../../lib/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";
import type {
  CreatePersonInput,
  UpdatePersonInput,
} from "./person.schema.js";

export interface FindPersonsParams {
  skip: number;
  take: number;
  search?: string;
  isActive?: boolean;
}

export async function findMany(params: FindPersonsParams) {
  const { skip, take, search, isActive } = params;

  return prisma.person.findMany({
    where: {
      ...(isActive !== undefined && {
        IsActive: isActive,
      }),

      ...(search
        ? {
            OR: [
              {
                RowName: {
                  contains: search,
                },
              },
              {
                RowCode: {
                  contains: search,
                },
              },
              {
                MobileNumber: {
                  contains: search,
                },
              },
              {
                NationalCode: {
                  contains: search,
                },
              },
            ],
          }
        : {}),
    },

    skip,
    take,

    orderBy: {
      RowID: "desc",
    },
  });
}

export async function count(params: {
  search?: string;
  isActive?: boolean;
}) {
  const { search, isActive } = params;

  return prisma.person.count({
    where: {
      ...(isActive !== undefined && {
        IsActive: isActive,
      }),

      ...(search
        ? {
            OR: [
              {
                RowName: {
                  contains: search,
                },
              },
              {
                RowCode: {
                  contains: search,
                },
              },
              {
                MobileNumber: {
                  contains: search,
                },
              },
              {
                NationalCode: {
                  contains: search,
                },
              },
            ],
          }
        : {}),
    },
  });
}

export async function findById(id: number) {
  return prisma.person.findUnique({
    where: {
      RowID: id,
    },
  });
}

export async function findByCode(code: string) {
  return prisma.person.findFirst({
    where: {
      RowCode: code,
    },
  });
}

export async function create(data: CreatePersonInput) {
  return prisma.person.create({
    data: data as Prisma.PersonUncheckedCreateInput,
  });
}

export async function update(
  id: number,
  data: UpdatePersonInput,
) {
  return prisma.person.update({
    where: {
      RowID: id,
    },
    data,
  });
}

export async function remove(id: number) {
  return prisma.person.delete({
    where: {
      RowID: id,
    },
  });
}

export async function updateActiveStatus(
  id: number,
  isActive: boolean,
) {
  return prisma.person.update({
    where: {
      RowID: id,
    },
    data: {
      IsActive: isActive,
    },
  });
}