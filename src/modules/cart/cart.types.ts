export type CartItem = {
  goodId: number;
  quantity: number;
  addedAt: string;
};

export type RedisCart = {
  personId: number;
  items: CartItem[];
  updatedAt: string;
};

export type CartItemResponse = {
  goodId: number;
  rowCode: string;
  rowName: string;
  imageUrl: string | null;

  quantity: number;

  unitPrice: number;
  totalPrice: number;

  minOrder: number | null;
  maxOrder: number | null;

  isActive: boolean;
  isShowInOnlineShop: boolean;
};

export type CartResponse = {
  personId: number;
  items: CartItemResponse[];

  itemsCount: number;
  totalQuantity: number;
  subtotal: number;
};