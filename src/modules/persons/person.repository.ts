import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import type {
  CreatePersonInput,
  UpdatePersonInput,
} from "./person.schema.js";
import { randomUUID } from "node:crypto";

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
  const createData: Prisma.PersonUncheckedCreateInput = {
    ...data,

    RowCode: data.RowCode ?? randomUUID(),

    RowName: data.RowName ?? "مشتری",

    Fix_PersonType_ID: data.Fix_PersonType_ID ?? 2,

    Fix_PersonRemainderType_ID:
      data.Fix_PersonRemainderType_ID ?? 1,

    IsActive: data.IsActive ?? true,
  };

  return prisma.person.create({
    data: createData,
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