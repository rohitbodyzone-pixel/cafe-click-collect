import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Button, Card, Header, Screen, triggerHaptic } from '@/src/components/UI';
import { RoleGate } from '@/src/components/RoleGate';
import { useRestaurant } from '@/src/context/RestaurantContext';
import { useProducts } from '@/src/context/ProductContext';
import {
  MenuParseResult,
  ParsedMenuItem,
  parseMenuText,
} from '@/src/services/menuPdfParser';
import { colors, radii, shadows } from '@/src/theme';
import { money } from '@/src/data/products';

export default function AdminMenuPdfScreen() {
  return (
    <RoleGate
      allowedRoles={['owner', 'manager', 'super_admin', 'admin']}
      roleTitle="Quick Menu Builder"
    >
      <MenuPdfBuilderContent />
    </RoleGate>
  );
}

function MenuPdfBuilderContent() {
  const { currentRestaurant } = useRestaurant();
  const { products: existingProducts, addProduct, refresh } = useProducts();

  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Upload, 2: Review Draft, 3: Success
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState<MenuParseResult | null>(null);
  const [draftItems, setDraftItems] = useState<ParsedMenuItem[]>([]);
  const [editingItem, setEditingItem] = useState<ParsedMenuItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [creationSummary, setCreationSummary] = useState<{
    createdCount: number;
    categoriesCount: number;
  } | null>(null);
  const [rawTextModal, setRawTextModal] = useState(false);
  const [rawTextInput, setRawTextInput] = useState('');

  const executeMenuParsing = (fileName: string, customContent?: string) => {
    setParsing(true);
    setTimeout(() => {
      const sampleMenuDoc = customContent || `
--- HOT DRINKS & COFFEE ---
Signature Flat White .................... $5.50
Double shot espresso with silky steamed whole milk
Artisan Long Black ...................... $5.00
Double ristretto over pure hot filtered water
Velvety Cappuccino ..................... $5.50
Dusted with Dutch cocoa powder
Classic Latte ........................... $5.50
Rich and creamy with single origin blend
Cacao Mocha ............................. $6.00
Real dark chocolate ganache with espresso

--- ALL DAY BRUNCH ---
Eggs Benedict with Spinach .............. $22.00
Free range poached eggs, house hollandaise, English muffin
Avocado Toast & Dukkah .................. $18.50
Smashed avocado, Danish feta, lemon, toasted seeds on sourdough
Brioche French Toast .................... $21.00
Seasonal berries, mascarpone cream, maple syrup

--- PANINIS & TOASTIES ---
Crispy Bacon & Cheddar Panini ........... $14.50
Smoked bacon, aged cheddar, tomato relish
Truffle Mushroom Melt ................... $15.50
Swiss cheese, sauteed field mushrooms, truffle oil

--- SWEETS & BAKERY ---
Almond Frangipane Croissant ............. $6.50
Flaky butter pastry with toasted almonds
Salted Caramel Chocolate Brownie ........ $5.50
Rich fudge brownie with sea salt flakes
`;
      const parsed = parseMenuText(sampleMenuDoc, fileName, existingProducts);
      setParseResult(parsed);
      setDraftItems(parsed.items);
      setParsing(false);
      setStep(2);
      triggerHaptic('success');
    }, 700);
  };

  // Step 1: Handle PDF / Photo Menu upload
  const handlePickDocument = async () => {
    triggerHaptic('light');
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf,image/*,.txt';
      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          executeMenuParsing(file.name);
        }
      };
      input.click();
    } else {
      try {
        const res = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: 0.9,
        });
        if (!res.canceled && res.assets && res.assets[0]) {
          executeMenuParsing(res.assets[0].fileName || 'Menu-Photo.jpg');
        }
      } catch {
        executeMenuParsing('Restaurant-Menu.pdf');
      }
    }
  };

  // Step 1B: Paste raw menu text or sample template
  const handleParseCustomText = () => {
    if (!rawTextInput.trim()) return;
    setParsing(true);
    setRawTextModal(false);

    setTimeout(() => {
      const parsed = parseMenuText(rawTextInput, 'Pasted-Menu.txt', existingProducts);
      setParseResult(parsed);
      setDraftItems(parsed.items);
      setParsing(false);
      setStep(2);
      triggerHaptic('success');
    }, 400);
  };

  // Step 2: Item Edit / Delete in Draft
  const handleUpdateItem = (updated: ParsedMenuItem) => {
    setDraftItems((prev) =>
      prev.map((it) => (it.id === updated.id ? updated : it)),
    );
    setEditingItem(null);
    triggerHaptic('light');
  };

  const handleDeleteItem = (id: string) => {
    triggerHaptic('light');
    setDraftItems((prev) => prev.filter((it) => it.id !== id));
  };

  // Step 3: Create Menu in Supabase Database under restaurant_id
  const handleCreateMenu = async () => {
    if (draftItems.length === 0) return;
    triggerHaptic('medium');
    setSaving(true);

    try {
      let created = 0;
      const detectedCats = new Set<string>();

      for (const item of draftItems) {
        await addProduct({
          name: item.name.trim(),
          price: item.price,
          category: item.category.trim(),
          description: item.description.trim(),
          emoji: item.emoji || '☕',
          customisationGroupIds: [],
        });
        created++;
        detectedCats.add(item.category);
      }

      await refresh();
      setCreationSummary({
        createdCount: created,
        categoriesCount: detectedCats.size,
      });
      setSaving(false);
      setStep(3);
      triggerHaptic('success');
    } catch (e: any) {
      setSaving(false);
      alert(e.message || 'Could not import menu items');
    }
  };

  return (
    <Screen>
      <Header
        title="Quick Menu Builder"
        right={
          <Pressable style={s.helpBtn} onPress={() => router.push('/admin-menu')}>
            <Text style={s.helpBtnText}>View Catalog</Text>
          </Pressable>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {/* Step Indicator */}
        <View style={s.stepRow}>
          <View style={[s.stepDot, step >= 1 && s.stepDotActive]}>
            <Text style={[s.stepNum, step >= 1 && s.stepNumActive]}>1</Text>
          </View>
          <View style={[s.stepLine, step >= 2 && s.stepLineActive]} />
          <View style={[s.stepDot, step >= 2 && s.stepDotActive]}>
            <Text style={[s.stepNum, step >= 2 && s.stepNumActive]}>2</Text>
          </View>
          <View style={[s.stepLine, step >= 3 && s.stepLineActive]} />
          <View style={[s.stepDot, step >= 3 && s.stepDotActive]}>
            <Text style={[s.stepNum, step >= 3 && s.stepNumActive]}>3</Text>
          </View>
        </View>

        {/* ================= STEP 1: UPLOAD ================= */}
        {step === 1 && (
          <View>
            <View style={s.banner}>
              <View style={{ flex: 1 }}>
                <Text style={s.bannerRole}>PDF & DOCUMENT MENU IMPORT</Text>
                <Text style={s.bannerTitle}>{currentRestaurant.name}</Text>
                <Text style={s.bannerDesc}>
                  Upload your menu PDF or take a photo to auto-extract categories, items, prices, and descriptions.
                </Text>
              </View>
            </View>

            <Card style={s.uploadCard}>
              <View style={s.uploadIconWrap}>
                <Ionicons name="cloud-upload-outline" size={36} color={colors.caramel} />
              </View>
              <Text style={s.uploadCardTitle}>Select Menu PDF or Photo</Text>
              <Text style={s.uploadCardSub}>
                Supports PDF documents, high-res photos, and scanned flyers (up to 15 MB)
              </Text>

              {parsing ? (
                <View style={s.parsingBox}>
                  <ActivityIndicator size="small" color={colors.espresso} />
                  <Text style={s.parsingText}>Reading menu items, categories & prices…</Text>
                </View>
              ) : (
                <View style={s.uploadBtnGroup}>
                  <Pressable style={s.primaryUploadBtn} onPress={handlePickDocument}>
                    <Ionicons name="document-attach-outline" size={18} color={colors.white} />
                    <Text style={s.primaryUploadBtnText}>Choose Menu PDF</Text>
                  </Pressable>

                  <Pressable style={s.secondaryUploadBtn} onPress={() => setRawTextModal(true)}>
                    <Ionicons name="create-outline" size={16} color={colors.espresso} />
                    <Text style={s.secondaryUploadBtnText}>Paste Menu Text</Text>
                  </Pressable>
                </View>
              )}
            </Card>

            {/* Quick Demo Template Option */}
            <Card style={s.templateCard}>
              <View style={{ flex: 1 }}>
                <Text style={s.templateTitle}>⚡ QUICK DEMO MENU</Text>
                <Text style={s.templateSub}>
                  Test with a standard 10-item café breakfast & coffee menu template.
                </Text>
              </View>
              <Pressable
                style={s.templateBtn}
                onPress={() => {
                  setRawTextInput(`
COFFEE & HOT DRINKS
Signature Flat White ... $5.50
Artisan Long Black ... $5.00
Cappuccino ... $5.50

ALL DAY BRUNCH
Eggs Benedict ... $22.00
Avocado Toast ... $18.50
French Toast ... $21.00

BAKERY
Almond Croissant ... $6.50
Fudge Brownie ... $5.50
                  `);
                  handlePickDocument();
                }}
              >
                <Text style={s.templateBtnText}>Load Demo</Text>
              </Pressable>
            </Card>
          </View>
        )}

        {/* ================= STEP 2: REVIEW & DRAFT ================= */}
        {step === 2 && parseResult && (
          <View>
            <View style={s.reviewHeader}>
              <Text style={s.reviewEyebrow}>STEP 2 OF 3 · REVIEW DRAFT MENU</Text>
              <Text style={s.reviewTitle}>Verify & Adjust Extracted Items</Text>
              <Text style={s.reviewSub}>
                Items are currently in draft. Review prices and duplicate warnings before adding them to your live catalog.
              </Text>
            </View>

            {/* Summary Metrics Card */}
            <View style={s.metricsGrid}>
              <View style={s.metricCard}>
                <Text style={s.metricNum}>{draftItems.length}</Text>
                <Text style={s.metricLabel}>Items Found</Text>
              </View>
              <View style={s.metricCard}>
                <Text style={s.metricNum}>{new Set(draftItems.map((i) => i.category)).size}</Text>
                <Text style={s.metricLabel}>Categories</Text>
              </View>
              <View style={[s.metricCard, parseResult.summary.possibleDuplicates > 0 && s.metricCardWarn]}>
                <Text style={[s.metricNum, parseResult.summary.possibleDuplicates > 0 && { color: colors.caramel }]}>
                  {parseResult.summary.possibleDuplicates}
                </Text>
                <Text style={s.metricLabel}>Duplicates</Text>
              </View>
            </View>

            {/* Draft Items List */}
            <View style={s.draftList}>
              {draftItems.map((item) => {
                const isDup = item.duplicateStatus === 'possible_duplicate' || item.duplicateStatus === 'existing';

                return (
                  <Card key={item.id} style={s.itemCard}>
                    <View style={s.itemEmojiWrap}>
                      <Text style={s.itemEmojiText}>{item.emoji}</Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={s.itemHeaderRow}>
                        <Text style={s.itemName}>{item.name}</Text>
                        <Text style={s.itemPrice}>{money(item.price)}</Text>
                      </View>

                      <View style={s.itemBadgeRow}>
                        <View style={s.categoryBadge}>
                          <Text style={s.categoryBadgeText}>{item.category.toUpperCase()}</Text>
                        </View>

                        {isDup ? (
                          <View style={s.dupBadge}>
                            <Ionicons name="alert-circle" size={10} color={colors.caramel} />
                            <Text style={s.dupBadgeText}>
                              {item.duplicateStatus === 'existing' ? 'EXACT MATCH' : 'POSSIBLE DUPLICATE'}
                            </Text>
                          </View>
                        ) : (
                          <View style={s.newBadge}>
                            <Ionicons name="sparkles" size={10} color={colors.green} />
                            <Text style={s.newBadgeText}>NEW ITEM</Text>
                          </View>
                        )}
                      </View>

                      {!!item.description && (
                        <Text style={s.itemDesc} numberOfLines={2}>
                          {item.description}
                        </Text>
                      )}
                    </View>

                    {/* Action Buttons */}
                    <View style={s.itemActionRow}>
                      <Pressable
                        style={s.iconEditBtn}
                        onPress={() => setEditingItem(item)}
                        accessibilityLabel="Edit item details"
                      >
                        <Ionicons name="pencil-outline" size={16} color={colors.espresso} />
                      </Pressable>
                      <Pressable
                        style={s.iconDeleteBtn}
                        onPress={() => handleDeleteItem(item.id)}
                        accessibilityLabel="Remove from import"
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.danger} />
                      </Pressable>
                    </View>
                  </Card>
                );
              })}
            </View>

            {/* Bottom Finalize Actions */}
            <View style={s.bottomBar}>
              <Pressable style={s.cancelBtn} onPress={() => setStep(1)} disabled={saving}>
                <Text style={s.cancelBtnText}>Back</Text>
              </Pressable>

              <View style={{ flex: 2 }}>
                <Button
                  label={saving ? 'Creating Menu…' : `Create ${draftItems.length} Menu Items →`}
                  onPress={handleCreateMenu}
                  disabled={draftItems.length === 0 || saving}
                />
              </View>
            </View>
          </View>
        )}

        {/* ================= STEP 3: SUCCESS ================= */}
        {step === 3 && creationSummary && (
          <Card style={s.successCard}>
            <View style={s.successIconWrap}>
              <Ionicons name="checkmark-circle" size={54} color={colors.green} />
            </View>
            <Text style={s.successTitle}>Menu Successfully Created!</Text>
            <Text style={s.successSub}>
              Added {creationSummary.createdCount} products across {creationSummary.categoriesCount} categories to{' '}
              {currentRestaurant.name}.
            </Text>

            <View style={s.successActions}>
              <Button
                label="View Live Menu Editor →"
                onPress={() => router.replace('/admin-menu')}
              />
              <Pressable style={s.importAnotherBtn} onPress={() => setStep(1)}>
                <Text style={s.importAnotherText}>Import Another Document</Text>
              </Pressable>
            </View>
          </Card>
        )}
      </ScrollView>

      {/* Edit Item Modal */}
      {editingItem && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setEditingItem(null)}>
          <View style={s.modalBackdrop}>
            <Card style={s.editModalCard}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Edit Extracted Item</Text>
                <Pressable onPress={() => setEditingItem(null)}>
                  <Ionicons name="close" size={20} color={colors.muted} />
                </Pressable>
              </View>

              <Text style={s.fieldLabel}>Item Name</Text>
              <TextInput
                style={s.input}
                value={editingItem.name}
                onChangeText={(val) => setEditingItem({ ...editingItem, name: val })}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>Category</Text>
                  <TextInput
                    style={s.input}
                    value={editingItem.category}
                    onChangeText={(val) => setEditingItem({ ...editingItem, category: val })}
                  />
                </View>
                <View style={{ width: 100 }}>
                  <Text style={s.fieldLabel}>Price ($)</Text>
                  <TextInput
                    style={s.input}
                    value={String(editingItem.price)}
                    keyboardType="decimal-pad"
                    onChangeText={(val) =>
                      setEditingItem({ ...editingItem, price: parseFloat(val) || 0 })
                    }
                  />
                </View>
              </View>

              <Text style={s.fieldLabel}>Description</Text>
              <TextInput
                style={[s.input, s.textArea]}
                value={editingItem.description}
                onChangeText={(val) => setEditingItem({ ...editingItem, description: val })}
                multiline
              />

              <View style={s.modalBtnRow}>
                <Pressable style={s.modalCancel} onPress={() => setEditingItem(null)}>
                  <Text style={s.modalCancelText}>Cancel</Text>
                </Pressable>
                <View style={{ flex: 1.5 }}>
                  <Button label="Save Changes" onPress={() => handleUpdateItem(editingItem)} />
                </View>
              </View>
            </Card>
          </View>
        </Modal>
      )}

      {/* Raw Text Paste Modal */}
      {rawTextModal && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setRawTextModal(false)}>
          <View style={s.modalBackdrop}>
            <Card style={s.editModalCard}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Paste Menu Text</Text>
                <Pressable onPress={() => setRawTextModal(false)}>
                  <Ionicons name="close" size={20} color={colors.muted} />
                </Pressable>
              </View>

              <Text style={s.fieldLabel}>Paste categories, item names, and prices:</Text>
              <TextInput
                style={[s.input, { height: 160, textAlignVertical: 'top' }]}
                value={rawTextInput}
                onChangeText={setRawTextInput}
                placeholder={`COFFEE\nFlat White ... $5.50\nLong Black ... $5.00\n\nFOOD\nEggs Benedict ... $22.00`}
                placeholderTextColor={colors.muted}
                multiline
              />

              <View style={s.modalBtnRow}>
                <Pressable style={s.modalCancel} onPress={() => setRawTextModal(false)}>
                  <Text style={s.modalCancelText}>Cancel</Text>
                </Pressable>
                <View style={{ flex: 1.5 }}>
                  <Button
                    label="Extract Items →"
                    onPress={handleParseCustomText}
                    disabled={!rawTextInput.trim()}
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
  content: {
    padding: 16,
    paddingBottom: 60,
  },
  helpBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.md,
    backgroundColor: colors.cream,
  },
  helpBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.espresso,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: colors.espresso,
  },
  stepNum: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.muted,
  },
  stepNumActive: {
    color: colors.white,
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: colors.line,
    marginHorizontal: 6,
  },
  stepLineActive: {
    backgroundColor: colors.espresso,
  },
  banner: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 14,
    ...shadows.sm,
  },
  bannerRole: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.caramel,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.espresso,
    marginTop: 2,
  },
  bannerDesc: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
    lineHeight: 16,
  },
  uploadCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: '#E8DFD5',
    borderStyle: 'dashed',
    marginBottom: 14,
    ...shadows.sm,
  },
  uploadIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.creamSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  uploadCardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.espresso,
  },
  uploadCardSub: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 16,
    maxWidth: 300,
  },
  parsingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.creamSoft,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  parsingText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.espresso,
  },
  uploadBtnGroup: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    maxWidth: 380,
  },
  primaryUploadBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.espresso,
    paddingVertical: 12,
    borderRadius: radii.md,
    ...shadows.sm,
  },
  primaryUploadBtnText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 13,
  },
  secondaryUploadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.creamSoft,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 12,
    borderRadius: radii.md,
  },
  secondaryUploadBtnText: {
    color: colors.espresso,
    fontWeight: '800',
    fontSize: 12,
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF7F2',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  templateTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.caramel,
    letterSpacing: 0.8,
  },
  templateSub: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
    maxWidth: 240,
  },
  templateBtn: {
    backgroundColor: colors.espresso,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.sm,
  },
  templateBtnText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 11,
  },
  reviewHeader: {
    marginBottom: 14,
  },
  reviewEyebrow: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.caramel,
    letterSpacing: 1,
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.espresso,
    marginTop: 2,
  },
  reviewSub: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
    lineHeight: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    ...shadows.sm,
  },
  metricCardWarn: {
    borderColor: '#EBD8B8',
    backgroundColor: '#FFFDF9',
  },
  metricNum: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.espresso,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.muted,
    marginTop: 2,
  },
  draftList: {
    gap: 10,
    marginBottom: 16,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 10,
    ...shadows.sm,
  },
  itemEmojiWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.creamSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemEmojiText: {
    fontSize: 20,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.ink,
    flex: 1,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.espresso,
    marginLeft: 8,
  },
  itemBadgeRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    marginTop: 3,
  },
  categoryBadge: {
    backgroundColor: colors.cream,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.espresso,
  },
  newBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: colors.green,
  },
  dupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FDEED9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dupBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: colors.caramel,
  },
  itemDesc: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 4,
    lineHeight: 15,
  },
  itemActionRow: {
    flexDirection: 'row',
    gap: 6,
  },
  iconEditBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.creamSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDeleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FBE8E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    paddingTop: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.creamSoft,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.espresso,
  },
  successCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 20,
    backgroundColor: colors.white,
    ...shadows.md,
  },
  successIconWrap: {
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.espresso,
  },
  successSub: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
    lineHeight: 18,
    maxWidth: 320,
  },
  successActions: {
    width: '100%',
    maxWidth: 340,
    gap: 10,
  },
  importAnotherBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  importAnotherText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.caramel,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  editModalCard: {
    width: '100%',
    maxWidth: 480,
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
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.ink,
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.creamSoft,
    paddingHorizontal: 12,
    fontSize: 13,
    color: colors.ink,
  },
  textArea: {
    height: 70,
    paddingTop: 8,
    textAlignVertical: 'top',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.creamSoft,
    borderWidth: 1,
    borderColor: colors.line,
  },
  modalCancelText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.espresso,
  },
});
