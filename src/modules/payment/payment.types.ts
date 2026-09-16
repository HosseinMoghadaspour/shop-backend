export interface PaymentMethodResponse {
  rowId: number;
  name: string;
  description: string | null;
  onlinePayType: number | null;
}

export interface PaymentMethodDetailResponse {
  rowId: number;
  name: string;
  description: string | null;
  onlinePayType: number | null;
  isOnline: boolean;
}

export interface PaymentStatusResponse {
  rowId: number;
  name: string;
  description: string | null;
}

export interface StartPaymentRequest {
  orderId: string;
}

export interface StartPaymentResponse {
  orderId: string;
  paymentMethodId: number;
  paymentMethodName: string;
  paymentMethodType:
    | "CARD_TO_CARD"
    | "PAY_IN_PLACE"
    | "GATEWAY";

  paymentStatusId: number;
  paymentStatusName: string;

  payableAmount: number;

  redirectUrl?: string;
  message?: string;
}