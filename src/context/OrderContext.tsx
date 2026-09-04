import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Product } from '@/src/data/products';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSupabaseConfigured, supabase } from '@/src/lib/supabase';
import { CafeTable } from '@/src/context/TableContext';
import { SelectedCustomisation } from '@/src/context/CustomisationContext';
import { useLoyalty } from '@/src/context/LoyaltyContext';
import { usePaymentSettings } from '@/src/context/PaymentSettingsContext';
import { useAdminAuth } from '@/src/context/AdminAuthContext';
import { useRestaurant } from '@/src/context/RestaurantContext';

export type CartItem = {
  cartKey: string;
  product: Product;
  quantity: number;
  notes?: string;
  customisations: SelectedCustomisation[];
  unitPrice: number;
};
export type OrderStatus =
  | 'Incoming'
  | 'Accepted'
  | 'Preparing'
  | 'Ready'
  | 'Collected'
  | 'Cancelled';
export type OrderMode = 'pickup' | 'table';
export type PaymentMethod =
  | 'card'
  | 'apple_pay'
  | 'google_pay'
  | 'pay_at_counter';
export type PaymentStatus = 'paid' | 'unpaid' | 'failed' | 'refunded';

export type Order = {
  id: string;
  restaurantId: string;
  restaurant?: {
    id: string;
    name: string;
    slug: string;
    phone: string;
    address: string;
    logoUrl?: string;
    coverImageUrl?: string;
  };
  customerKey?: string;
  items: CartItem[];
  orderType: OrderMode;
  table?: CafeTable;
  orderNotes?: string;
  pickupTime: string;
  pickupSlot?: string;
  customerName: string;
  phone: string;
  subtotal: number;
  discount: number;
  promoCode?: string;
  freeCoffeeDiscount: number;
  pointsEarned: number;
  pointsRedeemed: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  amountPaid: number;
  customerArrivedAt?: string;
  arrivalNote?: string;
};

type Store = {
  cart: CartItem[];
  cartRestaurantId?: string;
  cartRestaurantName?: string;
  pickupTime: string;
  pickupSlot?: string;
  orderMode: OrderMode;
  table?: CafeTable;
  orderNotes: string;
  promoCode: string;
  redeemFreeCoffee: boolean;
  orders: Order[];
  latestOrder?: Order;
  loadingOrders: boolean;
  backendError?: string;
  addToCart: (
    product: Product,
    quantity?: number,
    notes?: string,
    customisations?: SelectedCustomisation[],
  ) => void;
  setQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  setPickupTime: (time: string, slot?: string) => void;
  setOrderMode: (mode: OrderMode, table?: CafeTable) => void;
  setOrderNotes: (notes: string) => void;
  setPromoCode: (code: string) => void;
  setRedeemFreeCoffee: (redeem: boolean) => void;
  placeOrder: (name: string, phone: string) => Promise<Order>;
  startOnlinePayment: (
    name: string,
    phone: string,
    method: Exclude<PaymentMethod, 'pay_at_counter'>,
  ) => Promise<{
    orderId: string;
    checkoutToken: string;
    clientSecret: string;
    amount: number;
  }>;
  cancelOnlinePayment: (checkoutToken: string) => Promise<void>;
  finishOnlinePayment: (orderId: string) => Promise<Order>;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
  markOrderPaid: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
};

type OrderRow = {
  id: string;
  restaurant_id: string;
  restaurant?: {
    id: string;
    name: string;
    slug: string;
    phone: string;
    address: string;
  };
  customer_name: string;
  customer_key?: string | null;
  phone: string;
  pickup_time: string;
  pickup_slot: string | null;
  total_cents: number;
  status: OrderStatus;
  created_at: string;
  order_type?: OrderMode;
  table_id?: string | null;
  table_code?: string | null;
  table_name?: string | null;
  order_notes?: string | null;
  subtotal_cents?: number;
  discount_cents?: number;
  promo_code?: string | null;
  free_coffee_discount_cents?: number;
  points_earned?: number;
  points_redeemed?: number;
  payment_method?: PaymentMethod;
  payment_status?: PaymentStatus;
  amount_paid_cents?: number;
  customer_arrived_at?: string | null;
  arrival_note?: string | null;
  order_items?: Array<{
    id: number;
    product_id: string;
    product_name: string;
    unit_price_cents: number;
    quantity: number;
    notes: string | null;
    selected_customisations?: SelectedCustomisation[] | null;
  }>;
};

