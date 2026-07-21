import { Api } from '../api';
import { dateTime, rupees } from '../format';
import { colors, radius, space } from '../theme';
import { Button, Card, Empty, Screen, StatusBadge } from '../ui';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

export default function EarningsScreen() {
  const [earnings, setEarnings] = useState(null);
  const [payouts, setPayouts] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    try {
      const [e, p] = await Promise.all([Api.earnings(), Api.payouts()]);
      setEarnings(e.data);
      setPayouts(p.data);
    } catch {
      setEarnings({ balance: 0, totalEarned: 0, pendingPayouts: 0 });
      setPayouts([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function requestPayout() {
    setBusy(true);
    setMsg(null);
    try {
      await Api.requestPayout();
      setMsg('Payout requested 🎉');
      await load();
    } catch (e) {
      setMsg(e.message ?? 'Could not request payout');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: space(5), gap: space(5) }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.ink }}>Earnings</Text>

        <View style={{ backgroundColor: colors.brand, borderRadius: radius.xl, padding: space(5) }}>
          <Text style={{ color: '#c7d2fe' }}>Available balance</Text>
          <Text style={{ color: '#fff', fontSize: 34, fontWeight: '800', marginTop: space(1) }}>{rupees(earnings?.balance ?? 0)}</Text>
          <Button title="Request payout" variant="secondary" onPress={requestPayout} loading={busy} disabled={!earnings?.balance} style={{ marginTop: space(4) }} />
          {msg && <Text style={{ color: '#fff', marginTop: space(2) }}>{msg}</Text>}
        </View>

        <View style={{ flexDirection: 'row', gap: space(3) }}>
          <Card style={{ flex: 1 }}>
            <Text style={{ color: colors.muted, fontSize: 12 }}>Total earned</Text>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink, marginTop: space(1) }}>{rupees(earnings?.totalEarned ?? 0)}</Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <Text style={{ color: colors.muted, fontSize: 12 }}>Pending payouts</Text>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink, marginTop: space(1) }}>{rupees(earnings?.pendingPayouts ?? 0)}</Text>
          </Card>
        </View>

        <View style={{ gap: space(2) }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink }}>Payout history</Text>
          {payouts && payouts.length === 0 ? (
            <Empty icon="cash-outline" title="No payouts yet" />
          ) : (
            (payouts ?? []).map((p) => (
              <Card key={p.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ fontWeight: '800', color: colors.ink }}>{rupees(p.amount)}</Text>
                  <Text style={{ fontSize: 12, color: colors.muted }}>{dateTime(p.requestedAt)}</Text>
                </View>
                <StatusBadge status={p.status} />
              </Card>
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
