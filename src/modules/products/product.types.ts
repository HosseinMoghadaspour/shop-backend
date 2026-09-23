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
  measureUnitId: number | null;
mainMeasureUnitId: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  stockInfo: ProductStockInfo[];
}

export interface ProductStockInfo {
  barcode: string | null;
  productName: string | null;
  latinProductName: string | null;
  productNickName: string | null;
  quantity: number;
  warehouseId: number | null;
  financialYearId: number | null;
  financialId: number | null;
  warehouse: string | null;
  smallestUnit: string | null;
  categoryName: string | null;
  branchId: number | null;
  specialCategory: boolean | null;
  image: string | null;
  taxCode: string | null;
  taxName: string | null;
  taxPercent: number | null;
  taxPercentGroup: number | null;
  taxGroupGoodId: number | null;
  freeSalePrice: number | null;
  mid: number | null;
  mid2: number | null;
  maxPoint: number | null;
  minOrder: number | null;
  weight: number | null;
  quantityInBox: string | null;
  width: number | null;
  height: number | null;
  length: number | null;
}
