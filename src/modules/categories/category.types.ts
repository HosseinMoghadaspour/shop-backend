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
