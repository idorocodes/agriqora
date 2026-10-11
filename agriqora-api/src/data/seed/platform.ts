import type { User, FarmRecord, CommunityPost } from "../../types/index.js";

export const seedUsers: User[] = [
  {
    id: "usr-farmer-1",
    name: "Musa Ibrahim",
    role: "farmer",
    phone: "+234 803 234 5678",
    email: "musa.ibrahim@agriqora.ng",
    location: "Green Valley Farms",
    farmOrBusinessName: "Green Valley Agro Farms",
    farmSize: "4 Hectares",
    cropsOrInterests: "White Yam, Maize, Cassava",
    verified: true,
    registeredDate: "2026-08-14",
  },
  {
    id: "usr-farmer-2",
    name: "Aliyu Mohammed",
    role: "farmer",
    phone: "+234 802 918 3341",
    email: "aliyu.m@agriqora.ng",
    location: "Central Farm Hub",
    farmOrBusinessName: "Maje Grain Farmers Cooperative",
    farmSize: "6 Hectares",
    cropsOrInterests: "Dry Yellow Maize, Sorghum",
    verified: true,
    registeredDate: "2026-08-20",
  },
  {
    id: "usr-buyer-1",
    name: "Hauwa Balarabe",
    role: "buyer",
    phone: "+234 805 441 9023",
    email: "h.balarabe@catering.com",
    location: "Regional Commercial Axis",
    farmOrBusinessName: "Fresh Foods & Catering Co.",
    cropsOrInterests: "Yam, Maize, Soybean",
    verified: true,
    registeredDate: "2026-09-02",
  },
  {
    id: "usr-buyer-2",
    name: "Chinedu Agro Ventures",
    role: "buyer",
    phone: "+234 803 772 1904",
    email: "orders@chineduagro.ng",
    location: "Regional Feedmill Depot",
    farmOrBusinessName: "Chinedu Agro Feedmills",
    cropsOrInterests: "Maize, Soybean Grains",
    verified: true,
    registeredDate: "2026-09-15",
  },
  {
    id: "usr-admin-1",
    name: "Regional Agricultural Desk",
    role: "admin",
    phone: "+234 800 000 7711",
    email: "desk@agriqora.ng",
    location: "Central Agro Hub Secretariat",
    farmOrBusinessName: "AgriQora Pilot Administration",
    cropsOrInterests: "Market Oversight & Ledger Node",
    verified: true,
    registeredDate: "2026-07-01",
  },
];

export const seedFarmRecords: FarmRecord[] = [
  {
    id: "rec-1",
    farmerName: "Musa Ibrahim",
    activityType: "Harvesting",
    crop: "White Yam",
    date: "2026-10-02",
    location: "Green Valley Farmlands, Plot 3",
    notes:
      "Harvested 200 large tubers. Sorted for zero rot, treated crowns with wood ash for aeration storage.",
    batchId: "AGQ-YAM-2026-881",
    hash: "0x8fa3c029e18b42fd97dae181e11a3d0b284c0174be829ad567ef882a921d70a1",
  },
  {
    id: "rec-2",
    farmerName: "Musa Ibrahim",
    activityType: "Storage Inspection",
    crop: "White Yam",
    date: "2026-10-04",
    location: "Central Farm Yam Barn",
    notes:
      "Air-flow checked across bamboo racks. Moisture and ventilation normal. Batch ready for marketplace requests.",
    batchId: "AGQ-YAM-2026-881",
    hash: "0x43b2a9f1165bc083726a8d7912bc0f188374a5891e49120892019ab921c83fa1",
  },
  {
    id: "rec-3",
    farmerName: "Aliyu Mohammed",
    activityType: "Harvesting",
    crop: "Yellow Maize",
    date: "2026-09-28",
    location: "Maje Basin Field B",
    notes:
      "Harvested 86 bags of yellow maize. Sun-dried on clean tarpaulins for 4 consecutive days to achieve 12.5% safe moisture.",
    batchId: "AGQ-MAZ-2026-442",
    hash: "0x7cb51a92e4fd88a10b91dc384915a1a0f924bce81109a2ec7039fa41c098df24",
  },
];

export const seedCommunityPosts: CommunityPost[] = [
  {
    id: "comm-1",
    title: "Regional Central Market Bulk Aggregation Day: Every Thursday",
    category: "Market Day",
    author: "Produce Hub Desk",
    date: "October 5, 2026",
    location: "Central Aggregation Depot, Field Road",
    content:
      "Farmers bringing over 50 tubers of yam or 20 bags of grain can aggregate with registered wholesale buyers. Quality verification staff and moisture testing will be on-site.",
    actionText: "View Aggregation Center Details",
  },
  {
    id: "comm-2",
    title:
      "Free Workshop: Post-Harvest Aflatoxin Screening & Storage Standards",
    category: "Training",
    author: "Agricultural Extension Division",
    date: "October 12, 2026",
    location: "Central Community Hall",
    content:
      "Learn how to calibrate moisture meters, inspect hermetic storage bags, and earn higher price premiums from wholesale grain buyers.",
    actionText: "Register for Workshop",
  },
  {
    id: "comm-3",
    title:
      "Soil Nutrient Preparation for Dry Season Irrigation Along River Basin",
    category: "Advisory",
    author: "River Basin Irrigation Authority",
    date: "October 7, 2026",
    location: "River Basin Farming Corridor",
    content:
      "Dry season irrigation farmers along the river banks are advised to incorporate decomposed organic compost ahead of seedbed preparation to conserve water retention.",
    actionText: "Read Advisory Guide",
  },
];
