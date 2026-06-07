// Curated catalogue of popular current smartphones for PhoneCompare. baseUsd ≈
// typical launch price (USD, unlocked). The seeder synthesises AU/US/UK prices.
export interface PhoneSpec {
  name: string;
  brand: string; // SetInfo.code
  form: string; // DomainKey
  os: string; // CardType
  tier: string; // RarityInfo key
  ram: number; // GB
  year: number;
  model: string;
  baseUsd: number;
}

export const PHONES: PhoneSpec[] = [
  // Apple
  { name: "iPhone 16 Pro Max", brand: "APPLE", form: "Max", os: "iOS", tier: "Ultra", ram: 8, year: 2024, model: "16ProMax", baseUsd: 1199 },
  { name: "iPhone 16 Pro", brand: "APPLE", form: "Standard", os: "iOS", tier: "Flagship", ram: 8, year: 2024, model: "16Pro", baseUsd: 999 },
  { name: "iPhone 16", brand: "APPLE", form: "Standard", os: "iOS", tier: "Flagship", ram: 8, year: 2024, model: "16", baseUsd: 799 },
  { name: "iPhone 16 Plus", brand: "APPLE", form: "Max", os: "iOS", tier: "Flagship", ram: 8, year: 2024, model: "16Plus", baseUsd: 899 },
  { name: "iPhone 15", brand: "APPLE", form: "Standard", os: "iOS", tier: "Flagship", ram: 6, year: 2023, model: "15", baseUsd: 699 },
  { name: "iPhone SE (3rd gen)", brand: "APPLE", form: "Compact", os: "iOS", tier: "Budget", ram: 4, year: 2022, model: "SE3", baseUsd: 429 },

  // Samsung
  { name: "Samsung Galaxy S24 Ultra", brand: "SAMSUNG", form: "Max", os: "Android", tier: "Ultra", ram: 12, year: 2024, model: "S24Ultra", baseUsd: 1299 },
  { name: "Samsung Galaxy S24+", brand: "SAMSUNG", form: "Max", os: "Android", tier: "Flagship", ram: 12, year: 2024, model: "S24Plus", baseUsd: 999 },
  { name: "Samsung Galaxy S24", brand: "SAMSUNG", form: "Standard", os: "Android", tier: "Flagship", ram: 8, year: 2024, model: "S24", baseUsd: 799 },
  { name: "Samsung Galaxy Z Fold6", brand: "SAMSUNG", form: "Foldable", os: "Android", tier: "Ultra", ram: 12, year: 2024, model: "ZFold6", baseUsd: 1899 },
  { name: "Samsung Galaxy Z Flip6", brand: "SAMSUNG", form: "Flip", os: "Android", tier: "Flagship", ram: 12, year: 2024, model: "ZFlip6", baseUsd: 1099 },
  { name: "Samsung Galaxy A55", brand: "SAMSUNG", form: "Standard", os: "Android", tier: "Mid-range", ram: 8, year: 2024, model: "A55", baseUsd: 449 },
  { name: "Samsung Galaxy A35", brand: "SAMSUNG", form: "Standard", os: "Android", tier: "Budget", ram: 6, year: 2024, model: "A35", baseUsd: 399 },

  // Google
  { name: "Google Pixel 9 Pro XL", brand: "GOOGLE", form: "Max", os: "Android", tier: "Ultra", ram: 16, year: 2024, model: "9ProXL", baseUsd: 1099 },
  { name: "Google Pixel 9 Pro", brand: "GOOGLE", form: "Standard", os: "Android", tier: "Flagship", ram: 16, year: 2024, model: "9Pro", baseUsd: 999 },
  { name: "Google Pixel 9", brand: "GOOGLE", form: "Standard", os: "Android", tier: "Flagship", ram: 12, year: 2024, model: "9", baseUsd: 799 },
  { name: "Google Pixel 8a", brand: "GOOGLE", form: "Standard", os: "Android", tier: "Mid-range", ram: 8, year: 2024, model: "8a", baseUsd: 499 },
  { name: "Google Pixel 9 Pro Fold", brand: "GOOGLE", form: "Foldable", os: "Android", tier: "Ultra", ram: 16, year: 2024, model: "9ProFold", baseUsd: 1799 },

  // Motorola
  { name: "Motorola Edge 50 Pro", brand: "MOTOROLA", form: "Standard", os: "Android", tier: "Mid-range", ram: 12, year: 2024, model: "Edge50Pro", baseUsd: 599 },
  { name: "Motorola Razr 50 Ultra", brand: "MOTOROLA", form: "Flip", os: "Android", tier: "Flagship", ram: 12, year: 2024, model: "Razr50Ultra", baseUsd: 999 },
  { name: "Motorola Moto G84", brand: "MOTOROLA", form: "Standard", os: "Android", tier: "Budget", ram: 8, year: 2023, model: "MotoG84", baseUsd: 279 },

  // OnePlus
  { name: "OnePlus 12", brand: "ONEPLUS", form: "Standard", os: "Android", tier: "Flagship", ram: 16, year: 2024, model: "12", baseUsd: 799 },
  { name: "OnePlus 12R", brand: "ONEPLUS", form: "Standard", os: "Android", tier: "Mid-range", ram: 8, year: 2024, model: "12R", baseUsd: 499 },
  { name: "OnePlus Nord 4", brand: "ONEPLUS", form: "Standard", os: "Android", tier: "Mid-range", ram: 8, year: 2024, model: "Nord4", baseUsd: 449 },

  // Xiaomi
  { name: "Xiaomi 14 Ultra", brand: "XIAOMI", form: "Max", os: "Android", tier: "Ultra", ram: 16, year: 2024, model: "14Ultra", baseUsd: 1299 },
  { name: "Xiaomi 14", brand: "XIAOMI", form: "Standard", os: "Android", tier: "Flagship", ram: 12, year: 2024, model: "14", baseUsd: 899 },
  { name: "Xiaomi Redmi Note 13 Pro", brand: "XIAOMI", form: "Standard", os: "Android", tier: "Budget", ram: 8, year: 2024, model: "RedmiNote13Pro", baseUsd: 349 },

  // OPPO
  { name: "OPPO Find X7 Ultra", brand: "OPPO", form: "Max", os: "Android", tier: "Ultra", ram: 16, year: 2024, model: "FindX7Ultra", baseUsd: 1099 },
  { name: "OPPO Reno12 Pro", brand: "OPPO", form: "Standard", os: "Android", tier: "Mid-range", ram: 12, year: 2024, model: "Reno12Pro", baseUsd: 599 },

  // Nothing
  { name: "Nothing Phone (2)", brand: "NOTHING", form: "Standard", os: "Android", tier: "Flagship", ram: 12, year: 2023, model: "Phone2", baseUsd: 599 },
  { name: "Nothing Phone (2a)", brand: "NOTHING", form: "Standard", os: "Android", tier: "Mid-range", ram: 8, year: 2024, model: "Phone2a", baseUsd: 349 },

  // Sony
  { name: "Sony Xperia 1 VI", brand: "SONY", form: "Standard", os: "Android", tier: "Ultra", ram: 12, year: 2024, model: "Xperia1VI", baseUsd: 1399 },
  { name: "Sony Xperia 10 VI", brand: "SONY", form: "Compact", os: "Android", tier: "Mid-range", ram: 8, year: 2024, model: "Xperia10VI", baseUsd: 449 },
];
