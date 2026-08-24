export interface ProductPrice {
  sale: number;
  consumer: number | null;
  discount: number | null;
  old: number | null;
  priceType: {
    id: number | null;
    name: string | null;
  };
}