const Context = createContext<Store | null>(null);

function rowToOrder(row: OrderRow): Order {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    restaurant: row.restaurant,
    customerKey: row.customer_key ?? undefined,
    customerName: row.customer_name,
    phone: row.phone,
    orderType: row.order_type ?? 'pickup',
    orderNotes: row.order_notes ?? undefined,
    table:
      row.table_id && row.table_code && row.table_name
        ? {
            id: row.table_id,
            restaurantId: row.restaurant_id,
            code: row.table_code,
            name: row.table_name,
            active: true,
          }
        : undefined,
    pickupTime: row.pickup_time,
    pickupSlot: row.pickup_slot ?? undefined,
    subtotal: (row.subtotal_cents ?? row.total_cents) / 100,
    discount: (row.discount_cents ?? 0) / 100,
    promoCode: row.promo_code ?? undefined,
    freeCoffeeDiscount: (row.free_coffee_discount_cents ?? 0) / 100,
    pointsEarned: row.points_earned ?? 0,
    pointsRedeemed: row.points_redeemed ?? 0,
    total: row.total_cents / 100,
    status: row.status,
    createdAt: row.created_at,
    paymentMethod: row.payment_method ?? 'pay_at_counter',
    paymentStatus: row.payment_status ?? 'unpaid',
    amountPaid: (row.amount_paid_cents ?? 0) / 100,
    customerArrivedAt: row.customer_arrived_at ?? undefined,
    arrivalNote: row.arrival_note ?? undefined,
    items: (row.order_items ?? []).map((item) => ({
      cartKey: `saved-${item.id}`,
      product: {
        id: item.product_id,
        name: item.product_name,
        price: item.unit_price_cents / 100,
        description: '',
        emoji: '☕',
        category: 'Food',
        soldOut: false,
        customisationGroupIds: [],
      },
      quantity: item.quantity,
      notes:
        [
          item.notes,
          ...(item.selected_customisations ?? []).map(
            (option) =>
              `${option.groupName}: ${option.optionName}${option.price ? ` (+$${option.price.toFixed(2)})` : ''}`,
          ),
        ]
          .filter(Boolean)
          .join(' · ') || undefined,
      customisations: item.selected_customisations ?? [],
      unitPrice: item.unit_price_cents / 100,
    })),
  };
}

