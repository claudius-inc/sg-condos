import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number | null): string {
  if (!price) return "TBA";
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatPSF(psf: number | null): string {
  if (!psf) return "TBA";
  return `$${psf.toLocaleString()} psf`;
}

export function getStatusColor(status: string | null): string {
  switch (status) {
    case "upcoming":
      return "bg-blue-500";
    case "launched":
      return "bg-green-500";
    case "sold_out":
      return "bg-gray-500";
    case "completed":
      return "bg-purple-500";
    default:
      return "bg-gray-400";
  }
}

export function getStatusLabel(status: string | null): string {
  switch (status) {
    case "upcoming":
      return "Upcoming";
    case "launched":
      return "Now Selling";
    case "sold_out":
      return "Sold Out";
    case "completed":
      return "Completed";
    default:
      return "Unknown";
  }
}

export const DISTRICTS: Record<number, string> = {
  1: "D1 - Raffles Place, Marina",
  2: "D2 - Tanjong Pagar, Chinatown",
  3: "D3 - Alexandra, Queenstown",
  4: "D4 - Sentosa, Harbourfront",
  5: "D5 - Buona Vista, Clementi",
  6: "D6 - City Hall, Clarke Quay",
  7: "D7 - Beach Road, Bugis",
  8: "D8 - Farrer Park, Serangoon Rd",
  9: "D9 - Orchard, River Valley",
  10: "D10 - Tanglin, Holland",
  11: "D11 - Newton, Novena",
  12: "D12 - Toa Payoh, Balestier",
  13: "D13 - Macpherson, Potong Pasir",
  14: "D14 - Eunos, Geylang",
  15: "D15 - East Coast, Marine Parade",
  16: "D16 - Bedok, Upper East Coast",
  17: "D17 - Changi, Loyang",
  18: "D18 - Tampines, Pasir Ris",
  19: "D19 - Serangoon, Hougang",
  20: "D20 - Ang Mo Kio, Bishan",
  21: "D21 - Clementi Park, Upper BT",
  22: "D22 - Jurong, Boon Lay",
  23: "D23 - Dairy Farm, Bukit Panjang",
  24: "D24 - Lim Chu Kang, Tengah",
  25: "D25 - Woodlands, Admiralty",
  26: "D26 - Mandai, Upper Thomson",
  27: "D27 - Sembawang, Yishun",
  28: "D28 - Seletar, Yio Chu Kang",
};
