import {
  findCategories,
  findCategoryById
} from "./category.repository.js";

import type {
  CategoryNode
} from "./category.types.js";

export async function getCategories() {
  return findCategories();
}

export async function getCategoryById(id: number) {
  return findCategoryById(id);
}

export async function getCategoryTree(): Promise<CategoryNode[]> {
  const categories = await findCategories();

  const nodes = new Map<number, CategoryNode>();

  for (const category of categories) {
    nodes.set(category.id, {
      id: category.id,
      code: category.code,
      name: category.name,
      url: category.url,
      children: []
    });
  }

  const roots: CategoryNode[] = [];

  for (const category of categories) {
    const node = nodes.get(category.id);

    if (!node) {
      continue;
    }

    if (
      category.parentId === 0 ||
      category.parentId === category.id ||
      !nodes.has(category.parentId)
    ) {
      roots.push(node);
      continue;
    }

    const parent = nodes.get(category.parentId);

    if (parent) {
      parent.children.push(node);
    }
  }

  return roots;
}

export async function getRootCategories() {
  const tree = await getCategoryTree();

  return tree;
}