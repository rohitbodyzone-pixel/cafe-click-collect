import { Pressable, StyleSheet, Switch, Text, View, ScrollView, Modal, TextInput } from 'react-native';
import { useState, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Button, Card, Header, Screen, triggerHaptic } from '@/src/components/UI';
import { RoleGate } from '@/src/components/RoleGate';
import { useProducts } from '@/src/context/ProductContext';
import { useRestaurant } from '@/src/context/RestaurantContext';
import { money } from '@/src/data/products';
import { colors, radii, shadows } from '@/src/theme';
import { ProductImage } from '@/src/components/ProductImage';
import { supabase } from '@/src/lib/supabase';

export default function AdminMenu() {
  return (
    <RoleGate
      allowedRoles={['owner', 'manager', 'super_admin', 'admin']}
      roleTitle="Menu & Catalog Editor"
    >
      <AdminMenuContent />
    </RoleGate>
  );
}

function AdminMenuContent() {
  const { currentRestaurant } = useRestaurant();
  const { products, loading, error, toggleSoldOut, deleteProduct, addProduct, refresh } = useProducts();
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string }>();
  const [selectedCat, setSelectedCat] = useState<string>('All');
  const [draftSuccess, setDraftSuccess] = useState('');
  const [newCatModal, setNewCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [customCategories, setCustomCategories] = useState<string[]>([]);

  const categories = useMemo(() => {
    const fromProducts = Array.from(new Set(products.map((p) => p.category)));
    const all = Array.from(new Set(['Coffee', 'Drinks', 'Food', ...fromProducts, ...customCategories]));
    return ['All', ...all];
  }, [products, customCategories]);

  const filteredProducts = useMemo(() => {
    if (selectedCat === 'All') return products;
    return products.filter((p) => p.category === selectedCat);
  }, [products, selectedCat]);

  const remove = async () => {
    if (!pendingDelete) return;
    triggerHaptic('medium');
    try {
      await deleteProduct(pendingDelete.id);
      setPendingDelete(undefined);
      setDraftSuccess(`✓ Removed "${pendingDelete.name}" from catalog.`);
      setTimeout(() => setDraftSuccess(''), 3500);
    } catch (e: any) {
      alert(e.message || 'Could not delete product');
    }
  };

  const handleDuplicate = async (prod: any) => {
    triggerHaptic('medium');
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
      setDraftSuccess(`✓ Duplicated "${prod.name}" successfully!`);
      setTimeout(() => setDraftSuccess(''), 3500);
    } catch (e: any) {
      alert(e.message || 'Could not duplicate product');
    }
  };

  const handlePublishSnapshot = async () => {
    triggerHaptic('success');
    try {
      if (supabase) {
        await supabase.rpc('publish_menu_draft', {
          p_restaurant_id: currentRestaurant.id,
          p_snapshot: products,
          p_published_by: 'Menu Editor',
        });
      }
      setDraftSuccess('✓ Menu snapshot published to revision history!');
      setTimeout(() => setDraftSuccess(''), 4000);
    } catch (e: any) {
      alert(e.message || 'Could not publish draft');
    }
  };

  const handleAddCategory = () => {
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    setCustomCategories((prev) => Array.from(new Set([...prev, trimmed])));
    setSelectedCat(trimmed);
    setNewCatName('');
    setNewCatModal(false);
    triggerHaptic('success');
  };

  return (
    <Screen>
      <Header
        title="Menu & Catalog Editor"
        right={
          <Pressable style={s.historyBtn} onPress={handlePublishSnapshot} accessibilityLabel="Publish revision">
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
            <Pressable
              style={s.pdfImportBtn}
              onPress={() => router.push('/admin-menu-pdf')}
              accessibilityLabel="Upload Menu PDF"
            >
              <Ionicons name="document-text-outline" size={14} color={colors.caramel} />
              <Text style={s.pdfImportText}>Upload PDF</Text>
            </Pressable>
            <Pressable
              style={s.addBtn}
              onPress={() => router.push('/admin-product')}
              accessibilityLabel="Add new product"
            >
              <Ionicons name="add" size={18} color={colors.white} />
            </Pressable>
          </View>
        </View>

        {!!draftSuccess && (
          <View style={s.successBox}>
            <Text style={s.successText}>{draftSuccess}</Text>
          </View>
        )}

        {/* Quick Menu PDF Builder Teaser */}
        <Card style={s.pdfTeaserCard}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="sparkles" size={16} color={colors.caramel} />
              <Text style={s.pdfTeaserTitle}>QUICK MENU BUILDER (PDF / PHOTO)</Text>
            </View>
            <Text style={s.pdfTeaserSub}>
              Upload your restaurant menu PDF or flyer to auto-extract items, categories & prices.
            </Text>
          </View>
          <Pressable style={s.pdfTeaserBtn} onPress={() => router.push('/admin-menu-pdf')}>
            <Text style={s.pdfTeaserBtnText}>Import PDF →</Text>
          </Pressable>
        </Card>

        {/* Category Scroll & New Category Button */}
        <View style={s.catRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catScroll}>
            {categories.map((cat) => {
              const active = selectedCat === cat;
              return (
                <Pressable
                  key={cat}
                  style={[s.catPill, active && s.catPillActive]}
                  onPress={() => {
                    triggerHaptic('light');
                    setSelectedCat(cat);
                  }}
                >
                  <Text style={[s.catPillText, active && s.catPillTextActive]}>{cat}</Text>
                </Pressable>
              );
            })}
            <Pressable style={s.addCatPill} onPress={() => setNewCatModal(true)}>
              <Ionicons name="add" size={14} color={colors.espresso} />
              <Text style={s.addCatText}>New Category</Text>
            </Pressable>
          </ScrollView>
        </View>

        {/* Products List */}
        {filteredProducts.map((product) => (
          <Card key={product.id} style={s.card}>
            <ProductImage
              uri={product.imageUrl}
              category={product.category}
              name={product.name}
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

        {filteredProducts.length === 0 && !loading && (
          <View style={s.emptyBox}>
            <Text style={s.emptyTitle}>No items in "{selectedCat}"</Text>
            <Text style={s.emptySub}>Add a new item or upload a menu PDF to populate this category.</Text>
            <Pressable style={s.emptyAddBtn} onPress={() => router.push('/admin-product')}>
              <Text style={s.emptyAddBtnText}>+ Add Item</Text>
            </Pressable>
          </View>
        )}

        {/* Delete Confirmation Modal */}
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

      {/* New Category Modal */}
      {newCatModal && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setNewCatModal(false)}>
          <View style={s.modalBackdrop}>
            <Card style={s.catModalCard}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Create New Category</Text>
                <Pressable onPress={() => setNewCatModal(false)}>
                  <Ionicons name="close" size={20} color={colors.muted} />
                </Pressable>
              </View>

              <Text style={s.catLabel}>Category Name</Text>
              <TextInput
                style={s.catInput}
                value={newCatName}
                onChangeText={setNewCatName}
                placeholder="e.g. Daily Specials, Desserts, Sides"
                placeholderTextColor={colors.muted}
                autoFocus
              />

              <View style={s.catBtnRow}>
                <Pressable style={s.catCancelBtn} onPress={() => setNewCatModal(false)}>
                  <Text style={s.catCancelText}>Cancel</Text>
                </Pressable>
                <View style={{ flex: 1.5 }}>
                  <Button
                    label="Add Category"
                    onPress={handleAddCategory}
                    disabled={!newCatName.trim()}
                  />
                </View>
              </View>
            </Card>
          </View>
        </Modal>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  historyBtn: {
    padding: 6,
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  banner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 12,
    ...shadows.sm,
  },
  bannerTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.caramel,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  bannerSubtitle: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.espresso,
    marginTop: 2,
  },
  pdfImportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF8EB',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#EBD9B6',
  },
  pdfImportText: {
    color: colors.caramel,
    fontSize: 11,
    fontWeight: '800',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.espresso,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  successBox: {
    backgroundColor: '#E6F4EA',
    padding: 10,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#C3E6CD',
  },
  successText: {
    color: colors.green,
    fontWeight: '800',
    fontSize: 12,
    textAlign: 'center',
  },
  pdfTeaserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFDF9',
    borderColor: colors.caramel,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    ...shadows.sm,
  },
  pdfTeaserTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.espresso,
    letterSpacing: 0.8,
  },
  pdfTeaserSub: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
    maxWidth: 240,
    lineHeight: 15,
  },
  pdfTeaserBtn: {
    backgroundColor: colors.espresso,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.sm,
    ...shadows.sm,
  },
  pdfTeaserBtnText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 11,
  },
  catRow: {
    marginBottom: 14,
  },
  catScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  catPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.sm,
  },
  catPillActive: {
    backgroundColor: colors.espresso,
    borderColor: colors.espresso,
  },
  catPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.espresso,
  },
  catPillTextActive: {
    color: colors.white,
  },
  addCatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: colors.creamSoft,
    borderWidth: 1,
    borderColor: colors.line,
  },
  addCatText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.espresso,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.sm,
  },
  thumbnail: {
    width: 52,
    height: 52,
    borderRadius: 14,
    marginRight: 12,
  },
  copy: {
    flex: 1,
  },
  name: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  availability: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginLeft: -7,
  },
  status: {
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 6,
  },
  action: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.creamSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.lineLight,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.espresso,
  },
  emptySub: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
    marginBottom: 12,
  },
  emptyAddBtn: {
    backgroundColor: colors.espresso,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.sm,
  },
  emptyAddBtnText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 12,
  },
  confirm: {
    backgroundColor: '#FBE8E5',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8C4BE',
  },
  confirmTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  confirmText: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  cancel: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  cancelText: {
    color: colors.ink,
    fontWeight: '700',
    fontSize: 12,
  },
  delete: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  catModalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 18,
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.espresso,
  },
  catLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 4,
  },
  catInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.creamSoft,
    paddingHorizontal: 12,
    fontSize: 13,
    color: colors.ink,
    marginBottom: 14,
  },
  catBtnRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  catCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.creamSoft,
    borderWidth: 1,
    borderColor: colors.line,
  },
  catCancelText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.espresso,
  },
});
