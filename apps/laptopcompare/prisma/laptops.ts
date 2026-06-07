// Curated catalogue of popular current laptops for LaptopCompare. baseUsd ≈
// typical launch price (USD). The seeder synthesises AU/US/UK prices.
export interface LaptopSpec {
  name: string;
  brand: string; // SetInfo.code
  size: string; // DomainKey
  os: string; // CardType
  tier: string; // RarityInfo key
  ram: number; // GB
  year: number;
  model: string;
  baseUsd: number;
}

export const LAPTOPS: LaptopSpec[] = [
  // Apple
  { name: "Apple MacBook Air 13 (M3)", brand: "APPLE", size: "13-inch", os: "macOS", tier: "Premium", ram: 8, year: 2024, model: "MBA13-M3", baseUsd: 1099 },
  { name: "Apple MacBook Air 15 (M3)", brand: "APPLE", size: "15-inch", os: "macOS", tier: "Premium", ram: 8, year: 2024, model: "MBA15-M3", baseUsd: 1299 },
  { name: "Apple MacBook Pro 14 (M4 Pro)", brand: "APPLE", size: "14-inch", os: "macOS", tier: "Workstation", ram: 24, year: 2024, model: "MBP14-M4Pro", baseUsd: 1999 },
  { name: "Apple MacBook Pro 16 (M4 Max)", brand: "APPLE", size: "16-inch", os: "macOS", tier: "Workstation", ram: 36, year: 2024, model: "MBP16-M4Max", baseUsd: 3499 },

  // Dell
  { name: "Dell XPS 13", brand: "DELL", size: "13-inch", os: "Windows", tier: "Premium", ram: 16, year: 2024, model: "XPS13", baseUsd: 1299 },
  { name: "Dell XPS 16", brand: "DELL", size: "16-inch", os: "Windows", tier: "Workstation", ram: 16, year: 2024, model: "XPS16", baseUsd: 1899 },
  { name: "Dell Inspiron 15", brand: "DELL", size: "15-inch", os: "Windows", tier: "Budget", ram: 8, year: 2024, model: "Inspiron15", baseUsd: 649 },
  { name: "Dell Alienware m16", brand: "DELL", size: "16-inch", os: "Windows", tier: "Gaming", ram: 16, year: 2024, model: "Alienware-m16", baseUsd: 1999 },

  // HP
  { name: "HP Spectre x360 14", brand: "HP", size: "2-in-1", os: "Windows", tier: "Premium", ram: 16, year: 2024, model: "Spectre-x360-14", baseUsd: 1449 },
  { name: "HP Pavilion 15", brand: "HP", size: "15-inch", os: "Windows", tier: "Budget", ram: 8, year: 2024, model: "Pavilion15", baseUsd: 699 },
  { name: "HP Omen 16", brand: "HP", size: "16-inch", os: "Windows", tier: "Gaming", ram: 16, year: 2024, model: "Omen16", baseUsd: 1499 },
  { name: "HP EliteBook 840", brand: "HP", size: "14-inch", os: "Windows", tier: "Workstation", ram: 16, year: 2024, model: "EliteBook840", baseUsd: 1599 },

  // Lenovo
  { name: "Lenovo ThinkPad X1 Carbon Gen 12", brand: "LENOVO", size: "14-inch", os: "Windows", tier: "Workstation", ram: 16, year: 2024, model: "X1Carbon-G12", baseUsd: 1739 },
  { name: "Lenovo Yoga 9i", brand: "LENOVO", size: "2-in-1", os: "Windows", tier: "Premium", ram: 16, year: 2024, model: "Yoga9i", baseUsd: 1399 },
  { name: "Lenovo Legion Pro 7i", brand: "LENOVO", size: "16-inch", os: "Windows", tier: "Gaming", ram: 32, year: 2024, model: "LegionPro7i", baseUsd: 2299 },
  { name: "Lenovo IdeaPad Slim 3", brand: "LENOVO", size: "15-inch", os: "Windows", tier: "Budget", ram: 8, year: 2024, model: "IdeaPadSlim3", baseUsd: 549 },

  // Asus
  { name: "Asus Zenbook 14 OLED", brand: "ASUS", size: "14-inch", os: "Windows", tier: "Premium", ram: 16, year: 2024, model: "Zenbook14-OLED", baseUsd: 1099 },
  { name: "Asus ROG Zephyrus G16", brand: "ASUS", size: "16-inch", os: "Windows", tier: "Gaming", ram: 16, year: 2024, model: "ROG-G16", baseUsd: 2199 },
  { name: "Asus Vivobook 15", brand: "ASUS", size: "15-inch", os: "Windows", tier: "Budget", ram: 8, year: 2024, model: "Vivobook15", baseUsd: 599 },
  { name: "Asus ROG Ally (handheld)", brand: "ASUS", size: "13-inch", os: "Windows", tier: "Gaming", ram: 16, year: 2024, model: "ROG-Ally", baseUsd: 699 },

  // Acer
  { name: "Acer Swift Go 14", brand: "ACER", size: "14-inch", os: "Windows", tier: "Mainstream", ram: 16, year: 2024, model: "SwiftGo14", baseUsd: 799 },
  { name: "Acer Predator Helios 16", brand: "ACER", size: "16-inch", os: "Windows", tier: "Gaming", ram: 16, year: 2024, model: "Helios16", baseUsd: 1799 },
  { name: "Acer Aspire 5", brand: "ACER", size: "15-inch", os: "Windows", tier: "Budget", ram: 8, year: 2024, model: "Aspire5", baseUsd: 499 },
  { name: "Acer Chromebook Plus 514", brand: "ACER", size: "14-inch", os: "ChromeOS", tier: "Budget", ram: 8, year: 2024, model: "ChromebookPlus514", baseUsd: 399 },

  // MSI
  { name: "MSI Stealth 16", brand: "MSI", size: "16-inch", os: "Windows", tier: "Gaming", ram: 32, year: 2024, model: "Stealth16", baseUsd: 1999 },
  { name: "MSI Prestige 14", brand: "MSI", size: "14-inch", os: "Windows", tier: "Premium", ram: 16, year: 2024, model: "Prestige14", baseUsd: 1199 },

  // Microsoft
  { name: "Microsoft Surface Laptop 7", brand: "MICROSOFT", size: "13-inch", os: "Windows", tier: "Premium", ram: 16, year: 2024, model: "SurfaceLaptop7", baseUsd: 999 },
  { name: "Microsoft Surface Pro 11", brand: "MICROSOFT", size: "2-in-1", os: "Windows", tier: "Premium", ram: 16, year: 2024, model: "SurfacePro11", baseUsd: 999 },

  // Razer
  { name: "Razer Blade 14", brand: "RAZER", size: "14-inch", os: "Windows", tier: "Gaming", ram: 16, year: 2024, model: "Blade14", baseUsd: 2199 },
  { name: "Razer Blade 16", brand: "RAZER", size: "16-inch", os: "Windows", tier: "Gaming", ram: 32, year: 2024, model: "Blade16", baseUsd: 2999 },

  // Samsung
  { name: "Samsung Galaxy Book4 Pro", brand: "SAMSUNG", size: "14-inch", os: "Windows", tier: "Premium", ram: 16, year: 2024, model: "GalaxyBook4Pro", baseUsd: 1449 },
  { name: "Samsung Galaxy Book4 360", brand: "SAMSUNG", size: "2-in-1", os: "Windows", tier: "Mainstream", ram: 16, year: 2024, model: "GalaxyBook4-360", baseUsd: 899 },
];
