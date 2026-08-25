import type { Context } from "hono";

import {
  createPerson,
  deletePerson,
  getPersonById as getPersonByIdService,
  getPersons as getPersonsService,
  setPersonActive,
  updatePerson,
} from "./person.service.js";

import {
  createPersonSchema,
  personIdSchema,
  personListQuerySchema,
  updatePersonSchema,
} from "./person.schema.js";

import { AppError } from "../../shared/errors/app-error.js";

function toJsonSafe<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, nestedValue) =>
      typeof nestedValue === "bigint"
        ? nestedValue.toString()
        : nestedValue,
    ),
  ) as T;
}

export async function getPersons(c: Context) {
  const query = personListQuerySchema.parse(c.req.query());

  const result = await getPersonsService(query);

  return c.json({
    success: true,
    ...toJsonSafe(result),
  });
}

export async function getPersonById(c: Context) {
  const { id } = personIdSchema.parse(c.req.param());

  const person = await getPersonByIdService(id);

  if (!person) {
    throw new AppError(
      "PERSON_NOT_FOUND",
      "شخص مورد نظر پیدا نشد",
      404,
    );
  }

  return c.json({
    success: true,
    data: toJsonSafe(person),
  });
}

export async function createPersonController(c: Context) {
  const body = await c.req.json();
  const data = createPersonSchema.parse(body);
  const person = await createPerson(data);

  return c.json(
    {
      success: true,
      message: "شخص با موفقیت ایجاد شد",
      data: toJsonSafe(person),
    },
    201,
  );
}

export async function updatePersonController(c: Context) {
  const { id } = personIdSchema.parse(c.req.param());
  const existingPerson = await getPersonByIdService(id);

  if (!existingPerson) {
    throw new AppError(
      "PERSON_NOT_FOUND",
      "شخص مورد نظر پیدا نشد",
      404,
    );
  }

  const body = await c.req.json();
  const data = updatePersonSchema.parse(body);
  const person = await updatePerson(id, data);

  return c.json({
    success: true,
    message: "اطلاعات شخص با موفقیت بروزرسانی شد",
    data: toJsonSafe(person),
  });
}

export async function deletePersonController(c: Context) {
  const { id } = personIdSchema.parse(c.req.param());
  const existingPerson = await getPersonByIdService(id);

  if (!existingPerson) {
    throw new AppError(
      "PERSON_NOT_FOUND",
      "شخص مورد نظر پیدا نشد",
      404,
    );
  }

  await deletePerson(id);

  return c.json({
    success: true,
    message: "شخص با موفقیت حذف شد",
  });
}

export async function activatePersonController(c: Context) {
  const { id } = personIdSchema.parse(c.req.param());
  const existingPerson = await getPersonByIdService(id);

  if (!existingPerson) {
    throw new AppError(
      "PERSON_NOT_FOUND",
      "شخص مورد نظر پیدا نشد",
      404,
    );
  }

  const person = await setPersonActive(id, true);

  return c.json({
    success: true,
    message: "شخص فعال شد",
    data: toJsonSafe(person),
  });
}

export async function deactivatePersonController(c: Context) {
  const { id } = personIdSchema.parse(c.req.param());
  const existingPerson = await getPersonByIdService(id);

  if (!existingPerson) {
    throw new AppError(
      "PERSON_NOT_FOUND",
      "شخص مورد نظر پیدا نشد",
      404,
    );
  }

  const person = await setPersonActive(id, false);

  return c.json({
    success: true,
    message: "شخص غیرفعال شد",
    data: toJsonSafe(person),
  });
}