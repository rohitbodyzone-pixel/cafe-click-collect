import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useRestaurant } from './RestaurantContext';
import {
  MarketingPost,
  SupplierPurchaseOrder,
  GroupOrder,
  SimulatedVoiceOrder,
  CompetitorBenchmark,
  FoodPairingRecommendation,
  FranchisePlaybookTopic,
} from '../services/concierge/types';
import { ConciergeEngine } from '../services/concierge/conciergeEngine';

interface GrowthConciergeContextType {
  posts: MarketingPost[];
  purchaseOrders: SupplierPurchaseOrder[];
  groupOrders: GroupOrder[];
  voiceOrders: SimulatedVoiceOrder[];
  benchmarks: CompetitorBenchmark[];
  foodPairings: FoodPairingRecommendation[];
  franchiseTopics: FranchisePlaybookTopic[];
  createSocialPost: (platform: MarketingPost['platform'], theme: 'morning_coffee' | 'weekend_brunch' | 'bakery_fresh' | 'rainy_day') => Promise<void>;
  approvePost: (id: string, staffName: string) => Promise<void>;
  generateSupplierPO: (supplierName: string) => Promise<void>;
  approveSupplierPO: (poId: string, approverName: string) => Promise<void>;
  simulateIncomingVoiceOrder: (phone: string, customerName: string, transcript: string) => Promise<void>;
  acceptVoiceOrderToKDS: (voiceOrderId: string) => Promise<void>;
  createGroupOrderSession: (hostName: string, diningType: 'pickup' | 'table', tableName?: string) => Promise<GroupOrder | null>;
  loading: boolean;
  refresh: () => Promise<void>;
}

const GrowthConciergeContext = createContext<GrowthConciergeContextType | undefined>(undefined);