export function OrderProvider({ children }: PropsWithChildren) {
  const { currentRestaurant } = useRestaurant();
  const { staff, isSuperAdmin } = useAdminAuth();
  const targetRestaurantId = staff?.restaurantId || currentRestaurant.id;

  const {
    customerKey,
    promos,
    balance,
    settings,
    refresh: refreshLoyalty,
  } = useLoyalty();
  const { payAtCounterEnabled } = usePaymentSettings();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartRestaurantId, setCartRestaurantId] = useState<string>();
  const [cartRestaurantName, setCartRestaurantName] = useState<string>();
  const [pickupTime, setPickupTimeValue] = useState('');
  const [pickupSlot, setPickupSlot] = useState<string>();
  const [orderMode, setOrderModeValue] = useState<OrderMode>('pickup');
  const [table, setTable] = useState<CafeTable>();
  const [orderNotes, setOrderNotes] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [redeemFreeCoffee, setRedeemFreeCoffee] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(isSupabaseConfigured);
  const [backendError, setBackendError] = useState<string>();

  useEffect(() => {
    void AsyncStorage.getItem(`cafe-order-mode-${currentRestaurant.id}`).then((saved) => {
      if (!saved) {
        // Clear table mode if switching restaurant
        setOrderModeValue('pickup');
        setTable(undefined);
        return;
      }
      try {
        const value = JSON.parse(saved) as { mode?: OrderMode; table?: CafeTable };
        if (value.mode === 'table' && value.table?.id) {
          setOrderModeValue('table');
          setTable(value.table);
        } else {
          setOrderModeValue('pickup');
          setTable(undefined);
        }
      } catch {
        void AsyncStorage.removeItem(`cafe-order-mode-${currentRestaurant.id}`);
      }
    });
  }, [currentRestaurant.id]);

  const fetchOrders = useCallback(async () => {
    if (!supabase) {
      setBackendError(
        'Supabase is not configured. Add the required EXPO_PUBLIC_ environment variables.',
      );
      setLoadingOrders(false);
      return;
    }

    let result;
    if (staff) {
      let query = supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false });

      if (!isSuperAdmin && staff.restaurantId) {
        query = query.eq('restaurant_id', staff.restaurantId);
      } else if (staff.restaurantId) {
        query = query.eq('restaurant_id', staff.restaurantId);
      }
      result = await query;
    } else {
      result = await supabase.rpc('get_customer_orders', {
        p_customer_key: customerKey,
        p_restaurant_id: currentRestaurant.id,
      });
    }

    if (result.error) {
      setBackendError(result.error.message);
    } else {
      setOrders(((result.data as OrderRow[]) || []).map(rowToOrder));
      setBackendError(undefined);
    }
    setLoadingOrders(false);
  }, [customerKey, staff, isSuperAdmin, currentRestaurant.id]);

  useEffect(() => {
    setLoadingOrders(true);
    void fetchOrders();
    if (!supabase) return;
    const client = supabase;
    const channel = staff
      ? client
          .channel(`restaurant-orders-${targetRestaurantId}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'orders' },
            () => void fetchOrders(),
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'order_items' },
            () => void fetchOrders(),
          )
          .subscribe()
      : client
          .channel(`customer-order:${customerKey}`)
          .on('broadcast', { event: 'order-change' }, () => void fetchOrders())
          .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [fetchOrders, staff, targetRestaurantId, customerKey]);

  const addToCart = (
    product: Product,
    quantity = 1,
    notes = '',
    customisations: SelectedCustomisation[] = [],
  ) => {
    setCartRestaurantId(currentRestaurant.id);
    setCartRestaurantName(currentRestaurant.name);
    setCart((current) => {
      const signature = customisations
        .map((item) => item.optionId)
        .sort()
        .join('-');
      const cartKey = `${product.id}:${signature}:${notes}`;
      const unitPrice =
        product.price +
        customisations.reduce((sum, item) => sum + item.price, 0);
      const existing = current.find((item) => item.cartKey === cartKey);
      if (existing)
        return current.map((item) =>
          item === existing
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        );
      return [
        ...current,
        { cartKey, product, quantity, notes, customisations, unitPrice },
      ];
    });
  };

  const clearCart = () => {
    setCart([]);
    setCartRestaurantId(undefined);
    setCartRestaurantName(undefined);
  };

  const setQuantity = (id: string, quantity: number) =>
    setCart((current) =>
      current
        .map((item) => (item.cartKey === id ? { ...item, quantity } : item))
        .filter((item) => item.quantity > 0),
    );

  const placeOrder = async (customerName: string, phone: string) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    if (!payAtCounterEnabled)
      throw new Error(
        'Pay at Counter / Pickup is currently unavailable. Please pay online.',
      );
    const subtotal = cart.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );
    const promo = promos.find(
      (item) =>
        item.enabled &&
        item.code === promoCode.trim().toUpperCase() &&
        subtotal >= item.minimumSpend &&
        (!item.expiresAt || new Date(item.expiresAt) >= new Date()),
    );
    const promoDiscount = promo
      ? promo.discountType === 'percent'
        ? (subtotal * promo.discountValue) / 100
        : promo.discountValue
      : 0;
    const coffees = cart.filter((item) => item.product.category === 'Coffee');
    const freeCoffeeDiscount =
      redeemFreeCoffee &&
      settings.enabled &&
      balance.freeCoffees > 0 &&
      coffees.length
        ? Math.min(
            ...coffees.map((item) => item.unitPrice),
            settings.freeCoffeeMaxCents / 100,
          )
        : 0;
    const discount = Math.min(subtotal, promoDiscount + freeCoffeeDiscount);
    const netTotal = subtotal - discount;

    const order: Order = {
      id: `${orderMode === 'table' ? 'TB' : 'CC'}-${String(Date.now()).slice(-5)}`,
      restaurantId: currentRestaurant.id,
      customerKey,
      items: [...cart],
      pickupTime: orderMode === 'table' ? 'Table service' : pickupTime,
      pickupSlot: orderMode === 'pickup' ? pickupSlot : undefined,
      customerName:
        customerName.trim() || (orderMode === 'table' ? table?.name || 'Table Guest' : 'Guest'),
      phone: phone.trim() || (orderMode === 'table' ? 'Table Order' : ''),
      orderType: orderMode,
      table,
      orderNotes: orderNotes.trim() || undefined,
      subtotal,
      discount,
      promoCode: promo?.code,
      freeCoffeeDiscount,
      pointsEarned: Math.floor(netTotal * settings.pointsPerDollar),
      pointsRedeemed: freeCoffeeDiscount > 0 ? 1 : 0,
      total: netTotal,
      status: 'Incoming',
      createdAt: new Date().toISOString(),
      paymentMethod: 'pay_at_counter',
      paymentStatus: 'unpaid',
      amountPaid: 0,
    };

    if (orderMode === 'pickup' && !pickupSlot)
      throw new Error('Please select a pickup time.');
    if (orderMode === 'table' && !table)
      throw new Error('Open this menu using your table QR code.');

    const items = order.items.map((item) => ({
      product_id: item.product.id,
      product_name: item.product.name,
      unit_price_cents: Math.round(item.unitPrice * 100),
      quantity: item.quantity,
      notes: item.notes || '',
      selected_customisations: item.customisations,
      is_coffee: item.product.category === 'Coffee',
    }));

    const rewards = {
      p_customer_key: customerKey,
      p_promo_code: promoCode.trim() || null,
      p_redeem_free_coffee: redeemFreeCoffee,
      p_restaurant_id: currentRestaurant.id,
    };

    const request =
      orderMode === 'table'
        ? supabase.rpc('place_table_order', {
            p_id: order.id,
            p_table_id: table!.id,
            p_order_notes: orderNotes.trim(),
            p_items: items,
            ...rewards,
          })
        : supabase.rpc('place_cafe_order', {
            p_id: order.id,
            p_customer_name: order.customerName,
            p_phone: order.phone,
            p_pickup_time: order.pickupTime,
            p_pickup_slot: pickupSlot,
            p_items: items,
            ...rewards,
          });

    const { error: orderError } = await request;
    if (orderError) throw new Error(orderError.message);

    setOrders((current) => [
      order,
      ...current.filter((item) => item.id !== order.id),
    ]);
    setCart([]);
    setOrderNotes('');
    setPromoCode('');
    setRedeemFreeCoffee(false);
    void refreshLoyalty();
    return order;
  };

  const startOnlinePayment = async (
    customerName: string,
    phone: string,
    paymentMethod: Exclude<PaymentMethod, 'pay_at_counter'>,
  ) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    if (orderMode === 'pickup' && !pickupSlot)
      throw new Error('Please select a pickup time.');
    if (orderMode === 'table' && !table)
      throw new Error('Open this menu using your table QR code.');

    const orderId = `${orderMode === 'table' ? 'TB' : 'CC'}-${String(Date.now()).slice(-5)}`;
    const idempotencyKey = `${orderId}-${customerKey}-${Date.now()}`;
    const items = cart.map((item) => ({
      product_id: item.product.id,
      quantity: item.quantity,
      notes: item.notes || '',
      selected_customisations: item.customisations.map((option) => ({
        optionId: option.optionId,
      })),
    }));

    const { data, error } = await supabase.functions.invoke(
      'create-payment-intent',
      {
        body: {
          idempotencyKey,
          customerKey,
          restaurantId: currentRestaurant.id,
          orderId,
          orderType: orderMode,
          paymentMethod,
          customerName: customerName.trim() || (orderMode === 'table' ? table?.name || 'Table Guest' : 'Guest'),
          phone: phone.trim() || (orderMode === 'table' ? 'Table Order' : ''),
          pickupTime: orderMode === 'table' ? 'Table service' : pickupTime,
          pickupSlot: orderMode === 'pickup' ? pickupSlot : null,
          tableId: table?.id ?? null,
          orderNotes,
          items,
          promoCode: promoCode.trim() || null,
          redeemFreeCoffee,
        },
      },
    );
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    if (!data?.clientSecret || (!data?.orderId && !orderId))
      throw new Error('Stripe did not return a secure payment session.');

    return {
      orderId,
      checkoutToken: data.checkoutToken as string,
      clientSecret: data.clientSecret as string,
      amount: Number(data.amountCents) / 100,
    };
  };

  const cancelOnlinePayment = async (checkoutToken: string) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { data, error } = await supabase.functions.invoke(
      'cancel-payment-intent',
      { body: { checkoutToken, customerKey } },
    );
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
  };

  const finishOnlinePayment = async (orderId: string) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    for (let attempt = 0; attempt < 20; attempt++) {
      const { data: visibleOrders, error } = await supabase.rpc(
        'get_customer_orders',
        { p_customer_key: customerKey, p_restaurant_id: currentRestaurant.id },
      );
      const data = (visibleOrders as OrderRow[] | null)?.find(
        (row) => row.id === orderId,
      );
      if (error) throw new Error(error.message);
      if (data?.payment_status === 'paid') {
        const order = rowToOrder(data as OrderRow);
        setOrders((current) => [
          order,
          ...current.filter((item) => item.id !== order.id),
        ]);
        setCart([]);
        setOrderNotes('');
        setPromoCode('');
        setRedeemFreeCoffee(false);
        void refreshLoyalty();
        return order;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw new Error(
      'Payment is processing. Your order will appear as soon as Stripe confirms it.',
    );
  };

  const updateOrderStatus = async (id: string, status: OrderStatus) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const previous = orders;
    setOrders((current) =>
      current.map((order) => (order.id === id ? { ...order, status } : order)),
    );
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id);
    if (error) {
      setOrders(previous);
      throw new Error(error.message);
    }
  };

  const markOrderPaid = async (id: string) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const previous = orders;
    setOrders((current) =>
      current.map((order) =>
        order.id === id
          ? {
              ...order,
              paymentStatus: 'paid',
              amountPaid: order.total,
            }
          : order,
      ),
    );
    const { error } = await supabase.rpc('mark_order_paid', {
      p_order_id: id,
    });
    if (error) {
      setOrders(previous);
      throw new Error(error.message);
    }
  };

  const setPickupTime = (time: string, slot?: string) => {
    setPickupTimeValue(time);
    setPickupSlot(slot);
  };

  const setOrderMode = (mode: OrderMode, selectedTable?: CafeTable) => {
    setOrderModeValue(mode);
    setTable(mode === 'table' ? selectedTable : undefined);
    void AsyncStorage.setItem(
      `cafe-order-mode-${currentRestaurant.id}`,
      JSON.stringify({ mode, table: mode === 'table' ? selectedTable : undefined }),
    );
  };

  const value = useMemo(
    () => ({
      cart,
      cartRestaurantId,
      cartRestaurantName,
      pickupTime,
      pickupSlot,
      orderMode,
      table,
      orderNotes,
      promoCode,
      redeemFreeCoffee,
      orders,
      latestOrder: orders[0],
      loadingOrders,
      backendError,
      addToCart,
      setQuantity,
      clearCart,
      setPickupTime,
      setOrderMode,
      setOrderNotes,
      setPromoCode,
      setRedeemFreeCoffee,
      placeOrder,
      startOnlinePayment,
      cancelOnlinePayment,
      finishOnlinePayment,
      updateOrderStatus,
      markOrderPaid,
      refresh: fetchOrders,
    }),
    [
      cart,
      cartRestaurantId,
      cartRestaurantName,
      pickupTime,
      pickupSlot,
      orderMode,
      table,
      orderNotes,
      promoCode,
      redeemFreeCoffee,
      orders,
      loadingOrders,
      backendError,
      payAtCounterEnabled,
      fetchOrders,
    ],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useOrders() {
  const value = useContext(Context);
  if (!value) throw new Error('useOrders must be used inside OrderProvider');
  return value;
}
