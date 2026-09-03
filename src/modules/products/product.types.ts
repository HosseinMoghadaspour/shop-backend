import type { ProductImage } from "./product-image.types.js";
import type { ProductPricing } from "../pricing/price.types.js";

export interface Product {
  id: number;
  code: string;
  name: string;
  nameEn: string | null;
  alias: string | null;

  categoryId: number | null;
  brandId: number | null;
  producerId: number | null;

  salePrice: number;
  discountPrice: number | null;
  consumerPrice: number | null;

  isActive: boolean;
  isShowInOnlineShop: boolean;

  briefDescription: string | null;
  fullDescription: string | null;
  description: string | null;

  isSpecialSale: boolean;
  amazingSale: boolean;

  minOrder: number | null;
  maxOrder: number | null;
  minShow: number | null;

  stock: number;
  orderPoint: number | null;

  isHasSize: boolean;
  width: number | null;
  height: number | null;
  length: number | null;
  weight: number | null;

  showInCofferMenu: boolean;

  images: ProductImage[];
  pricing: ProductPricing;

  createdAt: Date | null;
  updatedAt: Date | null;
}
