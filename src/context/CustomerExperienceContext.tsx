import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/src/lib/supabase';
import { useRestaurant } from './RestaurantContext';
import { useLoyalty } from './LoyaltyContext';
import { CartItem } from './OrderContext';
import { Product } from '@/src/data/products';

export type VIPTier = 'standard' | 'bronze' | 'silver' | 'gold' | 'platinum';

export interface CustomerUsual {
  id: string;
  name: string;
  items: CartItem[];
  orderType: 'pickup' | 'table';
  notes?: string;
}

export interface UpsellRule {
  id: string;
  restaurantId: string;
  triggerCategory: string;
  suggestedProductId: string;
  discountPercent: number;
  title: string;
}

export interface PrepaidPassTemplate {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  passType: 'coffee' | 'meal' | 'value';
  totalUnits: number;
  priceCents: number;
  bonusUnits: number;
}

export interface CustomerPass {
  id: string;
  restaurantId: string;
  passName: string;
  unitsTotal: number;
  unitsRemaining: number;
  status: 'active' | 'exhausted' | 'expired';
  expiresAt?: string;
}

export interface QueuePositionInfo {
  found: boolean;
  status?: string;
  queuePosition: number;
  ordersAhead: number;
  estimatedPrepMinutes: number;
  isReady: boolean;
}

export interface ReviewShieldResult {
  rating: number;
  status: 'pending' | 'recovered' | 'public_prompted' | 'resolved';
  recoveryCode?: string;
  promptPublicReview: boolean;
}

interface CustomerExperienceContextType {
  // My Usual
  usual: CustomerUsual | null;
  saveUsual: (items: CartItem[], orderType?: 'pickup' | 'table', notes?: string, name?: string) => Promise<void>;
  // Upsells
  upsellRules: UpsellRule[];
  getSuggestedUpsell: (cartItems: CartItem[], allProducts: Product[]) => { product: Product; rule: UpsellRule } | null;
  // Passes
  passTemplates: PrepaidPassTemplate[];
  customerPasses: CustomerPass[];
  buyPass: (template: PrepaidPassTemplate) => Promise<void>;
  // VIP & Streaks
  vipTier: VIPTier;
  lifetimeSpendCents: number;
  currentStreakDays: number;
  longestStreakDays: number;
  streakBonusUnlocked: boolean;
  vipDiscountPercent: number;
  // Review Shield
  submitReviewFeedback: (orderId: string, rating: number, feedbackText: string) => Promise<ReviewShieldResult>;
  // Customer Arrival
  notifyArrival: (orderId: string, note?: string) => Promise<void>;
  // Live Queue
  getLiveQueue: (orderId: string) => Promise<QueuePositionInfo>;
  // Wallet Passes
  getWalletPassPayload: (type: 'apple' | 'google') => any;
  loading: boolean;
  refresh: () => Promise<void>;
}

const CustomerExperienceContext = createContext<CustomerExperienceContextType | undefined>(undefined);

