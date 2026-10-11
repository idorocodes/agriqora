import type { BuyerRequest, AppNotification } from "../../types/index.js";
import { hoursAgoIso } from "../../utils/time.js";

export const seedRequests: BuyerRequest[] = [
  {
    id: "req-01",
    produceId: "prod-yam-1",
    produceTitle: "Fresh white yam",
    buyerName: "Hauwa Balarabe (Restaurant Supplier)",
    buyerPhone: "+234 805 441 9023",
    quantityRequested: 100,
    unit: "tubers",
    offerPrice: 1150,
    location: "Metropolitan Commercial Depot",
    notes:
      "Require medium to large sized tubers for restaurant supply by Thursday.",
    status: "Available",
    farmerResponseNotes:
      "Agreed on ₦1,200/tuber. Ready for aggregation at Regional Central Hub.",
    createdAt: hoursAgoIso(8),
  },
  {
    id: "req-02",
    produceId: "prod-maize-1",
    produceTitle: "Dry yellow maize",
    buyerName: "Chinedu Agro Ventures",
    buyerPhone: "+234 803 772 1904",
    quantityRequested: 50,
    unit: "bags",
    offerPrice: 47000,
    location: "Regional Grain Market Depot",
    notes: "Looking for 50 bags for immediate poultry feed production.",
    status: "Pending",
    createdAt: hoursAgoIso(3),
  },
];

export const seedNotifications: AppNotification[] = [
  {
    id: "notif-1",
    userRole: "Farmer",
    title: "New Buyer Purchase Request",
    message:
      "Chinedu Agro Ventures submitted a request for 50 bags of Dry yellow maize.",
    createdAt: hoursAgoIso(3),
    read: false,
  },
  {
    id: "notif-2",
    userRole: "Farmer",
    title: "Produce Batch Verified & Listed",
    message:
      "Batch AGQ-YAM-2026-881 has been verified and certified for marketplace listing.",
    createdAt: hoursAgoIso(24),
    read: true,
  },
  {
    id: "notif-3",
    userRole: "Buyer",
    title: "Listing Update in Produce Hub",
    message:
      "Fresh cassava (3.5 tonnes) from River Basin Farmlands is now available.",
    createdAt: hoursAgoIso(12),
    read: false,
  },
];
