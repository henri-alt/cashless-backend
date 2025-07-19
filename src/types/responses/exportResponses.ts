import {
  BartenderAnalytic,
  BonusAnalytic,
  ItemAnalytic,
  TopUpAnalytic,
  EventOverviewAnalytic,
  ClientAnalytic,
  EventReport,
} from "../tableTypes";

export type GetEventExportResponse = void;

export type GetEventExportAnalyticsResponse = {
  bartenderAnalytics: BartenderAnalytic[];
  bonusAnalytics: BonusAnalytic[];
  clientAnalytics: ClientAnalytic[];
  eventOverview: EventOverviewAnalytic;
  itemsAnalytics: ItemAnalytic[];
  topUpAnalytics: TopUpAnalytic[];
};

interface SingleEventReport extends Omit<EventReport, "fileData"> {
  fileData: {
    type: string;
    data: number[];
  };
}

export type GetEventReportResponse = SingleEventReport;

export type GetAllReportsResponse = Omit<EventReport, "fileData">[];
