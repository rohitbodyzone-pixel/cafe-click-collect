import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/src/lib/supabase';
import { useRestaurant } from './RestaurantContext';
import { PrinterConfig, KitchenDocketPayload, CustomerReceiptPayload } from '../services/printer/types';
import { PrinterService } from '../services/printer/printerService';
import { POSIntegrationConfig, POSSyncResult } from '../services/pos/types';
import { POSService } from '../services/pos/posService';

export interface InventoryItem {
  id: string;
  restaurantId: string;
  name: string;
  category: 'coffee' | 'dairy' | 'bakery' | 'packaging' | 'ingredient';
  unit: string;
  currentStock: number;
  minThreshold: number;
  optimalStock: number;
  dailyConsumptionRate: number;
  costPerUnitCents: number;
  supplierName?: string;
  lastRestockedAt?: string;
  daysRemaining: number;
  isLowStock: boolean;
}

export interface StaffShift {
  id: string;
  restaurantId: string;
  staffName: string;
  staffRole: 'head_barista' | 'barista' | 'chef' | 'counter' | 'manager';
  shiftDate: string;
  startTime: string;
  endTime: string;
  notes?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

export interface OperationsChecklist {
  id: string;
  restaurantId: string;
  checklistType: 'opening' | 'closing' | 'shift_change' | 'deep_clean';
  title: string;
  items: Array<{ id: string; task: string; done: boolean }>;
}

export interface ChecklistCompletion {
  id: string;
  restaurantId: string;
  checklistType: string;
  completedBy: string;
  completedItems: any[];
  notes?: string;
  completedAt: string;
}

export interface TrainingDoc {
  id: string;
  restaurantId: string;
  category: 'recipe' | 'equipment' | 'service' | 'troubleshooting' | 'pos';
  title: string;
  content: string;
  steps: Array<{ step: number; instruction: string }>;
  tags: string[];
}

export interface WaitTimeInfo {
  basePrepMinutes: number;
  activeOrders: number;
  surgeMinutes: number;
  estimatedWaitMinutes: number;
  loadLevel: 'low' | 'moderate' | 'busy' | 'rush_hour';
}

export interface OfflineAction {
  id: string;
  actionType: 'bump_order_status' | 'create_order' | 'mark_paid' | 'complete_checklist';
  payload: any;
  createdAt: string;
}

interface RestaurantOperationsContextType {
  // Inventory
  inventory: InventoryItem[];
  recordInventoryUsage: (itemId: string, qty: number, reason: 'order_deduction' | 'waste_spoilage' | 'manual_restock', notes?: string) => Promise<void>;
  // Wait Time Balancer
  waitTime: WaitTimeInfo;
  setManualSurge: (surgeMins: number) => Promise<void>;
  // Staff Scheduler
  shifts: StaffShift[];
  generateSmartRoster: (date: string) => Promise<void>;
  addShift: (shift: Omit<StaffShift, 'id' | 'restaurantId'>) => Promise<void>;
  // Checklists
  checklists: OperationsChecklist[];
  completions: ChecklistCompletion[];
  submitChecklist: (type: 'opening' | 'closing' | 'shift_change' | 'deep_clean', staffName: string, items: any[], notes?: string) => Promise<void>;
  // Pocket Trainer & SOPs
  trainingDocs: TrainingDoc[];
  // Printers & POS
  printers: PrinterConfig[];
  posConfigs: POSIntegrationConfig[];
  testPrintKitchenDocket: (printerId?: string) => Promise<{ success: boolean; message: string; formatted: string }>;
  syncPOSProvider: (provider: string) => Promise<POSSyncResult>;
  // Offline Mode
  isOffline: boolean;
  offlineQueueCount: number;
  syncOfflineQueue: () => Promise<void>;
  loading: boolean;
  refresh: () => Promise<void>;
}

const RestaurantOperationsContext = createContext<RestaurantOperationsContextType | undefined>(undefined);

export function RestaurantOperationsProvider({ children }: { children: React.ReactNode }) {
  const { currentRestaurant } = useRestaurant();

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [shifts, setShifts] = useState<StaffShift[]>([]);
  const [checklists, setChecklists] = useState<OperationsChecklist[]>([]);
  const [completions, setCompletions] = useState<ChecklistCompletion[]>([]);
  const [trainingDocs, setTrainingDocs] = useState<TrainingDoc[]>([]);
  const [printers, setPrinters] = useState<PrinterConfig[]>([]);
  const [posConfigs, setPosConfigs] = useState<POSIntegrationConfig[]>([]);
  const [waitTime, setWaitTime] = useState<WaitTimeInfo>({
    basePrepMinutes: 10,
    activeOrders: 0,
    surgeMinutes: 0,
    estimatedWaitMinutes: 10,
    loadLevel: 'low',
  });
  const [isOffline, setIsOffline] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState<OfflineAction[]>([]);
  const [loading, setLoading] = useState(true);

  // Load Operations Data
  const loadOperationsData = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    try {
      // 1. Inventory Items
      const { data: invData } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('restaurant_id', currentRestaurant.id);

      if (invData) {
        setInventory(
          invData.map((i) => {
            const current = Number(i.current_stock);
            const rate = Number(i.daily_consumption_rate) || 1;
            const days = rate > 0 ? Math.round((current / rate) * 10) / 10 : 99;
            return {
              id: i.id,
              restaurantId: i.restaurant_id,
              name: i.name,
              category: i.category,
              unit: i.unit,
              currentStock: current,
              minThreshold: Number(i.min_threshold),
              optimalStock: Number(i.optimal_stock),
              dailyConsumptionRate: rate,
              costPerUnitCents: i.cost_per_unit_cents,
              supplierName: i.supplier_name,
              lastRestockedAt: i.last_restocked_at,
              daysRemaining: days,
              isLowStock: current <= Number(i.min_threshold),
            };
          }),
        );
      }

      // 2. Staff Shifts (today and upcoming)
      const todayStr = new Date().toISOString().split('T')[0];
      const { data: shiftData } = await supabase
        .from('staff_shifts')
        .select('*')
        .eq('restaurant_id', currentRestaurant.id)
        .gte('shift_date', todayStr)
        .order('shift_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (shiftData) {
        setShifts(
          shiftData.map((s) => ({
            id: s.id,
            restaurantId: s.restaurant_id,
            staffName: s.staff_name,
            staffRole: s.staff_role,
            shiftDate: s.shift_date,
            startTime: s.start_time,
            endTime: s.end_time,
            notes: s.notes,
            status: s.status,
          })),
        );
      }

      // 3. Operations Checklists & Completions
      const { data: checkData } = await supabase
        .from('operations_checklists')
        .select('*')
        .eq('restaurant_id', currentRestaurant.id);

      if (checkData) {
        setChecklists(
          checkData.map((c) => ({
            id: c.id,
            restaurantId: c.restaurant_id,
            checklistType: c.checklist_type,
            title: c.title,
            items: c.items,
          })),
        );
      }

      const { data: compData } = await supabase
        .from('checklist_completions')
        .select('*')
        .eq('restaurant_id', currentRestaurant.id)
        .order('completed_at', { ascending: false })
        .limit(10);

      if (compData) {
        setCompletions(
          compData.map((c) => ({
            id: c.id,
            restaurantId: c.restaurant_id,
            checklistType: c.checklist_type,
            completedBy: c.completed_by,
            completedItems: c.completed_items,
            notes: c.notes,
            completedAt: c.completed_at,
          })),
        );
      }

      // 4. SOP & Training Docs
      const { data: trainData } = await supabase
        .from('restaurant_training_docs')
        .select('*')
        .eq('restaurant_id', currentRestaurant.id);

      if (trainData) {
        setTrainingDocs(
          trainData.map((t) => ({
            id: t.id,
            restaurantId: t.restaurant_id,
            category: t.category,
            title: t.title,
            content: t.content,
            steps: t.steps,
            tags: t.tags || [],
          })),
        );
      }

      // 5. Printers & POS
      const { data: prData } = await supabase
        .from('printer_configs')
        .select('*')
        .eq('restaurant_id', currentRestaurant.id);

      if (prData) {
        setPrinters(
          prData.map((p) => ({
            id: p.id,
            restaurantId: p.restaurant_id,
            printerName: p.printer_name,
            printerType: p.printer_type,
            connectionType: p.connection_type,
            ipAddress: p.ip_address,
            port: p.port,
            autoPrintOnOrder: p.auto_print_on_order,
            printCustomerReceipts: p.print_customer_receipts,
          })),
        );
      }

      const { data: posData } = await supabase
        .from('pos_integrations')
        .select('*')
        .eq('restaurant_id', currentRestaurant.id);

      if (posData) {
        setPosConfigs(
          posData.map((p) => ({
            id: p.id,
            restaurantId: p.restaurant_id,
            provider: p.provider,
            enabled: p.enabled,
            syncMenu: p.sync_menu,
            syncOrders: p.sync_orders,
            apiEnvironment: p.api_environment,
            webhookUrl: p.webhook_url,
            lastSyncAt: p.last_sync_at,
          })),
        );
      }

      // 6. Dynamic Wait Time
      const { data: waitRes } = await supabase.rpc('calculate_dynamic_wait_time', {
        p_restaurant_id: currentRestaurant.id,
      });

      if (waitRes) {
        setWaitTime({
          basePrepMinutes: waitRes.base_prep_minutes || 10,
          activeOrders: waitRes.active_orders || 0,
          surgeMinutes: waitRes.surge_minutes || 0,
          estimatedWaitMinutes: waitRes.estimated_wait_minutes || 10,
          loadLevel: waitRes.load_level || 'low',
        });
      }
    } catch (e) {
      console.warn('Error loading operations data:', e);
    } finally {
      setLoading(false);
    }
  }, [currentRestaurant.id]);

  useEffect(() => {
    void loadOperationsData();
  }, [loadOperationsData]);

  // Inventory Usage / Restock
  const recordInventoryUsage = async (
    itemId: string,
    qty: number,
    reason: 'order_deduction' | 'waste_spoilage' | 'manual_restock',
    notes?: string,
  ) => {
    if (!supabase) return;
    await supabase.rpc('record_inventory_usage', {
      p_restaurant_id: currentRestaurant.id,
      p_item_id: itemId,
      p_quantity: qty,
      p_reason: reason,
      p_notes: notes || null,
    });
    await loadOperationsData();
  };

  // Dynamic Wait-Time Manual Surge Control
  const setManualSurge = async (surgeMins: number) => {
    if (!supabase) return;
    await supabase.rpc('set_manual_surge_minutes', {
      p_restaurant_id: currentRestaurant.id,
      p_surge: Math.max(0, surgeMins),
    });
    await loadOperationsData();
  };

  // AI Staff Scheduler Roster Generation
  const generateSmartRoster = async (date: string) => {
    if (!supabase) return;
    await supabase.rpc('generate_smart_shift_schedule', {
      p_restaurant_id: currentRestaurant.id,
      p_date: date,
    });
    await loadOperationsData();
  };

  const addShift = async (shift: Omit<StaffShift, 'id' | 'restaurantId'>) => {
    if (!supabase) return;
    await supabase.from('staff_shifts').insert({
      restaurant_id: currentRestaurant.id,
      staff_name: shift.staffName,
      staff_role: shift.staffRole,
      shift_date: shift.shiftDate,
      start_time: shift.startTime,
      end_time: shift.endTime,
      notes: shift.notes || null,
      status: shift.status || 'scheduled',
    });
    await loadOperationsData();
  };

  // Submit Operations Checklist
  const submitChecklist = async (
    type: 'opening' | 'closing' | 'shift_change' | 'deep_clean',
    staffName: string,
    items: any[],
    notes?: string,
  ) => {
    if (!supabase) return;
    await supabase.rpc('complete_operations_checklist', {
      p_restaurant_id: currentRestaurant.id,
      p_type: type,
      p_staff_name: staffName,
      p_items: items,
      p_notes: notes || null,
    });
    await loadOperationsData();
  };

  // Printer Test Dispatch
  const testPrintKitchenDocket = async (printerId?: string) => {
    const targetPrinter =
      printers.find((p) => p.id === printerId) ||
      printers[0] || {
        id: 'mock-1',
        restaurantId: currentRestaurant.id,
        printerName: 'Default Kitchen Printer',
        printerType: 'esc_pos' as const,
        connectionType: 'network' as const,
        ipAddress: '192.168.1.200',
        port: 9100,
        autoPrintOnOrder: true,
        printCustomerReceipts: false,
      };

    const mockPayload: KitchenDocketPayload = {
      orderId: 'ORD-TEST-99',
      orderNumber: '#99',
      restaurantName: currentRestaurant.name,
      orderType: 'pickup',
      customerName: 'Sarah Jenkins',
      pickupTime: '10:15 AM',
      createdAt: new Date().toISOString(),
      items: [
        { name: 'Flat White (Large)', quantity: 2, modifiers: ['Oat Milk', 'Extra Hot'], notes: 'Tulip latte art' },
        { name: 'Warm Blueberry Muffin', quantity: 1, modifiers: ['Toasted w/ Butter'] },
      ],
      orderNotes: 'Urgent meeting order - thank you!',
    };

    return PrinterService.printKitchenDocket(targetPrinter, mockPayload);
  };

  // POS Sync Trigger
  const syncPOSProvider = async (provider: string): Promise<POSSyncResult> => {
    const config = posConfigs.find((p) => p.provider === provider) || {
      id: 'mock-pos',
      restaurantId: currentRestaurant.id,
      provider: 'mock' as const,
      enabled: true,
      syncMenu: true,
      syncOrders: true,
      apiEnvironment: 'sandbox' as const,
    };

    return POSService.syncMenu(config);
  };

  // Offline Queue Flush & Sync
  const syncOfflineQueue = async () => {
    try {
      const stored = await AsyncStorage.getItem('@cafe_offline_queue');
      if (!stored) return;
      const queue: OfflineAction[] = JSON.parse(stored);
      if (queue.length === 0) return;

      console.log(`[Offline Sync] Processing ${queue.length} queued offline actions...`);
      for (const item of queue) {
        if (item.actionType === 'bump_order_status' && supabase) {
          await supabase.from('orders').update({ status: item.payload.status }).eq('id', item.payload.orderId);
        }
      }
      await AsyncStorage.removeItem('@cafe_offline_queue');
      setOfflineQueue([]);
      setIsOffline(false);
    } catch (e) {
      console.warn('Error during offline sync:', e);
    }
  };

  return (
    <RestaurantOperationsContext.Provider
      value={{
        inventory,
        recordInventoryUsage,
        waitTime,
        setManualSurge,
        shifts,
        generateSmartRoster,
        addShift,
        checklists,
        completions,
        submitChecklist,
        trainingDocs,
        printers,
        posConfigs,
        testPrintKitchenDocket,
        syncPOSProvider,
        isOffline,
        offlineQueueCount: offlineQueue.length,
        syncOfflineQueue,
        loading,
        refresh: loadOperationsData,
      }}
    >
      {children}
    </RestaurantOperationsContext.Provider>
  );
}

export function useRestaurantOperations() {
  const context = useContext(RestaurantOperationsContext);
  if (!context) {
    throw new Error('useRestaurantOperations must be used within a RestaurantOperationsProvider');
  }
  return context;
}
