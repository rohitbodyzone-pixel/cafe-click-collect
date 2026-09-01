import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Header, Screen } from '@/src/components/UI';
import { useGrowthConcierge } from '@/src/context/GrowthConciergeContext';
import { useRestaurant } from '@/src/context/RestaurantContext';
import { colors } from '@/src/theme';
import { ConciergeEngine } from '@/src/services/concierge/conciergeEngine';
import { MarketingPost } from '@/src/services/concierge/types';

type GrowthTab = 'social' | 'reviews' | 'voice_orders' | 'group_orders' | 'supplier_po' | 'benchmarks' | 'franchise';

export default function AdminGrowthScreen() {
  const { currentRestaurant } = useRestaurant();
  const {
    posts,
    purchaseOrders,
    groupOrders,
    voiceOrders,
    benchmarks,
    foodPairings,
    franchiseTopics,
    createSocialPost,
    approvePost,
    generateSupplierPO,
    approveSupplierPO,
    simulateIncomingVoiceOrder,
    acceptVoiceOrderToKDS,
    createGroupOrderSession,
  } = useGrowthConcierge();

  const [currentTab, setCurrentTab] = useState<GrowthTab>('social');
  const [busyAction, setBusyAction] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  // Group Order form
  const [groupHost, setGroupHost] = useState('');
  const [createdGroupCode, setCreatedGroupCode] = useState<string | null>(null);

  // Review Responder simulation
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewerName, setReviewerName] = useState('Alex M.');
  const [generatedReply, setGeneratedReply] = useState('');

  const handleGeneratePost = async (theme: 'morning_coffee' | 'weekend_brunch' | 'bakery_fresh' | 'rainy_day') => {
    setBusyAction(true);
    try {
      await createSocialPost('instagram', theme);
      setActionMessage(`✓ Generated new Instagram post for "${theme.replace('_', ' ').toUpperCase()}"!`);
    } catch (e: any) {
      alert(e.message || 'Could not generate post.');
    } finally {
      setBusyAction(false);
    }
  };

  const handleApprovePost = async (id: string, title: string) => {
    setBusyAction(true);
    try {
      await approvePost(id, 'Social Media Manager');
      setActionMessage(`✓ Approved & Scheduled Post: "${title}"!`);
    } catch (e: any) {
      alert(e.message || 'Could not approve post.');
    } finally {
      setBusyAction(false);
    }
  };

  const handleGenerateReply = () => {
    const reply = ConciergeEngine.generateReviewResponse(reviewRating, reviewerName);
    setGeneratedReply(reply);
  };

  const handleSimulatePhoneCall = async () => {
    setBusyAction(true);
    try {
      const sampleTranscript = 'Hi there, could I please order 2 large oat flat whites and a warm blueberry muffin for pickup in 15 minutes?';
      await simulateIncomingVoiceOrder('+64 21 555 0192', 'Marcus Phone Caller', sampleTranscript);
      setActionMessage('✓ Incoming Phone Call simulated & parsed into structured order ticket!');
    } catch (e: any) {
      alert(e.message || 'Could not simulate voice call.');
    } finally {
      setBusyAction(false);
    }
  };

  const handleAcceptVoiceOrder = async (voiceOrderId: string) => {
    setBusyAction(true);
    try {
      await acceptVoiceOrderToKDS(voiceOrderId);
      setActionMessage('✓ Phone order accepted and injected directly into KDS Kitchen Queue!');
    } catch (e: any) {
      alert(e.message || 'Could not accept voice order.');
    } finally {
      setBusyAction(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupHost.trim()) return;
    setBusyAction(true);
    try {
      const res = await createGroupOrderSession(groupHost, 'pickup');
      if (res) {
        setCreatedGroupCode(res.groupCode);
        setActionMessage(`✓ Created Group Order Session: ${res.groupCode}`);
        setGroupHost('');
      }
    } catch (e: any) {
      alert(e.message || 'Could not create group order.');
    } finally {
      setBusyAction(false);
    }
  };

  const handleGenerateSupplierPO = async (supplier: string) => {
    setBusyAction(true);
    try {
      await generateSupplierPO(supplier);
      setActionMessage(`✓ Draft Purchase Order generated for ${supplier}!`);
    } catch (e: any) {
      alert(e.message || 'Could not generate PO.');
    } finally {
      setBusyAction(false);
    }
  };

  const handleApprovePO = async (poId: string, poNum: string) => {
    setBusyAction(true);
    try {
      await approveSupplierPO(poId, 'Owner Rohit');
      setActionMessage(`✓ Approved Purchase Order ${poNum} signed off by Owner!`);
    } catch (e: any) {
      alert(e.message || 'Could not approve PO.');
    } finally {
      setBusyAction(false);
    }
  };

  return (
    <Screen>
      <Header
        title="Growth, Marketing & Concierge"
        right={
          <Pressable style={s.adminBtn} onPress={() => router.replace('/admin')}>
            <Ionicons name="grid-outline" size={18} color={colors.espresso} />
          </Pressable>
        }
      />

      {/* Header Banner */}
      <View style={s.headerBar}>
        <Text style={s.subHeader}>GROWTH & REPUTATION ENGINE · {currentRestaurant.name.toUpperCase()}</Text>
        <Text style={s.title}>Smart Marketing & Omnichannel Hub</Text>
      </View>

      {/* Navigation Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabScroll}>
        <Pressable
          style={[s.tab, currentTab === 'social' && s.tabActive]}
          onPress={() => setCurrentTab('social')}
        >
          <Ionicons name="logo-instagram" size={16} color={currentTab === 'social' ? colors.white : colors.espresso} />
          <Text style={[s.tabText, currentTab === 'social' && s.tabTextActive]}>AI Social Copywriter</Text>
        </Pressable>

        <Pressable
          style={[s.tab, currentTab === 'reviews' && s.tabActive]}
          onPress={() => setCurrentTab('reviews')}
        >
          <Ionicons name="star" size={16} color={currentTab === 'reviews' ? colors.white : colors.espresso} />
          <Text style={[s.tabText, currentTab === 'reviews' && s.tabTextActive]}>Review Responder</Text>
        </Pressable>

        <Pressable
          style={[s.tab, currentTab === 'voice_orders' && s.tabActive]}
          onPress={() => setCurrentTab('voice_orders')}
        >
          <Ionicons name="call" size={16} color={currentTab === 'voice_orders' ? colors.white : colors.espresso} />
          <Text style={[s.tabText, currentTab === 'voice_orders' && s.tabTextActive]}>AI Voice Phone Orders</Text>
        </Pressable>

        <Pressable
          style={[s.tab, currentTab === 'group_orders' && s.tabActive]}
          onPress={() => setCurrentTab('group_orders')}
        >
          <Ionicons name="people" size={16} color={currentTab === 'group_orders' ? colors.white : colors.espresso} />
          <Text style={[s.tabText, currentTab === 'group_orders' && s.tabTextActive]}>Group Orders & Split</Text>
        </Pressable>

        <Pressable
          style={[s.tab, currentTab === 'supplier_po' && s.tabActive]}
          onPress={() => setCurrentTab('supplier_po')}
        >
          <Ionicons name="document-text" size={16} color={currentTab === 'supplier_po' ? colors.white : colors.espresso} />
          <Text style={[s.tabText, currentTab === 'supplier_po' && s.tabTextActive]}>Supplier PO Generator</Text>
        </Pressable>

        <Pressable
          style={[s.tab, currentTab === 'benchmarks' && s.tabActive]}
          onPress={() => setCurrentTab('benchmarks')}
        >
          <Ionicons name="stats-chart" size={16} color={currentTab === 'benchmarks' ? colors.white : colors.espresso} />
          <Text style={[s.tabText, currentTab === 'benchmarks' && s.tabTextActive]}>Market Benchmarks</Text>
        </Pressable>

        <Pressable
          style={[s.tab, currentTab === 'franchise' && s.tabActive]}
          onPress={() => setCurrentTab('franchise')}
        >
          <Ionicons name="business" size={16} color={currentTab === 'franchise' ? colors.white : colors.espresso} />
          <Text style={[s.tabText, currentTab === 'franchise' && s.tabTextActive]}>Franchise Playbook</Text>
        </Pressable>
      </ScrollView>

      {!!actionMessage && (
        <View style={s.messageBanner}>
          <Text style={s.messageText}>{actionMessage}</Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 1. AI SOCIAL COPYWRITER */}
        {currentTab === 'social' && (
          <View style={s.tabContent}>
            <Text style={s.sectionTitle}>AI Social Post Generator</Text>
            <Text style={s.sectionHelp}>
              Craft on-brand captions and hashtags for Instagram, Facebook, and TikTok. Review before publishing.
            </Text>

            <View style={s.generatorBtnsRow}>
              <Pressable style={s.themeBtn} onPress={() => void handleGeneratePost('morning_coffee')}>
                <Text style={s.themeBtnText}>+ Morning Coffee</Text>
              </Pressable>
              <Pressable style={s.themeBtn} onPress={() => void handleGeneratePost('weekend_brunch')}>
                <Text style={s.themeBtnText}>+ Weekend Brunch</Text>
              </Pressable>
              <Pressable style={s.themeBtn} onPress={() => void handleGeneratePost('bakery_fresh')}>
                <Text style={s.themeBtnText}>+ Fresh Bakery</Text>
              </Pressable>
              <Pressable style={s.themeBtn} onPress={() => void handleGeneratePost('rainy_day')}>
                <Text style={s.themeBtnText}>+ Rainy Day</Text>
              </Pressable>
            </View>

            {posts.map((post) => (
              <Card key={post.id} style={s.postCard}>
                <View style={s.postHeader}>
                  <View>
                    <Text style={s.postTitle}>{post.title}</Text>
                    <Text style={s.postPlatform}>Platform: {post.platform.toUpperCase()}</Text>
                  </View>
                  <View style={[s.postStatusBadge, post.status === 'approved' && s.postStatusApproved]}>
                    <Text style={s.postStatusText}>{post.status.toUpperCase()}</Text>
                  </View>
                </View>

                <Text style={s.postCaption}>{post.caption}</Text>
                {post.hashtags && post.hashtags.length > 0 && (
                  <Text style={s.postTags}>{post.hashtags.join(' ')}</Text>
                )}
                {!!post.callToAction && (
                  <Text style={s.postCta}>CTA: {post.callToAction}</Text>
                )}

                <View style={s.postActionRow}>
                  {post.status === 'draft' ? (
                    <Button
                      label="Approve & Schedule Post"
                      onPress={() => void handleApprovePost(post.id, post.title)}
                    />
                  ) : (
                    <View style={s.approvedBanner}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.green} />
                      <Text style={s.approvedText}>Approved by {post.approvedBy || 'Manager'}</Text>
                    </View>
                  )}
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* 2. AI REVIEW RESPONDER */}
        {currentTab === 'reviews' && (
          <View style={s.tabContent}>
            <Text style={s.sectionTitle}>AI Review Responder & Reputation Copilot</Text>
            <Text style={s.sectionHelp}>
              Generates empathetic and on-brand replies for Google & Facebook reviews.
            </Text>

            <Card style={s.reviewCard}>
              <Text style={s.reviewCardTitle}>Test Review Response Generator</Text>
              <View style={s.ratingRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Pressable key={star} onPress={() => setReviewRating(star)}>
                    <Ionicons
                      name={star <= reviewRating ? 'star' : 'star-outline'}
                      size={24}
                      color={colors.caramel}
                    />
                  </Pressable>
                ))}
                <Text style={s.ratingLabel}>({reviewRating} Star Review)</Text>
              </View>

              <TextInput
                style={s.input}
                placeholder="Reviewer Name (e.g. Alex Mercer)"
                placeholderTextColor={colors.muted}
                value={reviewerName}
                onChangeText={setReviewerName}
              />

              <Button label="Generate Smart Reply" onPress={handleGenerateReply} />

              {!!generatedReply && (
                <View style={s.replyBox}>
                  <Text style={s.replyTitle}>Suggested Response:</Text>
                  <Text style={s.replyText}>"{generatedReply}"</Text>
                </View>
              )}
            </Card>

            {/* Barista & Sommelier Pairings */}
            <Text style={[s.sectionTitle, { marginTop: 16 }]}>AI Barista & Sommelier Pairings</Text>
            {foodPairings.map((pair, idx) => (
              <Card key={idx} style={s.pairCard}>
                <Text style={s.pairTitle}>{pair.baseItem} + {pair.pairedItem}</Text>
                <Text style={s.pairReason}>"{pair.pairingReason}"</Text>
                <Text style={s.pairAov}>Est. AOV Boost: +${pair.estimatedAovBoostDollars.toFixed(2)}</Text>
              </Card>
            ))}
          </View>
        )}

        {/* 3. AI VOICE PHONE ORDERS */}
        {currentTab === 'voice_orders' && (
          <View style={s.tabContent}>
            <View style={s.sectionRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.sectionTitle}>AI Voice Phone Assistant</Text>
                <Text style={s.sectionHelp}>Transcribes phone orders and injects to KDS.</Text>
              </View>
              <Button
                label={busyAction ? 'Simulating…' : 'Simulate Phone Call'}
                disabled={busyAction}
                onPress={handleSimulatePhoneCall}
              />
            </View>

            {voiceOrders.map((voice) => (
              <Card key={voice.id} style={s.voiceCard}>
                <View style={s.voiceHeader}>
                  <View>
                    <Text style={s.voiceCustomer}>{voice.customerName || 'Phone Customer'}</Text>
                    <Text style={s.voicePhone}>{voice.callerPhone} · Pickup: {voice.requestedPickupTime || '15 mins'}</Text>
                  </View>
                  <View style={[s.voiceBadge, voice.status === 'accepted_to_kds' && s.voiceBadgeAccepted]}>
                    <Text style={s.voiceBadgeText}>{voice.status.replace(/_/g, ' ').toUpperCase()}</Text>
                  </View>
                </View>

                <View style={s.transcriptBox}>
                  <Text style={s.transcriptLabel}>CALL TRANSCRIPT:</Text>
                  <Text style={s.transcriptText}>"{voice.transcript}"</Text>
                </View>

                <View style={s.parsedItemsList}>
                  <Text style={s.parsedHeader}>PARSED KITCHEN ITEMS:</Text>
                  {voice.parsedItems.map((item, idx) => (
                    <Text key={idx} style={s.parsedItemText}>
                      • {item.quantity}x {item.name} {item.notes ? `(${item.notes})` : ''}
                    </Text>
                  ))}
                </View>

                <View style={s.voiceActionRow}>
                  {voice.status === 'pending_review' ? (
                    <Button
                      label="Accept & Send to KDS Queue"
                      onPress={() => void handleAcceptVoiceOrder(voice.id)}
                    />
                  ) : (
                    <View style={s.approvedBanner}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.green} />
                      <Text style={s.approvedText}>Dispatched to Kitchen KDS (Incoming)</Text>
                    </View>
                  )}
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* 4. GROUP ORDERS & SPLIT BILL */}
        {currentTab === 'group_orders' && (
          <View style={s.tabContent}>
            <Text style={s.sectionTitle}>Group Order Concierge & Split Bill</Text>
            <Text style={s.sectionHelp}>
              Shareable group ordering links with individual item tracking and split payment settlement.
            </Text>

            <Card style={s.groupCreateCard}>
              <Text style={s.groupCreateTitle}>Start New Group Order</Text>
              <TextInput
                style={s.input}
                placeholder="Host Name (e.g. Office Breakfast Lead)"
                placeholderTextColor={colors.muted}
                value={groupHost}
                onChangeText={setGroupHost}
              />
              <Button label="Generate Group Order Link" onPress={handleCreateGroup} />

              {createdGroupCode && (
                <View style={s.codeResultBox}>
                  <Text style={s.codeResultLabel}>Active Group Code:</Text>
                  <Text style={s.codeResultBig}>{createdGroupCode}</Text>
                  <Text style={s.codeResultSub}>Share link: /group/{createdGroupCode}</Text>
                </View>
              )}
            </Card>

            {groupOrders.map((grp) => (
              <Card key={grp.id} style={s.grpCard}>
                <View style={s.grpHeader}>
                  <View>
                    <Text style={s.grpCode}>{grp.groupCode}</Text>
                    <Text style={s.grpHost}>Host: {grp.hostName} · Type: {grp.diningType.toUpperCase()}</Text>
                  </View>
                  <View style={s.grpStatusBadge}>
                    <Text style={s.grpStatusText}>{grp.status.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={s.grpCreated}>Created: {new Date(grp.createdAt).toLocaleString()}</Text>
              </Card>
            ))}
          </View>
        )}

        {/* 5. SUPPLIER PURCHASE ORDER GENERATOR */}
        {currentTab === 'supplier_po' && (
          <View style={s.tabContent}>
            <Text style={s.sectionTitle}>Automated Supplier Purchase Orders</Text>
            <Text style={s.sectionHelp}>
              Depletion-based PO drafts for Supreme Coffee Roasters & Oatly. Mandatory owner sign-off.
            </Text>

            <View style={s.poButtonsRow}>
              <Pressable
                style={s.poDraftBtn}
                onPress={() => void handleGenerateSupplierPO('Supreme Coffee Roasters')}
              >
                <Text style={s.poDraftBtnText}>+ Draft Supreme Coffee PO</Text>
              </Pressable>
              <Pressable
                style={s.poDraftBtn}
                onPress={() => void handleGenerateSupplierPO('Oatly Barista NZ')}
              >
                <Text style={s.poDraftBtnText}>+ Draft Oatly Dairy PO</Text>
              </Pressable>
            </View>

            {purchaseOrders.map((po) => (
              <Card key={po.id} style={s.poCard}>
                <View style={s.poHeader}>
                  <View>
                    <Text style={s.poNumber}>{po.poNumber}</Text>
                    <Text style={s.poSupplier}>Supplier: {po.supplierName}</Text>
                  </View>
                  <View style={[s.poBadge, po.status === 'approved' && s.poBadgeApproved]}>
                    <Text style={s.poBadgeText}>{po.status.toUpperCase()}</Text>
                  </View>
                </View>

                <View style={s.poItemsList}>
                  {po.items.map((item, idx) => (
                    <Text key={idx} style={s.poItemText}>
                      • {item.quantity}x {item.item} — ${((item.subtotalCents || (item as any).subtotal_cents || 0) / 100).toFixed(2)}
                    </Text>
                  ))}
                </View>

                <Text style={s.poTotal}>Total Order Value: ${po.totalCostDollars.toFixed(2)}</Text>

                <View style={s.poActionRow}>
                  {po.status === 'draft' ? (
                    <Button
                      label="Sign Off & Approve PO"
                      onPress={() => void handleApprovePO(po.id, po.poNumber)}
                    />
                  ) : (
                    <View style={s.approvedBanner}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.green} />
                      <Text style={s.approvedText}>Approved & Sent by {po.approvedBy || 'Owner'}</Text>
                    </View>
                  )}
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* 6. COMPETITOR BENCHMARKS */}
        {currentTab === 'benchmarks' && (
          <View style={s.tabContent}>
            <Text style={s.sectionTitle}>Public Competitor Market Benchmarks</Text>
            <Text style={s.sectionHelp}>Local Auckland cafe pricing for core items.</Text>

            {benchmarks.map((b) => (
              <Card key={b.id} style={s.benchCard}>
                <View style={s.benchHeader}>
                  <Text style={s.benchName}>{b.competitorName}</Text>
                  <Text style={s.benchCat}>{b.category.toUpperCase()}</Text>
                </View>
                <Text style={s.benchItem}>{b.itemName}</Text>
                <View style={s.benchPriceRow}>
                  <Text style={s.benchCompPrice}>Competitor: ${b.competitorPrice.toFixed(2)}</Text>
                  <Text style={s.benchOurPrice}>Our Price: ${b.ourPrice.toFixed(2)}</Text>
                </View>
                {!!b.notes && <Text style={s.benchNotes}>"{b.notes}"</Text>}
              </Card>
            ))}
          </View>
        )}

        {/* 7. FRANCHISE PLAYBOOK */}
        {currentTab === 'franchise' && (
          <View style={s.tabContent}>
            <Text style={s.sectionTitle}>AI Franchise Playbook & Standards</Text>
            <Text style={s.sectionHelp}>Multi-location operational excellence and barista quality guidelines.</Text>

            {franchiseTopics.map((topic, idx) => (
              <Card key={idx} style={s.topicCard}>
                <Text style={s.topicTitle}>{topic.title}</Text>
                <View style={s.standardsList}>
                  {topic.standards.map((std, sIdx) => (
                    <View key={sIdx} style={s.stdRow}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.green} />
                      <Text style={s.stdText}>{std}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
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
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  generatorBtnsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  themeBtn: { backgroundColor: colors.cream, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  themeBtnText: { fontSize: 12, fontWeight: '800', color: colors.espresso },
  postCard: { marginBottom: 14 },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  postTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
  postPlatform: { fontSize: 10, color: colors.caramel, fontWeight: '700', marginTop: 1 },
  postStatusBadge: { backgroundColor: colors.cream, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  postStatusApproved: { backgroundColor: '#E6F4EA' },
  postStatusText: { fontSize: 10, fontWeight: '800', color: colors.espresso },
  postCaption: { fontSize: 13, color: colors.ink, marginBottom: 8, lineHeight: 18 },
  postTags: { fontSize: 11, color: '#3F88C5', marginBottom: 6 },
  postCta: { fontSize: 11, fontStyle: 'italic', color: colors.muted, marginBottom: 10 },
  postActionRow: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10 },
  approvedBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  approvedText: { color: colors.green, fontWeight: '800', fontSize: 13 },
  reviewCard: { marginBottom: 14 },
  reviewCardTitle: { fontSize: 15, fontWeight: '800', color: colors.espresso, marginBottom: 10 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  ratingLabel: { fontSize: 12, fontWeight: '700', color: colors.muted, marginLeft: 6 },
  input: {
    backgroundColor: colors.cream,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.ink,
    marginBottom: 10,
  },
  replyBox: { backgroundColor: colors.cream, borderRadius: 10, padding: 12, marginTop: 12 },
  replyTitle: { fontSize: 11, fontWeight: '800', color: colors.caramel, marginBottom: 4 },
  replyText: { fontSize: 13, color: colors.espresso, fontStyle: 'italic', lineHeight: 18 },
  pairCard: { marginBottom: 10 },
  pairTitle: { fontSize: 14, fontWeight: '800', color: colors.espresso, marginBottom: 4 },
  pairReason: { fontSize: 12, color: colors.ink, fontStyle: 'italic', marginBottom: 6 },
  pairAov: { fontSize: 11, fontWeight: '800', color: colors.green },
  voiceCard: { marginBottom: 14 },
  voiceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  voiceCustomer: { fontSize: 15, fontWeight: '800', color: colors.ink },
  voicePhone: { fontSize: 11, color: colors.muted, marginTop: 1 },
  voiceBadge: { backgroundColor: colors.cream, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  voiceBadgeAccepted: { backgroundColor: '#E6F4EA' },
  voiceBadgeText: { fontSize: 10, fontWeight: '800', color: colors.espresso },
  transcriptBox: { backgroundColor: colors.cream, padding: 8, borderRadius: 8, marginBottom: 10 },
  transcriptLabel: { fontSize: 9, fontWeight: '800', color: colors.caramel },
  transcriptText: { fontSize: 12, color: colors.espresso, fontStyle: 'italic', marginTop: 2 },
  parsedItemsList: { marginBottom: 10 },
  parsedHeader: { fontSize: 10, fontWeight: '800', color: colors.muted, marginBottom: 4 },
  parsedItemText: { fontSize: 13, color: colors.ink, fontWeight: '700', marginBottom: 2 },
  voiceActionRow: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10 },
  groupCreateCard: { marginBottom: 14 },
  groupCreateTitle: { fontSize: 15, fontWeight: '800', color: colors.espresso, marginBottom: 10 },
  codeResultBox: { backgroundColor: colors.espresso, borderRadius: 10, padding: 12, marginTop: 12, alignItems: 'center' },
  codeResultLabel: { color: colors.caramel, fontSize: 11, fontWeight: '800' },
  codeResultBig: { color: colors.white, fontSize: 24, fontWeight: '900', letterSpacing: 2, marginVertical: 4 },
  codeResultSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  grpCard: { marginBottom: 10 },
  grpHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  grpCode: { fontSize: 15, fontWeight: '800', color: colors.ink },
  grpHost: { fontSize: 11, color: colors.muted, marginTop: 2 },
  grpStatusBadge: { backgroundColor: colors.cream, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  grpStatusText: { fontSize: 10, fontWeight: '800', color: colors.espresso },
  grpCreated: { fontSize: 10, color: colors.muted, marginTop: 6 },
  poButtonsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  poDraftBtn: { flex: 1, backgroundColor: colors.cream, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  poDraftBtnText: { fontSize: 12, fontWeight: '800', color: colors.espresso },
  poCard: { marginBottom: 14 },
  poHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  poNumber: { fontSize: 15, fontWeight: '800', color: colors.ink },
  poSupplier: { fontSize: 11, color: colors.caramel, fontWeight: '700', marginTop: 1 },
  poBadge: { backgroundColor: colors.cream, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  poBadgeApproved: { backgroundColor: '#E6F4EA' },
  poBadgeText: { fontSize: 10, fontWeight: '800', color: colors.espresso },
  poItemsList: { marginBottom: 8 },
  poItemText: { fontSize: 13, color: colors.ink, marginBottom: 2 },
  poTotal: { fontSize: 14, fontWeight: '800', color: colors.espresso, marginBottom: 10 },
  poActionRow: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10 },
  benchCard: { marginBottom: 10 },
  benchHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  benchName: { fontSize: 14, fontWeight: '800', color: colors.ink },
  benchCat: { fontSize: 9, color: colors.muted, fontWeight: '800' },
  benchItem: { fontSize: 13, color: colors.espresso, fontWeight: '700' },
  benchPriceRow: { flexDirection: 'row', gap: 14, marginVertical: 4 },
  benchCompPrice: { fontSize: 12, color: colors.muted },
  benchOurPrice: { fontSize: 12, fontWeight: '800', color: colors.green },
  benchNotes: { fontSize: 11, color: colors.muted, fontStyle: 'italic' },
  topicCard: { marginBottom: 12 },
  topicTitle: { fontSize: 15, fontWeight: '800', color: colors.espresso, marginBottom: 8 },
  standardsList: { gap: 6 },
  stdRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  stdText: { fontSize: 12, color: colors.ink, flex: 1, lineHeight: 16 },
});
