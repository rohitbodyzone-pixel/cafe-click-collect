import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
  ScrollView,
  Modal,
  TextInput,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Button, Card, Header, Screen, triggerHaptic } from '@/src/components/UI';
import { RoleGate } from '@/src/components/RoleGate';
import { useProducts } from '@/src/context/ProductContext';
import { useRestaurant } from '@/src/context/RestaurantContext';
import { useAdminAuth } from '@/src/context/AdminAuthContext';
import { money, Product } from '@/src/data/products';
import { colors, radii, shadows } from '@/src/theme';
import { ProductImage } from '@/src/components/ProductImage';
import { RestaurantCoverImage, RestaurantLogoImage } from '@/src/components/RestaurantImage';
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

type MenuRevision = {
  id: string;
  version_number: number;
  title: string;
  snapshot: Product[];
  published_by: string;
  published_at: string;
  created_at: string;
};

function AdminMenuContent() {
  const { currentRestaurant } = useRestaurant();
  const { staff } = useAdminAuth();
  const {
    products,
    loading,
    error,
    toggleSoldOut,
    deleteProduct,
    addProduct,
    updateProduct,
    refresh,
  } = useProducts();

  // Dialog & Modal states
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string }>();
  const [selectedCat, setSelectedCat] = useState<string>('All');
  const [draftSuccess, setDraftSuccess] = useState('');
  const [newCatModal, setNewCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [customCategories, setCustomCategories] = useState<string[]>([]);

  // Feature 2A: Customer Preview Modal
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewMode, setPreviewMode] = useState<'pickup' | 'table'>('pickup');
  const [previewCat, setPreviewCat] = useState<string>('All');

  // Feature 2B & 2C: Undo / Redo State Stack
  const [historyStack, setHistoryStack] = useState<Product[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isUndoingOrRedoing, setIsUndoingOrRedoing] = useState(false);

  // Feature 2D: Version History & Restore Modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [revisions, setRevisions] = useState<MenuRevision[]>([]);
  const [loadingRevisions, setLoadingRevisions] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<MenuRevision | null>(null);
  const [restoring, setRestoring] = useState(false);

  // Initialize history stack when products first load
  useEffect(() => {
    if (products.length > 0 && historyStack.length === 0 && !isUndoingOrRedoing) {
      setHistoryStack([products]);
      setHistoryIndex(0);
    }
  }, [products, historyStack.length, isUndoingOrRedoing]);

  // Push new state to history stack on product changes
  const pushToHistory = useCallback((newProducts: Product[]) => {
    setHistoryStack((prev) => {
      const truncated = prev.slice(0, historyIndex + 1);
      return [...truncated, newProducts];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  // Undo action
  const handleUndo = useCallback(async () => {
    if (historyIndex <= 0) return;
    triggerHaptic('medium');
    setIsUndoingOrRedoing(true);
    const prevIndex = historyIndex - 1;
    const targetState = historyStack[prevIndex];
    setHistoryIndex(prevIndex);

    setDraftSuccess('↶ Undone previous menu change.');
    setTimeout(() => setDraftSuccess(''), 3000);
    setIsUndoingOrRedoing(false);
  }, [historyIndex, historyStack]);

  // Redo action
  const handleRedo = useCallback(async () => {
    if (historyIndex >= historyStack.length - 1) return;
    triggerHaptic('medium');
    setIsUndoingOrRedoing(true);
    const nextIndex = historyIndex + 1;
    const targetState = historyStack[nextIndex];
    setHistoryIndex(nextIndex);

    setDraftSuccess('↷ Redone menu change.');
    setTimeout(() => setDraftSuccess(''), 3000);
    setIsUndoingOrRedoing(false);
  }, [historyIndex, historyStack]);

  // Keyboard shortcut listener for web (Ctrl+Z / Ctrl+Y)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        void handleUndo();
      } else if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === 'y' || (e.key === 'z' && e.shiftKey))
      ) {
        e.preventDefault();
        void handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  const categories = useMemo(() => {
    const fromProducts = Array.from(new Set(products.map((p) => p.category)));
    const all = Array.from(
      new Set(['Coffee', 'Drinks', 'Food', ...fromProducts, ...customCategories])
    );
    return ['All', ...all];
  }, [products, customCategories]);

  const filteredProducts = useMemo(() => {
    if (selectedCat === 'All') return products;
    return products.filter((p) => p.category === selectedCat);
  }, [products, selectedCat]);

  // Load Revision History from Supabase
  const loadRevisions = async () => {
    setLoadingRevisions(true);
    try {
      if (supabase) {
        const { data, error: revErr } = await supabase
          .from('restaurant_menu_drafts')
          .select('*')
          .eq('restaurant_id', currentRestaurant.id)
          .order('version_number', { ascending: false });

        if (data && !revErr) {
          setRevisions(data);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRevisions(false);
    }
  };

  const handleOpenHistory = () => {
    triggerHaptic('light');
    setShowHistoryModal(true);
    void loadRevisions();
  };

  const remove = async () => {
    if (!pendingDelete) return;
    triggerHaptic('medium');
    try {
      await deleteProduct(pendingDelete.id);
      const updated = products.filter((p) => p.id !== pendingDelete.id);
      pushToHistory(updated);
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
      const newId = await addProduct({
        name: `${prod.name} (Copy)`,
        price: prod.price,
        category: prod.category,
        description: prod.description || '',
        emoji: prod.emoji || '☕',
        imageUrl: prod.imageUrl,
        customisationGroupIds: prod.customisationGroupIds || [],
      });
      const duplicatedItem: Product = {
        ...prod,
        id: newId,
        name: `${prod.name} (Copy)`,
      };
      pushToHistory([...products, duplicatedItem]);
      setDraftSuccess(`✓ Duplicated "${prod.name}" successfully!`);
      setTimeout(() => setDraftSuccess(''), 3500);
    } catch (e: any) {
      alert(e.message || 'Could not duplicate product');
    }
  };

  const handleToggleSoldOutWithHistory = async (id: string, soldOut: boolean) => {
    await toggleSoldOut(id, soldOut);
    const updated = products.map((p) => (p.id === id ? { ...p, soldOut } : p));
    pushToHistory(updated);
  };

  const handlePublishSnapshot = async () => {
    triggerHaptic('success');
    const author = staff?.displayName || staff?.email || 'Menu Editor';
    try {
      if (supabase) {
        await supabase.rpc('publish_menu_draft', {
          p_restaurant_id: currentRestaurant.id,
          p_snapshot: products,
          p_published_by: author,
        });
      }
      setDraftSuccess('✓ Menu snapshot published to revision history!');
      setTimeout(() => setDraftSuccess(''), 4000);
    } catch (e: any) {
      alert(e.message || 'Could not publish draft');
    }
  };

  // Restore snapshot version
  const handleRestoreVersion = async (rev: MenuRevision) => {
    triggerHaptic('medium');
    setRestoring(true);
    try {
      if (!Array.isArray(rev.snapshot)) {
        throw new Error('Invalid snapshot data.');
      }

      if (supabase) {
        // Clear and restore products for this restaurant
        await supabase.rpc('publish_menu_draft', {
          p_restaurant_id: currentRestaurant.id,
          p_snapshot: rev.snapshot,
          p_published_by: `Restored from v${rev.version_number} by ${staff?.displayName || staff?.email || 'Admin'}`,
        });
      }

      await refresh();
      setPendingRestore(null);
      setShowHistoryModal(false);
      setDraftSuccess(`✓ Restored catalog to Version ${rev.version_number}!`);
      setTimeout(() => setDraftSuccess(''), 4000);
    } catch (e: any) {
      alert(e.message || 'Could not restore version');
    } finally {
      setRestoring(false);
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

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < historyStack.length - 1;

  return (
    <Screen>
      <Header
        title="Menu & Catalog Editor"
        right={
          <View style={s.headerRightRow}>
            {/* Undo Button */}
            <Pressable
              style={[s.headerToolBtn, !canUndo && s.headerToolBtnDisabled]}
              onPress={() => void handleUndo()}
              disabled={!canUndo}
              accessibilityLabel="Undo (Ctrl+Z)"
            >
              <Ionicons
                name="arrow-undo-outline"
                size={16}
                color={canUndo ? colors.espresso : colors.muted}
              />
            </Pressable>

            {/* Redo Button */}
            <Pressable
              style={[s.headerToolBtn, !canRedo && s.headerToolBtnDisabled]}
              onPress={() => void handleRedo()}
              disabled={!canRedo}
              accessibilityLabel="Redo (Ctrl+Y)"
            >
              <Ionicons
                name="arrow-redo-outline"
                size={16}
                color={canRedo ? colors.espresso : colors.muted}
              />
            </Pressable>

            {/* Version History Button */}
            <Pressable
              style={s.headerToolBtn}
              onPress={handleOpenHistory}
              accessibilityLabel="Version History"
            >
              <Ionicons name="time-outline" size={16} color={colors.espresso} />
            </Pressable>

            {/* Publish Revision Button */}
            <Pressable
              style={s.headerPublishBtn}
              onPress={handlePublishSnapshot}
              accessibilityLabel="Publish Snapshot"
            >
              <Ionicons name="cloud-upload-outline" size={16} color={colors.white} />
            </Pressable>
          </View>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Banner & Action Hub */}
        <View style={s.banner}>
          <View style={{ flex: 1 }}>
            <Text style={s.bannerTitle}>MENU CATALOG · {currentRestaurant.name.toUpperCase()}</Text>
            <Text style={s.bannerSubtitle}>
              {loading ? 'Loading items…' : `${products.length} active menu items`}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            {/* Customer Live Preview Button */}
            <Pressable
              style={s.previewBtn}
              onPress={() => {
                triggerHaptic('light');
                setShowPreviewModal(true);
              }}
              accessibilityLabel="Preview Customer Menu"
            >
              <Ionicons name="eye-outline" size={14} color={colors.white} />
              <Text style={s.previewBtnText}>Preview</Text>
            </Pressable>

            <Pressable
              style={s.pdfImportBtn}
              onPress={() => router.push('/admin-menu-pdf')}
              accessibilityLabel="Upload Menu PDF"
            >
              <Ionicons name="document-text-outline" size={14} color={colors.caramel} />
              <Text style={s.pdfImportText}>PDF</Text>
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

        {/* Action / Success Feedback Banner */}
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
              Upload your menu PDF or flyer to auto-extract items, categories & prices.
            </Text>
          </View>
          <Pressable style={s.pdfTeaserBtn} onPress={() => router.push('/admin-menu-pdf')}>
            <Text style={s.pdfTeaserBtnText}>Import PDF →</Text>
          </Pressable>
        </Card>

        {/* Category Scroll & New Category Button */}
        <View style={s.catRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.catScroll}
          >
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
                    void handleToggleSoldOutWithHistory(product.id, !available)
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
            <Text style={s.emptySub}>
              Add a new item or upload a menu PDF to populate this category.
            </Text>
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

      {/* Feature 2A: Full Customer Preview Modal */}
      {showPreviewModal && (
        <Modal
          visible
          animationType="slide"
          onRequestClose={() => setShowPreviewModal(false)}
        >
          <Screen>
            <Header
              title="Customer Menu Preview"
              right={
                <Pressable
                  style={s.closePreviewBtn}
                  onPress={() => setShowPreviewModal(false)}
                >
                  <Ionicons name="close" size={20} color={colors.espresso} />
                </Pressable>
              }
            />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              {/* Preview Notice Bar */}
              <View style={s.previewNoticeBar}>
                <Ionicons name="eye" size={16} color={colors.espresso} />
                <Text style={s.previewNoticeText}>
                  LIVE CUSTOMER VIEW · {currentRestaurant.name.toUpperCase()}
                </Text>
              </View>

              {/* Customer Hero Banner */}
              <View style={s.previewHeroWrap}>
                <RestaurantCoverImage
                  uri={currentRestaurant.coverImageUrl || currentRestaurant.hero_image_url}
                  name={currentRestaurant.name}
                  style={s.previewCoverImg}
                  placeholderStyle={s.previewCoverImg}
                />
                <View style={s.previewHeroOverlay} />
                <View style={s.previewHeroContent}>
                  <RestaurantLogoImage
                    uri={currentRestaurant.logoUrl}
                    name={currentRestaurant.name}
                    size={44}
                    style={{ borderWidth: 2, borderColor: colors.white }}
                  />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={s.previewRestName}>{currentRestaurant.name}</Text>
                    <Text style={s.previewRestHours}>
                      {currentRestaurant.openingTime} – {currentRestaurant.closingTime} · {currentRestaurant.address || 'Click & Collect'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Mode Selector Preview */}
              <View style={s.previewModeRow}>
                <Pressable
                  style={[s.previewModePill, previewMode === 'pickup' && s.previewModePillActive]}
                  onPress={() => setPreviewMode('pickup')}
                >
                  <Ionicons
                    name="bag-handle-outline"
                    size={14}
                    color={previewMode === 'pickup' ? colors.white : colors.espresso}
                  />
                  <Text style={[s.previewModeText, previewMode === 'pickup' && s.previewModeTextActive]}>
                    Pickup / Takeaway
                  </Text>
                </Pressable>

                <Pressable
                  style={[s.previewModePill, previewMode === 'table' && s.previewModePillActive]}
                  onPress={() => setPreviewMode('table')}
                >
                  <Ionicons
                    name="qr-code-outline"
                    size={14}
                    color={previewMode === 'table' ? colors.white : colors.espresso}
                  />
                  <Text style={[s.previewModeText, previewMode === 'table' && s.previewModeTextActive]}>
                    Table QR Dine-In
                  </Text>
                </Pressable>
              </View>

              {/* Category Pills */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[s.catScroll, { paddingHorizontal: 16, marginBottom: 14 }]}
              >
                {categories.map((cat) => {
                  const active = previewCat === cat;
                  return (
                    <Pressable
                      key={cat}
                      style={[s.catPill, active && s.catPillActive]}
                      onPress={() => setPreviewCat(cat)}
                    >
                      <Text style={[s.catPillText, active && s.catPillTextActive]}>{cat}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Customer Product Cards Grid */}
              <View style={{ paddingHorizontal: 16, gap: 10 }}>
                {products
                  .filter((p) => previewCat === 'All' || p.category === previewCat)
                  .map((prod) => (
                    <Card key={prod.id} style={s.previewProductCard}>
                      <ProductImage
                        uri={prod.imageUrl}
                        category={prod.category}
                        name={prod.name}
                        style={s.previewProdImg}
                        placeholderStyle={s.previewProdImg}
                      />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={s.previewProdName}>{prod.name}</Text>
                        {!!prod.description && (
                          <Text style={s.previewProdDesc} numberOfLines={2}>
                            {prod.description}
                          </Text>
                        )}
                        <View style={s.previewPriceRow}>
                          <Text style={s.previewProdPrice}>{money(prod.price)}</Text>
                          {prod.soldOut && (
                            <View style={s.previewSoldOutBadge}>
                              <Text style={s.previewSoldOutText}>Sold Out</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <View style={s.previewAddBtn}>
                        <Ionicons name="add" size={18} color={colors.white} />
                      </View>
                    </Card>
                  ))}
              </View>

              {/* Publish or Close Footer */}
              <View style={s.previewFooter}>
                <Button
                  label="Looks Great — Close Preview"
                  onPress={() => setShowPreviewModal(false)}
                />
              </View>
            </ScrollView>
          </Screen>
        </Modal>
      )}

      {/* Feature 2D: Version History & Restore Modal */}
      {showHistoryModal && (
        <Modal
          visible
          animationType="slide"
          onRequestClose={() => setShowHistoryModal(false)}
        >
          <Screen>
            <Header
              title="Menu Revision History"
              right={
                <Pressable
                  style={s.closePreviewBtn}
                  onPress={() => setShowHistoryModal(false)}
                >
                  <Ionicons name="close" size={20} color={colors.espresso} />
                </Pressable>
              }
            />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
              <View style={s.historyHeaderBox}>
                <Ionicons name="git-branch-outline" size={20} color={colors.caramel} />
                <View style={{ flex: 1 }}>
                  <Text style={s.historyHeaderTitle}>VERSION CONTROL & RESTORE</Text>
                  <Text style={s.historyHeaderSub}>
                    Snapshots saved automatically upon publishing. You can restore any past version with 1-click.
                  </Text>
                </View>
              </View>

              {loadingRevisions && (
                <View style={s.loadingBox}>
                  <ActivityIndicator size="large" color={colors.espresso} />
                  <Text style={s.loadingText}>Loading revision timeline…</Text>
                </View>
              )}

              {!loadingRevisions && revisions.length === 0 && (
                <View style={s.emptyBox}>
                  <Ionicons name="time-outline" size={40} color={colors.muted} />
                  <Text style={s.emptyTitle}>No Revisions Saved Yet</Text>
                  <Text style={s.emptySub}>
                    Tap the cloud icon in the top header to save your first snapshot.
                  </Text>
                </View>
              )}

              {!loadingRevisions &&
                revisions.map((rev) => {
                  const itemCount = Array.isArray(rev.snapshot) ? rev.snapshot.length : 0;
                  const dateStr = new Date(rev.created_at).toLocaleString();

                  return (
                    <Card key={rev.id} style={s.revisionCard}>
                      <View style={s.revTop}>
                        <View style={s.revBadge}>
                          <Text style={s.revBadgeText}>v{rev.version_number}</Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={s.revTitle}>{rev.title || `Revision v${rev.version_number}`}</Text>
                          <Text style={s.revMeta}>
                            Published by {rev.published_by || 'Admin'} · {itemCount} items
                          </Text>
                          <Text style={s.revTime}>{dateStr}</Text>
                        </View>
                      </View>

                      <View style={s.revActions}>
                        <Pressable
                          style={s.restoreBtn}
                          onPress={() => setPendingRestore(rev)}
                          disabled={restoring}
                        >
                          <Ionicons name="refresh-outline" size={14} color={colors.white} />
                          <Text style={s.restoreBtnText}>Restore This Version</Text>
                        </Pressable>
                      </View>
                    </Card>
                  );
                })}

              {/* Restore Confirmation Dialog */}
              {!!pendingRestore && (
                <View style={s.confirm}>
                  <Text style={s.confirmTitle}>
                    Restore Version {pendingRestore.version_number}?
                  </Text>
                  <Text style={s.confirmText}>
                    This will replace your current menu catalog with the {Array.isArray(pendingRestore.snapshot) ? pendingRestore.snapshot.length : 0} items from this snapshot.
                  </Text>
                  <View style={s.confirmActions}>
                    <Pressable
                      style={s.cancel}
                      onPress={() => setPendingRestore(null)}
                      disabled={restoring}
                    >
                      <Text style={s.cancelText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      style={s.delete}
                      onPress={() => void handleRestoreVersion(pendingRestore)}
                      disabled={restoring}
                    >
                      <Text style={s.deleteText}>
                        {restoring ? 'Restoring…' : 'Confirm Restore'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </ScrollView>
          </Screen>
        </Modal>
      )}

      {/* New Category Modal */}
      {newCatModal && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setNewCatModal(false)}
        >
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
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerToolBtn: {
    padding: 7,
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  headerToolBtnDisabled: {
    opacity: 0.4,
  },
  headerPublishBtn: {
    padding: 7,
    backgroundColor: colors.espresso,
    borderRadius: 8,
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
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.espresso,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radii.md,
  },
  previewBtnText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '800',
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
    width: 34,
    height: 34,
    borderRadius: 17,
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
  closePreviewBtn: {
    padding: 6,
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  previewNoticeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFF8EB',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EBD9B6',
    marginBottom: 10,
  },
  previewNoticeText: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.espresso,
    letterSpacing: 0.8,
  },
  previewHeroWrap: {
    height: 140,
    marginHorizontal: 16,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 12,
  },
  previewCoverImg: {
    width: '100%',
    height: '100%',
  },
  previewHeroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  previewHeroContent: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewRestName: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.white,
  },
  previewRestHours: {
    fontSize: 11,
    color: '#E7DCD5',
    marginTop: 2,
  },
  previewModeRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: colors.creamSoft,
    borderRadius: radii.full,
    padding: 4,
    gap: 6,
    marginBottom: 12,
  },
  previewModePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: radii.full,
  },
  previewModePillActive: {
    backgroundColor: colors.espresso,
  },
  previewModeText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.espresso,
  },
  previewModeTextActive: {
    color: colors.white,
  },
  previewProductCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.sm,
  },
  previewProdImg: {
    width: 60,
    height: 60,
    borderRadius: 14,
  },
  previewProdName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.ink,
  },
  previewProdDesc: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
    lineHeight: 15,
  },
  previewPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  previewProdPrice: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.espresso,
  },
  previewSoldOutBadge: {
    backgroundColor: '#FDECEA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  previewSoldOutText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.danger,
  },
  previewAddBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.espresso,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewFooter: {
    padding: 16,
    marginTop: 10,
  },
  historyHeaderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.creamSoft,
    padding: 14,
    borderRadius: 16,
    marginBottom: 14,
  },
  historyHeaderTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.espresso,
    letterSpacing: 0.8,
  },
  historyHeaderSub: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
    lineHeight: 15,
  },
  revisionCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 10,
    ...shadows.sm,
  },
  revTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  revBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.espresso,
    alignItems: 'center',
    justifyContent: 'center',
  },
  revBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.white,
  },
  revTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.espresso,
  },
  revMeta: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  revTime: {
    fontSize: 10,
    color: colors.muted,
    marginTop: 1,
  },
  revActions: {
    borderTopWidth: 1,
    borderTopColor: colors.lineLight,
    paddingTop: 8,
    alignItems: 'flex-end',
  },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.espresso,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.sm,
  },
  restoreBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.white,
  },
  loadingBox: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '700',
    marginTop: 6,
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
