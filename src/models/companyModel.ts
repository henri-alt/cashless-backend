import format from "pg-format";
import {
  CreateCompanyRequest,
  PatchCompanyRequest,
} from "../types/requests/companyRequests";

export function getCompaniesModel() {
  //#region GET COMPANIES
  return format("select * from companies");
}

export function createCompanyModel({
  company,
  tenantId,
}: CreateCompanyRequest) {
  //#region CREATE COMPANY
  return format(
    "insert into companies(%I) values(%L)",
    ["company", "tenantId", "companyId"],
    [company, tenantId, crypto.randomUUID()]
  );
}

interface GetCompanyByNameParam {
  company: string;
}

export function getCompanyByName({ company }: GetCompanyByNameParam) {
  //#region GET BY NAME
  return format("select * from companies where %I=%L", "company", company);
}

interface GetCompanyByTenantParam {
  tenantId: string;
}

export function getCompanyByTenant({ tenantId }: GetCompanyByTenantParam) {
  //#region GET BY TENANT
  return format("select * from companies where %I=%L", "tenantId", tenantId);
}

interface PatchCompanyModelParam extends PatchCompanyRequest {
  companyId: string;
}

export function patchCompanyModel({
  company,
  companyStatus,
  tenantId,
  companyId,
}: PatchCompanyModelParam) {
  //#region PATCH COMPANY
  let baseUpdateQuery = format("update companies set ");
  const updates = [];
  const condition = format(" where %I=%L", "companyId", companyId);

  if (company) {
    updates.push(format("%I=%L", "company", company));
  }

  if (companyStatus) {
    updates.push(format("%I=%L", "companyStatus", companyStatus));
  }

  if (tenantId) {
    updates.push(format("%I=%L", "tenantId", tenantId));
  }

  return baseUpdateQuery + updates.join(", ") + condition;
}

interface DeleteCompanyParam {
  companyId: string;
}

export function deleteCompanyModel({ companyId }: DeleteCompanyParam) {
  //#region DELETE COMPANY
  return {
    event: format("DELETE FROM events WHERE %I=%L", "company", companyId),
    items: format("DELETE FROM item_configs WHERE %I=%L", "company", companyId),
    stands: format(
      "DELETE FROM stand_configs WHERE %I=%L",
      "company",
      companyId
    ),
    members: format(
      "DELETE FROM staff_members WHERE %I=%L",
      "company",
      companyId
    ),
    balances: format("DELETE FROM balances WHERE %I=%L", "company", companyId),
    clients: format("DELETE FROM clients WHERE %I=%L", "company", companyId),
    transactions: format(
      "DELETE FROM transactions WHERE %I=%L",
      "company",
      companyId
    ),
    topUps: format("DELETE FROM top_ups WHERE %I=%L", "company", companyId),
    analytics: format(
      "DELETE FROM event_analytics WHERE %I=%L",
      "company",
      companyId
    ),
    currencies: format(
      "DELETE FROM currencies WHERE %I=%L",
      "company",
      companyId
    ),
    tickets: format("DELETE FROM tickets WHERE %I=%L", "company", companyId),
    company: format(
      "DELETE FROM companies WHERE %I=%L",
      "companyId",
      companyId
    ),
    eventExports: format(
      "DELETE FROM event_exports WHERE %I=%L",
      "company",
      companyId
    ),
  };
}
