export type OrderHRequest = {
  totalPrice?: number;

  deliveryAddress:
    | {
        addressId: number;
      }
    | OrderDeliveryAddressRequest;
};
export interface OrderItemResponse {
  goodId: number;
  goodCode: string;
  goodName: string;
  quantity: number;
  unitPrice: number;

  mainMeasureUnitId: number | null;
  defaultMeasureUnitId: number | null;

  measureUnit: {
    id: number;
    name: string;
    weightOrAmount: number | null;
  } | null;

  discountPrice: number;
  totalPrice: number;
}

export type OrderResponse = {
  orderHId: number;
  docNo: number;
  personId: number;
  totalPrice: number;
  discountPrice: number;
  taxPrice: number;
  payablePrice: number;
  items: OrderItemResponse[];
};

export type OrderDeliveryAddressRequest = {
  cityId: number;
  deliverToName: string;
  deliverToMobileNumber: string;
  deliverToPhoneNumber?: string;
  Adrs: string;
  PostalCode?: string;
  RowDesc?: string;
};
