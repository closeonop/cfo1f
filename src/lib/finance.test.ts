import { describe, expect, it } from "vitest";
import { financeReportPath, reportCellKind } from "./finance";

describe("finance report contracts", () => {
  it("uses the existing cost-by endpoint for every JSON grouping", () => {
    for (const group of ["tier","role","team"] as const) {
      expect(financeReportPath(`cost-by-${group}`)).toBe(`/reports/cost-by?group=${group}`);
      expect(financeReportPath(`cost-by-${group}`,"2026-01-01","2026-02-01",true)).toBe(`/reports/cost-by-${group}/csv`);
    }
  });
  it("keeps CSV history filters identical and excludes hidden filters from other reports", () => {
    const preview=financeReportPath("salary-history","2026-01-01","2026-02-01");
    expect(financeReportPath("salary-history","2026-01-01","2026-02-01",true)).toBe(preview.replace("?","/csv?"));
    expect(financeReportPath("variable-pay","2026-01-01","2026-02-01")).toBe("/reports/variable-pay");
  });
  it("distinguishes percentage rates from money in mixed variable pay rows", () => {
    const columns=["component","calc_type","value","monthly_equivalent"];
    expect(reportCellKind("value",["Commission","PERCENT",5,100],columns)).toBe("percent");
    expect(reportCellKind("value",["Bonus","FIXED",500,500],columns)).toBe("money");
    expect(reportCellKind("monthly_equivalent",["Commission","PERCENT",5,100],columns)).toBe("money");
  });
});
