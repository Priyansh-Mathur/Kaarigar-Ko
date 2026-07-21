import { Api } from '../api';
import { dateTime, rupees, titleCase } from '../format';
import { connectSocket } from '../socket';
import { colors, radius, space } from '../theme';
import { Button, Card, Loading, Screen, StatusBadge } from '../ui';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

export default function JobDetailScreen({ navigation, route }) {
  const { id } = route.params;
  const [b, setB] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [sharing, setSharing] = useState(false);
  const socketRef = useRef(null);
  const watchRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const r = await Api.booking(id);
      setB(r.data);
    } catch {
      /* ignore */
    }
  }, [id]);

  useEffect(() => {
    load();
    const socket = connectSocket();
    socketRef.current = socket;
    socket.on('connect', () => socket.emit('booking.join', { bookingId: id }));
    const refresh = () => load();
    socket.on('booking.status_changed', refresh);
    socket.on('payment.updated', refresh);
    return () => {
      watchRef.current?.remove();
      socket.disconnect();
    };
  }, [id, load]);

  async function toggleShare() {
    if (sharing) {
      watchRef.current?.remove();
      watchRef.current = null;
      setSharing(false);
      return;
    }
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setMsg('Location permission is needed to share your live position.');
      return;
    }
    setSharing(true);
    watchRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 25 },
      (pos) => {
        socketRef.current?.emit('location.ping', {
          bookingId: id,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
    );
  }

  async function run(fn) {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setMsg(e.message ?? 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  if (!b) return <Screen><Loading /></Screen>;

  const paid = (b.payments ?? []).some((p) => p.status === 'PAID');

  function actions() {
    switch (b.status) {
      case 'REQUESTED':
        return (
          <View style={{ flexDirection: 'row', gap: space(3) }}>
            <Button title="Reject" variant="secondary" style={{ flex: 1 }} disabled={busy} onPress={() => run(() => Api.rejectJob(id))} />
            <Button title="Accept job" style={{ flex: 1 }} loading={busy} onPress={() => run(() => Api.acceptJob(id))} />
          </View>
        );
      case 'ACCEPTED':
        return <Button title="Start — on my way" icon="navigate" loading={busy} onPress={() => run(() => Api.jobStatus(id, 'EN_ROUTE'))} />;
      case 'EN_ROUTE':
        return <Button title="I've arrived" icon="location" loading={busy} onPress={() => run(() => Api.jobStatus(id, 'IN_PROGRESS'))} />;
      case 'IN_PROGRESS':
        return <Button title="Mark job complete" icon="checkmark-circle" variant="success" loading={busy} onPress={() => run(() => Api.jobStatus(id, 'COMPLETED'))} />;
      case 'COMPLETED':
        if (b.paymentMode === 'CASH') return <Button title={`Collect ${rupees(b.finalPrice ?? b.priceEstimate)} cash`} icon="cash" variant="success" loading={busy} onPress={() => run(() => Api.cashConfirm(id))} />;
        if (paid) return <Text style={{ color: colors.muted, textAlign: 'center' }}>Settled automatically.</Text>;
        return (
          <View style={{ gap: space(2) }}>
            <Button title="Confirm UPI payment received" icon="checkmark-circle" variant="success" loading={busy} onPress={() => run(() => Api.upiConfirm(id))} />
            <Text style={{ color: colors.muted, textAlign: 'center', fontSize: 12 }}>Tap once the customer&apos;s UPI transfer lands in your account.</Text>
          </View>
        );
      default:
        return null;
    }
  }

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: space(4), gap: space(3) }}>
        <Pressable onPress={() => navigation.goBack()}><Ionicons name="chevron-back" size={26} color={colors.text} /></Pressable>
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink, flex: 1 }} numberOfLines={1}>{b.service?.name}</Text>
        <StatusBadge status={b.status} />
      </View>

      <ScrollView contentContainerStyle={{ padding: space(5), paddingTop: 0, gap: space(4) }}>
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ color: colors.muted, fontSize: 12 }}>Job value</Text>
              <Text style={{ fontSize: 24, fontWeight: '800', color: colors.ink }}>{rupees(b.finalPrice ?? b.priceEstimate)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: colors.muted, fontSize: 12 }}>Payment</Text>
              <Text style={{ fontWeight: '700', color: colors.text }}>{b.paymentMode === 'CASH' ? 'Cash' : 'Online'}</Text>
            </View>
          </View>
        </Card>

        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
            <Ionicons name="location" size={18} color={colors.brand} />
            <Text style={{ color: colors.text }}>{b.location ? `${b.location.lat}, ${b.location.lng}` : 'Location shared'}</Text>
          </View>
        </Card>

        {b.status === 'EN_ROUTE' && (
          <Pressable onPress={toggleShare}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderColor: sharing ? colors.green : colors.border, borderWidth: sharing ? 2 : 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(3) }}>
                <Ionicons name="navigate" size={20} color={sharing ? colors.green : colors.brand} />
                <View>
                  <Text style={{ fontWeight: '800', color: colors.ink }}>{sharing ? 'Sharing live location' : 'Share live location'}</Text>
                  <Text style={{ fontSize: 12, color: colors.muted }}>{sharing ? 'Customer can see you approaching' : 'Let the customer track your arrival'}</Text>
                </View>
              </View>
              <Ionicons name={sharing ? 'radio' : 'radio-outline'} size={22} color={sharing ? colors.green : colors.muted} />
            </Card>
          </Pressable>
        )}

        <Card>
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Timeline</Text>
          <View style={{ marginTop: space(3), gap: space(3) }}>
            {(b.events ?? []).map((e, i) => {
              const last = i === b.events.length - 1;
              return (
                <View key={e.id} style={{ flexDirection: 'row', gap: space(3), alignItems: 'center' }}>
                  <View style={{ width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: last ? colors.brand : '#f1f5f9' }}>
                    <Ionicons name="checkmark" size={15} color={last ? '#fff' : colors.muted} />
                  </View>
                  <View>
                    <Text style={{ fontWeight: '600', color: colors.text }}>{titleCase(e.type)}</Text>
                    <Text style={{ fontSize: 12, color: colors.muted }}>{dateTime(e.createdAt)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </Card>

        {msg && <Text style={{ color: colors.rose }}>{msg}</Text>}
        <View style={{ marginTop: space(2) }}>{actions()}</View>
      </ScrollView>
    </Screen>
  );
}
