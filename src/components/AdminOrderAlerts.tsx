import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer } from "expo-audio";
import * as Speech from "expo-speech";
import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { money } from "@/src/data/products";
import { supabase } from "@/src/lib/supabase";
import { useRestaurant } from "@/src/context/RestaurantContext";
import { colors, shadow } from "@/src/theme";

const MUTED_KEY = "cafe-admin-alerts-muted";
const SEEN_KEY = "cafe-admin-alerted-orders";

type NewOrder = {
  id: string;
  total_cents: number;
  order_type?: "pickup" | "table";
  table_name?: string | null;
};

function makeDingUri() {
  const sampleRate = 8000;
  const duration = 0.28;
  const sampleCount = Math.floor(sampleRate * duration);
  const bytes = new Uint8Array(44 + sampleCount * 2);
  const view = new DataView(bytes.buffer);
  const write = (offset: number, value: string) =>
    [...value].forEach((character, index) =>
      view.setUint8(offset + index, character.charCodeAt(0)),
    );
  write(0, "RIFF");
  view.setUint32(4, 36 + sampleCount * 2, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, sampleCount * 2, true);
  for (let index = 0; index < sampleCount; index++) {
    const time = index / sampleRate;
    const frequency = time < 0.13 ? 880 : 1174;
    const envelope = Math.exp(-7 * time);
    view.setInt16(
      44 + index * 2,
      Math.round(Math.sin(2 * Math.PI * frequency * time) * envelope * 15000),
      true,
    );
  }
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return `data:audio/wav;base64,${btoa(binary)}`;
}

const dingUri = makeDingUri();

export function AdminOrderAlerts() {
  const { currentRestaurant } = useRestaurant();
  const player = useAudioPlayer(dingUri);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  const [audioEnabled, setAudioEnabled] = useState(Platform.OS !== "web");
  const audioEnabledRef = useRef(Platform.OS !== "web");
  const seenRef = useRef(new Set<string>());
  const [notification, setNotification] = useState<NewOrder>();

  const playDing = () => {
    void player
      .seekTo(0)
      .then(() => player.play())
      .catch(() => undefined);
  };

  useEffect(() => {
    void Promise.all([
      AsyncStorage.getItem(MUTED_KEY),
      AsyncStorage.getItem(SEEN_KEY),
    ]).then(([savedMuted, savedSeen]) => {
      const isMuted = savedMuted === "true";
      setMuted(isMuted);
      mutedRef.current = isMuted;
      if (savedSeen) {
        try { seenRef.current = new Set(JSON.parse(savedSeen) as string[]); }
        catch { seenRef.current = new Set(); }
      }
    });
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    const channel = client
      .channel(`admin-new-order-alerts-${currentRestaurant.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${currentRestaurant.id}`,
        },
        (payload) => {
          const order = payload.new as NewOrder & { restaurant_id?: string };
          if (!order.id || seenRef.current.has(order.id)) return;
          seenRef.current.add(order.id);
          void AsyncStorage.setItem(
            SEEN_KEY,
            JSON.stringify([...seenRef.current].slice(-100)),
          );
          if (!mutedRef.current && audioEnabledRef.current) {
            playDing();
            Speech.stop();
            Speech.speak("New order received", { rate: 0.95, pitch: 1 });
          }
          void client.from("orders").select("id,total_cents,order_type,table_name").eq("id", order.id).single().then(({ data }) => {
            setNotification((data as NewOrder | null) ?? order);
          });
        },
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
      Speech.stop();
    };
  }, [player, currentRestaurant.id]);

  const toggleMute = () => {
    if (!audioEnabled) {
      setAudioEnabled(true);
      audioEnabledRef.current = true;
      setMuted(false);
      mutedRef.current = false;
      void AsyncStorage.setItem(MUTED_KEY, "false");
      playDing();
      return;
    }
    const next = !muted;
    setMuted(next);
    mutedRef.current = next;
    void AsyncStorage.setItem(MUTED_KEY, String(next));
    if (next) Speech.stop();
    else playDing();
  };

  return (
    <View>
      <View style={styles.controlRow}>
        <View>
          <Text style={styles.controlTitle}>New order alerts</Text>
          <Text style={styles.controlText}>
            {!audioEnabled
              ? "Tap once to enable sound and voice"
              : muted ? "Sound and voice are off" : "Sound and voice are on"}
          </Text>
        </View>
        <Pressable
          style={[styles.muteButton, muted && styles.muteButtonOff]}
          onPress={toggleMute}
        >
          <Ionicons
            name={!audioEnabled || muted ? "volume-mute-outline" : "volume-high-outline"}
            size={18}
            color={muted ? colors.espresso : colors.white}
          />
          <Text style={[styles.muteText, muted && { color: colors.espresso }]}>
            {!audioEnabled ? "Enable" : muted ? "Unmute" : "Mute"}
          </Text>
        </Pressable>
      </View>
      {!!notification && (
        <View style={styles.banner}>
          <View style={styles.bell}>
            <Ionicons name="notifications" size={24} color={colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>
              {notification.order_type === "table"
                ? `TABLE ORDER · ${notification.table_name?.toUpperCase()}`
                : "NEW ORDER RECEIVED"}
            </Text>
            <Text style={styles.order}>{notification.id}</Text>
            <Text style={styles.total}>
              Total · {money(notification.total_cents / 100)}
            </Text>
          </View>
          <Pressable
            style={styles.close}
            onPress={() => setNotification(undefined)}
          >
            <Ionicons name="close" size={20} color={colors.white} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  controlRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    padding: 13,
    marginBottom: 12,
  },
  controlTitle: { color: colors.ink, fontWeight: "800", fontSize: 14 },
  controlText: { color: colors.muted, fontSize: 11, marginTop: 3 },
  muteButton: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    backgroundColor: colors.espresso,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 12,
  },
  muteButtonOff: {
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.line,
  },
  muteText: { color: colors.white, fontWeight: "800", fontSize: 12 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.green,
    borderRadius: 19,
    padding: 15,
    marginBottom: 14,
    ...shadow,
  },
  bell: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,.18)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  eyebrow: {
    color: "#DDEADF",
    fontSize: 9,
    letterSpacing: 1.2,
    fontWeight: "800",
  },
  order: { color: colors.white, fontSize: 18, fontWeight: "800", marginTop: 3 },
  total: { color: "#E8F1EA", fontSize: 12, marginTop: 2 },
  close: { padding: 8 },
});
