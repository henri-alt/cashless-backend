import { Company } from "../tableTypes";

export type CreateCompanyRequest = Omit<
  Company,
  "companyId" | "companyStatus" | "createdAt"
>;

export type PatchCompanyRequest = Omit<Company, "companyId" | "createdAt">;
