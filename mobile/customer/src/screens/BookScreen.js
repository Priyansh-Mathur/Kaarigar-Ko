import { Api } from '../api';
import { rupees } from '../format';
import { colors, radius, space } from '../theme';
import { Button, Card, Loading, Screen } from '../ui';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

const LOCATIONS = [
  { label: 'Jabalpur, MP', lat: 23.18, lng: 79.98 },
  { label: 'Civil Lines', lat: 23.166, lng: 79.95 },
];

function Option({ active, children, onPress }) {
  return (
    <Pressable onPress={onPress} style={{ flex: 1 }}>
      <Card style={{ borderColor: active ? colors.brand : colors.border, borderWidth: active ? 2 : 1, backgroundColor: active ? colors.brandLight : colors.card }}>
        {children}
      </Card>
    </Pressable>
  );
}

export default function BookScreen({ navigation, route }) {
  const { categoryId } = route.params ?? {};
  const [services, setServices] = useState(null);
  const [serviceId, setServiceId] = useState(null);
  const [loc, setLoc] = useState(LOCATIONS[0]);
  const [mode, setMode] = useState('ONLINE');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    Api.services(categoryId)
      .then((r) => {
        setServices(r.data);
        if (r.data[0]) setServiceId(r.data[0].id);
      })
      .catch(() => setServices([]));
  }, [categoryId]);

  const selected = services?.find((s) => s.id === serviceId);

  async function confirm() {
    if (!serviceId) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await Api.createBooking({ serviceId, lat: loc.lat, lng: loc.lng, paymentMode: mode });
      navigation.replace('BookingDetail', { id: r.data.id });
    } catch (e) {
      setError(e.message ?? 'Could not create booking');
      setSubmitting(false);
    }
  }

  if (!services) return <Screen><Loading /></Screen>;

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: space(4), gap: space(3) }}>
        <Pressable onPress={() => navigation.goBack()}><Ionicons name="close" size={26} color={colors.text} /></Pressable>
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.ink }}>Book a service</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: space(5), paddingTop: 0, gap: space(5) }}>
        <View style={{ gap: space(2) }}>
          <Text style={styleSection}>1 · Choose a service</Text>
          {services.map((s) => (
            <Pressable key={s.id} onPress={() => setServiceId(s.id)}>
              <Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderColor: serviceId === s.id ? colors.brand : colors.border, borderWidth: serviceId === s.id ? 2 : 1, backgroundColor: serviceId === s.id ? colors.brandLight : colors.card }}>
                <View>
                  <Text style={{ fontWeight: '700', color: colors.ink }}>{s.name}</Text>
                  <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>~{s.defaultDurationMin} min</Text>
                </View>
                <Text style={{ fontWeight: '800', color: colors.ink }}>{rupees(s.basePrice)}</Text>
              </Card>
            </Pressable>
          ))}
        </View>

        <View style={{ gap: space(2) }}>
          <Text style={styleSection}>2 · Where?</Text>
          <View style={{ flexDirection: 'row', gap: space(3) }}>
            {LOCATIONS.map((l) => (
              <Option key={l.label} active={loc.label === l.label} onPress={() => setLoc(l)}>
                <Ionicons name="location" size={20} color={colors.brand} />
                <Text style={{ fontWeight: '700', color: colors.ink, marginTop: space(1) }}>{l.label}</Text>
              </Option>
            ))}
          </View>
        </View>

        <View style={{ gap: space(2) }}>
          <Text style={styleSection}>3 · Payment</Text>
          <View style={{ flexDirection: 'row', gap: space(3) }}>
            <Option active={mode === 'ONLINE'} onPress={() => setMode('ONLINE')}>
              <Ionicons name="card" size={20} color={colors.brand} />
              <Text style={{ fontWeight: '700', color: colors.ink, marginTop: space(1) }}>Pay online</Text>
            </Option>
            <Option active={mode === 'CASH'} onPress={() => setMode('CASH')}>
              <Ionicons name="cash" size={20} color={colors.green} />
              <Text style={{ fontWeight: '700', color: colors.ink, marginTop: space(1) }}>Cash</Text>
            </Option>
          </View>
        </View>

        <Card style={{ gap: space(2) }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.muted }}>Estimate</Text>
            <Text style={{ fontWeight: '800', fontSize: 18, color: colors.brand }}>{rupees(selected?.basePrice)}</Text>
          </View>
          <Text style={{ fontSize: 12, color: colors.muted }}>We&apos;ll match you with the nearest verified pro.</Text>
        </Card>

        {error && <Text style={{ color: colors.rose }}>{error}</Text>}
        <Button title="Confirm booking" icon="checkmark" onPress={confirm} loading={submitting} disabled={!serviceId} />
      </ScrollView>
    </Screen>
  );
}

const styleSection = { fontSize: 12, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 };
