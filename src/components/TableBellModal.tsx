import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Tooltip, triggerHaptic } from '@/src/components/UI';
import {
  ServiceRequestType,
  useServiceRequests,
  SERVICE_REQUEST_LABELS,
} from '@/src/context/ServiceRequestContext';
import { useOrders } from '@/src/context/OrderContext';
import { colors, radii, shadows } from '@/src/theme';

export function TableBellButton() {
  const { orderMode, table } = useOrders();
  const { requests } = useServiceRequests();
  const [modalVisible, setModalVisible] = useState(false);

  // Table bell only appears for Dine-In / Table context
  if (orderMode !== 'table' || !table) {
    return null;
  }

  const activeRequest = requests.find(
    (r) =>
      r.tableCode === table.code &&
      (r.status === 'pending' || r.status === 'acknowledged'),
  );

  return (
    <>
      <Tooltip text="Call Staff / Table Service">
        <Pressable
          style={[
            s.floatingBellBtn,
            activeRequest && s.floatingBellBtnActive,
          ]}
          onPress={() => {
            triggerHaptic('medium');
            setModalVisible(true);
          }}
          accessibilityLabel="Call staff or request service"
        >
          <Ionicons
            name={activeRequest ? 'notifications' : 'notifications-outline'}
            size={20}
            color={activeRequest ? colors.white : colors.espresso}
          />
          <Text
            style={[
              s.floatingBellText,
              activeRequest && s.floatingBellTextActive,
            ]}
          >
            {activeRequest
              ? activeRequest.status === 'acknowledged'
                ? 'Staff On The Way'
                : 'Staff Notified'
              : 'Call Staff'}
          </Text>
        </Pressable>
      </Tooltip>

      <TableBellModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </>
  );
}

