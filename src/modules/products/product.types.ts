export interface Product {
  RowID: number;
  Branch_ID: number | null;
  GoodCategory_ID: number | null;
  Main_MeasureUnit_ID: number | null;
  Default_MeasureUnit_ID: number | null;

  RowCode: string | null;
  RowName: string | null;
  RowNameEN: string | null;
  RowNameAlias: string | null;

  PurchasePrice: number | null;
  SalePrice: number | null;
  DiscountPrice: number | null;
  ConsumerPrice: number | null;

  IsActive: boolean | null;

  RowDesc: string | null;

  FirstStock: number | null;
  OrderPoint: number | null;

  IsHasSize: boolean | null;
  Warehouse_ID: number | null;

  Producers_ID: number | null;
  BrandID: number | null;

  IsShowInOnlineShop: boolean | null;
  BriefDescription: string | null;
  FullDescription: string | null;

  IsSpecialSale: boolean | null;
  AmazingSale: boolean | null;

  MinOrderSite: number | null;
  MaxOrderSite: number | null;
  MinSiteShow: number | null;

  Width: number | null;
  Height: number | null;
  Length: number | null;
  Weight: number | null;

  ShowInCofferMenu: boolean | null;
  ProfitFromConsumer: number | null;
}