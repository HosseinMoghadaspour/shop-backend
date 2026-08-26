import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import type {
  CreateUserInput,
  UpdateUserInput
} from "./userInfo.schema.js";

export interface FindUserInfoParams {
  skip: number;
  take: number;
  search?: string;
  isActive?: boolean;
}

export async function findMany(params:FindUserInfoParams) {
     const { skip, take, search, isActive } = params;
     
     return prisma.userInfo.findMany({
        where: {
        ...(isActive !== undefined && {
            IsActive : isActive,
        }),
        ...(search ? {OR: [{RowName: {
            contains: search,
        },}, {
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
              },]}:{}),
        },
        skip,
        take,
         orderBy: {
      RowID: "desc",
    },
     })
}

export async function count(params: {
  search?: string;
  isActive?: boolean;
}) {
  const { search, isActive } = params;

  return prisma.userInfo.count({
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
  return prisma.userInfo.findUnique({
    where: {
      RowID: id,
    },
  });
}

export async function create(data: CreateUserInput) {
  return prisma.userInfo.create({
   data: data as Prisma.UserInfoUncheckedCreateInput,
  });
  }

export async function update(
  id: number,
  data: UpdateUserInput,
) {
  return prisma.userInfo.update({
    where: {
      RowID: id,
    },
    data,
  });
}

export async function remove(id: number) {
  return prisma.userInfo.delete({
    where: {
      RowID: id,
    },
  });
}

export async function updateActiveStatus(
  id: number,
  isActive: boolean,
) {
  return prisma.userInfo.update({
    where: {
      RowID: id,
    },
    data: {
      IsActive: isActive,
    },
  });
}