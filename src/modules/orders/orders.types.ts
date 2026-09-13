export type OrderHRequest = {
  totalPrice?: number;
  deliveryAddress: OrderDeliveryAddressRequest;
};

export type OrderItemResponse = {
    goodId: number;
    goodCode: string;
    goodName: string;
    quantity: number;
    unitPrice: number;
    discountPrice: number;
    totalPrice: number;
    
};

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
  provinceId: number; 
  deliverToName: string; 
  deliverToMobileNumber: string; 
  deliverToPhoneNumber?: string; 
  City: string; 
  Adrs: string; 
  PostalCode?: string; 
  RowDesc?: string; 
  FDateInset: string; 
  FTimeInsert: string; 
};