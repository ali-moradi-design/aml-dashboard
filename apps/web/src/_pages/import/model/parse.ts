import Papa from "papaparse";
import { importFields, type ImportKind } from "@aml/shared";

export type ParsedFile = { headers: string[]; rows: Array<Record<string, unknown>> };

const MAX_ROWS = 5000;

/** CSV through papaparse, Excel (first sheet) through read-excel-file; row 1 holds the headers. */
export const parseFile = async (file: File): Promise<ParsedFile> => {
  if (/\.xlsx$/i.test(file.name)) {
    const { readSheet } = await import("read-excel-file/browser");
    const [head = [], ...body] = await readSheet(file);
    const headers = head.map((h, i) =>
      h === null || h === undefined || h === "" ? `column ${i + 1}` : String(h).trim(),
    );
    const rows = body
      .filter((r) => r.some((c) => c !== null && c !== ""))
      .map((r) =>
        Object.fromEntries(
          headers.map((h, i) => {
            const v = r[i] as unknown;
            return [h, v instanceof Date ? v.toISOString() : (v ?? "")];
          }),
        ),
      );
    return { headers, rows };
  }
  return new Promise((resolve, reject) =>
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim(),
      complete: (r) => resolve({ headers: r.meta.fields ?? [], rows: r.data }),
      error: reject,
    }),
  );
};

export const tooManyRows = (parsed: ParsedFile) => parsed.rows.length > MAX_ROWS;

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Same-named headers first ("Booked at" → bookedAt), then a header that contains the field name. */
export const autoMap = (kind: ImportKind, headers: string[]): Record<string, string> =>
  Object.fromEntries(
    importFields[kind].map((f) => {
      const key = normalize(f.key);
      const exact = headers.find((h) => normalize(h) === key);
      const loose = headers.find(
        (h) =>
          normalize(h).includes(key) || (normalize(h).length > 3 && key.includes(normalize(h))),
      );
      return [f.key, exact ?? loose ?? ""];
    }),
  );

const examples: Record<ImportKind, Array<Record<string, string>>> = {
  customers: [
    {
      name: "Example Trading GmbH",
      type: "COMPANY",
      country: "DE",
      branchCode: "BER",
      email: "office@example-trading.example",
      phone: "+49 30 1234567",
      riskScore: "20",
    },
    {
      name: "Mara Example",
      type: "PERSON",
      country: "TR",
      branchCode: "IST",
      email: "",
      phone: "",
      riskScore: "",
    },
  ],
  transactions: [
    {
      iban: "DE89370400440532013000",
      bookedAt: "2026-10-01T09:30:00Z",
      amount: "1250.00",
      currency: "EUR",
      direction: "OUT",
      channel: "WIRE",
      counterpartyName: "Example Supplier Ltd",
      counterpartyIban: "",
      counterpartyCountry: "GB",
    },
  ],
};

/** A CSV with the expected headers and example rows. */
export const templateCsv = (kind: ImportKind) =>
  Papa.unparse({
    fields: importFields[kind].map((f) => f.key),
    data: examples[kind].map((r) => importFields[kind].map((f) => r[f.key] ?? "")),
  });
