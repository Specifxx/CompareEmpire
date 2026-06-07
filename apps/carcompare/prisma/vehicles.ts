// Curated catalogue of popular current cars (AU-market focus) for CarCompare's
// framework preview. baseAud ≈ typical drive-away price (AUD). The seeder
// synthesises AU/US/UK prices around this. Swap for a live feed later.
export interface VehicleSpec {
  name: string;
  make: string; // SetInfo.code
  body: string; // DomainKey
  fuel: string; // CardType
  segment: string; // RarityInfo key
  powerKw: number;
  year: number;
  model: string;
  baseAud: number; // drive-away, AUD
}

export const VEHICLES: VehicleSpec[] = [
  // Toyota
  { name: "Toyota RAV4 Hybrid", make: "TOYOTA", body: "SUV", fuel: "Hybrid", segment: "Mainstream", powerKw: 160, year: 2024, model: "RAV4", baseAud: 48000 },
  { name: "Toyota Corolla Hybrid", make: "TOYOTA", body: "Hatchback", fuel: "Hybrid", segment: "Mainstream", powerKw: 103, year: 2024, model: "Corolla", baseAud: 33000 },
  { name: "Toyota Camry", make: "TOYOTA", body: "Sedan", fuel: "Hybrid", segment: "Mainstream", powerKw: 170, year: 2025, model: "Camry", baseAud: 42000 },
  { name: "Toyota LandCruiser 300", make: "TOYOTA", body: "SUV", fuel: "Diesel", segment: "Premium", powerKw: 227, year: 2024, model: "LC300", baseAud: 100000 },
  { name: "Toyota HiLux SR5", make: "TOYOTA", body: "Ute", fuel: "Diesel", segment: "Mainstream", powerKw: 150, year: 2024, model: "HiLux", baseAud: 62000 },
  { name: "Toyota Kluger Hybrid", make: "TOYOTA", body: "SUV", fuel: "Hybrid", segment: "Mainstream", powerKw: 184, year: 2024, model: "Kluger", baseAud: 62000 },
  { name: "Toyota Yaris Cross", make: "TOYOTA", body: "SUV", fuel: "Hybrid", segment: "Budget", powerKw: 85, year: 2024, model: "YarisCross", baseAud: 33000 },
  { name: "Toyota Prado", make: "TOYOTA", body: "SUV", fuel: "Diesel", segment: "Premium", powerKw: 150, year: 2025, model: "Prado", baseAud: 75000 },

  // Mazda
  { name: "Mazda CX-5", make: "MAZDA", body: "SUV", fuel: "Petrol", segment: "Mainstream", powerKw: 140, year: 2024, model: "CX-5", baseAud: 40000 },
  { name: "Mazda CX-60", make: "MAZDA", body: "SUV", fuel: "Petrol", segment: "Premium", powerKw: 209, year: 2024, model: "CX-60", baseAud: 60000 },
  { name: "Mazda3", make: "MAZDA", body: "Hatchback", fuel: "Petrol", segment: "Mainstream", powerKw: 139, year: 2024, model: "Mazda3", baseAud: 32000 },
  { name: "Mazda CX-3", make: "MAZDA", body: "SUV", fuel: "Petrol", segment: "Budget", powerKw: 110, year: 2024, model: "CX-3", baseAud: 28000 },
  { name: "Mazda BT-50", make: "MAZDA", body: "Ute", fuel: "Diesel", segment: "Mainstream", powerKw: 140, year: 2024, model: "BT-50", baseAud: 58000 },
  { name: "Mazda MX-5", make: "MAZDA", body: "Convertible", fuel: "Petrol", segment: "Performance", powerKw: 135, year: 2024, model: "MX-5", baseAud: 43000 },
  { name: "Mazda CX-30", make: "MAZDA", body: "SUV", fuel: "Petrol", segment: "Mainstream", powerKw: 139, year: 2024, model: "CX-30", baseAud: 35000 },

  // Hyundai
  { name: "Hyundai Tucson", make: "HYUNDAI", body: "SUV", fuel: "Petrol", segment: "Mainstream", powerKw: 115, year: 2024, model: "Tucson", baseAud: 42000 },
  { name: "Hyundai i30", make: "HYUNDAI", body: "Hatchback", fuel: "Petrol", segment: "Budget", powerKw: 120, year: 2024, model: "i30", baseAud: 28000 },
  { name: "Hyundai Kona", make: "HYUNDAI", body: "SUV", fuel: "Petrol", segment: "Mainstream", powerKw: 110, year: 2024, model: "Kona", baseAud: 34000 },
  { name: "Hyundai Santa Fe Hybrid", make: "HYUNDAI", body: "SUV", fuel: "Hybrid", segment: "Premium", powerKw: 172, year: 2024, model: "SantaFe", baseAud: 60000 },
  { name: "Hyundai Ioniq 5", make: "HYUNDAI", body: "SUV", fuel: "Electric", segment: "Premium", powerKw: 168, year: 2024, model: "Ioniq5", baseAud: 72000 },

  // Kia
  { name: "Kia Sportage", make: "KIA", body: "SUV", fuel: "Petrol", segment: "Mainstream", powerKw: 115, year: 2024, model: "Sportage", baseAud: 38000 },
  { name: "Kia Seltos", make: "KIA", body: "SUV", fuel: "Petrol", segment: "Mainstream", powerKw: 110, year: 2024, model: "Seltos", baseAud: 32000 },
  { name: "Kia Sorento", make: "KIA", body: "SUV", fuel: "Diesel", segment: "Premium", powerKw: 148, year: 2024, model: "Sorento", baseAud: 60000 },
  { name: "Kia EV6", make: "KIA", body: "SUV", fuel: "Electric", segment: "Performance", powerKw: 168, year: 2024, model: "EV6", baseAud: 75000 },
  { name: "Kia Carnival", make: "KIA", body: "Van", fuel: "Diesel", segment: "Mainstream", powerKw: 148, year: 2024, model: "Carnival", baseAud: 55000 },
  { name: "Kia Picanto", make: "KIA", body: "Hatchback", fuel: "Petrol", segment: "Budget", powerKw: 62, year: 2024, model: "Picanto", baseAud: 20000 },

  // Ford
  { name: "Ford Ranger Wildtrak", make: "FORD", body: "Ute", fuel: "Diesel", segment: "Mainstream", powerKw: 184, year: 2024, model: "Ranger", baseAud: 70000 },
  { name: "Ford Everest", make: "FORD", body: "SUV", fuel: "Diesel", segment: "Mainstream", powerKw: 184, year: 2024, model: "Everest", baseAud: 72000 },
  { name: "Ford Mustang GT", make: "FORD", body: "Coupe", fuel: "Petrol", segment: "Performance", powerKw: 345, year: 2024, model: "Mustang", baseAud: 80000 },
  { name: "Ford Escape", make: "FORD", body: "SUV", fuel: "Petrol", segment: "Mainstream", powerKw: 183, year: 2024, model: "Escape", baseAud: 40000 },
  { name: "Ford Puma", make: "FORD", body: "SUV", fuel: "Petrol", segment: "Budget", powerKw: 92, year: 2024, model: "Puma", baseAud: 33000 },

  // Mitsubishi
  { name: "Mitsubishi Outlander", make: "MITSUBISHI", body: "SUV", fuel: "Petrol", segment: "Mainstream", powerKw: 135, year: 2024, model: "Outlander", baseAud: 42000 },
  { name: "Mitsubishi Triton", make: "MITSUBISHI", body: "Ute", fuel: "Diesel", segment: "Mainstream", powerKw: 150, year: 2024, model: "Triton", baseAud: 52000 },
  { name: "Mitsubishi Outlander PHEV", make: "MITSUBISHI", body: "SUV", fuel: "PHEV", segment: "Premium", powerKw: 185, year: 2024, model: "OutlanderPHEV", baseAud: 60000 },
  { name: "Mitsubishi ASX", make: "MITSUBISHI", body: "SUV", fuel: "Petrol", segment: "Budget", powerKw: 110, year: 2024, model: "ASX", baseAud: 28000 },

  // Subaru
  { name: "Subaru Forester", make: "SUBARU", body: "SUV", fuel: "Petrol", segment: "Mainstream", powerKw: 136, year: 2024, model: "Forester", baseAud: 42000 },
  { name: "Subaru Outback", make: "SUBARU", body: "Wagon", fuel: "Petrol", segment: "Mainstream", powerKw: 138, year: 2024, model: "Outback", baseAud: 47000 },
  { name: "Subaru WRX", make: "SUBARU", body: "Sedan", fuel: "Petrol", segment: "Performance", powerKw: 202, year: 2024, model: "WRX", baseAud: 50000 },
  { name: "Subaru BRZ", make: "SUBARU", body: "Coupe", fuel: "Petrol", segment: "Performance", powerKw: 174, year: 2024, model: "BRZ", baseAud: 43000 },

  // Volkswagen
  { name: "Volkswagen Golf", make: "VW", body: "Hatchback", fuel: "Petrol", segment: "Mainstream", powerKw: 110, year: 2024, model: "Golf", baseAud: 38000 },
  { name: "Volkswagen Tiguan", make: "VW", body: "SUV", fuel: "Petrol", segment: "Premium", powerKw: 132, year: 2024, model: "Tiguan", baseAud: 48000 },
  { name: "Volkswagen Amarok", make: "VW", body: "Ute", fuel: "Diesel", segment: "Mainstream", powerKw: 184, year: 2024, model: "Amarok", baseAud: 65000 },
  { name: "Volkswagen Golf GTI", make: "VW", body: "Hatchback", fuel: "Petrol", segment: "Performance", powerKw: 180, year: 2024, model: "GolfGTI", baseAud: 58000 },

  // Honda
  { name: "Honda CR-V", make: "HONDA", body: "SUV", fuel: "Petrol", segment: "Mainstream", powerKw: 140, year: 2024, model: "CR-V", baseAud: 45000 },
  { name: "Honda Civic", make: "HONDA", body: "Hatchback", fuel: "Hybrid", segment: "Mainstream", powerKw: 135, year: 2024, model: "Civic", baseAud: 48000 },
  { name: "Honda HR-V", make: "HONDA", body: "SUV", fuel: "Hybrid", segment: "Mainstream", powerKw: 96, year: 2024, model: "HR-V", baseAud: 38000 },

  // Nissan
  { name: "Nissan X-Trail", make: "NISSAN", body: "SUV", fuel: "Petrol", segment: "Mainstream", powerKw: 135, year: 2024, model: "X-Trail", baseAud: 42000 },
  { name: "Nissan Qashqai", make: "NISSAN", body: "SUV", fuel: "Petrol", segment: "Mainstream", powerKw: 110, year: 2024, model: "Qashqai", baseAud: 38000 },
  { name: "Nissan Patrol", make: "NISSAN", body: "SUV", fuel: "Petrol", segment: "Premium", powerKw: 298, year: 2024, model: "Patrol", baseAud: 95000 },
  { name: "Nissan Navara", make: "NISSAN", body: "Ute", fuel: "Diesel", segment: "Mainstream", powerKw: 140, year: 2024, model: "Navara", baseAud: 52000 },

  // Tesla
  { name: "Tesla Model 3", make: "TESLA", body: "Sedan", fuel: "Electric", segment: "Premium", powerKw: 208, year: 2024, model: "Model3", baseAud: 62000 },
  { name: "Tesla Model Y", make: "TESLA", body: "SUV", fuel: "Electric", segment: "Premium", powerKw: 220, year: 2024, model: "ModelY", baseAud: 70000 },

  // BMW
  { name: "BMW 3 Series", make: "BMW", body: "Sedan", fuel: "Petrol", segment: "Luxury", powerKw: 135, year: 2024, model: "330i", baseAud: 85000 },
  { name: "BMW X3", make: "BMW", body: "SUV", fuel: "Petrol", segment: "Luxury", powerKw: 180, year: 2024, model: "X3", baseAud: 92000 },
  { name: "BMW X5", make: "BMW", body: "SUV", fuel: "Diesel", segment: "Luxury", powerKw: 250, year: 2024, model: "X5", baseAud: 130000 },
  { name: "BMW M3 Competition", make: "BMW", body: "Sedan", fuel: "Petrol", segment: "Performance", powerKw: 390, year: 2024, model: "M3", baseAud: 175000 },

  // Mercedes-Benz
  { name: "Mercedes-Benz C-Class", make: "MERCEDES", body: "Sedan", fuel: "Petrol", segment: "Luxury", powerKw: 190, year: 2024, model: "C300", baseAud: 92000 },
  { name: "Mercedes-Benz GLC", make: "MERCEDES", body: "SUV", fuel: "Petrol", segment: "Luxury", powerKw: 190, year: 2024, model: "GLC300", baseAud: 100000 },
  { name: "Mercedes-Benz A-Class", make: "MERCEDES", body: "Hatchback", fuel: "Petrol", segment: "Luxury", powerKw: 120, year: 2024, model: "A250", baseAud: 62000 },

  // Audi
  { name: "Audi A3", make: "AUDI", body: "Hatchback", fuel: "Petrol", segment: "Luxury", powerKw: 110, year: 2024, model: "A3", baseAud: 55000 },
  { name: "Audi Q5", make: "AUDI", body: "SUV", fuel: "Petrol", segment: "Luxury", powerKw: 183, year: 2024, model: "Q5", baseAud: 90000 },
  { name: "Audi Q3", make: "AUDI", body: "SUV", fuel: "Petrol", segment: "Luxury", powerKw: 110, year: 2024, model: "Q3", baseAud: 60000 },

  // Lexus
  { name: "Lexus NX 350h", make: "LEXUS", body: "SUV", fuel: "Hybrid", segment: "Luxury", powerKw: 179, year: 2024, model: "NX350h", baseAud: 75000 },
  { name: "Lexus RX 350h", make: "LEXUS", body: "SUV", fuel: "Hybrid", segment: "Luxury", powerKw: 184, year: 2024, model: "RX350h", baseAud: 95000 },
  { name: "Lexus UX 250h", make: "LEXUS", body: "SUV", fuel: "Hybrid", segment: "Luxury", powerKw: 135, year: 2024, model: "UX250h", baseAud: 60000 },

  // MG
  { name: "MG3", make: "MG", body: "Hatchback", fuel: "Petrol", segment: "Budget", powerKw: 81, year: 2024, model: "MG3", baseAud: 22000 },
  { name: "MG ZS", make: "MG", body: "SUV", fuel: "Petrol", segment: "Budget", powerKw: 84, year: 2024, model: "ZS", baseAud: 28000 },
  { name: "MG4", make: "MG", body: "Hatchback", fuel: "Electric", segment: "Budget", powerKw: 150, year: 2024, model: "MG4", baseAud: 40000 },

  // Isuzu
  { name: "Isuzu D-Max", make: "ISUZU", body: "Ute", fuel: "Diesel", segment: "Mainstream", powerKw: 140, year: 2024, model: "D-Max", baseAud: 58000 },
  { name: "Isuzu MU-X", make: "ISUZU", body: "SUV", fuel: "Diesel", segment: "Mainstream", powerKw: 140, year: 2024, model: "MU-X", baseAud: 62000 },

  // GWM
  { name: "GWM Haval H6", make: "GWM", body: "SUV", fuel: "Petrol", segment: "Budget", powerKw: 150, year: 2024, model: "H6", baseAud: 38000 },
  { name: "GWM Cannon", make: "GWM", body: "Ute", fuel: "Diesel", segment: "Budget", powerKw: 120, year: 2024, model: "Cannon", baseAud: 42000 },
];
