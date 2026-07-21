import { useAuth } from '../auth';
import { colors, radius, space } from '../theme';
import { Avatar, Button, Card, Screen } from '../ui';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView, Text, View } from 'react-native';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const rows = [
    { icon: 'call', label: 'Phone', value: user?.phone },
    { icon: 'mail', label: 'Email', value: user?.email ?? 'Not set' },
    { icon: 'globe', label: 'Language', value: user?.locale?.toUpperCase() },
    { icon: 'shield-checkmark', label: 'Account', value: user?.status },
  ];

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: space(5), gap: space(5) }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.ink }}>Profile</Text>

        <Card style={{ alignItems: 'center', gap: space(2), paddingVertical: space(6) }}>
          <Avatar name={user?.name} size={72} />
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink }}>{user?.name ?? 'Guest'}</Text>
          <View style={{ backgroundColor: colors.brandLight, paddingHorizontal: space(3), paddingVertical: space(1), borderRadius: radius.pill }}>
            <Text style={{ color: colors.brand, fontWeight: '700', fontSize: 12 }}>Customer</Text>
          </View>
        </Card>

        <Card style={{ gap: 0, padding: 0 }}>
          {rows.map((r, i) => (
            <View key={r.label} style={{ flexDirection: 'row', alignItems: 'center', gap: space(3), padding: space(4), borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
              <Ionicons name={r.icon} size={20} color={colors.brand} />
              <Text style={{ color: colors.muted, flex: 1 }}>{r.label}</Text>
              <Text style={{ fontWeight: '600', color: colors.text }}>{r.value}</Text>
            </View>
          ))}
        </Card>

        <Button title="Log out" variant="danger" icon="log-out" onPress={async () => { await logout(); }} />
      </ScrollView>
    </Screen>
  );
}
