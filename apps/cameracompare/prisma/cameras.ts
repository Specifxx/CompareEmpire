// Curated catalogue of popular current cameras for CameraCompare's framework
// preview. baseUsd ≈ typical street price (USD). The seeder synthesises AU/US/UK
// retailer prices around this. Swap this list for a live feed later.
export interface CameraSpec {
  name: string;
  brand: string; // SetInfo.code
  category: string; // CardType
  sensor: string; // DomainKey
  tier: string; // RarityInfo key
  mp: number; // megapixels
  year: number;
  model: string; // model code
  baseUsd: number;
}

export const CAMERAS: CameraSpec[] = [
  // Sony
  { name: "Sony α1", brand: "SONY", category: "Mirrorless", sensor: "Full Frame", tier: "Flagship", mp: 50, year: 2021, model: "ILCE-1", baseUsd: 6500 },
  { name: "Sony α7 IV", brand: "SONY", category: "Mirrorless", sensor: "Full Frame", tier: "Professional", mp: 33, year: 2021, model: "ILCE-7M4", baseUsd: 2500 },
  { name: "Sony α7R V", brand: "SONY", category: "Mirrorless", sensor: "Full Frame", tier: "Professional", mp: 61, year: 2022, model: "ILCE-7RM5", baseUsd: 3900 },
  { name: "Sony α7C II", brand: "SONY", category: "Mirrorless", sensor: "Full Frame", tier: "Enthusiast", mp: 33, year: 2023, model: "ILCE-7CM2", baseUsd: 2200 },
  { name: "Sony α6700", brand: "SONY", category: "Mirrorless", sensor: "APS-C", tier: "Enthusiast", mp: 26, year: 2023, model: "ILCE-6700", baseUsd: 1400 },
  { name: "Sony ZV-E10 II", brand: "SONY", category: "Mirrorless", sensor: "APS-C", tier: "Entry", mp: 26, year: 2024, model: "ZV-E10M2", baseUsd: 1000 },
  { name: "Sony FX30", brand: "SONY", category: "Cinema", sensor: "APS-C", tier: "Professional", mp: 26, year: 2022, model: "ILME-FX30", baseUsd: 1800 },
  { name: "Sony RX100 VII", brand: "SONY", category: "Compact", sensor: "1-inch", tier: "Enthusiast", mp: 20, year: 2019, model: "DSC-RX100M7", baseUsd: 1300 },

  // Canon
  { name: "Canon EOS R5 Mark II", brand: "CANON", category: "Mirrorless", sensor: "Full Frame", tier: "Flagship", mp: 45, year: 2024, model: "EOS-R5M2", baseUsd: 4300 },
  { name: "Canon EOS R5", brand: "CANON", category: "Mirrorless", sensor: "Full Frame", tier: "Professional", mp: 45, year: 2020, model: "EOS-R5", baseUsd: 3300 },
  { name: "Canon EOS R6 Mark II", brand: "CANON", category: "Mirrorless", sensor: "Full Frame", tier: "Professional", mp: 24, year: 2022, model: "EOS-R6M2", baseUsd: 2500 },
  { name: "Canon EOS R8", brand: "CANON", category: "Mirrorless", sensor: "Full Frame", tier: "Enthusiast", mp: 24, year: 2023, model: "EOS-R8", baseUsd: 1500 },
  { name: "Canon EOS R7", brand: "CANON", category: "Mirrorless", sensor: "APS-C", tier: "Enthusiast", mp: 33, year: 2022, model: "EOS-R7", baseUsd: 1500 },
  { name: "Canon EOS R50", brand: "CANON", category: "Mirrorless", sensor: "APS-C", tier: "Entry", mp: 24, year: 2023, model: "EOS-R50", baseUsd: 680 },
  { name: "Canon EOS R100", brand: "CANON", category: "Mirrorless", sensor: "APS-C", tier: "Entry", mp: 24, year: 2023, model: "EOS-R100", baseUsd: 480 },
  { name: "Canon EOS R3", brand: "CANON", category: "Mirrorless", sensor: "Full Frame", tier: "Flagship", mp: 24, year: 2021, model: "EOS-R3", baseUsd: 6000 },

  // Nikon
  { name: "Nikon Z9", brand: "NIKON", category: "Mirrorless", sensor: "Full Frame", tier: "Flagship", mp: 46, year: 2021, model: "Z9", baseUsd: 5500 },
  { name: "Nikon Z8", brand: "NIKON", category: "Mirrorless", sensor: "Full Frame", tier: "Flagship", mp: 46, year: 2023, model: "Z8", baseUsd: 4000 },
  { name: "Nikon Z6 III", brand: "NIKON", category: "Mirrorless", sensor: "Full Frame", tier: "Professional", mp: 25, year: 2024, model: "Z6III", baseUsd: 2500 },
  { name: "Nikon Z f", brand: "NIKON", category: "Mirrorless", sensor: "Full Frame", tier: "Enthusiast", mp: 25, year: 2023, model: "Zf", baseUsd: 2000 },
  { name: "Nikon Z fc", brand: "NIKON", category: "Mirrorless", sensor: "APS-C", tier: "Entry", mp: 21, year: 2021, model: "Zfc", baseUsd: 960 },
  { name: "Nikon Z50 II", brand: "NIKON", category: "Mirrorless", sensor: "APS-C", tier: "Entry", mp: 21, year: 2024, model: "Z50II", baseUsd: 910 },

  // Fujifilm
  { name: "Fujifilm X-T5", brand: "FUJI", category: "Mirrorless", sensor: "APS-C", tier: "Professional", mp: 40, year: 2022, model: "X-T5", baseUsd: 1700 },
  { name: "Fujifilm X-T50", brand: "FUJI", category: "Mirrorless", sensor: "APS-C", tier: "Enthusiast", mp: 40, year: 2024, model: "X-T50", baseUsd: 1400 },
  { name: "Fujifilm X100VI", brand: "FUJI", category: "Compact", sensor: "APS-C", tier: "Enthusiast", mp: 40, year: 2024, model: "X100VI", baseUsd: 1600 },
  { name: "Fujifilm X-S20", brand: "FUJI", category: "Mirrorless", sensor: "APS-C", tier: "Enthusiast", mp: 26, year: 2023, model: "X-S20", baseUsd: 1300 },
  { name: "Fujifilm X-H2S", brand: "FUJI", category: "Mirrorless", sensor: "APS-C", tier: "Professional", mp: 26, year: 2022, model: "X-H2S", baseUsd: 2500 },
  { name: "Fujifilm GFX 100 II", brand: "FUJI", category: "Mirrorless", sensor: "Medium Format", tier: "Flagship", mp: 102, year: 2023, model: "GFX100II", baseUsd: 7500 },

  // Panasonic
  { name: "Panasonic Lumix S5 II", brand: "PANA", category: "Mirrorless", sensor: "Full Frame", tier: "Professional", mp: 24, year: 2023, model: "DC-S5M2", baseUsd: 2000 },
  { name: "Panasonic Lumix S9", brand: "PANA", category: "Mirrorless", sensor: "Full Frame", tier: "Enthusiast", mp: 24, year: 2024, model: "DC-S9", baseUsd: 1500 },
  { name: "Panasonic Lumix GH7", brand: "PANA", category: "Mirrorless", sensor: "Micro 4/3", tier: "Professional", mp: 25, year: 2024, model: "DC-GH7", baseUsd: 2200 },
  { name: "Panasonic Lumix G9 II", brand: "PANA", category: "Mirrorless", sensor: "Micro 4/3", tier: "Professional", mp: 25, year: 2023, model: "DC-G9M2", baseUsd: 1900 },

  // OM System
  { name: "OM System OM-1 Mark II", brand: "OM", category: "Mirrorless", sensor: "Micro 4/3", tier: "Professional", mp: 20, year: 2024, model: "OM-1II", baseUsd: 2400 },
  { name: "OM System OM-5", brand: "OM", category: "Mirrorless", sensor: "Micro 4/3", tier: "Enthusiast", mp: 20, year: 2022, model: "OM-5", baseUsd: 1200 },

  // Leica
  { name: "Leica Q3", brand: "LEICA", category: "Compact", sensor: "Full Frame", tier: "Flagship", mp: 60, year: 2023, model: "Q3", baseUsd: 6000 },
  { name: "Leica M11", brand: "LEICA", category: "Mirrorless", sensor: "Full Frame", tier: "Flagship", mp: 60, year: 2022, model: "M11", baseUsd: 9000 },
  { name: "Leica SL3", brand: "LEICA", category: "Mirrorless", sensor: "Full Frame", tier: "Flagship", mp: 60, year: 2024, model: "SL3", baseUsd: 6900 },

  // Hasselblad
  { name: "Hasselblad X2D 100C", brand: "HASS", category: "Mirrorless", sensor: "Medium Format", tier: "Flagship", mp: 100, year: 2022, model: "X2D-100C", baseUsd: 8200 },

  // GoPro
  { name: "GoPro HERO13 Black", brand: "GOPRO", category: "Action", sensor: "Action", tier: "Enthusiast", mp: 27, year: 2024, model: "HERO13", baseUsd: 400 },
  { name: "GoPro HERO12 Black", brand: "GOPRO", category: "Action", sensor: "Action", tier: "Entry", mp: 27, year: 2023, model: "HERO12", baseUsd: 350 },

  // DJI
  { name: "DJI Osmo Pocket 3", brand: "DJI", category: "Compact", sensor: "1-inch", tier: "Enthusiast", mp: 20, year: 2023, model: "OsmoPocket3", baseUsd: 520 },
  { name: "DJI Osmo Action 5 Pro", brand: "DJI", category: "Action", sensor: "Action", tier: "Enthusiast", mp: 40, year: 2024, model: "OsmoAction5Pro", baseUsd: 350 },

  // Sigma
  { name: "Sigma fp L", brand: "SIGMA", category: "Mirrorless", sensor: "Full Frame", tier: "Professional", mp: 61, year: 2021, model: "fp-L", baseUsd: 2500 },
  { name: "Sigma BF", brand: "SIGMA", category: "Mirrorless", sensor: "Full Frame", tier: "Enthusiast", mp: 24, year: 2025, model: "BF", baseUsd: 2000 },

  // Ricoh
  { name: "Ricoh GR III", brand: "RICOH", category: "Compact", sensor: "APS-C", tier: "Enthusiast", mp: 24, year: 2019, model: "GR-III", baseUsd: 1000 },
  { name: "Ricoh GR IIIx", brand: "RICOH", category: "Compact", sensor: "APS-C", tier: "Enthusiast", mp: 24, year: 2021, model: "GR-IIIx", baseUsd: 1100 },
];
