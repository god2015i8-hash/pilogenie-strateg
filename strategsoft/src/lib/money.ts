import type { CurrencyCode } from "../types/models";

const SYMBOLS: Record<CurrencyCode, string> = {
  RUB: "₽",
  USD: "$",
  EUR: "€",
  KZT: "₸",
  BYN: "Br",
  UAH: "₴",
};

export function formatMoney(amount: number, currency: CurrencyCode): string {
  const formatted = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${formatted} ${SYMBOLS[currency]}`;
}

export function parseAmount(raw: string): number | null {
  const normalized = raw.replace(/\s/g, "").replace(",", ".");
  if (!normalized) return null;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}
