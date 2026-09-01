export interface MarketingPost {
  id: string;
  restaurantId: string;
  platform: 'instagram' | 'facebook' | 'tiktok' | 'google_business' | 'email_newsletter';
  title: string;
  caption: string;
  hashtags: string[];
  callToAction?: string;
  status: 'draft' | 'approved' | 'published' | 'archived';
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
}

export interface SupplierPOItem {
  item: string;
  quantity: number;
  unitCostCents: number;
  subtotalCents: number;
}

export interface SupplierPurchaseOrder {
  id: string;
  restaurantId: string;
  supplierName: string;
  poNumber: string;
  items: SupplierPOItem[];
  totalCostDollars: number;
  status: 'draft' | 'approved' | 'sent' | 'delivered' | 'cancelled';
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
}

export interface GroupOrderParticipant {
  name: string;
  items: Array<{ name: string; price: number; quantity: number }>;
  paid: boolean;
}

export interface GroupOrder {
  id: string;
  restaurantId: string;
  groupCode: string;
  hostName: string;
  diningType: 'pickup' | 'table';
  tableName?: string;
  participants: GroupOrderParticipant[];
  status: 'open' | 'locked' | 'ordered' | 'settled';
  createdAt: string;
}

export interface SimulatedVoiceOrder {
  id: string;
  restaurantId: string;
  callerPhone: string;
  customerName?: string;
  transcript: string;
  parsedItems: Array<{ name: string; quantity: number; notes?: string }>;
  requestedPickupTime?: string;
  status: 'pending_review' | 'accepted_to_kds' | 'rejected';
  createdAt: string;
}

export interface CompetitorBenchmark {
  id: string;
  restaurantId: string;
  competitorName: string;
  category: string;
  itemName: string;
  competitorPrice: number;
  ourPrice: number;
  notes?: string;
}

export interface FoodPairingRecommendation {
  baseItem: string;
  pairedItem: string;
  pairingReason: string;
  estimatedAovBoostDollars: number;
}

export interface FranchisePlaybookTopic {
  title: string;
  category: 'barista_standard' | 'brand_voice' | 'hygiene_audit' | 'kds_throughput';
  standards: string[];
}