export function TableBellModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { table, orderMode } = useOrders();
  const { requestService, requests, isCoolingDown } = useServiceRequests();

  const [selectedType, setSelectedType] = useState<ServiceRequestType>('call_staff');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    text: string;
    type: 'success' | 'info' | 'error';
  } | null>(null);

  if (orderMode !== 'table' || !table) return null;

  const activeRequest = requests.find(
    (r) =>
      r.tableCode === table.code &&
      (r.status === 'pending' || r.status === 'acknowledged'),
  );

  const requestOptions: Array<{
    type: ServiceRequestType;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    sub: string;
  }> = [
    {
      type: 'call_staff',
      label: 'Call Staff',
      icon: 'notifications-outline',
      sub: 'Need assistance from your server',
    },
    {
      type: 'water',
      label: 'Water Please',
      icon: 'water-outline',
      sub: 'Complimentary table water',
    },
    {
      type: 'need_help',
      label: 'Need Help',
      icon: 'help-circle-outline',
      sub: 'Menu questions or cutlery',
    },
    {
      type: 'bill',
      label: 'Ready to Pay / Bill',
      icon: 'receipt-outline',
      sub: 'Request bill at table or counter',
    },
  ];

  const handleSend = async (typeToSend?: ServiceRequestType) => {
    const type = typeToSend || selectedType;
    triggerHaptic('medium');
    setSubmitting(true);
    setFeedbackMessage(null);

    try {
      await requestService(type, notes);
      setFeedbackMessage({
        text: `Staff have been notified for ${table.name || `Table ${table.code}`}.`,
        type: 'success',
      });
      setNotes('');
    } catch (e: any) {
      const msg = e.message || 'Could not send table request';
      if (msg.includes('already been sent')) {
        setFeedbackMessage({
          text: 'Your request has already been sent.',
          type: 'info',
        });
      } else {
        setFeedbackMessage({
          text: msg,
          type: 'error',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={s.backdrop}>
        <Card style={s.modalCard}>
          {/* Header */}
          <View style={s.headerRow}>
            <View style={{ flex: 1 }}>
              <View style={s.tableBadge}>
                <Ionicons name="restaurant-outline" size={13} color={colors.caramel} />
                <Text style={s.tableBadgeText}>
                  {table.name ? `${table.name} (${table.code})` : `TABLE ${table.code}`}
                </Text>
              </View>
              <Text style={s.title}>Call Staff & Table Service</Text>
            </View>
            <Tooltip text="Close Dialog">
              <Pressable style={s.closeBtn} onPress={onClose} accessibilityLabel="Close Dialog">
                <Ionicons name="close" size={20} color={colors.muted} />
              </Pressable>
            </Tooltip>
          </View>

          {/* Active Request Status Banner if already active */}
          {activeRequest && (
            <View
              style={[
                s.activeBanner,
                activeRequest.status === 'acknowledged' && s.activeBannerAcknowledged,
              ]}
            >
              <Ionicons
                name={
                  activeRequest.status === 'acknowledged'
                    ? 'checkmark-circle'
                    : 'time-outline'
                }
                size={20}
                color={
                  activeRequest.status === 'acknowledged'
                    ? colors.green
                    : colors.caramel
                }
              />
              <View style={{ flex: 1 }}>
                <Text style={s.activeBannerTitle}>
                  {activeRequest.status === 'acknowledged'
                    ? 'Staff are on the way!'
                    : `Staff have been notified for Table ${table.code}`}
                </Text>
                <Text style={s.activeBannerSub}>
                  {SERVICE_REQUEST_LABELS[activeRequest.requestType] || activeRequest.requestType} request sent
                </Text>
              </View>
            </View>
          )}

          {/* Feedback message banner */}
          {feedbackMessage && (
            <View
              style={[
                s.feedbackBox,
                feedbackMessage.type === 'error' && s.feedbackError,
                feedbackMessage.type === 'info' && s.feedbackInfo,
              ]}
            >
              <Text
                style={[
                  s.feedbackText,
                  feedbackMessage.type === 'error' && s.feedbackTextError,
                  feedbackMessage.type === 'info' && s.feedbackTextInfo,
                ]}
              >
                {feedbackMessage.text}
              </Text>
            </View>
          )}

          {/* Quick Choice Buttons */}
          <Text style={s.sectionLabel}>CHOOSE SERVICE REQUEST</Text>
          <View style={s.optionsGrid}>
            {requestOptions.map((opt) => {
              const isSelected = selectedType === opt.type;
              const cooling = isCoolingDown(opt.type);

              return (
                <Pressable
                  key={opt.type}
                  style={[
                    s.optionCard,
                    isSelected && s.optionCardSelected,
                    cooling && s.optionCardCooling,
                  ]}
                  onPress={() => {
                    setSelectedType(opt.type);
                    void handleSend(opt.type);
                  }}
                  disabled={submitting}
                >
                  <View
                    style={[
                      s.optionIconWrap,
                      isSelected && s.optionIconWrapSelected,
                    ]}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={20}
                      color={isSelected ? colors.white : colors.espresso}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        s.optionTitle,
                        isSelected && s.optionTitleSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    <Text style={s.optionSub}>{opt.sub}</Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={isSelected ? colors.espresso : colors.line}
                  />
                </Pressable>
              );
            })}
          </View>

          {/* Optional notes */}
          <Text style={s.sectionLabel}>OPTIONAL NOTE FOR STAFF</Text>
          <TextInput
            style={s.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. Extra napkins, high chair please"
            placeholderTextColor={colors.muted}
            maxLength={100}
          />

          {/* Action buttons */}
          <View style={s.btnRow}>
            <Pressable style={s.cancelBtn} onPress={onClose}>
              <Text style={s.cancelBtnText}>Done</Text>
            </Pressable>
            <View style={{ flex: 1.5 }}>
              <Button
                label={submitting ? 'Sending…' : 'Send Request'}
                onPress={() => void handleSend()}
                disabled={submitting}
              />
            </View>
          </View>
        </Card>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  floatingBellBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.caramel,
    ...shadows.md,
  },
  floatingBellBtnActive: {
    backgroundColor: colors.espresso,
    borderColor: colors.espresso,
  },
  floatingBellText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.espresso,
  },
  floatingBellTextActive: {
    color: colors.white,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 20,
    ...shadows.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  tableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.cream,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  tableBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.caramel,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.espresso,
  },
  closeBtn: {
    padding: 6,
    backgroundColor: colors.creamSoft,
    borderRadius: radii.full,
  },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FAF5EE',
    borderWidth: 1,
    borderColor: '#EBD8B8',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  activeBannerAcknowledged: {
    backgroundColor: '#F0F9F2',
    borderColor: '#BFE5CA',
  },
  activeBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.espresso,
  },
  activeBannerSub: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 1,
  },
  feedbackBox: {
    backgroundColor: '#F0F9F2',
    borderColor: '#BFE5CA',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  feedbackError: {
    backgroundColor: '#FBE8E5',
    borderColor: '#E8C4BE',
  },
  feedbackInfo: {
    backgroundColor: '#FAF5EE',
    borderColor: '#EBD8B8',
  },
  feedbackText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.green,
    textAlign: 'center',
  },
  feedbackTextError: {
    color: colors.danger,
  },
  feedbackTextInfo: {
    color: colors.espresso,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.caramel,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 6,
  },
  optionsGrid: {
    gap: 8,
    marginBottom: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 16,
    padding: 12,
    gap: 10,
    ...shadows.sm,
  },
  optionCardSelected: {
    borderColor: colors.espresso,
    backgroundColor: colors.creamSoft,
  },
  optionCardCooling: {
    opacity: 0.6,
  },
  optionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconWrapSelected: {
    backgroundColor: colors.espresso,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.espresso,
  },
  optionTitleSelected: {
    color: colors.espresso,
  },
  optionSub: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 1,
  },
  notesInput: {
    height: 42,
    backgroundColor: colors.creamSoft,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 12,
    color: colors.ink,
    marginBottom: 14,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
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
});
