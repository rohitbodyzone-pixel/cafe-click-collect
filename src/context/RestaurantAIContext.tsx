import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useRestaurant } from './RestaurantContext';
import {
  AIRecommendation,
  WinBackCampaign,
  RestaurantHealthScore,
  CopilotDailyBriefing,
  DemandForecast,
  MenuItemMatrix,
  AnomalyLogItem,
  RestaurantIncident,
  CustomerCLV,
} from '../services/ai/types';
import { AIAnalyticsEngine } from '../services/ai/analyticsEngine';

interface RestaurantAIContextType {
  recommendations: AIRecommendation[];
  winbackCampaigns: WinBackCampaign[];
  healthScore: RestaurantHealthScore;
  copilotBriefing: CopilotDailyBriefing | null;
  demandForecast: DemandForecast[];
  menuMatrix: MenuItemMatrix[];
  anomalies: AnomalyLogItem[];
  incidents: RestaurantIncident[];
  topVipCustomers: CustomerCLV[];
  approveRecommendation: (id: string, staffName: string) => Promise<void>;
  approveWinBackCampaign: (id: string, staffName: string) => Promise<void>;
  resolveAnomaly: (id: string) => Promise<void>;
  logIncident: (type: RestaurantIncident['incidentType'], title: string, description: string, loggedBy: string) => Promise<void>;
  loading: boolean;
  refresh: () => Promise<void>;
}

const RestaurantAIContext = createContext<RestaurantAIContextType | undefined>(undefined);

