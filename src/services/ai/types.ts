export interface DemandForecast {
  hour: string;
  projectedOrders: number;
  projectedRevenueDollars: number;
  recommendedStaff: number;
  rushLevel: 'normal' | 'moderate' | 'peak';
}

export interface CustomerCLV {
  customerId: string;
  customerName?: string;
  recencyDays: number;
  frequencyOrders: number;
  monetarySpendDollars: number;
  predicted12MoValueDollars: number;
  vipScore: number; // 0 - 100
  segment: 'Top VIP' | 'Loyal Regular' | 'Promising' | 'At-Risk' | 'Dormant';
}

export interface MenuItemMatrix {
  id: string;
  name: string;
  category: string;
  price: number;
  marginPct: number;
  volume: 'High' | 'Moderate' | 'Low';
  matrixCategory: 'star' | 'plowhorse' | 'puzzle' | 'dog';
  recommendation: string;
}

export interface AIRecommendation {
  id: string;
  restaurantId: string;
  category: 'pricing' | 'menu' | 'inventory' | 'growth' | 'win_back' | 'profit_leak';
  title: string;
  description: string;
  evidence: string;
  potentialMonthlyImpactDollars: number;
  actionType: 'update_price' | 'send_campaign' | 'restock_item' | 'feature_product' | 'review_anomaly' | 'sop_improvement';
  actionPayload: any;
  status: 'pending' | 'approved' | 'rejected' | 'applied';
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface WinBackCampaign {
  id: string;
  restaurantId: string;
  targetSegment: string;
  customerCount: number;
  offerDescription: string;
  suggestedDiscountCode: string;
  discountPercent: number;
  status: 'draft' | 'approved' | 'sent' | 'archived';
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
}

export interface RestaurantHealthScore {
  overallScore: number; // 0 - 100
  grade: string;
  speedScore: number;
  loyaltyScore: number;
  financialScore: number;
  totalOrdersSample: number;
  serviceSpeedAvg: number;
  summary: string;
}

export interface CopilotDailyBriefing {
  restaurantName: string;
  briefingDate: string;
  projectedOrdersToday: number;
  projectedRevenueDollars: number;
  activeKitchenQueue: number;
  scheduledStaffOnRoster: number;
  peakRushWindow: string;
  keyPriorities: string[];
}

export interface AnomalyLogItem {
  id: string;
  restaurantId: string;
  anomalyType: 'unusual_void_rate' | 'multiple_discounts' | 'rapid_loyalty_claims' | 'high_waste_rate' | 'delayed_order_cluster';
  severity: 'info' | 'low' | 'medium' | 'high';
  title: string;
  description: string;
  evidence: any;
  status: 'open' | 'reviewed' | 'resolved' | 'dismissed';
  createdAt: string;
}

export interface RestaurantIncident {
  id: string;
  restaurantId: string;
  incidentType: 'equipment' | 'supplier' | 'health_safety' | 'customer_service' | 'maintenance' | 'weather_event';
  title: string;
  description: string;
  resolutionNotes?: string;
  loggedBy: string;
  status: 'open' | 'in_progress' | 'resolved';
  occurredAt: string;
  resolvedAt?: string;
}
