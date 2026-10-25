"use client";

import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { reportsSchema, type ReportRange } from "@aml/shared";
import { download, request } from "@/shared/api";

const qs = (r: ReportRange) => new URLSearchParams(r).toString();

export const getReports = (r: ReportRange) => request(`/reports?${qs(r)}`, reportsSchema);
export const exportReports = (r: ReportRange) => download(`/reports/export.xlsx?${qs(r)}`, `aml-report-${r.from}-${r.to}.xlsx`);

export const reportKeys = { all: ["reports"] as const, range: (r: ReportRange) => ["reports", r] as const };

export const useReports = (r: ReportRange) => useQuery({ queryKey: reportKeys.range(r), queryFn: () => getReports(r), placeholderData: keepPreviousData });
export const useExportReports = () => useMutation({ mutationFn: exportReports });