export function RestaurantAIProvider({ children }: { children: React.ReactNode }) {
  const { currentRestaurant } = useRestaurant();

  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [winbackCampaigns, setWinbackCampaigns] = useState<WinBackCampaign[]>([]);
  const [healthScore, setHealthScore] = useState<RestaurantHealthScore>({
    overallScore: 88,
    grade: 'A (Healthy)',
    speedScore: 90,
    loyaltyScore: 85,
    financialScore: 90,
    totalOrdersSample: 0,
    serviceSpeedAvg: 10,
    summary: 'Strong operational efficiency with healthy repeat customer conversion.',
  });
  const [copilotBriefing, setCopilotBriefing] = useState<CopilotDailyBriefing | null>(null);
  const [demandForecast, setDemandForecast] = useState<DemandForecast[]>([]);
  const [menuMatrix, setMenuMatrix] = useState<MenuItemMatrix[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyLogItem[]>([]);
  const [incidents, setIncidents] = useState<RestaurantIncident[]>([]);
  const [topVipCustomers, setTopVipCustomers] = useState<CustomerCLV[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAIData = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    try {
      // 1. Recommendations
      const { data: recData } = await supabase
        .from('ai_recommendations')
        .select('*')
        .eq('restaurant_id', currentRestaurant.id)
        .order('created_at', { ascending: false });

      if (recData) {
        setRecommendations(
          recData.map((r) => ({
            id: r.id,
            restaurantId: r.restaurant_id,
            category: r.category,
            title: r.title,
            description: r.description,
            evidence: r.evidence,
            potentialMonthlyImpactDollars: Math.round(r.potential_monthly_impact_cents / 100),
            actionType: r.action_type,
            actionPayload: r.action_payload,
            status: r.status,
            reviewedBy: r.reviewed_by,
            reviewedAt: r.reviewed_at,
            createdAt: r.created_at,
          })),
        );
      }

      // 2. Winback Campaigns
      const { data: winData } = await supabase
        .from('ai_winback_campaigns')
        .select('*')
        .eq('restaurant_id', currentRestaurant.id)
        .order('created_at', { ascending: false });

      if (winData) {
        setWinbackCampaigns(
          winData.map((w) => ({
            id: w.id,
            restaurantId: w.restaurant_id,
            targetSegment: w.target_segment,
            customerCount: w.customer_count,
            offerDescription: w.offer_description,
            suggestedDiscountCode: w.suggested_discount_code,
            discountPercent: w.discount_percent,
            status: w.status,
            approvedBy: w.approved_by,
            approvedAt: w.approved_at,
            createdAt: w.created_at,
          })),
        );
      }

      // 3. Health Score RPC
      const { data: healthData } = await supabase.rpc('calculate_restaurant_health_score', {
        p_restaurant_id: currentRestaurant.id,
      });

      if (healthData) {
        setHealthScore({
          overallScore: healthData.overall_score || 88,
          grade: healthData.grade || 'A (Healthy)',
          speedScore: healthData.speed_score || 90,
          loyaltyScore: healthData.loyalty_score || 85,
          financialScore: healthData.financial_score || 90,
          totalOrdersSample: healthData.total_orders_sample || 0,
          serviceSpeedAvg: healthData.service_speed_avg || 10,
          summary: `Overall Performance Grade: ${healthData.grade}. Speed and financial health are in top percentiles.`,
        });
      }

      // 4. Copilot Briefing RPC
      const { data: briefData } = await supabase.rpc('generate_ai_copilot_briefing', {
        p_restaurant_id: currentRestaurant.id,
      });

      if (briefData) {
        setCopilotBriefing({
          restaurantName: briefData.restaurant_name,
          briefingDate: briefData.briefing_date,
          projectedOrdersToday: briefData.projected_orders_today,
          projectedRevenueDollars: Math.round(briefData.projected_revenue_cents / 100),
          activeKitchenQueue: briefData.active_kitchen_queue,
          scheduledStaffOnRoster: briefData.scheduled_staff_on_roster,
          peakRushWindow: briefData.peak_rush_window,
          keyPriorities: briefData.key_priorities || [],
        });
      }

      // 5. Anomalies Log
      const { data: anomData } = await supabase
        .from('ai_anomalies_log')
        .select('*')
        .eq('restaurant_id', currentRestaurant.id)
        .order('created_at', { ascending: false });

      if (anomData) {
        setAnomalies(
          anomData.map((a) => ({
            id: a.id,
            restaurantId: a.restaurant_id,
            anomalyType: a.anomaly_type,
            severity: a.severity,
            title: a.title,
            description: a.description,
            evidence: a.evidence,
            status: a.status,
            createdAt: a.created_at,
          })),
        );
      }

      // 6. Incidents Memory
      const { data: incData } = await supabase
        .from('restaurant_incidents_memory')
        .select('*')
        .eq('restaurant_id', currentRestaurant.id)
        .order('occurred_at', { ascending: false });

      if (incData) {
        setIncidents(
          incData.map((i) => ({
            id: i.id,
            restaurantId: i.restaurant_id,
            incidentType: i.incident_type,
            title: i.title,
            description: i.description,
            resolutionNotes: i.resolution_notes,
            loggedBy: i.logged_by,
            status: i.status,
            occurredAt: i.occurred_at,
            resolvedAt: i.resolved_at,
          })),
        );
      }

      // 7. Local Analytics Engine Forecasts & Matrix
      setDemandForecast(AIAnalyticsEngine.generateHourlyDemandForecast());
      setMenuMatrix(AIAnalyticsEngine.generateMenuMatrix());

      // 8. VIP & CLV Cohort
      const sampleVips = [
        AIAnalyticsEngine.calculateCustomerCLV(2, 28, 154.0, 'Sarah Jenkins (Gold VIP)'),
        AIAnalyticsEngine.calculateCustomerCLV(1, 19, 104.5, 'David Chen (Silver VIP)'),
        AIAnalyticsEngine.calculateCustomerCLV(16, 12, 66.0, 'Marcus Vance (At-Risk Regular)'),
      ];
      setTopVipCustomers(sampleVips);
    } catch (e) {
      console.warn('Error loading AI data:', e);
    } finally {
      setLoading(false);
    }
  }, [currentRestaurant.id]);

  useEffect(() => {
    void loadAIData();
  }, [loadAIData]);

  // Approve Price / Menu Recommendation (Human-in-the-Loop)
  const approveRecommendation = async (id: string, staffName: string) => {
    if (!supabase) return;
    await supabase.rpc('approve_ai_recommendation', {
      p_rec_id: id,
      p_approved_by: staffName,
    });
    await loadAIData();
  };

  // Approve Win-Back Campaign (Human-in-the-Loop)
  const approveWinBackCampaign = async (id: string, staffName: string) => {
    if (!supabase) return;
    await supabase.rpc('approve_winback_campaign', {
      p_campaign_id: id,
      p_approved_by: staffName,
    });
    await loadAIData();
  };

  // Resolve Anomaly Flag
  const resolveAnomaly = async (id: string) => {
    if (!supabase) return;
    await supabase
      .from('ai_anomalies_log')
      .update({ status: 'resolved' })
      .eq('id', id);
    await loadAIData();
  };

  // Log Incident in Restaurant Memory
  const logIncident = async (
    type: RestaurantIncident['incidentType'],
    title: string,
    description: string,
    loggedBy: string,
  ) => {
    if (!supabase) return;
    await supabase.from('restaurant_incidents_memory').insert({
      restaurant_id: currentRestaurant.id,
      incident_type: type,
      title,
      description,
      logged_by: loggedBy,
      status: 'resolved',
    });
    await loadAIData();
  };

  return (
    <RestaurantAIContext.Provider
      value={{
        recommendations,
        winbackCampaigns,
        healthScore,
        copilotBriefing,
        demandForecast,
        menuMatrix,
        anomalies,
        incidents,
        topVipCustomers,
        approveRecommendation,
        approveWinBackCampaign,
        resolveAnomaly,
        logIncident,
        loading,
        refresh: loadAIData,
      }}
    >
      {children}
    </RestaurantAIContext.Provider>
  );
}

export function useRestaurantAI() {
  const context = useContext(RestaurantAIContext);
  if (!context) {
    throw new Error('useRestaurantAI must be used within a RestaurantAIProvider');
  }
  return context;
}