export function CustomerExperienceProvider({ children }: { children: React.ReactNode }) {
  const { currentRestaurant } = useRestaurant();
  const { customerKey } = useLoyalty();

  const [usual, setUsual] = useState<CustomerUsual | null>(null);
  const [upsellRules, setUpsellRules] = useState<UpsellRule[]>([]);
  const [passTemplates, setPassTemplates] = useState<PrepaidPassTemplate[]>([]);
  const [customerPasses, setCustomerPasses] = useState<CustomerPass[]>([]);
  const [vipTier, setVipTier] = useState<VIPTier>('standard');
  const [lifetimeSpendCents, setLifetimeSpendCents] = useState(0);
  const [currentStreakDays, setCurrentStreakDays] = useState(1);
  const [longestStreakDays, setLongestStreakDays] = useState(1);
  const [streakBonusUnlocked, setStreakBonusUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);

  // VIP discount percentage calculation
  const vipDiscountPercent =
    vipTier === 'platinum' ? 15 : vipTier === 'gold' ? 10 : vipTier === 'silver' ? 5 : 0;

  const loadData = useCallback(async () => {
    if (!supabase || !customerKey) {
      setLoading(false);
      return;
    }
    try {
      // 1. Load Usual Order
      const { data: usualData } = await supabase
        .from('customer_usuals')
        .select('*')
        .eq('restaurant_id', currentRestaurant.id)
        .eq('customer_key', customerKey)
        .maybeSingle();

      if (usualData) {
        setUsual({
          id: usualData.id,
          name: usualData.name,
          items: usualData.items,
          orderType: usualData.order_type,
          notes: usualData.notes,
        });
      } else {
        setUsual(null);
      }

      // 2. Load Upsell Rules
      const { data: rules } = await supabase
        .from('smart_upsell_rules')
        .select('*')
        .eq('restaurant_id', currentRestaurant.id)
        .eq('active', true);

      if (rules) {
        setUpsellRules(
          rules.map((r) => ({
            id: r.id,
            restaurantId: r.restaurant_id,
            triggerCategory: r.trigger_category,
            suggestedProductId: r.suggested_product_id,
            discountPercent: r.discount_percent,
            title: r.title,
          })),
        );
      }

      // 3. Load Prepaid Pass Templates & Customer Passes
      const { data: templates } = await supabase
        .from('prepaid_pass_templates')
        .select('*')
        .eq('restaurant_id', currentRestaurant.id)
        .eq('active', true);

      if (templates) {
        setPassTemplates(
          templates.map((t) => ({
            id: t.id,
            restaurantId: t.restaurant_id,
            name: t.name,
            description: t.description,
            passType: t.pass_type,
            totalUnits: t.total_units,
            priceCents: t.price_cents,
            bonusUnits: t.bonus_units,
          })),
        );
      }

      const { data: passes } = await supabase
        .from('customer_prepaid_passes')
        .select('*')
        .eq('restaurant_id', currentRestaurant.id)
        .eq('customer_key', customerKey)
        .eq('status', 'active');

      if (passes) {
        setCustomerPasses(
          passes.map((p) => ({
            id: p.id,
            restaurantId: p.restaurant_id,
            passName: p.pass_name,
            unitsTotal: p.units_total,
            unitsRemaining: p.units_remaining,
            status: p.status,
            expiresAt: p.expires_at,
          })),
        );
      }

      // 4. Load VIP Tier & Streak from customer_loyalty
      const { data: loyaltyData } = await supabase
        .from('customer_loyalty')
        .select('vip_tier, lifetime_spend_cents, current_streak_days, longest_streak_days, streak_bonus_unlocked')
        .eq('restaurant_id', currentRestaurant.id)
        .eq('customer_key', customerKey)
        .maybeSingle();

      if (loyaltyData) {
        setVipTier((loyaltyData.vip_tier as VIPTier) || 'standard');
        setLifetimeSpendCents(loyaltyData.lifetime_spend_cents || 0);
        setCurrentStreakDays(loyaltyData.current_streak_days || 1);
        setLongestStreakDays(loyaltyData.longest_streak_days || 1);
        setStreakBonusUnlocked(loyaltyData.streak_bonus_unlocked || false);
      }
    } catch (e) {
      console.warn('Error loading customer experience data:', e);
    } finally {
      setLoading(false);
    }
  }, [currentRestaurant.id, customerKey]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Save My Usual
  const saveUsual = async (
    items: CartItem[],
    orderType: 'pickup' | 'table' = 'pickup',
    notes?: string,
    name: string = 'My Usual',
  ) => {
    if (!supabase || !customerKey) return;
    await supabase.rpc('save_customer_usual', {
      p_restaurant_id: currentRestaurant.id,
      p_customer_key: customerKey,
      p_name: name,
      p_items: items,
      p_order_type: orderType,
      p_notes: notes || null,
    });
    await loadData();
  };

  // Smart Add-on & Upsell Recommendation Logic
  const getSuggestedUpsell = (
    cartItems: CartItem[],
    allProducts: Product[],
  ): { product: Product; rule: UpsellRule } | null => {
    if (cartItems.length === 0 || upsellRules.length === 0) return null;
    const cartProductIds = new Set(cartItems.map((i) => i.product.id));

    // Find rule where trigger matches item in cart and suggested item is not yet in cart
    for (const item of cartItems) {
      const matchingRule = upsellRules.find(
        (r) =>
          r.triggerCategory.toLowerCase() === item.product.category.toLowerCase() &&
          !cartProductIds.has(r.suggestedProductId),
      );
      if (matchingRule) {
        const product = allProducts.find((p) => p.id === matchingRule.suggestedProductId);
        if (product && !product.soldOut) {
          return { product, rule: matchingRule };
        }
      }
    }
    return null;
  };

  // Buy / Activate Prepaid Pass
  const buyPass = async (template: PrepaidPassTemplate) => {
    if (!supabase || !customerKey) return;
    const totalUnits = template.totalUnits + template.bonusUnits;
    await supabase.from('customer_prepaid_passes').insert({
      restaurant_id: currentRestaurant.id,
      customer_key: customerKey,
      template_id: template.id,
      pass_name: template.name,
      units_total: totalUnits,
      units_remaining: totalUnits,
      status: 'active',
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days validity
    });
    await loadData();
  };

  // Review Shield: Submit Rating & Intercept Feedback
  const submitReviewFeedback = async (
    orderId: string,
    rating: number,
    feedbackText: string,
  ): Promise<ReviewShieldResult> => {
    if (!supabase || !customerKey) {
      return { rating, status: 'pending', promptPublicReview: rating >= 4 };
    }
    const { data, error } = await supabase.rpc('submit_review_shield_feedback', {
      p_restaurant_id: currentRestaurant.id,
      p_order_id: orderId,
      p_customer_key: customerKey,
      p_rating: rating,
      p_feedback: feedbackText,
    });

    if (error || !data) {
      return { rating, status: 'pending', promptPublicReview: rating >= 4 };
    }

    return {
      rating: data.rating,
      status: data.status,
      recoveryCode: data.recovery_code,
      promptPublicReview: data.prompt_public_review,
    };
  };

  // Customer Arrival Alert
  const notifyArrival = async (orderId: string, note?: string) => {
    if (!supabase) return;
    await supabase.rpc('notify_customer_arrival', {
      p_order_id: orderId,
      p_arrival_note: note || 'Arrived outside / at counter',
    });
  };

  // Live Queue Position Calculation
  const getLiveQueue = async (orderId: string): Promise<QueuePositionInfo> => {
    if (!supabase) {
      return { found: true, queuePosition: 1, ordersAhead: 0, estimatedPrepMinutes: 8, isReady: false };
    }
    const { data, error } = await supabase.rpc('get_live_queue_position', {
      p_order_id: orderId,
    });
    if (error || !data) {
      return { found: false, queuePosition: 0, ordersAhead: 0, estimatedPrepMinutes: 0, isReady: false };
    }
    return {
      found: data.found,
      status: data.status,
      queuePosition: data.queue_position || 1,
      ordersAhead: data.orders_ahead || 0,
      estimatedPrepMinutes: data.estimated_prep_minutes || 5,
      isReady: data.is_ready || false,
    };
  };

  // Digital Wallet Pass Data Model (Apple Wallet PKPass & Google Wallet Object)
  const getWalletPassPayload = (type: 'apple' | 'google') => {
    return {
      formatVersion: 1,
      passTypeIdentifier: 'pass.com.cafecollect.loyalty',
      organizationName: currentRestaurant.name,
      description: `${currentRestaurant.name} Loyalty & Coffee Card`,
      teamIdentifier: 'TEAMCAFE01',
      foregroundColor: 'rgb(255, 255, 255)',
      backgroundColor: 'rgb(44, 24, 16)',
      labelColor: 'rgb(212, 163, 115)',
      logoText: currentRestaurant.name,
      barcode: {
        message: customerKey || 'LOY-0000',
        format: 'PKBarcodeFormatQR',
        messageEncoding: 'iso-8859-1',
      },
      generic: {
        primaryFields: [
          {
            key: 'tier',
            label: 'MEMBER STATUS',
            value: vipTier.toUpperCase(),
          },
        ],
        secondaryFields: [
          {
            key: 'streak',
            label: 'CURRENT STREAK',
            value: `${currentStreakDays} Days 🔥`,
          },
        ],
      },
    };
  };

  return (
    <CustomerExperienceContext.Provider
      value={{
        usual,
        saveUsual,
        upsellRules,
        getSuggestedUpsell,
        passTemplates,
        customerPasses,
        buyPass,
        vipTier,
        lifetimeSpendCents,
        currentStreakDays,
        longestStreakDays,
        streakBonusUnlocked,
        vipDiscountPercent,
        submitReviewFeedback,
        notifyArrival,
        getLiveQueue,
        getWalletPassPayload,
        loading,
        refresh: loadData,
      }}
    >
      {children}
    </CustomerExperienceContext.Provider>
  );
}

export function useCustomerExperience() {
  const context = useContext(CustomerExperienceContext);
  if (!context) {
    throw new Error('useCustomerExperience must be used within a CustomerExperienceProvider');
  }
  return context;
}
