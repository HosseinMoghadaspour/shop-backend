import {
  count,
  create,
  findByCode,
  findById,
  findMany,
  remove,
  update,
  updateActiveStatus,
} from "./person.repository.js";

import type {
  CreatePersonInput,
  UpdatePersonInput,
} from "./person.schema.js";

export async function getPersons(params: {
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

export async function getPersonById(id: number) {
  return findById(id);
}

export async function getPersonByCode(code: string) {
  return findByCode(code);
}

export async function createPerson(
  data: CreatePersonInput,
) {
  return create(data);
}

export async function updatePerson(
  id: number,
  data: UpdatePersonInput,
) {
  return update(id, data);
}

export async function deletePerson(id: number) {
  return remove(id);
}

export async function activatePerson(id: number) {
  return updateActiveStatus(id, true);
}

export async function deactivatePerson(id: number) {
  return updateActiveStatus(id, false);
}

export async function setPersonActive(id: number, isActive: boolean) {
  return updateActiveStatus(id, isActive);
}