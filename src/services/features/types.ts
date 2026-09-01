export type FeatureCategory = 'ordering' | 'operations' | 'marketing' | 'ai_analytics' | 'staff';

export interface FeatureDefinition {
  key: string;
  name: string;
  category: FeatureCategory;
  description: string;
  defaultEnabled: boolean;
}

export interface RestaurantFeaturePermission {
  id: string;
  restaurantId: string;
  featureKey: string;
  category: FeatureCategory;
  isEnabled: boolean;
  notes?: string;
  updatedAt: string;
}

export const PLATFORM_FEATURES: FeatureDefinition[] = [
  // Ordering
  { key: 'click_and_collect', name: 'Click & Collect Pre-Orders', category: 'ordering', description: 'Allows customers to order ahead and select pickup time slots', defaultEnabled: true },
  { key: 'table_ordering', name: 'QR Table Ordering', category: 'ordering', description: 'Allows dine-in customers to order and call staff directly from their table QR', defaultEnabled: true },
  { key: 'pay_at_counter', name: 'Pay at Counter Option', category: 'ordering', description: 'Enables customers to pay with Cash or EFTPOS at the counter', defaultEnabled: true },
  { key: 'group_ordering', name: 'Group Ordering & Split Bill', category: 'ordering', description: 'Shareable group ordering links with individual item tracking and split bill calculations', defaultEnabled: true },
  { key: 'curbside_pickup', name: 'Curbside / Car Pickup Workflow', category: 'ordering', description: 'Enables customers to provide vehicle details and bay number for car arrival pickup', defaultEnabled: true },

  // Operations
  { key: 'rush_mode', name: 'Busy / Rush Mode Controls', category: 'operations', description: 'Allows managers to extend prep time or pause incoming orders during peak rushes', defaultEnabled: true },
  { key: 'kds_station_routing', name: 'Kitchen Station Routing', category: 'operations', description: 'Routes orders to Barista, Kitchen, or Bakery stations based on product categories', defaultEnabled: true },
  { key: 'inventory_tracking', name: 'Smart Inventory & Draft POs', category: 'operations', description: 'Tracks ingredient depletion and automatically drafts supplier purchase orders', defaultEnabled: true },
  { key: 'receipt_printers', name: 'Hardware Printers (ESC/POS & Star)', category: 'operations', description: 'Supports direct network receipt and kitchen docket printing', defaultEnabled: true },
  { key: 'digital_checklists', name: 'Opening & Closing Checklists', category: 'operations', description: 'Staff opening and closing operational checklists with digital sign-off', defaultEnabled: true },

  // Marketing
  { key: 'loyalty_rewards', name: 'Digital Stamp Card & Streaks', category: 'marketing', description: 'Customer loyalty points, digital stamp cards, and streak incentives', defaultEnabled: true },
  { key: 'prepaid_passes', name: 'Prepaid Coffee & Meal Passes', category: 'marketing', description: 'Prepaid 5-coffee and 10-coffee roaster pass packages', defaultEnabled: true },
  { key: 'my_usual', name: 'My Usual 1-Tap Reorder', category: 'marketing', description: 'Allows customers to save and reorder their favorite order in one tap', defaultEnabled: true },
  { key: 'review_shield', name: 'Review Shield & Customer Recovery', category: 'marketing', description: 'Intercepts low ratings with instant recovery vouchers and routes 5-star reviews to Google', defaultEnabled: true },
  { key: 'social_copywriter', name: 'AI Social Post Generator', category: 'marketing', description: 'Generates on-brand Instagram, Facebook, and TikTok posts with hashtags', defaultEnabled: true },

  // AI & Analytics
  { key: 'demand_prediction', name: 'AI 24h Demand Forecasting', category: 'ai_analytics', description: 'Calculates volume-weighted hourly order and revenue forecasts', defaultEnabled: true },
  { key: 'health_score', name: 'Restaurant Health Score (0-100)', category: 'ai_analytics', description: 'Composite SLA speed, repeat customer, and financial health index', defaultEnabled: true },
  { key: 'menu_bcg_matrix', name: 'Menu Optimizer (BCG Matrix)', category: 'ai_analytics', description: 'Categorizes menu into Stars, Puzzles, Plowhorses, and Dogs with pricing advice', defaultEnabled: true },
  { key: 'price_optimizer', name: 'Price & Margin Optimizer', category: 'ai_analytics', description: 'High-confidence margin recommendations with mandatory owner sign-off', defaultEnabled: true },
  { key: 'ai_copilot', name: 'Daily Manager Copilot Briefing', category: 'ai_analytics', description: 'Morning briefing with projected order volumes and prioritized daily focus items', defaultEnabled: true },

  // Staff
  { key: 'staff_roster', name: 'AI Staff Scheduler & Shifts', category: 'staff', description: 'Generates volume-optimized shifts across Barista, Counter, and Closer roles', defaultEnabled: true },
  { key: 'training_sops', name: 'Pocket Trainer & SOP Library', category: 'staff', description: 'Interactive training manuals and dial-in guides for new staff', defaultEnabled: true },
];
