import { z } from "zod";

export const personIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const personListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20),

  search: z.string().trim().optional(),

  isActive: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});

export const createPersonSchema = z.object({
  Branch_ID: z.number().int().optional(),
  Fix_PersonType_ID: z.number().int().optional(),
  PersonKind_ID: z.number().int().optional(),
  PersonCategory_ID: z.number().int().optional(),
  Fix_PersonRemainderType_ID: z.number().int().optional(),
  DiscountGroupPerson_ID: z.number().int().optional(),

  RowCode: z.string().max(50).optional(),
  RowName: z.string().max(100).optional(),

  PhoneNumber: z.string().max(200).optional(),
  MobileNumber: z.string().max(200).optional(),
  FaxNumber: z.string().max(200).optional(),

  EconomicCode: z.string().max(200).optional(),
  FatherName: z.string().max(100).optional(),
  NationalCode: z.string().max(200).optional(),
  BornLocation: z.string().max(200).optional(),

  AccountNumber1: z.string().max(50).optional(),
  AccountNumber2: z.string().max(50).optional(),
  AccountNumber3: z.string().max(50).optional(),

  Postalcode: z.string().max(200).optional(),
  RegistrationCode: z.string().max(200).optional(),
  Email: z.string().email().max(200).optional(),

  Adress: z.string().max(500).optional(),

  FDate: z.string().max(10).optional(),
  MDate: z.coerce.date().optional(),

  RemainderTot: z.number().optional(),

  IndebtednessRemanence: z.number().optional(),

  IsActive: z.boolean().optional(),

  RowDesc: z.string().max(500).optional(),

  MobileForSMS: z.string().max(11).optional(),

  Province_ID: z.coerce.bigint().optional(),
  County_ID: z.coerce.bigint().optional(),
  City_ID: z.coerce.bigint().optional(),

  PercentPrice: z.number().optional(),
  MarketerPercent: z.number().optional(),

  AutomaticSettelAfterSale: z.boolean().optional(),
  AutomaticSettelAfterSaleReturn: z.boolean().optional(),

  IsRegisteredOnline: z.boolean().optional(),

  BornDay: z.number().int().optional(),
  BornMonth: z.number().int().optional(),
  BornYear: z.number().int().optional(),

  City: z.string().max(100).optional(),

  Fix_Sex_ID: z.number().int().optional(),
  Company_Type_ID: z.number().int().optional(),

  CreditLimitPrice: z.number().optional(),

  CreditSelling: z.boolean().optional(),

  PercentService: z.number().optional(),

  CardPass: z.string().max(50).optional(),

  EnablePass: z.boolean().optional(),

  AgentPercent: z.number().optional(),

  AddressShop: z.string().optional(),
  NameShop: z.string().max(250).optional(),
  ActiveCategory: z.string().max(50).optional(),

  UserName: z.string().max(250).optional(),

  FBornDate: z.string().max(50).optional(),
  MBornDate: z.coerce.date().optional(),

  ClientVersion: z.coerce.bigint().optional(),

  HyperPerson: z.boolean().optional(),
  EtebarBestan: z.boolean().optional(),

  p1: z.string().max(50).optional(),
  p2: z.string().max(50).optional(),
  p3: z.string().max(50).optional(),
  p4: z.string().max(50).optional(),

  CarType: z.string().max(150).optional(),
  CarTypeID: z.number().int().optional(),

  CarWeight: z.number().optional(),
  CarMinWeight: z.number().optional(),
  CarMaxWeight: z.number().optional(),
});




export const updatePersonSchema = createPersonSchema.partial();

export type CreatePersonInput = z.infer<typeof createPersonSchema>;
export type UpdatePersonInput = z.infer<typeof updatePersonSchema>;