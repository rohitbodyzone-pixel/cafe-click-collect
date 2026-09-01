type Db = any;

export type CheckoutItem = {
  product_id: string;
  quantity: number;
  notes?: string;
  selected_customisations?: Array<{ optionId: string }>;
};

export type PricedItem = {
  product_id: string;
  product_name: string;
  unit_price_cents: number;
  quantity: number;
  notes: string;
  selected_customisations: Array<{
    groupId: string; groupName: string; optionId: string; optionName: string; price: number;
  }>;
  is_coffee: boolean;
};

const fail = (message: string): never => { throw new Error(message); };

export async function createSecureQuote(db: Db, rawItems: CheckoutItem[], customerKey: string, rawPromoCode?: string, redeemFreeCoffee = false) {
  if (!Array.isArray(rawItems) || rawItems.length < 1 || rawItems.length > 50) fail('Your cart is empty or too large.');
  const ids = [...new Set(rawItems.map(item => String(item.product_id || '')))];
  if (ids.some(id => !id)) fail('A cart item is invalid.');

  const { data: products, error: productError } = await db.from('products')
    .select('id,name,category,price_cents,sold_out').in('id', ids);
  if (productError) fail(productError.message);
  const productMap = new Map((products ?? []).map((row: any) => [row.id, row]));
  if (productMap.size !== ids.length) fail('A menu item is no longer available.');

  const optionIds = [...new Set(rawItems.flatMap(item =>
    (item.selected_customisations ?? []).map(option => String(option.optionId || ''))
  ).filter(Boolean))];
  let optionMap = new Map<string, any>();
  if (optionIds.length) {
    const { data: options, error: optionError } = await db.from('customisation_options')
      .select('id,group_id,name,price_adjustment_cents,available,customisation_groups(name)')
      .in('id', optionIds);
    if (optionError) fail(optionError.message);
    optionMap = new Map((options ?? []).map((row: any) => [row.id, row]));
  }

  const { data: assignments, error: assignmentError } = await db.from('product_customisation_groups')
    .select('product_id,group_id').in('product_id', ids);
  if (assignmentError) fail(assignmentError.message);
  const allowed = new Set((assignments ?? []).map((row: any) => `${row.product_id}:${row.group_id}`));
  const assignedGroupIds = [...new Set((assignments ?? []).map((row: any) => row.group_id))];
  const { data: groupRows, error: groupError } = assignedGroupIds.length
    ? await db.from('customisation_groups').select('id,kind').in('id', assignedGroupIds)
    : { data: [], error: null };
  if (groupError) fail(groupError.message);
  const groupKinds = new Map((groupRows ?? []).map((row: any) => [row.id, row.kind]));

  const items: PricedItem[] = rawItems.map(raw => {
    const product: any = productMap.get(raw.product_id);
    if (!product || product.sold_out) fail(`${product?.name ?? 'This item'} is sold out.`);
    const quantity = Number(raw.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) fail('An item quantity is invalid.');
    const rawSelections = raw.selected_customisations ?? [];
    if (new Set(rawSelections.map(selection => selection.optionId)).size !== rawSelections.length)
      fail(`A customisation for ${product.name} was selected more than once.`);
    const selected = rawSelections.map(selection => {
      const option = optionMap.get(selection.optionId);
      if (!option || !option.available || !allowed.has(`${product.id}:${option.group_id}`))
        fail(`A customisation for ${product.name} is unavailable.`);
      return {
        groupId: option.group_id,
        groupName: option.customisation_groups?.name ?? option.group_id,
        optionId: option.id,
        optionName: option.name,
        price: option.price_adjustment_cents / 100,
      };
    });
    const selectedByGroup = new Map<string, typeof selected>();
    selected.forEach(option => selectedByGroup.set(option.groupId, [...(selectedByGroup.get(option.groupId) ?? []), option]));
    const productGroups = (assignments ?? []).filter((row: any) => row.product_id === product.id).map((row: any) => row.group_id);
    const noSugar = selected.some(option => option.groupId === 'sugar-quantity' && option.optionName === 'No sugar');
    productGroups.forEach((groupId: string) => {
      const count = selectedByGroup.get(groupId)?.length ?? 0; const kind = groupKinds.get(groupId);
      if (kind !== 'extras' && !(kind === 'sugar_type' && noSugar) && count !== 1)
        fail(`Please choose one ${groupId.replaceAll('-', ' ')} option for ${product.name}.`);
      if (kind !== 'extras' && count > 1) fail(`Only one ${groupId.replaceAll('-', ' ')} option can be selected.`);
    });
    const unitPrice = product.price_cents + selected.reduce((sum, option) => sum + Math.round(option.price * 100), 0);
    return {
      product_id: product.id, product_name: product.name, unit_price_cents: unitPrice,
      quantity, notes: String(raw.notes ?? '').slice(0, 500), selected_customisations: selected,
      is_coffee: product.category === 'Coffee',
    };
  });

  const subtotalCents = items.reduce((sum, item) => sum + item.unit_price_cents * item.quantity, 0);
  let promoCode: string | null = null;
  let promoDiscountCents = 0;
  const normalizedPromo = String(rawPromoCode ?? '').trim().toUpperCase();
  if (normalizedPromo) {
    const { data: promo } = await db.from('promo_codes').select('*').eq('code', normalizedPromo)
      .eq('enabled', true).maybeSingle();
    const valid = promo && subtotalCents >= promo.minimum_spend_cents &&
      (!promo.expires_at || new Date(promo.expires_at).getTime() >= Date.now());
    if (!valid) fail('This promo code is invalid, expired, or does not meet the minimum spend.');
    promoCode = promo.code;
    promoDiscountCents = promo.discount_type === 'percent'
      ? Math.floor(subtotalCents * Number(promo.discount_value) / 100)
      : Math.round(Number(promo.discount_value));
  }

  const [{ data: settings }, { data: balance }] = await Promise.all([
    db.from('loyalty_settings').select('*').eq('id', 1).single(),
    db.from('customer_loyalty').select('*').eq('customer_key', customerKey).maybeSingle(),
  ]);
  const coffeePrices = items.filter(item => item.is_coffee).map(item => item.unit_price_cents);
  const freeCoffeeDiscountCents = redeemFreeCoffee && settings?.enabled && Number(balance?.free_coffees ?? 0) > 0 && coffeePrices.length
    ? Math.min(Math.min(...coffeePrices), settings.free_coffee_max_cents) : 0;
  const discountCents = Math.min(subtotalCents, promoDiscountCents + freeCoffeeDiscountCents);
  const totalCents = subtotalCents - discountCents;

  return { items, subtotalCents, discountCents, promoCode, freeCoffeeDiscountCents, totalCents };
}
