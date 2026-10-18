import { z } from "zod";
import { CATEGORY_ICONS } from "./category.icons.js";

const iconSchema = z.enum(CATEGORY_ICONS);

export const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(500).nullable().optional(),
  icon: iconSchema.default("folder"),
  parentId: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
});

export const updateCategorySchema =
  createCategorySchema.partial();

export type CreateCategoryInput =
  z.infer<typeof createCategorySchema>;

export type UpdateCategoryInput =
  z.infer<typeof updateCategorySchema>;


export interface CategorySummary {
  id: number;
  code: string;
  name: string;
  url: string | null;
  onlineCategoryImage: string | null;
}

export interface CategoryRecord extends CategorySummary {
  parentId: number;
  sortOrder: number;
}

export interface CategoryNode extends CategorySummary {
  children: CategoryNode[];
}
