import { Api } from '../api';
import { useAuth } from '../auth';
import { colors, radius, space, statusTone } from '../theme';
import { Avatar, Badge, Button, Card, Screen } from '../ui';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, Switch, Text, View } from 'react-native';

export default function ProfileScreen() {
  const { user, logout, refreshMe } = useAuth();
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const wp = user?.workerProfile;
  const online = wp?.availabilityStatus === 'ONLINE';
  const kyc = wp?.kycStatus ?? 'NONE';
  const tone = statusTone(kyc);

  async function toggle(value) {
    setError(null);
    setBusy(true);
    try {
      await Api.patchWorkerProfile({ availabilityStatus: value ? 'ONLINE' : 'OFFLINE' });
      await refreshMe();
    } catch (e) {
      setError(e.message ?? 'Could not update availability');
    } finally {
      setBusy(false);
    }
  }

  async function submitKyc() {
    setError(null);
    setBusy(true);
    try {
      await Api.submitKyc({ documents: [{ docType: 'PAN', fileUrl: 'https://example.com/kyc/pan.jpg' }] });
      await refreshMe();
    } catch (e) {
      setError(e.message ?? 'Could not submit KYC');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: space(5), gap: space(5) }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.ink }}>Profile</Text>

        <Card style={{ alignItems: 'center', gap: space(2), paddingVertical: space(6) }}>
          <Avatar name={user?.name} size={72} />
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink }}>{user?.name ?? 'Pro'}</Text>
          <Text style={{ color: colors.muted }}>{user?.phone}</Text>
          <Badge label={`KYC ${kyc.toLowerCase()}`} bg={tone.bg} fg={tone.fg} />
        </Card>

        {/* Availability */}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(3) }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: online ? colors.greenBg : '#f1f5f9' }}>
                <Ionicons name="power" size={20} color={online ? colors.green : colors.muted} />
              </View>
              <View>
                <Text style={{ fontWeight: '800', color: colors.ink }}>{online ? 'You are online' : 'You are offline'}</Text>
                <Text style={{ fontSize: 12, color: colors.muted }}>{online ? 'Receiving job requests' : 'Go online to get jobs'}</Text>
              </View>
            </View>
            <Switch value={online} onValueChange={toggle} disabled={busy} trackColor={{ true: colors.brand }} />
          </View>
          {error && <Text style={{ color: colors.rose, marginTop: space(3) }}>{error}</Text>}
          {kyc !== 'APPROVED' && <Text style={{ color: colors.amber, marginTop: space(3), fontSize: 13 }}>Complete KYC verification to go online.</Text>}
        </Card>

        {/* KYC */}
        {kyc !== 'APPROVED' && (
          <Card style={{ gap: space(3) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(3) }}>
              <Ionicons name="shield-checkmark" size={22} color={colors.brand} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '800', color: colors.ink }}>KYC verification</Text>
                <Text style={{ fontSize: 12, color: colors.muted }}>
                  {kyc === 'PENDING' ? 'Submitted — under review by our team.' : 'Verify your identity to start taking jobs.'}
                </Text>
              </View>
            </View>
            {kyc !== 'PENDING' && <Button title="Submit KYC documents" onPress={submitKyc} loading={busy} />}
          </Card>
        )}

        <Button title="Log out" variant="danger" icon="log-out" onPress={async () => { await logout(); }} />
      </ScrollView>
    </Screen>
  );
}
