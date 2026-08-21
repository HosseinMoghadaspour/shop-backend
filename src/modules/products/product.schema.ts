import { z } from "zod";

export const productQuerySchema = z.object({
  search: z.string().optional(),

  categoryId: z.coerce.number().int().positive().optional(),

  brandId: z.coerce.number().int().positive().optional(),

  producerId: z.coerce.number().int().positive().optional(),

  minPrice: z.coerce.number().nonnegative().optional(),

  maxPrice: z.coerce.number().nonnegative().optional(),

  isSpecialSale: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),

  amazingSale: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),

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
    .default(20)
});