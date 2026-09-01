import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { supabase } from '@/src/lib/supabase';
import { useRestaurant } from '@/src/context/RestaurantContext';
import { useAdminAuth } from '@/src/context/AdminAuthContext';
import { useLoyalty } from '@/src/context/LoyaltyContext';
import { useOrders } from '@/src/context/OrderContext';

export type ServiceRequestType = 'call_staff' | 'water' | 'bill';
export type ServiceRequestStatus = 'pending' | 'acknowledged' | 'completed' | 'cancelled';

export type TableServiceRequest = {
  id: string;
  restaurantId: string;
  tableId?: string;
  tableCode: string;
  tableName: string;
  requestType: ServiceRequestType;
  status: ServiceRequestStatus;
  customerKey: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

type Row = {
  id: string;
  restaurant_id: string;
  table_id: string | null;
  table_code: string;
  table_name: string;
  request_type: ServiceRequestType;
  status: ServiceRequestStatus;
  customer_key: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function mapRow(row: Row): TableServiceRequest {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    tableId: row.table_id || undefined,
    tableCode: row.table_code,
    tableName: row.table_name,
    requestType: row.request_type,
    status: row.status,
    customerKey: row.customer_key,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type Store = {
  requests: TableServiceRequest[];
  loading: boolean;
  error?: string;
  cooldownSeconds: number;
  isCoolingDown: (type: ServiceRequestType) => boolean;
  requestService: (type: ServiceRequestType, notes?: string) => Promise<void>;
  updateStatus: (id: string, status: ServiceRequestStatus) => Promise<void>;
  refresh: () => Promise<void>;
};

const Context = createContext<Store | null>(null);

export function ServiceRequestProvider({ children }: PropsWithChildren) {
  const { currentRestaurant } = useRestaurant();
  const { staff } = useAdminAuth();
  const { customerKey } = useLoyalty();
  const { table, orderMode } = useOrders();

  const [requests, setRequests] = useState<TableServiceRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});

  const targetRestaurantId = staff?.restaurantId || currentRestaurant.id;

  const fetchRequests = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const query = staff
      ? supabase
          .from('table_service_requests')
          .select('*')
          .eq('restaurant_id', targetRestaurantId)
          .in('status', ['pending', 'acknowledged'])
          .order('created_at', { ascending: false })
      : supabase
          .from('table_service_requests')
          .select('*')
          .eq('restaurant_id', currentRestaurant.id)
          .eq('customer_key', customerKey)
          .in('status', ['pending', 'acknowledged'])
          .order('created_at', { ascending: false });

    const { data, error: fetchErr } = await query;
    if (fetchErr && !fetchErr.message.includes('table_service_requests" does not exist')) {
      setError(fetchErr.message);
    } else if (data) {
      setRequests((data as Row[]).map(mapRow));
      setError(undefined);
    }
    setLoading(false);
  }, [staff, targetRestaurantId, currentRestaurant.id, customerKey]);

  useEffect(() => {
    void fetchRequests();
    if (!supabase) return;
    const client = supabase;
    const channel = client
      .channel(`service-requests-${targetRestaurantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'table_service_requests' },
        () => void fetchRequests(),
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [fetchRequests, targetRestaurantId]);

  // Cooldown countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCooldowns((current) => {
        const next = { ...current };
        let changed = false;
        Object.keys(next).forEach((k) => {
          if (next[k] > 0) {
            next[k] -= 1;
            changed = true;
          }
        });
        return changed ? next : current;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const isCoolingDown = useCallback(
    (type: ServiceRequestType) => (cooldowns[type] ?? 0) > 0,
    [cooldowns],
  );

  const requestService = async (type: ServiceRequestType, notes?: string) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    if (orderMode !== 'table' || !table) {
      throw new Error('Table service is only available when seated at a table.');
    }
    if (isCoolingDown(type)) {
      throw new Error(`Please wait ${cooldowns[type]}s before sending another ${type.replace('_', ' ')} request.`);
    }

    const { error: reqErr } = await supabase.rpc('request_table_service', {
      p_restaurant_id: currentRestaurant.id,
      p_table_id: table.id,
      p_request_type: type,
      p_customer_key: customerKey,
      p_notes: notes?.trim() || null,
    });

    if (reqErr) throw new Error(reqErr.message);

    // Set 30s cooldown
    setCooldowns((current) => ({ ...current, [type]: 30 }));
    await fetchRequests();
  };

  const updateStatus = async (id: string, status: ServiceRequestStatus) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { error: updErr } = await supabase.rpc('update_table_service_status', {
      p_request_id: id,
      p_status: status,
    });
    if (updErr) throw new Error(updErr.message);
    await fetchRequests();
  };

  const value = useMemo(
    () => ({
      requests,
      loading,
      error,
      cooldownSeconds: 30,
      isCoolingDown,
      requestService,
      updateStatus,
      refresh: fetchRequests,
    }),
    [requests, loading, error, isCoolingDown, fetchRequests],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useServiceRequests() {
  const value = useContext(Context);
  if (!value) throw new Error('useServiceRequests must be used inside ServiceRequestProvider');
  return value;
}
