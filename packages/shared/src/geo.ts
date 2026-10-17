/**
 * Countries and cities for the dependent selects (country → city → branch).
 * XA, XB, XC are fictional high-risk jurisdictions (the brief keeps the list generic).
 */
export const countries = [
  { code: "DE", cities: ["Berlin", "Hamburg", "Munich", "Frankfurt"] },
  { code: "GB", cities: ["London", "Manchester", "Birmingham"] },
  { code: "TR", cities: ["Istanbul", "Izmir", "Ankara", "Antalya"] },
  { code: "AE", cities: ["Dubai", "Abu Dhabi", "Sharjah"] },
  { code: "NL", cities: ["Amsterdam", "Rotterdam"] },
  { code: "FR", cities: ["Paris", "Lyon"] },
  { code: "CH", cities: ["Zurich", "Geneva"] },
  { code: "US", cities: ["New York", "Chicago"] },
  { code: "XA", cities: ["Capital A"] },
  { code: "XB", cities: ["Capital B"] },
  { code: "XC", cities: ["Capital C"] },
] as const;

export type CountryCode = (typeof countries)[number]["code"];
export const countryCodes = countries.map((c) => c.code) as [CountryCode, ...CountryCode[]];
export const highRiskCountries: readonly string[] = ["XA", "XB", "XC"];

export const citiesOf = (country: string): readonly string[] => countries.find((c) => c.code === country)?.cities ?? [];

/** IBAN check digits (ISO 13616, mod 97). Used in the form and again in the API. */
export const isValidIban = (raw: string) => {
  const iban = raw.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (ch) => String(ch.charCodeAt(0) - 55));
  let remainder = 0;
  for (const digit of numeric) remainder = (remainder * 10 + Number(digit)) % 97;
  return remainder === 1;
};

const mod97 = (digits: string) => [...digits].reduce((r, d) => (r * 10 + Number(d)) % 97, 0);
const lettersToDigits = (s: string) => s.replace(/[A-Z]/g, (ch) => String(ch.charCodeAt(0) - 55));

/** Builds an IBAN with correct check digits from a country code and account part (BBAN). */
export const ibanFrom = (country: string, bban: string) => {
  const check = 98 - mod97(lettersToDigits(`${bban}${country}00`.toUpperCase()));
  return `${country}${String(check).padStart(2, "0")}${bban}`.toUpperCase();
};

export const formatIban = (raw: string) => raw.replace(/\s+/g, "").toUpperCase().replace(/(.{4})/g, "$1 ").trim();
