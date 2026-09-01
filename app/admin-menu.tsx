import { Pressable, StyleSheet, Switch, Text, View, ScrollView } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Button, Card, Header, Screen } from '@/src/components/UI';
import { useProducts } from '@/src/context/ProductContext';
import { useRestaurant } from '@/src/context/RestaurantContext';
import { money } from '@/src/data/products';
import { colors } from '@/src/theme';
import { ProductImage } from '@/src/components/ProductImage';
import { supabase } from '@/src/lib/supabase';

export default function AdminMenu() {
  const { currentRestaurant } = useRestaurant();
  const { products, loading, error, toggleSoldOut, deleteProduct, addProduct } = useProducts();
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string }>();
  const [showAiImport, setShowAiImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [draftSuccess, setDraftSuccess] = useState('');

  const remove = async () => {
    if (!pendingDelete) return;
    await deleteProduct(pendingDelete.id);
    setPendingDelete(undefined);
  };

  const handleDuplicate = async (prod: any) => {
    try {
      await addProduct({
        name: `${prod.name} (Copy)`,
        price: prod.price,
        category: prod.category,
        description: prod.description || '',
        emoji: prod.emoji || '☕',
        imageUrl: prod.imageUrl,
        customisationGroupIds: prod.customisationGroupIds || [],
      });
      alert(`✓ Duplicated "${prod.name}" successfully!`);
    } catch (e: any) {
      alert(e.message || 'Could not duplicate product');
    }
  };

  const handlePublishSnapshot = async () => {
    try {
      if (supabase) {
        await supabase.rpc('publish_menu_draft', {
          p_restaurant_id: currentRestaurant.id,
          p_snapshot: products,
          p_published_by: 'Owner Admin',
        });
      }
      setDraftSuccess('✓ Menu snapshot published to revision history!');
      setTimeout(() => setDraftSuccess(''), 4000);
    } catch (e: any) {
      alert(e.message || 'Could not publish draft');
    }
  };

  const handleSimulateAiImport = async () => {
    setImporting(true);
    setTimeout(async () => {
      try {
        await addProduct({
          name: 'Iced Pistachio Latte',
          price: 7.5,
          category: 'Coffee',
          description: 'Single origin espresso with house pistachio milk and salted foam.',
          emoji: '🥛',
          imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500',
          customisationGroupIds: [],
        });
        setImporting(false);
        setShowAiImport(false);
        alert('✓ AI Menu Import parsed & added "Iced Pistachio Latte" to your catalog!');
      } catch (e: any) {
        setImporting(false);
        alert(e.message || 'Could not import item');
      }
    }, 1200);
  };

  return (
    <Screen>
      <Header
        title="Menu & Catalog Editor"
        right={
          <Pressable style={s.historyBtn} onPress={handlePublishSnapshot}>
            <Ionicons name="cloud-upload-outline" size={18} color={colors.espresso} />
          </Pressable>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Banner & Action Hub */}
        <View style={s.banner}>
          <View style={{ flex: 1 }}>
            <Text style={s.bannerTitle}>MENU CATALOG · {currentRestaurant.name.toUpperCase()}</Text>
            <Text style={s.bannerSubtitle}>
              {loading ? 'Loading items…' : `${products.length} active menu items`}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Pressable style={s.aiImportBtn} onPress={() => setShowAiImport((v) => !v)}>
              <Ionicons name="sparkles" size={14} color={colors.caramel} />
              <Text style={s.aiImportText}>AI Import</Text>
            </Pressable>
            <Pressable style={s.addBtn} onPress={() => router.push('/admin-product')}>
              <Ionicons name="add" size={18} color={colors.white} />
            </Pressable>
          </View>
        </View>

        {!!draftSuccess && (
          <View style={s.successBox}>
            <Text style={s.successText}>{draftSuccess}</Text>
          </View>
        )}

        {/* AI Menu Import Modal / Box */}
        {showAiImport && (
          <Card style={s.aiBox}>
            <View style={s.aiHeader}>
              <Ionicons name="document-text-outline" size={20} color={colors.espresso} />
              <Text style={s.aiTitle}>AI MENU IMPORT ASSISTANT</Text>
            </View>
            <Text style={s.aiDesc}>
              Upload or scan a photo/PDF menu to auto-extract items, categories, prices, and descriptions into a draft table.
            </Text>
            <Pressable
              style={s.parseBtn}
              onPress={handleSimulateAiImport}
              disabled={importing}
            >
              <Ionicons name="cloud-upload" size={16} color={colors.white} />
              <Text style={s.parseBtnText}>{importing ? 'Extracting menu items…' : 'Simulate Import from Menu Photo'}</Text>
            </Pressable>
          </Card>
        )}

        {/* Products List */}
        {products.map((product) => (
          <Card key={product.id} style={s.card}>
            <ProductImage
              uri={product.imageUrl}
              style={s.thumbnail}
              placeholderStyle={s.thumbnail}
            />
            <View style={s.copy}>
              <Text style={s.name}>{product.name}</Text>
              <Text style={s.meta}>
                {product.category} · {money(product.price)}
              </Text>
              <View style={s.availability}>
                <Switch
                  value={!product.soldOut}
                  onValueChange={(available) =>
                    void toggleSoldOut(product.id, !available)
                  }
                  trackColor={{ false: '#D8CBC1', true: '#A9C7AF' }}
                  thumbColor={!product.soldOut ? colors.green : colors.muted}
                />
                <Text
                  style={[
                    s.status,
                    { color: product.soldOut ? colors.danger : colors.green },
                  ]}
                >
                  {product.soldOut ? 'Sold out' : 'Available'}
                </Text>
              </View>
            </View>

            <View style={s.actions}>
              <Pressable
                style={s.action}
                onPress={() => void handleDuplicate(product)}
                accessibilityLabel="Duplicate item"
              >
                <Ionicons name="copy-outline" size={16} color={colors.espresso} />
              </Pressable>
              <Pressable
                style={s.action}
                onPress={() =>
                  router.push({
                    pathname: '/admin-product',
                    params: { id: product.id },
                  })
                }
                accessibilityLabel="Edit item"
              >
                <Ionicons name="pencil-outline" size={16} color={colors.espresso} />
              </Pressable>
              <Pressable
                style={s.action}
                onPress={() =>
                  setPendingDelete({ id: product.id, name: product.name })
                }
                accessibilityLabel="Delete item"
              >
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
              </Pressable>
            </View>
          </Card>
        ))}

        {!!pendingDelete && (
          <View style={s.confirm}>
            <Text style={s.confirmTitle}>Delete {pendingDelete.name}?</Text>
            <Text style={s.confirmText}>This permanently removes it from the menu.</Text>
            <View style={s.confirmActions}>
              <Pressable style={s.cancel} onPress={() => setPendingDelete(undefined)}>
                <Text style={s.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={s.delete} onPress={() => void remove()}>
                <Text style={s.deleteText}>Delete item</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  historyBtn: { padding: 6, backgroundColor: colors.white, borderRadius: 8, borderWidth: 1, borderColor: colors.line },
  banner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 12,
  },
  bannerTitle: { fontSize: 10, fontWeight: '900', color: colors.caramel, letterSpacing: 0.8 },
  bannerSubtitle: { fontSize: 13, fontWeight: '800', color: colors.espresso, marginTop: 2 },
  aiImportBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF8EB', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#EBD9B6' },
  aiImportText: { color: colors.caramel, fontSize: 11, fontWeight: '800' },
  addBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.espresso, alignItems: 'center', justifyContent: 'center' },
  successBox: { backgroundColor: '#E6F4EA', padding: 10, borderRadius: 8, marginBottom: 10 },
  successText: { color: colors.green, fontWeight: '800', fontSize: 11 },
  aiBox: { padding: 14, marginBottom: 12, backgroundColor: '#FFFDF9', borderColor: colors.caramel },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  aiTitle: { fontSize: 11, fontWeight: '900', color: colors.espresso, letterSpacing: 0.8 },
  aiDesc: { fontSize: 11, color: colors.muted, lineHeight: 16, marginBottom: 10 },
  parseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.espresso, paddingVertical: 10, borderRadius: 8 },
  parseBtnText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  card: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, padding: 12 },
  thumbnail: { width: 50, height: 50, borderRadius: 12, marginRight: 10 },
  copy: { flex: 1 },
  name: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  meta: { color: colors.muted, fontSize: 11, marginTop: 2 },
  availability: { flexDirection: 'row', alignItems: 'center', marginTop: 4, marginLeft: -7 },
  status: { fontSize: 11, fontWeight: '700', marginLeft: 4 },
  actions: { flexDirection: 'row', gap: 6 },
  action: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' },
  confirm: { backgroundColor: '#FBE8E5', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E8C4BE' },
  confirmTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  confirmText: { color: colors.muted, fontSize: 11, marginTop: 2 },
  confirmActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  cancel: { flex: 1, height: 38, borderRadius: 8, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: colors.ink, fontWeight: '700', fontSize: 12 },
  delete: { flex: 1, height: 38, borderRadius: 8, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  deleteText: { color: colors.white, fontWeight: '800', fontSize: 12 },
});
