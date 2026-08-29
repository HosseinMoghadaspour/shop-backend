import type { Context } from "hono";

import {
  createUser,
  deleteUser,
  getUserById as getUserByIdService,
  getUsers as getUsersService,
  setUserActive,
  updateUser,
} from "./userInfo.service.js";

import {
  createUserInfoSchema,
  updateUserInfoSchema,
   userListQuerySchema,
  userIdParamSchema,
} from "./userInfo.schema.js";

import { AppError } from "../../shared/errors/app-error.js";

function toJsonSafe<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (key, nestedValue) => {
      if (key === "UserLoginPassword") return undefined;
      return typeof nestedValue === "bigint"
        ? nestedValue.toString()
        : nestedValue;
    }),
  ) as T;
}

export async function getUsers(c: Context) {
  const query = userListQuerySchema.parse(c.req.query());

  const result = await getUsersService(query);

  return c.json({
    success: true,
    ...toJsonSafe(result),
  });
}

export async function getUserById(c: Context) {
  const { id } = userIdParamSchema.parse(c.req.param());

  const person = await getUserByIdService(id);

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

export async function createUserController(c: Context) {
  const body = await c.req.json();
  const data = createUserInfoSchema.parse(body);
  const person = await createUser(data);

  return c.json(
    {
      success: true,
      message: "شخص با موفقیت ایجاد شد",
      data: toJsonSafe(person),
    },
    201,
  );
}

export async function updateUserController(c: Context) {
  const { id } = userIdParamSchema.parse(c.req.param());
  const existingPerson = await getUserByIdService(id);

  if (!existingPerson) {
    throw new AppError(
      "PERSON_NOT_FOUND",
      "شخص مورد نظر پیدا نشد",
      404,
    );
  }

  const body = await c.req.json();
  const data = updateUserInfoSchema.parse(body);
  const person = await updateUser(id, data);

  return c.json({
    success: true,
    message: "اطلاعات شخص با موفقیت بروزرسانی شد",
    data: toJsonSafe(person),
  });
}

export async function deleteUserController(c: Context) {
  const { id } = userIdParamSchema.parse(c.req.param());
  const existingPerson = await getUserByIdService(id);

  if (!existingPerson) {
    throw new AppError(
      "PERSON_NOT_FOUND",
      "شخص مورد نظر پیدا نشد",
      404,
    );
  }

  await deleteUser(id);

  return c.json({
    success: true,
    message: "شخص با موفقیت حذف شد",
  });
}

export async function activateUserController(c: Context) {
  const { id } = userIdParamSchema.parse(c.req.param());
  const existingPerson = await getUserByIdService(id);

  if (!existingPerson) {
    throw new AppError(
      "PERSON_NOT_FOUND",
      "شخص مورد نظر پیدا نشد",
      404,
    );
  }

  const person = await setUserActive(id, true);

  return c.json({
    success: true,
    message: "شخص فعال شد",
    data: toJsonSafe(person),
  });
}

export async function deactivateUserController(c: Context) {
  const { id } = userIdParamSchema.parse(c.req.param());
  const existingPerson = await getUserByIdService(id);

  if (!existingPerson) {
    throw new AppError(
      "PERSON_NOT_FOUND",
      "شخص مورد نظر پیدا نشد",
      404,
    );
  }

  const person = await setUserActive(id, false);

  return c.json({
    success: true,
    message: "شخص غیرفعال شد",
    data: toJsonSafe(person),
  });
}