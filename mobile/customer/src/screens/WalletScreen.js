import { Api } from '../api';
import { dateTime, rupees } from '../format';
import { colors, radius, space } from '../theme';
import { Card, Empty, Screen } from '../ui';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

const CREDIT = ['CREDIT', 'REFUND', 'REFERRAL'];

export default function WalletScreen() {
  const [wallet, setWallet] = useState(null);
  const [txns, setTxns] = useState(null);

  useFocusEffect(
    useCallback(() => {
      Api.wallet().then((r) => setWallet(r.data)).catch(() => setWallet({ balance: 0 }));
      Api.walletTxns().then((r) => setTxns(r.data)).catch(() => setTxns([]));
    }, []),
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: space(5), gap: space(5) }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.ink }}>Wallet</Text>

        <View style={{ backgroundColor: colors.brand, borderRadius: radius.xl, padding: space(5) }}>
          <Text style={{ color: '#c7d2fe' }}>Available balance</Text>
          <Text style={{ color: '#fff', fontSize: 34, fontWeight: '800', marginTop: space(1) }}>{rupees(wallet?.balance ?? 0)}</Text>
          <Text style={{ color: '#c7d2fe', fontSize: 12, marginTop: space(3) }}>Credits, refunds and referral rewards.</Text>
        </View>

        <View style={{ gap: space(2) }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink }}>Transactions</Text>
          {txns && txns.length === 0 ? (
            <Empty icon="wallet-outline" title="No transactions yet" />
          ) : (
            (txns ?? []).map((t) => {
              const credit = CREDIT.includes(t.type);
              return (
                <Card key={t.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(3) }}>
                    <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: credit ? colors.greenBg : '#f1f5f9' }}>
                      <Ionicons name={credit ? 'arrow-down' : 'arrow-up'} size={18} color={credit ? colors.green : colors.muted} />
                    </View>
                    <View>
                      <Text style={{ fontWeight: '700', color: colors.text, textTransform: 'capitalize' }}>{t.type.toLowerCase()}</Text>
                      <Text style={{ fontSize: 12, color: colors.muted }}>{dateTime(t.createdAt)}</Text>
                    </View>
                  </View>
                  <Text style={{ fontWeight: '700', color: credit ? colors.green : colors.text }}>{credit ? '+' : '−'}{rupees(t.amount)}</Text>
                </Card>
              );
            })
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