export function GrowthConciergeProvider({ children }: { children: React.ReactNode }) {
  const { currentRestaurant } = useRestaurant();

  const [posts, setPosts] = useState<MarketingPost[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<SupplierPurchaseOrder[]>([]);
  const [groupOrders, setGroupOrders] = useState<GroupOrder[]>([]);
  const [voiceOrders, setVoiceOrders] = useState<SimulatedVoiceOrder[]>([]);
  const [benchmarks, setBenchmarks] = useState<CompetitorBenchmark[]>([]);
  const [loading, setLoading] = useState(true);

  const loadConciergeData = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    try {
      // 1. Marketing Posts
      const { data: postData } = await supabase
        .from('marketing_posts')
        .select('*')
        .eq('restaurant_id', currentRestaurant.id)
        .order('created_at', { ascending: false });

      if (postData) {
        setPosts(
          postData.map((p) => ({
            id: p.id,
            restaurantId: p.restaurant_id,
            platform: p.platform,
            title: p.title,
            caption: p.caption,
            hashtags: p.hashtags || [],
            callToAction: p.call_to_action,
            status: p.status,
            approvedBy: p.approved_by,
            approvedAt: p.approved_at,
            createdAt: p.created_at,
          })),
        );
      }

      // 2. Purchase Orders
      const { data: poData } = await supabase
        .from('supplier_purchase_orders')
        .select('*')
        .eq('restaurant_id', currentRestaurant.id)
        .order('created_at', { ascending: false });

      if (poData) {
        setPurchaseOrders(
          poData.map((po) => ({
            id: po.id,
            restaurantId: po.restaurant_id,
            supplierName: po.supplier_name,
            poNumber: po.po_number,
            items: po.items || [],
            totalCostDollars: Math.round(po.total_cost_cents / 100),
            status: po.status,
            approvedBy: po.approved_by,
            approvedAt: po.approved_at,
            createdAt: po.created_at,
          })),
        );
      }

      // 3. Group Orders
      const { data: grpData } = await supabase
        .from('group_orders')
        .select('*')
        .eq('restaurant_id', currentRestaurant.id)
        .order('created_at', { ascending: false });

      if (grpData) {
        setGroupOrders(
          grpData.map((g) => ({
            id: g.id,
            restaurantId: g.restaurant_id,
            groupCode: g.group_code,
            hostName: g.host_name,
            diningType: g.dining_type,
            tableName: g.table_name,
            participants: g.participants || [],
            status: g.status,
            createdAt: g.created_at,
          })),
        );
      }

      // 4. Voice Phone Orders
      const { data: voiceData } = await supabase
        .from('simulated_voice_orders')
        .select('*')
        .eq('restaurant_id', currentRestaurant.id)
        .order('created_at', { ascending: false });

      if (voiceData) {
        setVoiceOrders(
          voiceData.map((v) => ({
            id: v.id,
            restaurantId: v.restaurant_id,
            callerPhone: v.caller_phone,
            customerName: v.customer_name,
            transcript: v.transcript,
            parsedItems: v.parsed_items || [],
            requestedPickupTime: v.requested_pickup_time,
            status: v.status,
            createdAt: v.created_at,
          })),
        );
      }

      // 5. Competitor Benchmarks
      const { data: compData } = await supabase
        .from('competitor_benchmarks')
        .select('*')
        .eq('restaurant_id', currentRestaurant.id);

      if (compData) {
        setBenchmarks(
          compData.map((b) => ({
            id: b.id,
            restaurantId: b.restaurant_id,
            competitorName: b.competitor_name,
            category: b.category,
            itemName: b.item_name,
            competitorPrice: b.price_cents / 100,
            ourPrice: b.our_price_cents / 100,
            notes: b.notes,
          })),
        );
      }
    } catch (e) {
      console.warn('Error loading concierge data:', e);
    } finally {
      setLoading(false);
    }
  }, [currentRestaurant.id]);

  useEffect(() => {
    void loadConciergeData();
  }, [loadConciergeData]);

  // Create Social Post
  const createSocialPost = async (
    platform: MarketingPost['platform'],
    theme: 'morning_coffee' | 'weekend_brunch' | 'bakery_fresh' | 'rainy_day',
  ) => {
    if (!supabase) return;
    const generated = ConciergeEngine.generateSocialPost(theme);
    await supabase.from('marketing_posts').insert({
      restaurant_id: currentRestaurant.id,
      platform,
      title: generated.title,
      caption: generated.caption,
      hashtags: generated.hashtags,
      call_to_action: generated.callToAction,
      status: 'draft',
    });
    await loadConciergeData();
  };

  const approvePost = async (id: string, staffName: string) => {
    if (!supabase) return;
    await supabase
      .from('marketing_posts')
      .update({ status: 'approved', approved_by: staffName, approved_at: new Date().toISOString() })
      .eq('id', id);
    await loadConciergeData();
  };

  // Generate Draft Supplier PO
  const generateSupplierPO = async (supplierName: string) => {
    if (!supabase) return;
    await supabase.rpc('generate_supplier_draft_po', {
      p_restaurant_id: currentRestaurant.id,
      p_supplier: supplierName,
    });
    await loadConciergeData();
  };

  // Approve Supplier PO (Human Approval)
  const approveSupplierPO = async (poId: string, approverName: string) => {
    if (!supabase) return;
    await supabase.rpc('approve_supplier_po', {
      p_po_id: poId,
      p_approved_by: approverName,
    });
    await loadConciergeData();
  };

  // Simulate Incoming Voice Order
  const simulateIncomingVoiceOrder = async (phone: string, customerName: string, transcript: string) => {
    if (!supabase) return;
    const parsed = ConciergeEngine.parseVoicePhoneTranscript(transcript);
    await supabase.rpc('submit_voice_phone_order', {
      p_restaurant_id: currentRestaurant.id,
      p_phone: phone,
      p_name: customerName,
      p_transcript: transcript,
      p_items: parsed.items,
      p_pickup_time: parsed.pickupTime,
    });
    await loadConciergeData();
  };

  // Accept Voice Order into Live KDS
  const acceptVoiceOrderToKDS = async (voiceOrderId: string) => {
    if (!supabase) return;
    const targetVoice = voiceOrders.find((v) => v.id === voiceOrderId);
    if (!targetVoice) return;

    // 1. Mark voice order accepted
    await supabase.from('simulated_voice_orders').update({ status: 'accepted_to_kds' }).eq('id', voiceOrderId);

    // 2. Create order in orders table for KDS
    const newOrderId = 'ORD-VOICE-' + Math.floor(100000 + Math.random() * 900000);
    const { data: orderData } = await supabase
      .from('orders')
      .insert({
        id: newOrderId,
        restaurant_id: currentRestaurant.id,
        status: 'Incoming',
        order_type: 'pickup',
        customer_name: targetVoice.customerName || 'Phone Order Customer',
        phone: targetVoice.callerPhone,
        pickup_time: targetVoice.requestedPickupTime || '15 mins',
        payment_method: 'counter',
        payment_status: 'unpaid',
        subtotal_cents: 1550,
        discount_cents: 0,
        total_cents: 1550,
      })
      .select('id')
      .single();

    if (orderData?.id) {
      await supabase.from('order_items').insert([
        { order_id: orderData.id, name: 'Flat White (Large)', quantity: 2, unit_price_cents: 550, total_price_cents: 1100 },
        { order_id: orderData.id, name: 'Warm Blueberry Muffin', quantity: 1, unit_price_cents: 450, total_price_cents: 450 },
      ]);
    }

    await loadConciergeData();
  };

  // Create Group Order
  const createGroupOrderSession = async (
    hostName: string,
    diningType: 'pickup' | 'table',
    tableName?: string,
  ): Promise<GroupOrder | null> => {
    if (!supabase) return null;
    const { data } = await supabase.rpc('create_group_order', {
      p_restaurant_id: currentRestaurant.id,
      p_host: hostName,
      p_dining_type: diningType,
      p_table: tableName || null,
    });

    if (data?.group_code) {
      await loadConciergeData();
      return {
        id: data.group_order_id,
        restaurantId: currentRestaurant.id,
        groupCode: data.group_code,
        hostName,
        diningType,
        tableName,
        participants: [],
        status: 'open',
        createdAt: new Date().toISOString(),
      };
    }
    return null;
  };

  return (
    <GrowthConciergeContext.Provider
      value={{
        posts,
        purchaseOrders,
        groupOrders,
        voiceOrders,
        benchmarks,
        foodPairings: ConciergeEngine.getFoodPairings(),
        franchiseTopics: ConciergeEngine.getFranchiseStandards(),
        createSocialPost,
        approvePost,
        generateSupplierPO,
        approveSupplierPO,
        simulateIncomingVoiceOrder,
        acceptVoiceOrderToKDS,
        createGroupOrderSession,
        loading,
        refresh: loadConciergeData,
      }}
    >
      {children}
    </GrowthConciergeContext.Provider>
  );
}

export function useGrowthConcierge() {
  const context = useContext(GrowthConciergeContext);
  if (!context) {
    throw new Error('useGrowthConcierge must be used within a GrowthConciergeProvider');
  }
  return context;
}
