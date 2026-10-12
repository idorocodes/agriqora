// These types mirror the responses of the agriqora-api backend exactly.

export type ProduceCategory =
  | 'Yam'
  | 'Maize'
  | 'Soybean'
  | 'Cassava'
  | 'Vegetables'
  | 'Fruits'
  | 'Other';

export const CATEGORIES: ProduceCategory[] = [
  'Yam',
  'Maize',
  'Soybean',
  'Cassava',
  'Vegetables',
  'Fruits',
  'Other',
];

/** Categories shown as filter chips on the marketplace (as in the design). */
export const MARKET_CATEGORIES: ProduceCategory[] = CATEGORIES.filter((c) => c !== 'Other');

export type ProduceStatus = 'Ready now' | 'Harvesting soon' | 'Sold out';
export const PRODUCE_STATUSES: ProduceStatus[] = ['Ready now', 'Harvesting soon', 'Sold out'];

export type RequestStatus =
  | 'Pending'
  | 'Available'
  | 'Partially available'
  | 'Not available'
  | 'Completed';

export type UserRole = 'farmer' | 'buyer' | 'admin';
export type NotificationRole = 'Farmer' | 'Buyer' | 'Admin' | 'All';

export interface ProduceItem {
  id: string;
  title: string;
  category: ProduceCategory;
  quantity: number;
  unit: string;
  quantityLabel: string;
  price: number;
  priceUnit: string;
  priceDisplay: string;
  location: string;
  state: string;
  status: ProduceStatus;
  verified: boolean;
  image: string;
  farmerName: string;
  farmerPhone: string;
  farmName: string;
  farmSize?: string;
  harvestDate: string;
  availabilityDate?: string;
  batchId: string;
  blockHash: string;
  blockNumber: number;
  blockchainNetwork: string;
  farmingMethod: string;
  description: string;
  createdAt: string;
  chainAnchor?: {
    batchRef?: string;
    commitment?: string | null;
    authorityWallet?: string;
    revision?: number;
    status: string;
    txSignature?: string | null;
    anchorAddress?: string | null;
    cluster: string;
    verified?: boolean;
  };
}

export interface BuyerRequest {
  id: string;
  produceId: string;
  produceTitle: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail?: string;
  quantityRequested: number;
  unit: string;
  offerPrice?: number;
  location: string;
  notes: string;
  status: RequestStatus;
  farmerResponseNotes?: string;
  createdAt: string;
}

export interface TraceStep {
  stage: string;
  location: string;
  date: string;
  actor: string;
  details: string;
  verifiedOnLedger: boolean;
}

export interface CorrectionEntry {
  batchId: string;
  originalHash: string;
  correctionHash: string;
  correctionBlock: number;
  reason: string;
  correctedBy: string;
  updatedFields?: Record<string, unknown>;
  timestamp: string;
}

export interface TraceRecord {
  batchId: string;
  produceId: string;
  produceTitle: string;
  farmerName: string;
  farmLocation: string;
  harvestDate: string;
  blockHash: string;
  blockNumber: number;
  timestamp: string;
  tamperVerified: boolean;
  blockchain?: {
    status: string;
    verified: boolean;
    cluster: string;
    txSignature?: string | null;
    anchorAddress?: string | null;
    commitment?: string;
    programId?: string | null;
  };
  steps: TraceStep[];
  corrections: CorrectionEntry[];
}

export interface EducationModule {
  id: string;
  crop: string;
  title: string;
  category: string;
  readTime: string;
  summary: string;
  content: string;
  language: string;
}

export interface AppNotification {
  id: string;
  userRole: NotificationRole;
  recipientId?: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  /** Computed by the server on every read, e.g. "3 hours ago". */
  timestamp: string;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  phone: string;
  email: string;
  location: string;
  farmOrBusinessName: string;
  farmSize?: string;
  cropsOrInterests: string;
  verified: boolean;
  registeredDate: string;
}

export interface FarmRecord {
  id: string;
  farmerName: string;
  activityType: string;
  crop: string;
  date: string;
  location: string;
  notes: string;
  batchId?: string;
  hash: string;
}

export interface CommunityPost {
  id: string;
  title: string;
  category: string;
  author: string;
  date: string;
  location: string;
  content: string;
  actionText: string;
}

export interface AdminStats {
  totalFarmers: number;
  totalBuyers: number;
  totalListings: number;
  activeListings: number;
  totalRequests: number;
  blockchainRecordsCount: number;
  verifiedFarmersPercent: number;
  topCrops: { crop: string; listings: number; volume: string }[];
  recentBlocks: { blockNumber: number; batchId: string; crop: string; hash: string; time: string }[];
}
