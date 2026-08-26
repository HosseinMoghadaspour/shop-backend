import {
  count,
  create,
  findById,
  findMany,
  remove,
  update,
  updateActiveStatus,
} from "./userInfo.repository.js";

import type {
  CreateUserInput,
  UpdateUserInput,
} from "./userInfo.schema.js";

export async function getUsers(params: {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
}) {
  const {
    page,
    limit,
    search,
    isActive,
  } = params;

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    findMany({
      skip,
      take: limit,
      search,
      isActive,
    }),

    count({
      search,
      isActive,
    }),
  ]);

  return {
    data,

    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getUserById(id: number) {
  return findById(id);
}

export async function createUser(
  data: CreateUserInput,
) {
  return create(data);
}

export async function updateUser(
  id: number,
  data: UpdateUserInput,
) {
  return update(id, data);
}

export async function deleteUser(id: number) {
  return remove(id);
}

export async function activateUser(id: number) {
  return updateActiveStatus(id, true);
}

export async function deactivateUser(id: number) {
  return updateActiveStatus(id, false);
}

export async function setUserActive(id: number, isActive: boolean) {
  return updateActiveStatus(id, isActive);
}