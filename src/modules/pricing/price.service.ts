import { findProductPrices } from "./price.repository.js";

export async function getProductPrices(product: {
  RowID: number;
  SalePrice: number;
  DiscountPrice: number | null;
  ConsumerPrice: number | null;
}) {
  const prices = await findProductPrices(product.RowID);

  return {
    sale: product.SalePrice,
    discount: product.DiscountPrice,
    consumer: product.ConsumerPrice,

    types: prices.map((price) => ({
      id: price.SalePriceTypeID,
      name: price.SalePriceTypeName,
      sale: price.SalePrice,
      consumer: price.ConsumerPrice
    }))
  };
}