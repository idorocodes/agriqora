import type { EducationModule } from "../../types/index.js";

export const seedEducation: EducationModule[] = [
  {
    id: "edu-01",
    crop: "Yam",
    title: "Yam Barn Aeration & Post-Harvest Storage",
    category: "Storage & Post-Harvest",
    readTime: "4 min read",
    summary:
      "Prevent tuber rot and extend marketing lifespan by up to 5 months using raised bamboo frames and thatched ventilation.",
    content: `Harvested yams should never be left under direct midday sunlight for more than 2 hours.
Key practices for local farmers:
1. Inspect every tuber: isolate tubers with bruises or open cuts immediately.
2. Build raised bamboo racks at least 30cm off the earth floor to prevent damp soil condensation.
3. Use traditional dry wood ash over severed tips to form a natural antiseptic seal.
4. Maintain air channels between columns of tubers. Check weekly for early sprouting and pinch shoots promptly.`,
    language: "English & local language summary available",
  },
  {
    id: "edu-02",
    crop: "Maize",
    title: "Aflatoxin Control and Safe Moisture Standards",
    category: "Quality & Market Value",
    readTime: "5 min read",
    summary:
      "How to meet commercial grain processor standards (12-13% moisture) and earn premium prices in local markets.",
    content: `Buyers and food processors pay significantly higher rates for maize with proven low moisture.
1. The Salt Bottle Test: Place a small handful of dry kernels in a clean dry bottle with 2 teaspoons of table salt. Shake well. If salt clings to the glass after 10 minutes, moisture is above 14% and needs additional sunning.
2. Never store grain bags directly against concrete walls; always use wooden pallets.
3. Hermetic storage bags (PICS bags) eliminate weevils without applying expensive toxic chemical fumigants.`,
    language: "English & local language summary available",
  },
  {
    id: "edu-03",
    crop: "Cassava",
    title: "TME 419 Stem Handling and Starch Preservation",
    category: "Modern Farming Methods",
    readTime: "4 min read",
    summary:
      "Harvest scheduling to avoid post-harvest physiological deterioration (PPD) before factory delivery.",
    content: `Fresh cassava roots deteriorate quickly after uprooting due to enzyme oxidation.
1. Coordinate harvest dates with buyer aggregation windows within a 48-hour window.
2. Select mature 10-12 month stems for maximum starch density.
3. When transporting, shield the open truck bed with tarpaulin or wet palm fronds to avoid heat dehydration.`,
    language: "English & local language summary available",
  },
  {
    id: "edu-04",
    crop: "Soybean",
    title: "Rhizobium Inoculation & Organic Nitrogen Enrichment",
    category: "Soil Preparation",
    readTime: "3 min read",
    summary:
      "Boost soybean yields by 30% while reducing fertilizer expenditure for smallholder farmers.",
    content: `Soybeans naturally capture atmospheric nitrogen if root nodules are properly colonized.
1. Coat seeds with Rhizobium bio-inoculant in the shade just before planting.
2. Intercrop or rotate after cereal crops (maize, sorghum) to rebuild depleted nitrogen reserves in local fields.
3. Test soil pH: slightly acidic to neutral soils (6.0 - 6.8) optimize nodule formation.`,
    language: "English & local language summary available",
  },
];
