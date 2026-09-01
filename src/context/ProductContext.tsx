import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';
import { Product } from '@/src/data/products';
import { supabase } from '@/src/lib/supabase';
import { useRestaurant } from '@/src/context/RestaurantContext';
import { useAdminAuth } from '@/src/context/AdminAuthContext';

export type ProductInput = Omit<Product, 'id' | 'soldOut'>;

type ProductStore = {
  products: Product[];
  loading: boolean;
  error?: string;
  addProduct: (input: ProductInput) => Promise<string>;
  updateProduct: (id: string, input: ProductInput) => Promise<void>;
  uploadProductImage: (
    id: string,
    asset: { uri: string; mimeType?: string; file?: Blob },
  ) => Promise<void>;
  removeProductImage: (id: string) => Promise<void>;
  toggleSoldOut: (id: string, soldOut: boolean) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
};

type ProductRow = {
  id: string;
  restaurant_id: string;
  name: string;
  category: Product['category'];
  price_cents: number;
  description: string;
  emoji: string;
  sold_out: boolean;
  image_path: string | null;
  updated_at: string;
};
type ProductGroupRow = { product_id: string; group_id: string };

const Context = createContext<ProductStore | null>(null);

const rowToProduct = (
  row: ProductRow,
  mappings: ProductGroupRow[] = [],
): Product => ({
  id: row.id,
  name: row.name,
  category: row.category,
  price: row.price_cents / 100,
  description: row.description,
  emoji: row.emoji,
  soldOut: row.sold_out,
  imagePath: row.image_path || undefined,
  imageUrl:
    row.image_path && supabase
      ? `${supabase.storage.from('product-images').getPublicUrl(row.image_path).data.publicUrl}?v=${encodeURIComponent(row.updated_at)}`
      : undefined,
  customisationGroupIds: mappings
    .filter((item) => item.product_id === row.id)
    .map((item) => item.group_id),
});

export function ProductProvider({ children }: PropsWithChildren) {
  const { currentRestaurant } = useRestaurant();
  const { staff } = useAdminAuth();
  const targetRestaurantId = staff?.restaurantId || currentRestaurant.id;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const fetchProducts = useCallback(async () => {
    if (!supabase) {
      setError('Supabase is not configured.');
      setLoading(false);
      return;
    }
    const [result, mappingResult] = await Promise.all([
      supabase
        .from('products')
        .select('*')
        .eq('restaurant_id', targetRestaurantId)
        .order('display_order')
        .order('name'),
      supabase.from('product_customisation_groups').select('*'),
    ]);

    if (result.error) {
      setError(result.error.message);
    } else if (mappingResult.error) {
      setError(mappingResult.error.message);
    } else {
      setProducts(
        (result.data as ProductRow[]).map((row) =>
          rowToProduct(row, mappingResult.data as ProductGroupRow[]),
        ),
      );
      setError(undefined);
    }
    setLoading(false);
  }, [targetRestaurantId]);

  useEffect(() => {
    setLoading(true);
    void fetchProducts();
    if (!supabase) return;
    const client = supabase;
    const channel = client
      .channel(`restaurant-menu-${targetRestaurantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
          filter: `restaurant_id=eq.${targetRestaurantId}`,
        },
        () => void fetchProducts(),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_customisation_groups',
        },
        () => void fetchProducts(),
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [fetchProducts, targetRestaurantId]);

  const addProduct = async (input: ProductInput) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const id = `${input.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')}-${String(Date.now()).slice(-4)}`;
    const result = await supabase.from('products').insert({
      id,
      restaurant_id: targetRestaurantId,
      name: input.name,
      category: input.category,
      price_cents: Math.round(input.price * 100),
      description: input.description,
      emoji: input.emoji,
      sold_out: false,
    });
    if (result.error) throw new Error(result.error.message);

    if (input.customisationGroupIds.length) {
      const mapping = await supabase
        .from('product_customisation_groups')
        .insert(
          input.customisationGroupIds.map((group_id) => ({
            product_id: id,
            group_id,
          })),
        );
      if (mapping.error) throw new Error(mapping.error.message);
    }
    await fetchProducts();
    return id;
  };

  const uploadProductImage = async (
    id: string,
    asset: { uri: string; mimeType?: string; file?: Blob },
  ) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const contentType = asset.mimeType || 'image/jpeg';
    const body =
      Platform.OS === 'web' && asset.file
        ? asset.file
        : await (await fetch(asset.uri)).arrayBuffer();
    const path = `${targetRestaurantId}/${id}/menu-image`;
    const upload = await supabase.storage
      .from('product-images')
      .upload(path, body, {
        contentType,
        upsert: true,
        cacheControl: '0',
      });
    if (upload.error) throw new Error(upload.error.message);
    const update = await supabase
      .from('products')
      .update({ image_path: path })
      .eq('id', id);
    if (update.error) throw new Error(update.error.message);
    await fetchProducts();
  };

  const removeProductImage = async (id: string) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const product = products.find((item) => item.id === id);
    if (product?.imagePath) {
      const removed = await supabase.storage
        .from('product-images')
        .remove([product.imagePath]);
      if (removed.error) throw new Error(removed.error.message);
    }
    const update = await supabase
      .from('products')
      .update({ image_path: null })
      .eq('id', id);
    if (update.error) throw new Error(update.error.message);
    await fetchProducts();
  };

  const updateProduct = async (id: string, input: ProductInput) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const result = await supabase
      .from('products')
      .update({
        name: input.name,
        category: input.category,
        price_cents: Math.round(input.price * 100),
        description: input.description,
        emoji: input.emoji,
      })
      .eq('id', id);
    if (result.error) throw new Error(result.error.message);

    await supabase
      .from('product_customisation_groups')
      .delete()
      .eq('product_id', id);
    if (input.customisationGroupIds.length) {
      const mapping = await supabase
        .from('product_customisation_groups')
        .insert(
          input.customisationGroupIds.map((group_id) => ({
            product_id: id,
            group_id,
          })),
        );
      if (mapping.error) throw new Error(mapping.error.message);
    }
    await fetchProducts();
  };

  const toggleSoldOut = async (id: string, soldOut: boolean) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    setProducts((current) =>
      current.map((product) =>
        product.id === id ? { ...product, soldOut } : product,
      ),
    );
    const result = await supabase
      .from('products')
      .update({ sold_out: soldOut })
      .eq('id', id);
    if (result.error) {
      await fetchProducts();
      throw new Error(result.error.message);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const product = products.find((item) => item.id === id);
    if (product?.imagePath)
      await supabase.storage.from('product-images').remove([product.imagePath]);
    const result = await supabase.from('products').delete().eq('id', id);
    if (result.error) throw new Error(result.error.message);
    setProducts((current) => current.filter((product) => product.id !== id));
  };

  const value = useMemo(
    () => ({
      products,
      loading,
      error,
      addProduct,
      updateProduct,
      uploadProductImage,
      removeProductImage,
      toggleSoldOut,
      deleteProduct,
      refresh: fetchProducts,
    }),
    [products, loading, error, fetchProducts, targetRestaurantId],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useProducts() {
  const value = useContext(Context);
  if (!value) throw new Error('useProducts must be used inside ProductProvider');
  return value;
}
