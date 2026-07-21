import { Api } from '../api';
import { useAuth } from '../auth';
import { dateTime, rupees } from '../format';
import { colors, radius, space } from '../theme';
import { Card, Empty, Screen, StatusBadge } from '../ui';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

const EMOJI = {
  electrician: '⚡', plumber: '🚰', cleaner: '🧽', carpenter: '🪚', painter: '🎨',
  'ac-technician': '❄️', 'pest-control': '🐜', 'appliance-repair': '🔧', gardening: '🌿',
};

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [categories, setCategories] = useState(null);
  const [bookings, setBookings] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, b] = await Promise.all([Api.categories(), Api.myBookings()]);
      setCategories(c.data);
      setBookings(b.data);
    } catch {
      setCategories([]);
      setBookings([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: space(5), gap: space(6) }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
      >
        {/* Greeting */}
        <View style={{ backgroundColor: colors.brand, borderRadius: radius.xl, padding: space(5) }}>
          <Text style={{ color: '#c7d2fe', fontSize: 14 }}>Hi {user?.name?.split(' ')[0] ?? 'there'} 👋</Text>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', marginTop: space(1) }}>What needs fixing today?</Text>
        </View>

        {/* Categories */}
        <View style={{ gap: space(3) }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: colors.ink }}>Browse services</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(3) }}>
            {(categories ?? []).map((c) => (
              <Pressable
                key={c.id}
                onPress={() => navigation.navigate('Book', { categoryId: c.id, slug: c.slug })}
                style={{ width: '47.5%' }}
              >
                <Card style={{ gap: space(2) }}>
                  <View style={{ width: 46, height: 46, borderRadius: radius.md, backgroundColor: colors.brandLight, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 22 }}>{EMOJI[c.slug] ?? '🛠️'}</Text>
                  </View>
                  <Text style={{ fontWeight: '700', color: colors.ink }}>{c.name}</Text>
                  <Text style={{ fontSize: 12, color: colors.muted }}>{c.services?.length ?? 0} services</Text>
                </Card>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Recent bookings */}
        <View style={{ gap: space(3) }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: colors.ink }}>Recent bookings</Text>
          {bookings && bookings.length === 0 ? (
            <Empty icon="calendar-outline" title="No bookings yet" text="Pick a service above to book your first pro." />
          ) : (
            (bookings ?? []).slice(0, 4).map((b) => (
              <Pressable key={b.id} onPress={() => navigation.navigate('BookingDetail', { id: b.id })}>
                <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', color: colors.ink }}>{b.service?.name ?? 'Service'}</Text>
                    <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>{dateTime(b.createdAt)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: space(1) }}>
                    <Text style={{ fontWeight: '700', color: colors.text }}>{rupees(b.finalPrice ?? b.priceEstimate)}</Text>
                    <StatusBadge status={b.status} />
                  </View>
                </Card>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
