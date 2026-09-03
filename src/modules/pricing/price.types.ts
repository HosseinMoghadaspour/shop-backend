export interface PriceTypePrice {
  id: number;
  name: string;
  salePrice: number | null;
  consumerPrice: number | null;
}

export interface ProductPricing {
  salePrice: number;
  consumerPrice: number | null;
  discountPrice: number | null;
  finalPrice: number;
  hasDiscount: boolean;
  discountPercent: number | null;
  branchId: number | null;
  priceType: PriceTypePrice | null;
}
