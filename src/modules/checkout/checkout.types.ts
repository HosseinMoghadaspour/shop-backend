export type CheckoutRequest = {
  branchId?: number;
  financialYearId: number;
  warehouseId: number;

  fixWhDocType1Id: number;
  fixWhDocType2Id: number;

  deliveryTypeId?: number;

  customerAddress?: string;
  rowDesc?: string;
};

export type CheckoutItemResponse = {
  goodId: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type CheckoutResponse = {
  whDocHId: number;
  docNo: number;
  personId: number;

  totalPrice: number;
  discountPrice: number;
  taxPrice: number;
  payablePrice: number;

  items: CheckoutItemResponse[];
};
