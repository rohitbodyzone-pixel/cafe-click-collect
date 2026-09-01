export type FeatureCategory = 'ordering' | 'operations' | 'marketing' | 'ai_analytics' | 'staff';

export interface FeatureDefinition {
  key: string;
  name: string;
  category: FeatureCategory;
  description: string;
  defaultEnabled: boolean;
  isExternalPending?: boolean;
}

export interface FeatureState {
  superAdmin: boolean;
  owner: boolean;
  effective: boolean;
}

export interface RestaurantFeaturePermission {
  id: string;
  restaurantId: string;
  featureKey: string;
  category: FeatureCategory;
  isEnabled: boolean;
  superAdminEnabled: boolean;
  ownerEnabled: boolean;
  notes?: string;
  updatedAt: string;
}

export const PLATFORM_FEATURES: FeatureDefinition[] = [
  // 1. ORDERING & CUSTOMER EXPERIENCE (10 Features)
  { key: 'click_and_collect', name: 'Click & Collect Pre-Orders', category: 'ordering', description: 'Allows customers to order ahead and select capacity-controlled pickup time slots', defaultEnabled: true },
  { key: 'table_ordering', name: 'QR Table Ordering & Dine-In', category: 'ordering', description: 'Allows dine-in customers to order directly from table QR codes without waiting in line', defaultEnabled: true },
  { key: 'pay_at_counter', name: 'Pay at Counter Option', category: 'ordering', description: 'Enables customers to place pre-orders and pay with Cash or EFTPOS upon arrival', defaultEnabled: true },
  { key: 'group_ordering', name: 'Group Ordering & Split Bill', category: 'ordering', description: 'Shareable group ordering sessions with individual item tracking and split bill calculations', defaultEnabled: true },
  { key: 'curbside_pickup', name: 'Curbside / Car Pickup Workflow', category: 'ordering', description: 'Enables customers to provide vehicle details and bay number for drive-up pickup', defaultEnabled: true },
  { key: 'live_queue_tracking', name: 'Live Queue Position & Countdown', category: 'ordering', description: 'Shows real-time kitchen queue numbers and live order preparation progress countdown', defaultEnabled: true },
  { key: 'smart_pickup_timing', name: 'Smart Pickup Timing & Capacity Limits', category: 'ordering', description: 'Intelligent pickup scheduling with surge protection and slot capacity caps', defaultEnabled: true },
  { key: 'table_service_calls', name: 'Table Service Requests (Water/Bill)', category: 'ordering', description: 'Enables seated dine-in customers to summon waitstaff or request table service', defaultEnabled: true },
  { key: 'multi_channel_concierge', name: 'Multi-Channel Ordering Concierge', category: 'ordering', description: 'Omnichannel order ingestion architecture across Web, Table QR, Bay QR, and Voice', defaultEnabled: true },
  { key: 'voice_phone_assistant', name: 'AI Voice Phone Order Assistant', category: 'ordering', description: 'Simulated AI voice assistant that transcribes phone calls into structured kitchen tickets', defaultEnabled: true },

  // 2. RESTAURANT OPERATIONS & KITCHEN (11 Features)
  { key: 'rush_mode', name: 'Busy / Rush Mode Controls', category: 'operations', description: 'Allows managers to extend prep times (+5m to +20m) or temporarily pause incoming pre-orders', defaultEnabled: true },
  { key: 'kds_station_routing', name: 'Kitchen Station Routing', category: 'operations', description: 'Routes incoming tickets to Barista, Kitchen, Bakery, or Dessert screens', defaultEnabled: true },
  { key: 'inventory_tracking', name: 'Smart Inventory & Depletion Tracking', category: 'operations', description: 'Tracks real-time ingredient consumption and flags low-stock warnings', defaultEnabled: true },
  { key: 'receipt_printers', name: 'Hardware Printers (ESC/POS & Star)', category: 'operations', description: 'Network thermal receipt printer adapter architecture for kitchen dockets and GST receipts', defaultEnabled: true, isExternalPending: true },
  { key: 'digital_checklists', name: 'Opening & Closing Digital Checklists', category: 'operations', description: 'Staff opening and closing operational checklists with digital manager sign-offs', defaultEnabled: true },
  { key: 'pos_integrations', name: 'POS Integration Layer (Square/Toast/Lightspeed)', category: 'operations', description: 'External POS sync adapter architecture and bi-directional catalog syncing layer', defaultEnabled: true, isExternalPending: true },
  { key: 'offline_mode', name: 'Offline Mode Local Queue & Auto-Sync', category: 'operations', description: 'Safe local action queue for uninterrupted offline operation with auto-sync resolution', defaultEnabled: true },
  { key: 'wait_balancer', name: 'Dynamic Wait-Time Balancer', category: 'operations', description: 'Auto-adjusts preparation estimates based on active kitchen load and station bottlenecks', defaultEnabled: true },
  { key: 'universal_qr_posters', name: 'Universal QR Hub & Poster Generator', category: 'operations', description: 'Print-ready high-resolution QR posters for Storefront, Dining Tables, and Pickup Bays', defaultEnabled: true },
  { key: 'menu_versioning', name: 'Menu Snapshot Versioning & Rollback', category: 'operations', description: 'Save menu draft revisions with 1-tap snapshot publishing and rollback history', defaultEnabled: true },
  { key: 'kds_reopen_workflow', name: 'KDS Order Reopening Workflow', category: 'operations', description: 'Allows kitchen staff to quickly recall and reopen accidentally completed orders', defaultEnabled: true },

  // 3. LOYALTY, MARKETING & GROWTH (13 Features)
  { key: 'loyalty_rewards', name: 'Digital Stamp Card & Streaks', category: 'marketing', description: 'Customer loyalty points, digital stamp cards, and consecutive daily streak rewards', defaultEnabled: true },
  { key: 'prepaid_passes', name: 'Prepaid Coffee & Meal Passes', category: 'marketing', description: 'Prepaid 5-coffee and 10-coffee roaster pass packages with 1-tap redemption', defaultEnabled: true },
  { key: 'my_usual', name: 'My Usual 1-Tap Reorder', category: 'marketing', description: 'Allows customers to save their favorite usual order and reorder in one single tap', defaultEnabled: true },
  { key: 'review_shield', name: 'Review Shield & Customer Recovery', category: 'marketing', description: 'Intercepts low ratings privately with recovery vouchers and promotes 5-star Google reviews', defaultEnabled: true },
  { key: 'social_copywriter', name: 'AI Social Post Generator', category: 'marketing', description: 'Generates on-brand Instagram, Facebook, and TikTok promotional posts with hashtags', defaultEnabled: true },
  { key: 'combo_suggestions', name: 'Smart Add-on & Combo Suggestions', category: 'marketing', description: 'Dynamic cart upsell recommendations that increase average order value (AOV)', defaultEnabled: true },
  { key: 'digital_wallet_passes', name: 'Apple & Google Wallet Passes', category: 'marketing', description: 'Digital Apple Wallet and Google Wallet loyalty pass architecture', defaultEnabled: true, isExternalPending: true },
  { key: 'vip_customer_tiers', name: 'VIP Regular Customer Mode & Tiers', category: 'marketing', description: 'Recognizes frequent patrons with VIP tiers (Bronze, Silver, Gold VIP)', defaultEnabled: true },
  { key: 'auto_refill_reminders', name: 'Auto Refill / Usual Order Reminder', category: 'marketing', description: 'Predicts when customers usually grab their daily coffee and sends refill prompts', defaultEnabled: true },
  { key: 'push_notifications', name: 'Push Notification Infrastructure', category: 'marketing', description: 'Push notification engine for order ready alerts and promotional announcements', defaultEnabled: true, isExternalPending: true },
  { key: 'customer_arrival_alert', name: 'Customer Arrival / Curbside Alert', category: 'marketing', description: 'Alerts kitchen staff immediately when customer pulls up for parking bay pickup', defaultEnabled: true },
  { key: 'influencer_hub', name: 'Influencer & UGC Collaboration Hub', category: 'marketing', description: 'Tracks local foodie influencer collaborations and affiliate promo code campaigns', defaultEnabled: true },
  { key: 'weather_campaigns', name: 'Local Events & Weather Smart Campaigns', category: 'marketing', description: 'Smart marketing triggers that suggest iced drinks on sunny days and hot soups on rainy days', defaultEnabled: true },

  // 4. AI, ANALYTICS & OPTIMIZERS (21 Features)
  { key: 'demand_prediction', name: 'AI 24h Demand & Revenue Forecasting', category: 'ai_analytics', description: 'Calculates volume-weighted hourly order and revenue forecasts for prep planning', defaultEnabled: true },
  { key: 'health_score', name: 'Restaurant Health Score (0-100)', category: 'ai_analytics', description: 'Composite SLA speed, repeat customer retention, and financial performance index', defaultEnabled: true },
  { key: 'menu_bcg_matrix', name: 'Menu Optimizer (BCG Growth Matrix)', category: 'ai_analytics', description: 'Categorizes menu items into Stars, Puzzles, Plowhorses, and Dogs with pricing advice', defaultEnabled: true },
  { key: 'price_optimizer', name: 'Price & Margin Optimizer', category: 'ai_analytics', description: 'High-confidence margin recommendations with mandatory owner sign-off gate', defaultEnabled: true },
  { key: 'ai_copilot', name: 'Daily Manager Copilot Briefing', category: 'ai_analytics', description: 'Morning executive briefing with projected order volumes and prioritized daily focus items', defaultEnabled: true },
  { key: 'win_back_ai', name: 'Smart Win-Back AI Campaign Launchpad', category: 'ai_analytics', description: 'Identifies dormant regulars and drafts targeted recovery campaigns for owner approval', defaultEnabled: true },
  { key: 'customer_clv', name: 'Customer Lifetime Value (CLV) & VIP Score', category: 'ai_analytics', description: 'Predicts projected 12-month customer revenue and calculates loyalty VIP score', defaultEnabled: true },
  { key: 'food_waste_monitor', name: 'Food Waste / Loss Prevention Monitor', category: 'ai_analytics', description: 'Monitors operational variance, unpaid order patterns, and batch expiration alerts', defaultEnabled: true },
  { key: 'sound_alerts', name: 'Kitchen Voice / Sound Alert Simulator', category: 'ai_analytics', description: 'Audio chime and voice announcements for incoming tickets and rush surges', defaultEnabled: true },
  { key: 'kds_ai_optimization', name: 'AI Kitchen Display Optimization', category: 'ai_analytics', description: 'Smart ticket re-ordering that batches identical drink extractions together', defaultEnabled: true },
  { key: 'restaurant_memory', name: 'Restaurant Incident & Memory Timeline', category: 'ai_analytics', description: 'Institutional memory log recording equipment maintenance, supply spikes, and shift notes', defaultEnabled: true },
  { key: 'review_responder', name: 'AI Review Responder & Reputation Copilot', category: 'ai_analytics', description: 'Drafts personalized gratitude responses for 5-star reviews and empathetic recovery replies for low ratings', defaultEnabled: true },
  { key: 'pairing_concierge', name: 'AI Barista / Food-Pairing Concierge', category: 'ai_analytics', description: 'Recommends sensory food and coffee pairings to maximize cart satisfaction and AOV', defaultEnabled: true },
  { key: 'delivery_dispatcher', name: 'Smart Delivery Dispatcher & Route Optimizer', category: 'ai_analytics', description: 'Local delivery route optimization and driver dispatch coordination architecture', defaultEnabled: true },
  { key: 'customer_auto_tagger', name: 'Customer Segment Auto-Tagger', category: 'ai_analytics', description: 'Automatically tags customers into Morning Rush Regular, High-AOV Foodie, and Top VIP cohorts', defaultEnabled: true },
  { key: 'dynamic_pricing', name: 'AI Dynamic Pricing Recommendation Engine', category: 'ai_analytics', description: 'Suggests off-peak discounts and rush-hour pricing with strict owner approval guardrails', defaultEnabled: true },
  { key: 'franchise_playbook', name: 'Multi-Location Franchise Playbook', category: 'ai_analytics', description: 'Synchronizes brand standards, recipe specifications, and operational SOPs across locations', defaultEnabled: true },
  { key: 'competitor_price_spy', name: 'Competitor Benchmark & Price Spy Tracker', category: 'ai_analytics', description: 'Monitors neighborhood competitor pricing on flat whites, pastries, and lunch items', defaultEnabled: true },
  { key: 'menu_description_generator', name: 'AI Menu Item Description Generator', category: 'ai_analytics', description: 'Generates sensory culinary descriptions for new menu items in one click', defaultEnabled: true },
  { key: 'kds_sla_timers', name: 'KDS Late SLA Timers & Shift Handover', category: 'ai_analytics', description: 'Color-coded visual urgency alerts for tickets exceeding target preparation SLAs', defaultEnabled: true },
  { key: 'supplier_purchase_orders', name: 'Automated Supplier Purchase Order Generator', category: 'ai_analytics', description: 'Drafts PDF/email purchase orders when stock levels hit replenishment thresholds', defaultEnabled: true },

  // 5. STAFF & OPERATIONS MANAGEMENT (3 Features)
  { key: 'staff_roster', name: 'AI Staff Scheduler & Shifts', category: 'staff', description: 'Generates volume-optimized shifts across Barista, Counter, and Closer roles', defaultEnabled: true },
  { key: 'training_sops', name: 'Pocket Trainer & SOP Library', category: 'staff', description: 'Interactive training manuals and dial-in guides for rapid staff onboarding', defaultEnabled: true },
  { key: 'sales_analytics', name: 'Restaurant Sales & AOV Analytics', category: 'staff', description: 'Visual breakdown of revenue, sales volume, top-selling items, and hourly distribution', defaultEnabled: true },
];
