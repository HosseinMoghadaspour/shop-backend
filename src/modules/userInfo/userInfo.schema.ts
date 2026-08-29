import { z } from "zod";

export const createUserInfoSchema = z.object({
  RowName: z
    .string()
    .max(100)
    .optional(),

  UserLoginName: z
    .string()
    .max(50)
    .optional(),

  UserPermits_Menues: z
    .string()
    .max(400)
    .optional(),

  UserPermits_INSERT: z
    .string()
    .max(400)
    .optional(),

  UserPermits_UPDATE: z
    .string()
    .max(400)
    .optional(),

  UserPermits_DELETE: z
    .string()
    .max(400)
    .optional(),

  UserPermits_Special: z
    .string()
    .max(400)
    .optional(),

  NationalCode: z
    .string()
    .max(200)
    .optional(),

  FatherName: z
    .string()
    .max(100)
    .optional(),

  Mobile: z
    .string()
    .max(200)
    .optional(),

  Phone: z
    .string()
    .max(200)
    .optional(),

  Address: z
    .string()
    .max(500)
    .optional(),

  FDate: z
    .string()
    .max(10)
    .optional(),

  Mdate: z
    .coerce
    .date()
    .optional(),

  IsAdmin: z
    .boolean()
    .optional()
    .default(false),

  IsActive: z
    .boolean()
    .optional()
    .default(true),

  RowDesc: z
    .string()
    .max(500)
    .optional(),

  UniqueIdentifierValue: z
    .uuid()
    .optional(),

  Reversion: z
    .number()
    .int()
    .optional(),

  IsCashier: z
    .boolean()
    .optional()
    .default(false),

  ServerRowID: z
    .number()
    .int()
    .optional(),

  ClientRowID: z
    .number()
    .int()
    .optional(),

  BranchID: z
    .number()
    .int()
    .optional(),

  AdminSite: z
    .boolean()
    .optional()
    .default(false),
});


export const updateUserInfoSchema = createUserInfoSchema
  .omit({
    UniqueIdentifierValue: true,
  })
  .partial();


export const userIdParamSchema = z.object({
  id: z.coerce
    .number()
    .int()
    .positive(),
});


export const userListQuerySchema = z.object({
  page: z.coerce
    .number()
    .int()
    .positive()
    .default(1),

  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(100)
    .default(20),

  search: z
    .string()
    .trim()
    .optional(),

  isActive: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),

  branchId: z.coerce
    .number()
    .int()
    .positive()
    .optional(),
});


export type CreateUserInput = z.infer<
  typeof createUserInfoSchema
>;

export type UpdateUserInput = z.infer<
  typeof updateUserInfoSchema
>;

export type UserIdParam = z.infer<
  typeof userIdParamSchema
>;

export type UserListQuery = z.infer<
  typeof userListQuerySchema
>;