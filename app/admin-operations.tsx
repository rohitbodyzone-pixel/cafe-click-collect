import React, { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Header, Screen } from '@/src/components/UI';
import { useRestaurantOperations, InventoryItem, StaffShift, OperationsChecklist } from '@/src/context/RestaurantOperationsContext';
import { useRestaurant } from '@/src/context/RestaurantContext';
import { colors } from '@/src/theme';
import { money } from '@/src/data/products';

type Tab = 'inventory' | 'wait_time' | 'scheduler' | 'checklists' | 'trainer' | 'hardware';

export default function AdminOperationsScreen() {
  const { currentRestaurant } = useRestaurant();
  const {
    inventory,
    recordInventoryUsage,
    waitTime,
    setManualSurge,
    shifts,
    generateSmartRoster,
    addShift,
    checklists,
    submitChecklist,
    trainingDocs,
    printers,
    posConfigs,
    testPrintKitchenDocket,
    syncPOSProvider,
  } = useRestaurantOperations();

  const [currentTab, setCurrentTab] = useState<Tab>('inventory');
  const [busyAction, setBusyAction] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [printResult, setPrintResult] = useState<string | null>(null);

  // Checklists local checked state
  const [checkedTasks, setCheckedTasks] = useState<Record<string, boolean>>({});
  const [staffSignature, setStaffSignature] = useState('');

  // New Shift form state
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'head_barista' | 'barista' | 'chef' | 'counter' | 'manager'>('barista');
  const [newStartTime, setNewStartTime] = useState('07:00');
  const [newEndTime, setNewEndTime] = useState('15:00');

  const toggleTask = (taskId: string) => {
    setCheckedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const handleCompleteChecklist = async (checklist: OperationsChecklist) => {
    if (!staffSignature.trim()) {
      alert('Please enter your staff name / signature before submitting.');
      return;
    }
    setBusyAction(true);
    try {
      const items = checklist.items.map((i) => ({
        ...i,
        done: !!checkedTasks[i.id],
      }));
      await submitChecklist(checklist.checklistType, staffSignature, items);
      setActionMessage(`✓ ${checklist.title} completed by ${staffSignature}!`);
      setCheckedTasks({});
      setStaffSignature('');
    } catch (e: any) {
      alert(e.message || 'Could not complete checklist.');
    } finally {
      setBusyAction(false);
    }
  };

  const handleGenerateRoster = async () => {
    setBusyAction(true);
    setActionMessage('');
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      await generateSmartRoster(todayStr);
      setActionMessage(`✓ AI Smart Roster generated 4 optimized shifts for today!`);
    } catch (e: any) {
      alert(e.message || 'Could not generate roster.');
    } finally {
      setBusyAction(false);
    }
  };

  const handleAddShift = async () => {
    if (!newStaffName.trim()) return;
    setBusyAction(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      await addShift({
        staffName: newStaffName,
        staffRole: newStaffRole,
        shiftDate: todayStr,
        startTime: newStartTime,
        endTime: newEndTime,
        status: 'scheduled',
      });
      setNewStaffName('');
      setActionMessage(`✓ Shift added for ${newStaffName}`);
    } catch (e: any) {
      alert(e.message || 'Could not add shift.');
    } finally {
      setBusyAction(false);
    }
  };

  const handleTestPrint = async () => {
    setBusyAction(true);
    try {
      const res = await testPrintKitchenDocket();
      setPrintResult(res.formatted);
      setActionMessage(`✓ ${res.message}`);
    } catch (e: any) {
      alert(e.message || 'Test print failed.');
    } finally {
      setBusyAction(false);
    }
  };

  const handleSyncPOS = async (provider: string) => {
    setBusyAction(true);
    try {
      const res = await syncPOSProvider(provider);
      setActionMessage(`✓ ${res.message}`);
    } catch (e: any) {
      alert(e.message || 'POS sync failed.');
    } finally {
      setBusyAction(false);
    }
  };

  return (
    <Screen>
      <Header
        title="Operations & Automation Hub"
        right={
          <Pressable style={s.adminBtn} onPress={() => router.replace('/admin')}>
            <Ionicons name="grid-outline" size={18} color={colors.espresso} />
          </Pressable>
        }
      />

      {/* Restaurant Header */}
      <View style={s.headerBar}>
        <View style={{ flex: 1 }}>
          <Text style={s.subHeader}>RESTAURANT OPERATIONS · {currentRestaurant.name.toUpperCase()}</Text>
          <Text style={s.title}>Smart Kitchen & Ops Controls</Text>
        </View>
      </View>

      {/* Navigation Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabScroll}>
        <Pressable
          style={[s.tab, currentTab === 'inventory' && s.tabActive]}
          onPress={() => setCurrentTab('inventory')}
        >
          <Ionicons name="cube-outline" size={16} color={currentTab === 'inventory' ? colors.white : colors.espresso} />
          <Text style={[s.tabText, currentTab === 'inventory' && s.tabTextActive]}>Inventory & Stock</Text>
        </Pressable>

        <Pressable
          style={[s.tab, currentTab === 'wait_time' && s.tabActive]}
          onPress={() => setCurrentTab('wait_time')}
        >
          <Ionicons name="speedometer-outline" size={16} color={currentTab === 'wait_time' ? colors.white : colors.espresso} />
          <Text style={[s.tabText, currentTab === 'wait_time' && s.tabTextActive]}>Wait Balancer</Text>
        </Pressable>

        <Pressable
          style={[s.tab, currentTab === 'scheduler' && s.tabActive]}
          onPress={() => setCurrentTab('scheduler')}
        >
          <Ionicons name="people-outline" size={16} color={currentTab === 'scheduler' ? colors.white : colors.espresso} />
          <Text style={[s.tabText, currentTab === 'scheduler' && s.tabTextActive]}>AI Staff Roster</Text>
        </Pressable>

        <Pressable
          style={[s.tab, currentTab === 'checklists' && s.tabActive]}
          onPress={() => setCurrentTab('checklists')}
        >
          <Ionicons name="checkbox-outline" size={16} color={currentTab === 'checklists' ? colors.white : colors.espresso} />
          <Text style={[s.tabText, currentTab === 'checklists' && s.tabTextActive]}>Opening / Closing</Text>
        </Pressable>

        <Pressable
          style={[s.tab, currentTab === 'trainer' && s.tabActive]}
          onPress={() => setCurrentTab('trainer')}
        >
          <Ionicons name="book-outline" size={16} color={currentTab === 'trainer' ? colors.white : colors.espresso} />
          <Text style={[s.tabText, currentTab === 'trainer' && s.tabTextActive]}>Pocket Trainer</Text>
        </Pressable>

        <Pressable
          style={[s.tab, currentTab === 'hardware' && s.tabActive]}
          onPress={() => setCurrentTab('hardware')}
        >
          <Ionicons name="print-outline" size={16} color={currentTab === 'hardware' ? colors.white : colors.espresso} />
          <Text style={[s.tabText, currentTab === 'hardware' && s.tabTextActive]}>Printer & POS</Text>
        </Pressable>
      </ScrollView>

      {!!actionMessage && (
        <View style={s.messageBanner}>
          <Text style={s.messageText}>{actionMessage}</Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 1. INVENTORY TAB */}
        {currentTab === 'inventory' && (
          <View style={s.tabContent}>
            <Text style={s.sectionTitle}>Smart Inventory & Consumption Predictor</Text>
            <Text style={s.sectionHelp}>
              Real-time stock depletion and predictive restock dates based on daily order velocity.
            </Text>

            {inventory.map((item) => (
              <Card key={item.id} style={[s.itemCard, item.isLowStock && s.lowStockCard]}>
                <View style={s.itemHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.itemName}>{item.name}</Text>
                    <Text style={s.itemCategory}>
                      Category: {item.category.toUpperCase()} · Supplier: {item.supplierName || 'Primary'}
                    </Text>
                  </View>
                  <View style={[s.stockPill, item.isLowStock ? s.lowStockPill : s.normalStockPill]}>
                    <Text style={[s.stockPillText, item.isLowStock ? s.lowStockPillText : s.normalStockPillText]}>
                      {item.currentStock} {item.unit}
                    </Text>
                  </View>
                </View>

                <View style={s.predictionRow}>
                  <View style={s.predBox}>
                    <Text style={s.predLabel}>DAILY USAGE</Text>
                    <Text style={s.predVal}>~{item.dailyConsumptionRate} {item.unit}/day</Text>
                  </View>
                  <View style={s.predBox}>
                    <Text style={s.predLabel}>EST. DEPLETION</Text>
                    <Text style={[s.predVal, item.daysRemaining <= 2 && { color: colors.danger }]}>
                      {item.daysRemaining} days left
                    </Text>
                  </View>
                  <View style={s.predBox}>
                    <Text style={s.predLabel}>MIN THRESHOLD</Text>
                    <Text style={s.predVal}>{item.minThreshold} {item.unit}</Text>
                  </View>
                </View>

                {item.isLowStock && (
                  <View style={s.restockAlert}>
                    <Ionicons name="warning" size={16} color={colors.danger} />
                    <Text style={s.restockAlertText}>
                      LOW STOCK: Order +{item.optimalStock - item.currentStock} {item.unit} from supplier
                    </Text>
                  </View>
                )}

                <View style={s.stockActions}>
                  <Pressable
                    style={s.stockActionBtn}
                    onPress={() => void recordInventoryUsage(item.id, 1, 'order_deduction')}
                  >
                    <Text style={s.stockActionText}>-1 Used</Text>
                  </Pressable>
                  <Pressable
                    style={s.stockActionBtn}
                    onPress={() => void recordInventoryUsage(item.id, 5, 'manual_restock')}
                  >
                    <Text style={s.stockActionText}>+5 Restock</Text>
                  </Pressable>
                  <Pressable
                    style={[s.stockActionBtn, s.stockActionWaste]}
                    onPress={() => void recordInventoryUsage(item.id, 1, 'waste_spoilage')}
                  >
                    <Text style={s.stockActionWasteText}>Waste Log</Text>
                  </Pressable>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* 2. DYNAMIC WAIT TIME BALANCER */}
        {currentTab === 'wait_time' && (
          <View style={s.tabContent}>
            <Text style={s.sectionTitle}>Dynamic Wait-Time Balancer</Text>
            <Text style={s.sectionHelp}>
              Automatically scales customer pickup estimates based on live ticket queue and rush-hour load.
            </Text>

            <Card style={s.waitMetricsCard}>
              <View style={s.waitHeader}>
                <View>
                  <Text style={s.waitBigText}>{waitTime.estimatedWaitMinutes} Mins</Text>
                  <Text style={s.waitSubText}>Current Estimated Prep Time</Text>
                </View>
                <View style={[s.loadBadge, s[`load_${waitTime.loadLevel}`]]}>
                  <Text style={s.loadBadgeText}>{waitTime.loadLevel.toUpperCase()}</Text>
                </View>
              </View>

              <View style={s.waitStatsRow}>
                <View style={s.waitStat}>
                  <Text style={s.waitStatLabel}>ACTIVE ORDERS</Text>
                  <Text style={s.waitStatVal}>{waitTime.activeOrders} tickets</Text>
                </View>
                <View style={s.waitStat}>
                  <Text style={s.waitStatLabel}>BASE PREP</Text>
                  <Text style={s.waitStatVal}>{waitTime.basePrepMinutes} mins</Text>
                </View>
                <View style={s.waitStat}>
                  <Text style={s.waitStatLabel}>RUSH SURGE</Text>
                  <Text style={s.waitStatVal}>+{waitTime.surgeMinutes} mins</Text>
                </View>
              </View>
            </Card>

            <Text style={[s.sectionTitle, { marginTop: 20 }]}>Manual Surge Control</Text>
            <Text style={s.sectionHelp}>Apply manual prep buffers during unexpected counter rushes.</Text>

            <View style={s.surgeButtonsRow}>
              {[0, 5, 10, 15, 20].map((mins) => (
                <Pressable
                  key={mins}
                  style={[s.surgeBtn, waitTime.surgeMinutes === mins && s.surgeBtnActive]}
                  onPress={() => void setManualSurge(mins)}
                >
                  <Text style={[s.surgeBtnText, waitTime.surgeMinutes === mins && s.surgeBtnTextActive]}>
                    {mins === 0 ? 'Normal (+0m)' : `+${mins} Mins`}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* 3. AI STAFF SCHEDULER */}
        {currentTab === 'scheduler' && (
          <View style={s.tabContent}>
            <View style={s.sectionRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.sectionTitle}>AI Staff Scheduler</Text>
                <Text style={s.sectionHelp}>Volume-weighted shift optimization.</Text>
              </View>
              <Button
                label={busyAction ? 'Generating…' : 'Generate AI Roster'}
                disabled={busyAction}
                onPress={handleGenerateRoster}
              />
            </View>

            <Text style={[s.subHeading, { marginTop: 16 }]}>Today's Scheduled Roster ({shifts.length} Staff)</Text>
            {shifts.map((shift) => (
              <Card key={shift.id} style={s.shiftCard}>
                <View style={s.shiftHeader}>
                  <View>
                    <Text style={s.shiftName}>{shift.staffName}</Text>
                    <Text style={s.shiftRole}>{shift.staffRole.replace('_', ' ').toUpperCase()}</Text>
                  </View>
                  <View style={s.shiftTimeBox}>
                    <Ionicons name="time-outline" size={14} color={colors.espresso} />
                    <Text style={s.shiftTimeText}>{shift.startTime} – {shift.endTime}</Text>
                  </View>
                </View>
                {!!shift.notes && <Text style={s.shiftNotes}>"{shift.notes}"</Text>}
              </Card>
            ))}

            <Card style={s.addShiftCard}>
              <Text style={s.addShiftTitle}>Add Custom Shift</Text>
              <TextInput
                style={s.input}
                placeholder="Staff Member Name"
                placeholderTextColor={colors.muted}
                value={newStaffName}
                onChangeText={setNewStaffName}
              />
              <View style={s.timeInputRow}>
                <TextInput
                  style={[s.input, { flex: 1 }]}
                  placeholder="Start (e.g. 07:00)"
                  placeholderTextColor={colors.muted}
                  value={newStartTime}
                  onChangeText={setNewStartTime}
                />
                <TextInput
                  style={[s.input, { flex: 1 }]}
                  placeholder="End (e.g. 15:00)"
                  placeholderTextColor={colors.muted}
                  value={newEndTime}
                  onChangeText={setNewEndTime}
                />
              </View>
              <Button label="Add Shift" onPress={handleAddShift} />
            </Card>
          </View>
        )}

        {/* 4. OPENING / CLOSING CHECKLISTS */}
        {currentTab === 'checklists' && (
          <View style={s.tabContent}>
            <Text style={s.sectionTitle}>Digital Operations Checklists</Text>
            <Text style={s.sectionHelp}>Interactive opening, closing, and hygiene verification.</Text>

            {checklists.map((chk) => (
              <Card key={chk.id} style={s.checklistCard}>
                <Text style={s.chkTitle}>{chk.title}</Text>
                <View style={s.tasksList}>
                  {chk.items.map((task) => (
                    <Pressable
                      key={task.id}
                      style={s.taskRow}
                      onPress={() => toggleTask(task.id)}
                    >
                      <Ionicons
                        name={checkedTasks[task.id] ? 'checkbox' : 'square-outline'}
                        size={22}
                        color={checkedTasks[task.id] ? colors.green : colors.muted}
                      />
                      <Text style={[s.taskText, checkedTasks[task.id] && s.taskTextDone]}>
                        {task.task}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <View style={s.signatureBox}>
                  <TextInput
                    style={s.input}
                    placeholder="Staff Member Signature / Name"
                    placeholderTextColor={colors.muted}
                    value={staffSignature}
                    onChangeText={setStaffSignature}
                  />
                  <Button
                    label="Submit & Sign Off"
                    disabled={busyAction}
                    onPress={() => void handleCompleteChecklist(chk)}
                  />
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* 5. POCKET TRAINER & SOPS */}
        {currentTab === 'trainer' && (
          <View style={s.tabContent}>
            <Text style={s.sectionTitle}>AI Pocket Trainer & SOP Library</Text>
            <Text style={s.sectionHelp}>Standard operating procedures and recipes for staff training.</Text>

            {trainingDocs.map((doc) => (
              <Card key={doc.id} style={s.docCard}>
                <View style={s.docHeader}>
                  <Text style={s.docTitle}>{doc.title}</Text>
                  <View style={s.docTag}>
                    <Text style={s.docTagText}>{doc.category.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={s.docContent}>{doc.content}</Text>
                {doc.steps && doc.steps.length > 0 && (
                  <View style={s.docSteps}>
                    {doc.steps.map((st) => (
                      <View key={st.step} style={s.stepRow}>
                        <View style={s.stepPill}>
                          <Text style={s.stepPillText}>{st.step}</Text>
                        </View>
                        <Text style={s.stepInstruction}>{st.instruction}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </Card>
            ))}
          </View>
        )}

        {/* 6. PRINTER & POS HARDWARE */}
        {currentTab === 'hardware' && (
          <View style={s.tabContent}>
            <Text style={s.sectionTitle}>Hardware & Integration Adapters</Text>
            <Text style={s.sectionHelp}>ESC/POS, Star WebPRNT, and POS API synchronization.</Text>

            <Card style={s.hardwareCard}>
              <View style={s.hwHeader}>
                <Ionicons name="print" size={24} color={colors.espresso} />
                <View style={{ flex: 1 }}>
                  <Text style={s.hwTitle}>Thermal Receipt & Kitchen Printers</Text>
                  <Text style={s.hwSub}>ESC/POS (TCP Port 9100) & Star WebPRNT</Text>
                </View>
              </View>

              {printers.map((p) => (
                <View key={p.id} style={s.printerItem}>
                  <View>
                    <Text style={s.printerName}>{p.printerName}</Text>
                    <Text style={s.printerIp}>{p.ipAddress}:{p.port} ({p.printerType.toUpperCase()})</Text>
                  </View>
                  <Pressable style={s.testPrintBtn} onPress={handleTestPrint}>
                    <Ionicons name="print-outline" size={14} color={colors.white} />
                    <Text style={s.testPrintText}>Test Print</Text>
                  </Pressable>
                </View>
              ))}

              {printResult && (
                <View style={s.printPreviewBox}>
                  <Text style={s.printPreviewTitle}>Formatted ESC/POS Docket Preview:</Text>
                  <Text style={s.printPreviewText}>{printResult}</Text>
                </View>
              )}
            </Card>

            <Card style={s.hardwareCard}>
              <View style={s.hwHeader}>
                <Ionicons name="swap-horizontal" size={24} color={colors.espresso} />
                <View style={{ flex: 1 }}>
                  <Text style={s.hwTitle}>POS Systems Integration Layer</Text>
                  <Text style={s.hwSub}>Square, Lightspeed, Toast API Bridges</Text>
                </View>
              </View>

              {posConfigs.map((pos) => (
                <View key={pos.id} style={s.posItem}>
                  <View>
                    <Text style={s.posName}>{pos.provider.toUpperCase()} Integration</Text>
                    <Text style={s.posSub}>Mode: {pos.apiEnvironment.toUpperCase()} · Auto Sync Enabled</Text>
                  </View>
                  <Pressable style={s.syncBtn} onPress={() => void handleSyncPOS(pos.provider)}>
                    <Ionicons name="sync-outline" size={14} color={colors.espresso} />
                    <Text style={s.syncBtnText}>Sync Catalog</Text>
                  </Pressable>
                </View>
              ))}
            </Card>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  adminBtn: {
    padding: 8,
  },
  headerBar: {
    marginBottom: 12,
  },
  subHeader: {
    color: colors.caramel,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    color: colors.espresso,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2,
  },
  tabScroll: {
    flexDirection: 'row',
    marginBottom: 14,
  },
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
  tabActive: {
    backgroundColor: colors.espresso,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.espresso,
  },
  tabTextActive: {
    color: colors.white,
  },
  messageBanner: {
    backgroundColor: '#E6F4EA',
    borderWidth: 1,
    borderColor: '#CEEAD6',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  messageText: {
    color: colors.green,
    fontWeight: '800',
    fontSize: 13,
  },
  tabContent: {
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.ink,
  },
  sectionHelp: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
    marginBottom: 14,
    lineHeight: 16,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.espresso,
    marginBottom: 8,
  },
  itemCard: {
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.caramel,
  },
  lowStockCard: {
    borderLeftColor: colors.danger,
    backgroundColor: '#FFFDFD',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
  },
  itemCategory: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  stockPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  normalStockPill: {
    backgroundColor: colors.cream,
  },
  lowStockPill: {
    backgroundColor: '#FCE8E6',
  },
  stockPillText: {
    fontSize: 13,
    fontWeight: '800',
  },
  normalStockPillText: {
    color: colors.espresso,
  },
  lowStockPillText: {
    color: colors.danger,
  },
  predictionRow: {
    flexDirection: 'row',
    backgroundColor: colors.cream,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  predBox: {
    flex: 1,
  },
  predLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.muted,
  },
  predVal: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.espresso,
    marginTop: 2,
  },
  restockAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FDECEA',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  restockAlertText: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '800',
  },
  stockActions: {
    flexDirection: 'row',
    gap: 8,
  },
  stockActionBtn: {
    flex: 1,
    backgroundColor: colors.cream,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  stockActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.espresso,
  },
  stockActionWaste: {
    backgroundColor: '#FDECEA',
  },
  stockActionWasteText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.danger,
  },
  waitMetricsCard: {
    backgroundColor: colors.espresso,
    borderRadius: 16,
    padding: 20,
  },
  waitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  waitBigText: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.white,
  },
  waitSubText: {
    fontSize: 12,
    color: colors.caramel,
    fontWeight: '700',
    marginTop: 2,
  },
  loadBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  load_low: { backgroundColor: colors.green },
  load_moderate: { backgroundColor: colors.caramel },
  load_busy: { backgroundColor: '#FF6B4A' },
  load_rush_hour: { backgroundColor: colors.danger },
  loadBadgeText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 11,
  },
  waitStatsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
    paddingTop: 14,
  },
  waitStat: {
    flex: 1,
  },
  waitStatLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '700',
  },
  waitStatVal: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.white,
    marginTop: 2,
  },
  surgeButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  surgeBtn: {
    flex: 1,
    backgroundColor: colors.cream,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  surgeBtnActive: {
    backgroundColor: colors.espresso,
  },
  surgeBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.espresso,
  },
  surgeBtnTextActive: {
    color: colors.white,
  },
  shiftCard: {
    marginBottom: 10,
  },
  shiftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  shiftName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
  },
  shiftRole: {
    fontSize: 11,
    color: colors.caramel,
    fontWeight: '800',
    marginTop: 2,
  },
  shiftTimeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.cream,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  shiftTimeText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.espresso,
  },
  shiftNotes: {
    fontSize: 12,
    color: colors.muted,
    fontStyle: 'italic',
    marginTop: 6,
  },
  addShiftCard: {
    marginTop: 14,
  },
  addShiftTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.espresso,
    marginBottom: 10,
  },
  input: {
    backgroundColor: colors.cream,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.ink,
    marginBottom: 10,
  },
  timeInputRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  checklistCard: {
    marginBottom: 16,
  },
  chkTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.espresso,
    marginBottom: 12,
  },
  tasksList: {
    gap: 10,
    marginBottom: 14,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  taskText: {
    fontSize: 13,
    color: colors.ink,
    flex: 1,
  },
  taskTextDone: {
    textDecorationLine: 'line-through',
    color: colors.muted,
  },
  signatureBox: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 12,
  },
  docCard: {
    marginBottom: 12,
  },
  docHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  docTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.espresso,
  },
  docTag: {
    backgroundColor: colors.cream,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  docTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.caramel,
  },
  docContent: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 10,
  },
  docSteps: {
    gap: 6,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  stepPill: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.espresso,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepPillText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '800',
  },
  stepInstruction: {
    fontSize: 12,
    color: colors.ink,
    flex: 1,
  },
  hardwareCard: {
    marginBottom: 14,
  },
  hwHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  hwTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.espresso,
  },
  hwSub: {
    fontSize: 11,
    color: colors.muted,
  },
  printerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.cream,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  printerName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.ink,
  },
  printerIp: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  testPrintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.espresso,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  testPrintText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 12,
  },
  printPreviewBox: {
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  printPreviewTitle: {
    color: colors.caramel,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 6,
  },
  printPreviewText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    color: '#00FF66',
    lineHeight: 16,
  },
  posItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.cream,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  posName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.ink,
  },
  posSub: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  syncBtnText: {
    color: colors.espresso,
    fontWeight: '800',
    fontSize: 12,
  },
});
