import { CurrencyType } from "../tableTypes";

export type GetCurrenciesResponse = CurrencyType[];

export type CreateCurrenciesResponse = {
  currencyId: string;
  currency: string;
}[];
