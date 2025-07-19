import { CurrencyType } from "../tableTypes";

export type GetCurrenciesRequest = void;

export type CurrencyBody = Pick<
  CurrencyType,
  "currency" | "rate" | "isDefault" | "quickPrices" | "marketRate"
> & { currencyId?: string };

export type CreateCurrencyRequest = CurrencyBody | CurrencyBody[];

export type PatchCurrencyQuery = {
  currencyId: string;
};
