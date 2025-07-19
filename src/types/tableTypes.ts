export interface PaginationInfo {
  pagination: {
    totalRows: number;
    nextPageParam?: string;
    prevPageParam?: string;
    pageSize: number;
    pages: number;
    page: number;
  };
}

export type EventType = {
  eventId: string;
  eventName: string;
  eventDescription: string;
  startDate: string;
  eventStatus: "active" | "inactive";
  company: string;
  tagPrice: number;
  cardPrice: number;
  ticketPrice: number;
  activationMinimum: number;
  ticketingEventId: string | null;
};

export type StaffMember = {
  memberName: string;
  memberId: string;
  memberEmail: string;
  memberPassword: string;
  profileStatus: string;
  userClass: number;
  company: string;
  eventId?: string;
  superAdmin: boolean;
};

export interface AdminType extends StaffMember {
  userClass: 0;
}

export type StandConfigType = {
  standName: string;
  eventId: string;
  menuItems: string[];
  staffMembers: string[];
  company: string;
};

export type BalanceType = {
  balance: number;
  ticketId?: string;
  scanId: string;
  eventId?: string;
  balanceId: string;
  isFidelityCard: boolean;
  memberId?: string;
  company: string;
  createdAt: string;
  createdBy: string;
  initialAmount: number;
  isBonus: boolean;
  activationCost: number;
  eventCreated: string;
  activationCurrency: string;
  createdById: string;
  eventCurrency: string;
};

export type ItemConfig = {
  itemName: string;
  itemPrice: number;
  staffPrice: number;
  eventId: string;
  itemTax: number;
  staffSold: number;
  clientsSold: number;
  itemCategory: string;
  bonusAvailable: boolean;
};

export type TransactionType = {
  amount: number;
  memberId: string | null;
  itemName: string;
  transactionDate: string;
  quantity: number;
  eventId: string;
  company: string;
  scanId: string;
  memberName: string;
  transactionId: string;
};

export type ClientType = {
  clientName: string;
  clientEmail: string;
  clientId: string;
  balanceId: string;
  company: string;
  createdAt: string;
  amountSpent: number;
};

export type EventAnalytic = {
  eventId: string;
  analyticId: string;
  totalRevenue: number;
  totalTransactions: number;
  totalItemsSold: number;
  staffTransactions: number;
  staffTransactionsTotal: number;
  mostSoldItem: string;
  mostUsedStand: string;
  bestCustomer: string;
  averageExpense: number;
  highestAmountSpent: number;
  company: string;
  itemsTakenFromStaff: number;
  topUps: number;
  topUpsTotalAmount: number;
};

export type TopUp = {
  topUpDate: string;
  topUpAmount: number;
  memberId: string;
  scanId: string;
  eventId: string;
  company: string;
  memberName: string;
  topUpId: string;
  topUpCurrency: string;
};

export type TopUpAnalytic = {
  topUp: string;
  totalCash: number;
  numberOfTopUps: number;
  balancesCreated: number;
  initialAmount: number;
  topUpAmount: number;
  averageTopUp: number;
};

export type ClientAnalytic = {
  name: string;
  email: string;
  clientTotal: number;
  clientItems: number;
  clientType: "New Client" | "Existing Client";
};

interface BaseItemAnalytic {
  [key: string]: number | string;
}

export interface ItemAnalytic extends BaseItemAnalytic {
  bartender: string;
  totalSold: number;
  total: number;
}

export type EventOverviewAnalytic = {
  totalCash: number;
  newClients: number;
  totalBalancesCreated: number;
  leftInBalances: number;
  averageInitialAmount: number;
  averageActivation: number;
  totalTopUps: number;
  totalItemsSold: number;
  transactionsTotal: number;
  clientTotal: number;
  clientItems: number;
  mostSoldItem: string;
  mostActiveBartender: string;
  mostActiveCashier: string;
  bonusItems: number;
  bonusTotal: number;
};

export type BonusAnalytic = {
  staff: string;
  scanId: string;
  bonusItems: number;
  bonusTotal: number;
};

export type BartenderAnalytic = {
  memberName: string;
  itemsSold: number;
  total: number;
  numberOfTransactions: number;
};

export type CurrencyType = {
  company: string;
  eventId: string;
  rate: number;
  isDefault: boolean;
  currencyId: string;
  currency: string;
  quickPrices: number[];
  marketRate: number;
};

export interface EventReport {
  eventId: string;
  lastUpdate: string;
  fileData: Buffer;
  fileName: string;
  company: string;
  exportId: string;
  eventName: string;
  startDate: string;
}

export type TicketType = {
  ticket: string;
  checkTime: string;
  memberId: string;
  eventId: string;
  memberName: string;
  company: string;
};

export interface Company {
  companyId: string;
  company: string;
  companyStatus: "active" | "inactive" | "suspended";
  createdAt: string;
  tenantId: string | null;
}
