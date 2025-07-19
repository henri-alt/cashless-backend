export interface ExplanationType {
  "QUERY PLAN": string;
}

export type ExplanationResult = ExplanationType[];

const ROWS_RG = /rows=\d+/g;

export function explain(query: string) {
  return "EXPLAIN ANALYZE " + query;
}

export function count(explanationRes: ExplanationResult): number {
  let rowCount: number | undefined;

  for (let index = explanationRes.length - 1; index > -1; index--) {
    const explanation = explanationRes[index]["QUERY PLAN"];

    const actualTimeIndex = explanation.indexOf("actual time=");
    if (actualTimeIndex === -1) {
      continue;
    }

    const match = explanation.slice(actualTimeIndex).match(ROWS_RG)?.at(0);
    if (!match) continue;

    rowCount = Number(match.replace("rows=", ""));

    break;
  }

  return rowCount || 0;
}
