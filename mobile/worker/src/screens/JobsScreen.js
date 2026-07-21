import { Api } from '../api';
import { useAuth } from '../auth';
import { dateTime, rupees } from '../format';
import { colors, radius, space } from '../theme';
import { Card, Empty, Screen, StatusBadge } from '../ui';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

export default function JobsScreen({ navigation }) {
  const { user } = useAuth();
  const [jobs, setJobs] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await Api.myBookings();
      setJobs(r.data);
    } catch {
      setJobs([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const requests = (jobs ?? []).filter((j) => j.status === 'REQUESTED');
  const others = (jobs ?? []).filter((j) => j.status !== 'REQUESTED');

  const Job = ({ j, highlight }) => (
    <Pressable onPress={() => navigation.navigate('JobDetail', { id: j.id })}>
      <Card style={{ borderColor: highlight ? colors.brand : colors.border, borderWidth: highlight ? 2 : 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '800', color: colors.ink }}>{j.service?.name ?? 'Service'}</Text>
            <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>{dateTime(j.createdAt)} · {j.paymentMode === 'CASH' ? 'Cash' : 'Online'}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: space(1) }}>
            <Text style={{ fontWeight: '800', color: colors.text }}>{rupees(j.finalPrice ?? j.priceEstimate)}</Text>
            <StatusBadge status={j.status} />
          </View>
        </View>
      </Card>
    </Pressable>
  );

  return (
    <Screen>
      <View style={{ padding: space(5), paddingBottom: space(2) }}>
        <Text style={{ color: colors.muted }}>Welcome back,</Text>
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.ink }}>{user?.name ?? 'Pro'}</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: space(5), paddingTop: 0, gap: space(4) }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
      >
        {requests.length > 0 && (
          <View style={{ gap: space(2) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
              <Ionicons name="notifications" size={18} color={colors.brand} />
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink }}>New requests</Text>
            </View>
            {requests.map((j) => <Job key={j.id} j={j} highlight />)}
          </View>
        )}

        <View style={{ gap: space(2) }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink }}>Your jobs</Text>
          {others.length === 0 && requests.length === 0 ? (
            <Empty icon="briefcase-outline" title="No jobs yet" text="Go online from your profile to start receiving requests." />
          ) : others.length === 0 ? (
            <Text style={{ color: colors.muted }}>No active jobs.</Text>
          ) : (
            others.map((j) => <Job key={j.id} j={j} />)
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
