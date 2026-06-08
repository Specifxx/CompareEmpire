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

  // ---- Expanded catalogue: more current bodies + high-end / cinema ----------
  // Sony
  { name: "Sony α1 II", brand: "SONY", category: "Mirrorless", sensor: "Full Frame", tier: "Flagship", mp: 50, year: 2024, model: "ILCE-1M2", baseUsd: 6500 },
  { name: "Sony α9 III", brand: "SONY", category: "Mirrorless", sensor: "Full Frame", tier: "Flagship", mp: 25, year: 2023, model: "ILCE-9M3", baseUsd: 6000 },
  { name: "Sony α7S III", brand: "SONY", category: "Mirrorless", sensor: "Full Frame", tier: "Professional", mp: 12, year: 2020, model: "ILCE-7SM3", baseUsd: 3500 },
  { name: "Sony α7R IV", brand: "SONY", category: "Mirrorless", sensor: "Full Frame", tier: "Professional", mp: 61, year: 2019, model: "ILCE-7RM4", baseUsd: 3000 },
  { name: "Sony α7 III", brand: "SONY", category: "Mirrorless", sensor: "Full Frame", tier: "Enthusiast", mp: 24, year: 2018, model: "ILCE-7M3", baseUsd: 2000 },
  { name: "Sony α7CR", brand: "SONY", category: "Mirrorless", sensor: "Full Frame", tier: "Professional", mp: 61, year: 2023, model: "ILCE-7CR", baseUsd: 3000 },
  { name: "Sony α7C", brand: "SONY", category: "Mirrorless", sensor: "Full Frame", tier: "Enthusiast", mp: 24, year: 2020, model: "ILCE-7C", baseUsd: 1800 },
  { name: "Sony α6400", brand: "SONY", category: "Mirrorless", sensor: "APS-C", tier: "Enthusiast", mp: 24, year: 2019, model: "ILCE-6400", baseUsd: 900 },
  { name: "Sony α6100", brand: "SONY", category: "Mirrorless", sensor: "APS-C", tier: "Entry", mp: 24, year: 2019, model: "ILCE-6100", baseUsd: 750 },
  { name: "Sony FX3", brand: "SONY", category: "Cinema", sensor: "Full Frame", tier: "Professional", mp: 12, year: 2021, model: "ILME-FX3", baseUsd: 3900 },
  { name: "Sony FX6", brand: "SONY", category: "Cinema", sensor: "Full Frame", tier: "Flagship", mp: 10, year: 2020, model: "ILME-FX6", baseUsd: 6000 },
  { name: "Sony VENICE 2", brand: "SONY", category: "Cinema", sensor: "Full Frame", tier: "Flagship", mp: 50, year: 2022, model: "MPC-3628", baseUsd: 58000 },
  { name: "Sony ZV-E1", brand: "SONY", category: "Mirrorless", sensor: "Full Frame", tier: "Enthusiast", mp: 12, year: 2023, model: "ZV-E1", baseUsd: 2200 },
  { name: "Sony ZV-1 II", brand: "SONY", category: "Compact", sensor: "1-inch", tier: "Entry", mp: 20, year: 2023, model: "ZV-1M2", baseUsd: 900 },
  { name: "Sony RX10 IV", brand: "SONY", category: "Compact", sensor: "1-inch", tier: "Enthusiast", mp: 20, year: 2017, model: "DSC-RX10M4", baseUsd: 1700 },

  // Canon
  { name: "Canon EOS R1", brand: "CANON", category: "Mirrorless", sensor: "Full Frame", tier: "Flagship", mp: 24, year: 2024, model: "EOS-R1", baseUsd: 6300 },
  { name: "Canon EOS R5 C", brand: "CANON", category: "Cinema", sensor: "Full Frame", tier: "Professional", mp: 45, year: 2022, model: "EOS-R5C", baseUsd: 4500 },
  { name: "Canon EOS C400", brand: "CANON", category: "Cinema", sensor: "Full Frame", tier: "Flagship", mp: 24, year: 2024, model: "EOS-C400", baseUsd: 8000 },
  { name: "Canon EOS C70", brand: "CANON", category: "Cinema", sensor: "APS-C", tier: "Professional", mp: 9, year: 2020, model: "EOS-C70", baseUsd: 5500 },
  { name: "Canon EOS R6", brand: "CANON", category: "Mirrorless", sensor: "Full Frame", tier: "Professional", mp: 20, year: 2020, model: "EOS-R6", baseUsd: 2000 },
  { name: "Canon EOS RP", brand: "CANON", category: "Mirrorless", sensor: "Full Frame", tier: "Entry", mp: 26, year: 2019, model: "EOS-RP", baseUsd: 1000 },
  { name: "Canon EOS R10", brand: "CANON", category: "Mirrorless", sensor: "APS-C", tier: "Enthusiast", mp: 24, year: 2022, model: "EOS-R10", baseUsd: 1100 },
  { name: "Canon PowerShot G7 X Mark III", brand: "CANON", category: "Compact", sensor: "1-inch", tier: "Enthusiast", mp: 20, year: 2019, model: "G7X-III", baseUsd: 750 },
  { name: "Canon PowerShot V1", brand: "CANON", category: "Compact", sensor: "1.4-inch", tier: "Enthusiast", mp: 22, year: 2025, model: "PS-V1", baseUsd: 900 },

  // Nikon
  { name: "Nikon Z7 II", brand: "NIKON", category: "Mirrorless", sensor: "Full Frame", tier: "Professional", mp: 46, year: 2020, model: "Z7II", baseUsd: 3000 },
  { name: "Nikon Z6 II", brand: "NIKON", category: "Mirrorless", sensor: "Full Frame", tier: "Enthusiast", mp: 25, year: 2020, model: "Z6II", baseUsd: 2000 },
  { name: "Nikon Z5 II", brand: "NIKON", category: "Mirrorless", sensor: "Full Frame", tier: "Enthusiast", mp: 24, year: 2025, model: "Z5II", baseUsd: 1700 },
  { name: "Nikon Z5", brand: "NIKON", category: "Mirrorless", sensor: "Full Frame", tier: "Entry", mp: 24, year: 2020, model: "Z5", baseUsd: 1400 },
  { name: "Nikon Z30", brand: "NIKON", category: "Mirrorless", sensor: "APS-C", tier: "Entry", mp: 21, year: 2022, model: "Z30", baseUsd: 710 },
  { name: "Nikon D850", brand: "NIKON", category: "DSLR", sensor: "Full Frame", tier: "Professional", mp: 46, year: 2017, model: "D850", baseUsd: 3000 },
  { name: "Nikon D6", brand: "NIKON", category: "DSLR", sensor: "Full Frame", tier: "Flagship", mp: 21, year: 2020, model: "D6", baseUsd: 6500 },
  { name: "Nikon Coolpix P1000", brand: "NIKON", category: "Compact", sensor: "1/2.3-inch", tier: "Enthusiast", mp: 16, year: 2018, model: "P1000", baseUsd: 1000 },

  // Fujifilm
  { name: "Fujifilm GFX100S II", brand: "FUJI", category: "Mirrorless", sensor: "Medium Format", tier: "Professional", mp: 102, year: 2024, model: "GFX100S-II", baseUsd: 5000 },
  { name: "Fujifilm GFX50S II", brand: "FUJI", category: "Mirrorless", sensor: "Medium Format", tier: "Enthusiast", mp: 51, year: 2021, model: "GFX50S-II", baseUsd: 4000 },
  { name: "Fujifilm X-H2", brand: "FUJI", category: "Mirrorless", sensor: "APS-C", tier: "Professional", mp: 40, year: 2022, model: "X-H2", baseUsd: 2000 },
  { name: "Fujifilm X-E4", brand: "FUJI", category: "Mirrorless", sensor: "APS-C", tier: "Enthusiast", mp: 26, year: 2021, model: "X-E4", baseUsd: 850 },
  { name: "Fujifilm X-T30 II", brand: "FUJI", category: "Mirrorless", sensor: "APS-C", tier: "Entry", mp: 26, year: 2021, model: "X-T30-II", baseUsd: 900 },
  { name: "Fujifilm X-M5", brand: "FUJI", category: "Mirrorless", sensor: "APS-C", tier: "Entry", mp: 26, year: 2024, model: "X-M5", baseUsd: 800 },
  { name: "Fujifilm X100V", brand: "FUJI", category: "Compact", sensor: "APS-C", tier: "Enthusiast", mp: 26, year: 2020, model: "X100V", baseUsd: 1400 },

  // Panasonic
  { name: "Panasonic Lumix S1R II", brand: "PANA", category: "Mirrorless", sensor: "Full Frame", tier: "Professional", mp: 44, year: 2025, model: "DC-S1RM2", baseUsd: 3300 },
  { name: "Panasonic Lumix S1H", brand: "PANA", category: "Cinema", sensor: "Full Frame", tier: "Professional", mp: 24, year: 2019, model: "DC-S1H", baseUsd: 4000 },
  { name: "Panasonic Lumix S5 IIX", brand: "PANA", category: "Mirrorless", sensor: "Full Frame", tier: "Professional", mp: 24, year: 2023, model: "DC-S5M2X", baseUsd: 2200 },
  { name: "Panasonic Lumix GH6", brand: "PANA", category: "Mirrorless", sensor: "Micro 4/3", tier: "Professional", mp: 25, year: 2022, model: "DC-GH6", baseUsd: 1700 },
  { name: "Panasonic Lumix G100", brand: "PANA", category: "Mirrorless", sensor: "Micro 4/3", tier: "Entry", mp: 20, year: 2020, model: "DC-G100", baseUsd: 750 },
  { name: "Panasonic Lumix LX100 II", brand: "PANA", category: "Compact", sensor: "Micro 4/3", tier: "Enthusiast", mp: 17, year: 2018, model: "DC-LX100M2", baseUsd: 1000 },

  // OM System / Olympus
  { name: "OM System OM-3", brand: "OM", category: "Mirrorless", sensor: "Micro 4/3", tier: "Enthusiast", mp: 20, year: 2025, model: "OM-3", baseUsd: 2000 },
  { name: "OM System Tough TG-7", brand: "OM", category: "Compact", sensor: "1/2.3-inch", tier: "Entry", mp: 12, year: 2023, model: "TG-7", baseUsd: 550 },
  { name: "Olympus OM-D E-M10 Mark IV", brand: "OM", category: "Mirrorless", sensor: "Micro 4/3", tier: "Entry", mp: 20, year: 2020, model: "EM10-IV", baseUsd: 800 },

  // Leica (high end)
  { name: "Leica M11-P", brand: "LEICA", category: "Mirrorless", sensor: "Full Frame", tier: "Flagship", mp: 60, year: 2023, model: "M11-P", baseUsd: 9200 },
  { name: "Leica M11 Monochrom", brand: "LEICA", category: "Mirrorless", sensor: "Full Frame", tier: "Flagship", mp: 60, year: 2023, model: "M11-Monochrom", baseUsd: 9500 },
  { name: "Leica M11-D", brand: "LEICA", category: "Mirrorless", sensor: "Full Frame", tier: "Flagship", mp: 60, year: 2024, model: "M11-D", baseUsd: 9200 },
  { name: "Leica Q3 43", brand: "LEICA", category: "Compact", sensor: "Full Frame", tier: "Flagship", mp: 60, year: 2024, model: "Q3-43", baseUsd: 6900 },
  { name: "Leica SL3-S", brand: "LEICA", category: "Mirrorless", sensor: "Full Frame", tier: "Flagship", mp: 24, year: 2024, model: "SL3-S", baseUsd: 5300 },
  { name: "Leica Q2", brand: "LEICA", category: "Compact", sensor: "Full Frame", tier: "Flagship", mp: 47, year: 2019, model: "Q2", baseUsd: 5000 },
  { name: "Leica SL2", brand: "LEICA", category: "Mirrorless", sensor: "Full Frame", tier: "Professional", mp: 47, year: 2019, model: "SL2", baseUsd: 6000 },
  { name: "Leica D-Lux 8", brand: "LEICA", category: "Compact", sensor: "Micro 4/3", tier: "Enthusiast", mp: 17, year: 2024, model: "D-Lux-8", baseUsd: 1600 },

  // Hasselblad (high end)
  { name: "Hasselblad 907X & CFV 100C", brand: "HASS", category: "Mirrorless", sensor: "Medium Format", tier: "Flagship", mp: 100, year: 2024, model: "907X-CFV-100C", baseUsd: 8200 },
  { name: "Hasselblad X1D II 50C", brand: "HASS", category: "Mirrorless", sensor: "Medium Format", tier: "Flagship", mp: 50, year: 2019, model: "X1D-II-50C", baseUsd: 5750 },

  // Phase One (ultra high end)
  { name: "Phase One XF IQ4 150MP", brand: "PHASE", category: "Mirrorless", sensor: "Medium Format", tier: "Flagship", mp: 151, year: 2018, model: "XF-IQ4-150", baseUsd: 52000 },
  { name: "Phase One XT IQ4 150MP", brand: "PHASE", category: "Mirrorless", sensor: "Medium Format", tier: "Flagship", mp: 151, year: 2019, model: "XT-IQ4-150", baseUsd: 57000 },

  // RED (cinema)
  { name: "RED V-Raptor 8K VV", brand: "RED", category: "Cinema", sensor: "Full Frame", tier: "Flagship", mp: 35, year: 2021, model: "V-RAPTOR-8K", baseUsd: 25000 },
  { name: "RED Komodo-X 6K", brand: "RED", category: "Cinema", sensor: "Super 35", tier: "Professional", mp: 19, year: 2023, model: "KOMODO-X", baseUsd: 10000 },
  { name: "RED Komodo 6K", brand: "RED", category: "Cinema", sensor: "Super 35", tier: "Professional", mp: 19, year: 2020, model: "KOMODO-6K", baseUsd: 6000 },

  // Blackmagic (cinema)
  { name: "Blackmagic Pocket Cinema Camera 6K G2", brand: "BMD", category: "Cinema", sensor: "Super 35", tier: "Enthusiast", mp: 26, year: 2021, model: "BMPCC-6K-G2", baseUsd: 2000 },
  { name: "Blackmagic PYXIS 6K", brand: "BMD", category: "Cinema", sensor: "Full Frame", tier: "Professional", mp: 24, year: 2024, model: "PYXIS-6K", baseUsd: 3000 },
  { name: "Blackmagic URSA Cine 12K LF", brand: "BMD", category: "Cinema", sensor: "Large Format", tier: "Flagship", mp: 36, year: 2024, model: "URSA-CINE-12K", baseUsd: 15000 },

  // ARRI (ultra high end cinema)
  { name: "ARRI Alexa 35", brand: "ARRI", category: "Cinema", sensor: "Super 35", tier: "Flagship", mp: 17, year: 2022, model: "ALEXA-35", baseUsd: 75000 },
  { name: "ARRI Alexa Mini LF", brand: "ARRI", category: "Cinema", sensor: "Large Format", tier: "Flagship", mp: 13, year: 2019, model: "ALEXA-MINI-LF", baseUsd: 60000 },

  // Pentax
  { name: "Pentax K-3 Mark III", brand: "PENTAX", category: "DSLR", sensor: "APS-C", tier: "Enthusiast", mp: 26, year: 2021, model: "K-3-III", baseUsd: 2000 },
  { name: "Pentax K-1 Mark II", brand: "PENTAX", category: "DSLR", sensor: "Full Frame", tier: "Professional", mp: 36, year: 2018, model: "K-1-II", baseUsd: 2000 },
  { name: "Pentax 645Z", brand: "PENTAX", category: "DSLR", sensor: "Medium Format", tier: "Flagship", mp: 51, year: 2014, model: "645Z", baseUsd: 5000 },

  // Sigma
  { name: "Sigma fp", brand: "SIGMA", category: "Mirrorless", sensor: "Full Frame", tier: "Enthusiast", mp: 25, year: 2019, model: "fp", baseUsd: 1900 },

  // DJI / GoPro / Insta360 (action + pocket)
  { name: "DJI Osmo Action 4", brand: "DJI", category: "Action", sensor: "Action", tier: "Enthusiast", mp: 10, year: 2023, model: "OsmoAction4", baseUsd: 300 },
  { name: "DJI Osmo Pocket 2", brand: "DJI", category: "Compact", sensor: "1/1.7-inch", tier: "Entry", mp: 64, year: 2020, model: "OsmoPocket2", baseUsd: 350 },
  { name: "GoPro HERO11 Black", brand: "GOPRO", category: "Action", sensor: "Action", tier: "Entry", mp: 27, year: 2022, model: "HERO11", baseUsd: 300 },
  { name: "GoPro MAX", brand: "GOPRO", category: "Action", sensor: "Action", tier: "Enthusiast", mp: 17, year: 2019, model: "MAX", baseUsd: 500 },
  { name: "Insta360 X4", brand: "INSTA360", category: "Action", sensor: "Action", tier: "Enthusiast", mp: 72, year: 2024, model: "X4", baseUsd: 500 },
  { name: "Insta360 Ace Pro 2", brand: "INSTA360", category: "Action", sensor: "Action", tier: "Enthusiast", mp: 50, year: 2024, model: "AcePro2", baseUsd: 450 },
  { name: "Insta360 X3", brand: "INSTA360", category: "Action", sensor: "Action", tier: "Entry", mp: 72, year: 2022, model: "X3", baseUsd: 450 },
];
