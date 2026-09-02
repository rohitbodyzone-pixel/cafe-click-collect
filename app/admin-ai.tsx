import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Header, Screen } from '@/src/components/UI';
import { useRestaurantAI } from '@/src/context/RestaurantAIContext';
import { useRestaurant } from '@/src/context/RestaurantContext';
import { colors } from '@/src/theme';
import { AIRecommendation, RestaurantIncident } from '@/src/services/ai/types';

type AITab = 'copilot' | 'forecast' | 'menu_matrix' | 'pricing' | 'winback' | 'fraud_monitor' | 'incidents';

export default function AdminAIScreen() {
  const { currentRestaurant } = useRestaurant();
  const {
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
  } = useRestaurantAI();

  const [currentTab, setCurrentTab] = useState<AITab>('copilot');
  const [busyAction, setBusyAction] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  // Approval Modal state
  const [selectedRec, setSelectedRec] = useState<AIRecommendation | null>(null);
  const [approverName, setApproverName] = useState('');

  // Incident Modal state
  const [incidentTitle, setIncidentTitle] = useState('');
  const [incidentDesc, setIncidentDesc] = useState('');
  const [incidentType, setIncidentType] = useState<RestaurantIncident['incidentType']>('equipment');
  const [incidentStaff, setIncidentStaff] = useState('');

  const handleApproveRecommendation = async () => {
    if (!selectedRec) return;
    if (!approverName.trim()) {
      alert('Please enter your name / role to confirm approval.');
      return;
    }
    setBusyAction(true);
    try {
      await approveRecommendation(selectedRec.id, approverName);
      setActionMessage(`✓ Approved recommendation: "${selectedRec.title}" (Approved by ${approverName})`);
      setSelectedRec(null);
      setApproverName('');
    } catch (e: any) {
      alert(e.message || 'Could not approve recommendation.');
    } finally {
      setBusyAction(false);
    }
  };

  const handleApproveCampaign = async (campaignId: string, offer: string) => {
    setBusyAction(true);
    try {
      await approveWinBackCampaign(campaignId, 'Restaurant Owner');
      setActionMessage(`✓ Approved Win-Back Campaign: "${offer}" · Promo code registered in live checkout!`);
    } catch (e: any) {
      alert(e.message || 'Could not approve campaign.');
    } finally {
      setBusyAction(false);
    }
  };

  const handleResolveAnomaly = async (id: string, title: string) => {
    setBusyAction(true);
    try {
      await resolveAnomaly(id);
      setActionMessage(`✓ Resolved anomaly note: "${title}"`);
    } catch (e: any) {
      alert(e.message || 'Could not resolve anomaly.');
    } finally {
      setBusyAction(false);
    }
  };

  const handleLogIncident = async () => {
    if (!incidentTitle.trim() || !incidentDesc.trim()) return;
    setBusyAction(true);
    try {
      await logIncident(incidentType, incidentTitle, incidentDesc, incidentStaff || 'Staff');
      setActionMessage(`✓ Logged incident: "${incidentTitle}" to institutional memory.`);
      setIncidentTitle('');
      setIncidentDesc('');
      setIncidentStaff('');
    } catch (e: any) {
      alert(e.message || 'Could not log incident.');
    } finally {
      setBusyAction(false);
    }
  };

  return (
    <Screen>
      <Header
        title="AI Copilot & Decision Insights"
        right={
          <Pressable style={s.adminBtn} onPress={() => router.replace('/admin')}>
            <Ionicons name="grid-outline" size={18} color={colors.espresso} />
          </Pressable>
        }
      />

      {/* Header Banner */}
      <View style={s.headerBar}>
        <Text style={s.subHeader}>AI & DECISION INSIGHTS · {currentRestaurant.name.toUpperCase()}</Text>
        <Text style={s.title}>Daily Briefing & Performance Copilot</Text>
      </View>

      {/* Navigation Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabScroll}>
        <Pressable
          style={[s.tab, currentTab === 'copilot' && s.tabActive]}
          onPress={() => setCurrentTab('copilot')}
        >
          <Ionicons name="sparkles" size={16} color={currentTab === 'copilot' ? colors.white : colors.espresso} />
          <Text style={[s.tabText, currentTab === 'copilot' && s.tabTextActive]}>Daily Briefing & Health</Text>
        </Pressable>

        <Pressable
          style={[s.tab, currentTab === 'forecast' && s.tabActive]}
          onPress={() => setCurrentTab('forecast')}
        >
          <Ionicons name="trending-up" size={16} color={currentTab === 'forecast' ? colors.white : colors.espresso} />
          <Text style={[s.tabText, currentTab === 'forecast' && s.tabTextActive]}>Expected Busy Times</Text>
        </Pressable>

        <Pressable
          style={[s.tab, currentTab === 'menu_matrix' && s.tabActive]}
          onPress={() => setCurrentTab('menu_matrix')}
        >
          <Ionicons name="pie-chart" size={16} color={currentTab === 'menu_matrix' ? colors.white : colors.espresso} />
          <Text style={[s.tabText, currentTab === 'menu_matrix' && s.tabTextActive]}>Menu Performance</Text>
        </Pressable>

        <Pressable
          style={[s.tab, currentTab === 'pricing' && s.tabActive]}
          onPress={() => setCurrentTab('pricing')}
        >
          <Ionicons name="pricetag" size={16} color={currentTab === 'pricing' ? colors.white : colors.espresso} />
          <Text style={[s.tabText, currentTab === 'pricing' && s.tabTextActive]}>Price Suggestions</Text>
        </Pressable>

        <Pressable
          style={[s.tab, currentTab === 'winback' && s.tabActive]}
          onPress={() => setCurrentTab('winback')}
        >
          <Ionicons name="heart" size={16} color={currentTab === 'winback' ? colors.white : colors.espresso} />
          <Text style={[s.tabText, currentTab === 'winback' && s.tabTextActive]}>Bring Customers Back</Text>
        </Pressable>

        <Pressable
          style={[s.tab, currentTab === 'fraud_monitor' && s.tabActive]}
          onPress={() => setCurrentTab('fraud_monitor')}
        >
          <Ionicons name="shield-checkmark" size={16} color={currentTab === 'fraud_monitor' ? colors.white : colors.espresso} />
          <Text style={[s.tabText, currentTab === 'fraud_monitor' && s.tabTextActive]}>Unusual Activity</Text>
        </Pressable>

        <Pressable
          style={[s.tab, currentTab === 'incidents' && s.tabActive]}
          onPress={() => setCurrentTab('incidents')}
        >
          <Ionicons name="newspaper" size={16} color={currentTab === 'incidents' ? colors.white : colors.espresso} />
          <Text style={[s.tabText, currentTab === 'incidents' && s.tabTextActive]}>Shift & Incident History</Text>
        </Pressable>
      </ScrollView>

      {!!actionMessage && (
        <View style={s.messageBanner}>
          <Text style={s.messageText}>{actionMessage}</Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 1. COPILOT BRIEFING & HEALTH SCORE */}
        {currentTab === 'copilot' && (
          <View style={s.tabContent}>
            {/* Health Score Card */}
            <Card style={s.healthCard}>
              <View style={s.healthHeader}>
                <View>
                  <Text style={s.healthBigNumber}>{healthScore.overallScore}/100</Text>
                  <Text style={s.healthGradeText}>Health Index: {healthScore.grade}</Text>
                </View>
                <View style={s.healthBadge}>
                  <Text style={s.healthBadgeText}>OPTIMAL</Text>
                </View>
              </View>

              <View style={s.healthBreakdownRow}>
                <View style={s.healthMetric}>
                  <Text style={s.healthMetricLabel}>SPEED (SLA)</Text>
                  <Text style={s.healthMetricVal}>{healthScore.speedScore}%</Text>
                </View>
                <View style={s.healthMetric}>
                  <Text style={s.healthMetricLabel}>LOYALTY & CLV</Text>
                  <Text style={s.healthMetricVal}>{healthScore.loyaltyScore}%</Text>
                </View>
                <View style={s.healthMetric}>
                  <Text style={s.healthMetricLabel}>FINANCIAL / AOV</Text>
                  <Text style={s.healthMetricVal}>{healthScore.financialScore}%</Text>
                </View>
              </View>
            </Card>

            {/* Daily Briefing Card */}
            {copilotBriefing && (
              <Card style={s.briefingCard}>
                <View style={s.briefingHeader}>
                  <Ionicons name="sunny" size={22} color={colors.caramel} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.briefingTitle}>Daily Copilot Briefing</Text>
                    <Text style={s.briefingSub}>Forecast: {copilotBriefing.projectedOrdersToday} orders · Est. ${copilotBriefing.projectedRevenueDollars} revenue</Text>
                  </View>
                </View>

                <View style={s.priorityList}>
                  <Text style={s.priorityHeader}>TOP 3 ACTIONABLE PRIORITIES TODAY:</Text>
                  {copilotBriefing.keyPriorities.map((item, idx) => (
                    <View key={idx} style={s.priorityRow}>
                      <View style={s.priorityBullet}>
                        <Text style={s.priorityBulletText}>{idx + 1}</Text>
                      </View>
                      <Text style={s.priorityText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            )}

            {/* Top VIP Regulars Cohort */}
            <Text style={[s.sectionTitle, { marginTop: 16 }]}>VIP & Lifetime Value (CLV) Cohort</Text>
            {topVipCustomers.map((vip) => (
              <Card key={vip.customerId} style={s.vipCard}>
                <View style={s.vipHeader}>
                  <View>
                    <Text style={s.vipName}>{vip.customerName}</Text>
                    <Text style={s.vipSegment}>{vip.segment} · {vip.frequencyOrders} Orders to date</Text>
                  </View>
                  <View style={s.vipScorePill}>
                    <Text style={s.vipScoreText}>VIP {vip.vipScore}/100</Text>
                  </View>
                </View>
                <View style={s.vipStatsRow}>
                  <Text style={s.vipStatText}>Spent: ${vip.monetarySpendDollars.toFixed(2)}</Text>
                  <Text style={s.vipStatText}>Est. 12Mo CLV: ${vip.predicted12MoValueDollars}</Text>
                  <Text style={s.vipStatText}>Last Visit: {vip.recencyDays}d ago</Text>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* 2. EXPECTED BUSY TIMES & HOURLY PROJECTIONS */}
        {currentTab === 'forecast' && (
          <View style={s.tabContent}>
            <Text style={s.sectionTitle}>Expected Busy Times & Hourly Projections</Text>
            <Text style={s.sectionHelp}>Hour-by-hour order estimates and suggested barista cover for prep planning.</Text>

            {demandForecast.map((slot) => (
              <Card key={slot.hour} style={s.forecastCard}>
                <View style={s.forecastRow}>
                  <View style={s.timeCol}>
                    <Text style={s.timeText}>{slot.hour}</Text>
                    <View style={[s.rushPill, s[`rush_${slot.rushLevel}`]]}>
                      <Text style={s.rushText}>{slot.rushLevel.toUpperCase()}</Text>
                    </View>
                  </View>

                  <View style={s.forecastDataCol}>
                    <Text style={s.ordersProjected}>{slot.projectedOrders} Orders</Text>
                    <Text style={s.revenueProjected}>Est. ${slot.projectedRevenueDollars.toFixed(2)}</Text>
                  </View>

                  <View style={s.staffCol}>
                    <Ionicons name="person-outline" size={14} color={colors.espresso} />
                    <Text style={s.staffText}>{slot.recommendedStaff} Baristas</Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* 3. MENU PERFORMANCE (TOP SELLERS & PROFIT INSIGHTS) */}
        {currentTab === 'menu_matrix' && (
          <View style={s.tabContent}>
            <Text style={s.sectionTitle}>Menu Performance (Top Sellers & Profit Insights)</Text>
            <Text style={s.sectionHelp}>Items grouped by customer popularity and profit margin to help you optimize menu placement.</Text>

            {menuMatrix.map((item) => (
              <Card key={item.id} style={[s.matrixCard, s[`matrix_${item.matrixCategory}`]]}>
                <View style={s.matrixHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.matrixItemName}>{item.name}</Text>
                    <Text style={s.matrixCategory}>
                      Category: {item.category} · Margin: {item.marginPct}% · Volume: {item.volume}
                    </Text>
                  </View>
                  <View style={[s.matrixBadge, s[`badge_${item.matrixCategory}`]]}>
                    <Text style={s.matrixBadgeText}>{item.matrixCategory.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={s.matrixAdvice}>"{item.recommendation}"</Text>
              </Card>
            ))}
          </View>
        )}

        {/* 4. PRICE & MARGIN SUGGESTIONS (HUMAN APPROVAL REQUIRED) */}
        {currentTab === 'pricing' && (
          <View style={s.tabContent}>
            <Text style={s.sectionTitle}>Price & Margin Suggestions</Text>
            <Text style={s.sectionHelp}>
              Suggested price adjustments based on sales volume. Requires your review and approval before applying.
            </Text>

            {recommendations.map((rec) => (
              <Card key={rec.id} style={s.recCard}>
                <View style={s.recHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.recTitle}>{rec.title}</Text>
                    <Text style={s.recCategory}>Category: {rec.category.toUpperCase()}</Text>
                  </View>
                  <View style={s.impactBadge}>
                    <Text style={s.impactText}>+${rec.potentialMonthlyImpactDollars}/mo</Text>
                  </View>
                </View>

                <Text style={s.recDesc}>{rec.description}</Text>
                <View style={s.evidenceBox}>
                  <Text style={s.evidenceLabel}>SUPPORTING DATA / EVIDENCE:</Text>
                  <Text style={s.evidenceText}>{rec.evidence}</Text>
                </View>

                <View style={s.recActionRow}>
                  {rec.status === 'pending' ? (
                    <Button
                      label="Review & Approve Change"
                      onPress={() => setSelectedRec(rec)}
                    />
                  ) : (
                    <View style={s.approvedBanner}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.green} />
                      <Text style={s.approvedText}>Approved by {rec.reviewedBy || 'Owner'}</Text>
                    </View>
                  )}
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* 5. BRING CUSTOMERS BACK */}
        {currentTab === 'winback' && (
          <View style={s.tabContent}>
            <Text style={s.sectionTitle}>Bring Lapsed Customers Back</Text>
            <Text style={s.sectionHelp}>
              Automated re-engagement offers for regulars who haven't visited recently. Review and approve before sending.
            </Text>

            {winbackCampaigns.map((camp) => (
              <Card key={camp.id} style={s.campCard}>
                <View style={s.campHeader}>
                  <View>
                    <Text style={s.campTarget}>{camp.targetSegment}</Text>
                    <Text style={s.campCount}>{camp.customerCount} Inactive Customers Identified</Text>
                  </View>
                  <View style={s.discountBadge}>
                    <Text style={s.discountBadgeText}>{camp.discountPercent}% OFF</Text>
                  </View>
                </View>

                <Text style={s.campOffer}>"{camp.offerDescription}"</Text>
                <Text style={s.codeText}>Promo Code: {camp.suggestedDiscountCode}</Text>

                <View style={s.campActionRow}>
                  {camp.status === 'draft' ? (
                    <Button
                      label={busyAction ? 'Approving…' : 'Approve & Launch Campaign'}
                      disabled={busyAction}
                      onPress={() => void handleApproveCampaign(camp.id, camp.offerDescription)}
                    />
                  ) : (
                    <View style={s.approvedBanner}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.green} />
                      <Text style={s.approvedText}>Campaign Live & Active (Approved)</Text>
                    </View>
                  )}
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* 6. UNUSUAL ACTIVITY & WASTE ALERTS */}
        {currentTab === 'fraud_monitor' && (
          <View style={s.tabContent}>
            <Text style={s.sectionTitle}>Unusual Activity & Waste Alerts</Text>
            <Text style={s.sectionHelp}>
              Monitors unusual voids, sudden volume changes, and inventory waste patterns.
            </Text>

            {anomalies.map((anom) => (
              <Card key={anom.id} style={s.anomalyCard}>
                <View style={s.anomalyHeader}>
                  <Ionicons name="information-circle" size={20} color={colors.caramel} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.anomalyTitle}>{anom.title}</Text>
                    <Text style={s.anomalyType}>Type: {anom.anomalyType.replace(/_/g, ' ').toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={s.anomalyDesc}>{anom.description}</Text>

                <View style={s.anomActionRow}>
                  {anom.status === 'open' ? (
                    <Pressable
                      style={s.resolveBtn}
                      onPress={() => void handleResolveAnomaly(anom.id, anom.title)}
                    >
                      <Ionicons name="checkmark" size={14} color={colors.white} />
                      <Text style={s.resolveBtnText}>Mark Reviewed & Resolved</Text>
                    </Pressable>
                  ) : (
                    <Text style={s.resolvedText}>✓ Resolved & Reviewed</Text>
                  )}
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* 7. SHIFT NOTES & INCIDENT HISTORY */}
        {currentTab === 'incidents' && (
          <View style={s.tabContent}>
            <Text style={s.sectionTitle}>Shift Notes & Incident History</Text>
            <Text style={s.sectionHelp}>Log and review equipment repairs, supply notes, and health inspections.</Text>

            {incidents.map((inc) => (
              <Card key={inc.id} style={s.incidentCard}>
                <View style={s.incHeader}>
                  <View>
                    <Text style={s.incTitle}>{inc.title}</Text>
                    <Text style={s.incMeta}>
                      Type: {inc.incidentType.toUpperCase()} · Logged by: {inc.loggedBy} · {new Date(inc.occurredAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <Text style={s.incDesc}>{inc.description}</Text>
                {inc.resolutionNotes && (
                  <View style={s.incResolution}>
                    <Text style={s.incResText}>Resolution: {inc.resolutionNotes}</Text>
                  </View>
                )}
              </Card>
            ))}

            {/* Quick Log Incident Form */}
            <Card style={s.logFormCard}>
              <Text style={s.logFormTitle}>Log New Shift Note / Maintenance Incident</Text>
              <TextInput
                style={s.input}
                placeholder="Title (e.g. Grinder Blade Replacement, Milk Delivery Delay)"
                placeholderTextColor={colors.muted}
                value={incidentTitle}
                onChangeText={setIncidentTitle}
              />
              <TextInput
                style={[s.input, { height: 60 }]}
                placeholder="Details and action taken..."
                placeholderTextColor={colors.muted}
                multiline
                value={incidentDesc}
                onChangeText={setIncidentDesc}
              />
              <TextInput
                style={s.input}
                placeholder="Your Name (e.g. Lead Barista)"
                placeholderTextColor={colors.muted}
                value={incidentStaff}
                onChangeText={setIncidentStaff}
              />
              <Button label="Save to Shift History" onPress={handleLogIncident} />
            </Card>
          </View>
        )}
      </ScrollView>

      {/* Mandatory Owner Approval Modal */}
      <Modal visible={!!selectedRec} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <Card style={s.modalCard}>
            <Text style={s.modalTitle}>Confirm AI Recommendation</Text>
            <Text style={s.modalSub}>
              You are approving: "{selectedRec?.title}"
            </Text>
            <Text style={s.modalDesc}>{selectedRec?.description}</Text>
            <Text style={s.modalEvidence}>Evidence: {selectedRec?.evidence}</Text>

            <TextInput
              style={s.input}
              placeholder="Enter Owner / Manager Name to sign off"
              placeholderTextColor={colors.muted}
              value={approverName}
              onChangeText={setApproverName}
            />

            <View style={s.modalActions}>
              <Pressable style={s.cancelBtn} onPress={() => setSelectedRec(null)}>
                <Text style={s.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={s.confirmBtn} onPress={handleApproveRecommendation}>
                <Text style={s.confirmText}>Approve & Apply</Text>
              </Pressable>
            </View>
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}

const s = StyleSheet.create({
  adminBtn: { padding: 8 },
  headerBar: { marginBottom: 12 },
  subHeader: { color: colors.caramel, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  title: { color: colors.espresso, fontSize: 20, fontWeight: '900', marginTop: 2 },
  tabScroll: { flexDirection: 'row', marginBottom: 14 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: colors.cream,
    borderRadius: 12,
    marginRight: 8,
  },
  tabActive: { backgroundColor: colors.espresso },
  tabText: { fontSize: 13, fontWeight: '700', color: colors.espresso },
  tabTextActive: { color: colors.white },
  messageBanner: {
    backgroundColor: '#E6F4EA',
    borderWidth: 1,
    borderColor: '#CEEAD6',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  messageText: { color: colors.green, fontWeight: '800', fontSize: 13 },
  tabContent: { paddingBottom: 40 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.ink },
  sectionHelp: { fontSize: 12, color: colors.muted, marginTop: 2, marginBottom: 14, lineHeight: 16 },
  healthCard: { backgroundColor: colors.espresso, borderRadius: 16, padding: 20, marginBottom: 14 },
  healthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  healthBigNumber: { fontSize: 32, fontWeight: '900', color: colors.white },
  healthGradeText: { color: colors.caramel, fontSize: 13, fontWeight: '700', marginTop: 2 },
  healthBadge: { backgroundColor: colors.green, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  healthBadgeText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  healthBreakdownRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
    paddingTop: 12,
  },
  healthMetric: { flex: 1 },
  healthMetricLabel: { fontSize: 9, color: 'rgba(255, 255, 255, 0.6)', fontWeight: '800' },
  healthMetricVal: { fontSize: 16, fontWeight: '800', color: colors.white, marginTop: 2 },
  briefingCard: { marginBottom: 14, borderLeftWidth: 4, borderLeftColor: colors.caramel },
  briefingHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  briefingTitle: { fontSize: 16, fontWeight: '800', color: colors.espresso },
  briefingSub: { fontSize: 12, color: colors.muted, marginTop: 1 },
  priorityList: { gap: 8, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10 },
  priorityHeader: { fontSize: 10, fontWeight: '800', color: colors.caramel, letterSpacing: 0.5 },
  priorityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  priorityBullet: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.espresso,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityBulletText: { color: colors.white, fontSize: 10, fontWeight: '800' },
  priorityText: { fontSize: 13, color: colors.ink, flex: 1, lineHeight: 17 },
  vipCard: { marginBottom: 10 },
  vipHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  vipName: { fontSize: 14, fontWeight: '800', color: colors.ink },
  vipSegment: { fontSize: 11, color: colors.muted, marginTop: 2 },
  vipScorePill: { backgroundColor: colors.cream, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  vipScoreText: { fontSize: 11, fontWeight: '800', color: colors.espresso },
  vipStatsRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  vipStatText: { fontSize: 11, fontWeight: '700', color: colors.caramel },
  forecastCard: { marginBottom: 8 },
  forecastRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timeCol: { width: 80 },
  timeText: { fontSize: 15, fontWeight: '900', color: colors.espresso },
  rushPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 2, alignSelf: 'flex-start' },
  rush_peak: { backgroundColor: '#FDECEA' },
  rush_moderate: { backgroundColor: colors.cream },
  rush_normal: { backgroundColor: '#E6F4EA' },
  rushText: { fontSize: 9, fontWeight: '800', color: colors.espresso },
  forecastDataCol: { flex: 1, paddingHorizontal: 12 },
  ordersProjected: { fontSize: 14, fontWeight: '800', color: colors.ink },
  revenueProjected: { fontSize: 12, color: colors.muted },
  staffCol: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  staffText: { fontSize: 12, fontWeight: '800', color: colors.espresso },
  matrixCard: { marginBottom: 10, borderLeftWidth: 4 },
  matrix_star: { borderLeftColor: colors.green },
  matrix_puzzle: { borderLeftColor: colors.caramel },
  matrix_plowhorse: { borderLeftColor: '#3F88C5' },
  matrix_dog: { borderLeftColor: colors.muted },
  matrixHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  matrixItemName: { fontSize: 15, fontWeight: '800', color: colors.ink },
  matrixCategory: { fontSize: 11, color: colors.muted, marginTop: 2 },
  matrixBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badge_star: { backgroundColor: '#E6F4EA' },
  badge_puzzle: { backgroundColor: colors.cream },
  badge_plowhorse: { backgroundColor: '#E8F0FE' },
  badge_dog: { backgroundColor: '#F1F3F4' },
  matrixBadgeText: { fontSize: 10, fontWeight: '800', color: colors.espresso },
  matrixAdvice: { fontSize: 12, color: colors.espresso, fontStyle: 'italic' },
  recCard: { marginBottom: 14 },
  recHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  recTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
  recCategory: { fontSize: 10, color: colors.muted, marginTop: 1 },
  impactBadge: { backgroundColor: '#E6F4EA', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  impactText: { color: colors.green, fontWeight: '900', fontSize: 12 },
  recDesc: { fontSize: 13, color: colors.ink, marginBottom: 8 },
  evidenceBox: { backgroundColor: colors.cream, borderRadius: 8, padding: 8, marginBottom: 10 },
  evidenceLabel: { fontSize: 9, fontWeight: '800', color: colors.caramel },
  evidenceText: { fontSize: 11, color: colors.espresso, marginTop: 2 },
  recActionRow: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10 },
  approvedBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  approvedText: { color: colors.green, fontWeight: '800', fontSize: 13 },
  campCard: { marginBottom: 12 },
  campHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  campTarget: { fontSize: 15, fontWeight: '800', color: colors.ink },
  campCount: { fontSize: 11, color: colors.muted, marginTop: 2 },
  discountBadge: { backgroundColor: colors.espresso, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  discountBadgeText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  campOffer: { fontSize: 13, color: colors.espresso, marginBottom: 4 },
  codeText: { fontSize: 12, fontWeight: '800', color: colors.caramel, marginBottom: 10 },
  campActionRow: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10 },
  anomalyCard: { marginBottom: 10 },
  anomalyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  anomalyTitle: { fontSize: 14, fontWeight: '800', color: colors.ink },
  anomalyType: { fontSize: 10, color: colors.muted },
  anomalyDesc: { fontSize: 12, color: colors.muted, marginBottom: 8 },
  anomActionRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  resolveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.espresso,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  resolveBtnText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  resolvedText: { color: colors.green, fontWeight: '800', fontSize: 12 },
  incidentCard: { marginBottom: 10 },
  incHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  incTitle: { fontSize: 14, fontWeight: '800', color: colors.ink },
  incMeta: { fontSize: 10, color: colors.muted, marginTop: 1 },
  incDesc: { fontSize: 12, color: colors.muted, marginBottom: 6 },
  incResolution: { backgroundColor: colors.cream, padding: 6, borderRadius: 6 },
  incResText: { fontSize: 11, color: colors.espresso, fontWeight: '700' },
  logFormCard: { marginTop: 14 },
  logFormTitle: { fontSize: 14, fontWeight: '800', color: colors.espresso, marginBottom: 8 },
  input: {
    backgroundColor: colors.cream,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.ink,
    marginBottom: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: { backgroundColor: colors.white, borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 17, fontWeight: '900', color: colors.espresso, marginBottom: 4 },
  modalSub: { fontSize: 13, fontWeight: '700', color: colors.caramel, marginBottom: 8 },
  modalDesc: { fontSize: 13, color: colors.ink, marginBottom: 8 },
  modalEvidence: { fontSize: 11, color: colors.muted, fontStyle: 'italic', marginBottom: 14 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  cancelBtn: {
    flex: 1,
    backgroundColor: colors.cream,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelText: { color: colors.espresso, fontWeight: '800', fontSize: 13 },
  confirmBtn: {
    flex: 1,
    backgroundColor: colors.espresso,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmText: { color: colors.white, fontWeight: '800', fontSize: 13 },
});
