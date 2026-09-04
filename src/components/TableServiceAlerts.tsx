import React, { useState, useEffect, useRef } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useServiceRequests,
  TableServiceRequest,
  SERVICE_REQUEST_LABELS,
} from '@/src/context/ServiceRequestContext';
import { colors, radii, shadows } from '@/src/theme';
import { triggerHaptic, Tooltip } from '@/src/components/UI';

export function TableServiceAlerts({
  showPanel = true,
  title = 'Table Service Calls',
}: {
  showPanel?: boolean;
  title?: string;
}) {
  const { requests, updateStatus } = useServiceRequests();
  const [muted, setMuted] = useState(false);
  const alertedIdsRef = useRef(new Set<string>());

  const pendingRequests = requests.filter(
    (r) => r.status === 'pending' || r.status === 'acknowledged',
  );

  // Play chime for brand-new pending requests
  useEffect(() => {
    if (muted) return;
    const newRequests = pendingRequests.filter(
      (r) => r.status === 'pending' && !alertedIdsRef.current.has(r.id),
    );

    if (newRequests.length > 0) {
      newRequests.forEach((r) => alertedIdsRef.current.add(r.id));
      triggerHaptic('medium');
      if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).AudioContext) {
        try {
          const ctx = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.18);
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.35);
        } catch {}
      }
    }
  }, [pendingRequests, muted]);

  if (pendingRequests.length === 0) {
    return null;
  }

  const handleAcknowledge = async (id: string) => {
    triggerHaptic('light');
    try {
      await updateStatus(id, 'acknowledged');
    } catch (e: any) {
      alert(e.message || 'Could not update status');
    }
  };

  const handleComplete = async (id: string) => {
    triggerHaptic('success');
    try {
      await updateStatus(id, 'completed');
    } catch (e: any) {
      alert(e.message || 'Could not complete request');
    }
  };

  const topRequest = pendingRequests[0];
  const isUrgent = topRequest.status === 'pending';

  return (
    <View style={s.container}>
      {/* Top Banner Alert Bar */}
      <View style={[s.alertBanner, isUrgent ? s.alertBannerUrgent : s.alertBannerAck]}>
        <View style={s.bellIconWrap}>
          <Ionicons
            name={isUrgent ? 'notifications' : 'notifications-outline'}
            size={18}
            color={colors.white}
          />
        </View>

        <View style={{ flex: 1 }}>
          <View style={s.topRow}>
            <Text style={s.tableBadgeText}>
              TABLE {topRequest.tableCode}
            </Text>
            <View
              style={[
                s.statusBadge,
                topRequest.status === 'acknowledged' && s.statusBadgeAck,
              ]}
            >
              <Text
                style={[
                  s.statusText,
                  topRequest.status === 'acknowledged' && s.statusTextAck,
                ]}
              >
                {topRequest.status === 'acknowledged' ? 'ACKNOWLEDGED' : 'NEW CALL'}
              </Text>
            </View>
          </View>

          <Text style={s.requestLabel}>
            {SERVICE_REQUEST_LABELS[topRequest.requestType] || topRequest.requestType}
            {topRequest.notes ? ` · "${topRequest.notes}"` : ''}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={s.actionsRow}>
          {topRequest.status === 'pending' && (
            <Tooltip text="Acknowledge Call">
              <Pressable
                style={s.ackBtn}
                onPress={() => void handleAcknowledge(topRequest.id)}
              >
                <Text style={s.ackBtnText}>Acknowledge</Text>
              </Pressable>
            </Tooltip>
          )}

          <Tooltip text="Mark Completed">
            <Pressable
              style={s.doneBtn}
              onPress={() => void handleComplete(topRequest.id)}
            >
              <Ionicons name="checkmark" size={14} color={colors.white} />
              <Text style={s.doneBtnText}>Complete</Text>
            </Pressable>
          </Tooltip>
        </View>
      </View>

      {/* If more than 1 active request, show list panel */}
      {showPanel && pendingRequests.length > 1 && (
        <View style={s.listPanel}>
          <Text style={s.panelHeading}>
            OTHER ACTIVE REQUESTS ({pendingRequests.length - 1})
          </Text>
          {pendingRequests.slice(1).map((req) => (
            <View key={req.id} style={s.listItem}>
              <View style={{ flex: 1 }}>
                <Text style={s.listTableText}>
                  Table {req.tableCode} ·{' '}
                  <Text style={{ fontWeight: '700', color: colors.ink }}>
                    {SERVICE_REQUEST_LABELS[req.requestType] || req.requestType}
                  </Text>
                </Text>
                {!!req.notes && <Text style={s.listNotes}>"{req.notes}"</Text>}
              </View>

              <View style={s.listActions}>
                {req.status === 'pending' && (
                  <Pressable
                    style={s.miniAckBtn}
                    onPress={() => void handleAcknowledge(req.id)}
                  >
                    <Text style={s.miniAckText}>Ack</Text>
                  </Pressable>
                )}
                <Pressable
                  style={s.miniDoneBtn}
                  onPress={() => void handleComplete(req.id)}
                >
                  <Ionicons name="checkmark" size={12} color={colors.white} />
                  <Text style={s.miniDoneText}>Done</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FAF5EE',
    borderWidth: 1.5,
    borderColor: '#EBD8B8',
    borderRadius: 18,
    padding: 12,
    ...shadows.sm,
  },
  alertBannerUrgent: {
    backgroundColor: '#FFF7E6',
    borderColor: '#E68A00',
  },
  alertBannerAck: {
    backgroundColor: '#F0F9F2',
    borderColor: '#BFE5CA',
  },
  bellIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.caramel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  tableBadgeText: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.espresso,
  },
  statusBadge: {
    backgroundColor: '#FFF0D4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: '#F5BE6B',
  },
  statusBadgeAck: {
    backgroundColor: '#E6F4EA',
    borderColor: '#A4D9B2',
  },
  statusText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#B36B00',
    letterSpacing: 0.5,
  },
  statusTextAck: {
    color: colors.green,
  },
  requestLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.ink,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  ackBtn: {
    backgroundColor: colors.cream,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  ackBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.espresso,
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.green,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    ...shadows.sm,
  },
  doneBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.white,
  },
  listPanel: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 10,
    marginTop: 8,
  },
  panelHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.muted,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  listTableText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.espresso,
  },
  listNotes: {
    fontSize: 11,
    color: colors.muted,
    fontStyle: 'italic',
  },
  listActions: {
    flexDirection: 'row',
    gap: 6,
  },
  miniAckBtn: {
    backgroundColor: colors.cream,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  miniAckText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.espresso,
  },
  miniDoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.green,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  miniDoneText: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.white,
  },
});
