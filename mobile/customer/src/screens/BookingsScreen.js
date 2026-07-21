import { Api } from '../api';
import { dateTime, rupees } from '../format';
import { colors, radius, space } from '../theme';
import { Card, Empty, Screen, StatusBadge } from '../ui';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'done', label: 'Done' },
];
const ACTIVE = ['REQUESTED', 'ACCEPTED', 'EN_ROUTE', 'IN_PROGRESS'];
const DONE = ['COMPLETED', 'SETTLED'];

export default function BookingsScreen({ navigation }) {
  const [bookings, setBookings] = useState(null);
  const [tab, setTab] = useState('all');

  useFocusEffect(
    useCallback(() => {
      Api.myBookings().then((r) => setBookings(r.data)).catch(() => setBookings([]));
    }, []),
  );

  const filtered = (bookings ?? []).filter((b) =>
    tab === 'active' ? ACTIVE.includes(b.status) : tab === 'done' ? DONE.includes(b.status) : true,
  );

  return (
    <Screen>
      <View style={{ padding: space(5), paddingBottom: space(2) }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.ink }}>Your bookings</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: space(2), paddingHorizontal: space(5), marginBottom: space(3) }}>
        {TABS.map((t) => (
          <Pressable
            key={t.key}
            onPress={() => setTab(t.key)}
            style={{ paddingHorizontal: space(4), paddingVertical: space(2), borderRadius: radius.pill, backgroundColor: tab === t.key ? colors.brand : colors.card, borderWidth: 1, borderColor: tab === t.key ? colors.brand : colors.border }}
          >
            <Text style={{ fontWeight: '700', color: tab === t.key ? '#fff' : colors.text, fontSize: 13 }}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: space(5), paddingTop: 0, gap: space(3) }}>
        {filtered.length === 0 ? (
          <Empty icon="calendar-outline" title="Nothing here yet" text="Your bookings will appear here." />
        ) : (
          filtered.map((b) => (
            <Pressable key={b.id} onPress={() => navigation.navigate('BookingDetail', { id: b.id })}>
              <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', color: colors.ink }}>{b.service?.name ?? 'Service'}</Text>
                  <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>{dateTime(b.createdAt)} · {b.paymentMode === 'CASH' ? 'Cash' : 'Online'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: space(1) }}>
                  <Text style={{ fontWeight: '700', color: colors.text }}>{rupees(b.finalPrice ?? b.priceEstimate)}</Text>
                  <StatusBadge status={b.status} />
                </View>
              </Card>
            </Pressable>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
