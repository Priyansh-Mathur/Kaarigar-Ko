import { Api } from '../api';
import { useAuth } from '../auth';
import { colors, radius, space } from '../theme';
import { Button, Card, Field, Input, Screen } from '../ui';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

const LOCATIONS = [
  { label: 'Jabalpur, MP', lat: 23.18, lng: 79.98 },
  { label: 'Civil Lines', lat: 23.166, lng: 79.95 },
];

export default function OnboardingScreen() {
  const { user, refreshMe } = useAuth();
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState(null);
  const [bio, setBio] = useState('');
  const [years, setYears] = useState('3');
  const [radius_, setRadius] = useState('10');
  const [loc, setLoc] = useState(LOCATIONS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    Api.categories().then((r) => {
      setCategories(r.data);
      if (r.data[0]) setCategoryId(r.data[0].id);
    }).catch(() => {});
  }, []);

  async function submit() {
    if (!categoryId) return;
    setBusy(true);
    setError(null);
    try {
      await Api.createWorkerProfile({
        bio: bio || undefined,
        yearsExperience: Number(years) || 0,
        serviceRadiusKm: Number(radius_) || 10,
        lat: loc.lat,
        lng: loc.lng,
      });
      await Api.addSkill({ categoryId, priceType: 'FIXED', basePrice: 0 });
      await refreshMe();
    } catch (e) {
      setError(e.message ?? 'Could not create profile');
      setBusy(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: space(5), gap: space(5) }}>
        <View>
          <Text style={{ fontSize: 26, fontWeight: '800', color: colors.ink }}>Set up your pro profile</Text>
          <Text style={{ color: colors.muted, marginTop: space(1) }}>Welcome {user?.name?.split(' ')[0] ?? ''}! Tell customers what you do.</Text>
        </View>

        <View style={{ gap: space(2) }}>
          <Text style={label}>Your main service</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2) }}>
            {categories.map((c) => {
              const active = categoryId === c.id;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setCategoryId(c.id)}
                  style={{ paddingHorizontal: space(4), paddingVertical: space(2.5), borderRadius: radius.pill, backgroundColor: active ? colors.brand : colors.card, borderWidth: 1, borderColor: active ? colors.brand : colors.border }}
                >
                  <Text style={{ fontWeight: '700', color: active ? '#fff' : colors.text, fontSize: 13 }}>{c.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Field label="Short bio"><Input value={bio} onChangeText={setBio} placeholder="e.g. Certified electrician, 8 years" /></Field>

        <View style={{ flexDirection: 'row', gap: space(3) }}>
          <View style={{ flex: 1 }}><Field label="Experience (yrs)"><Input value={years} onChangeText={setYears} keyboardType="number-pad" /></Field></View>
          <View style={{ flex: 1 }}><Field label="Service radius (km)"><Input value={radius_} onChangeText={setRadius} keyboardType="number-pad" /></Field></View>
        </View>

        <View style={{ gap: space(2) }}>
          <Text style={label}>Base location</Text>
          <View style={{ flexDirection: 'row', gap: space(3) }}>
            {LOCATIONS.map((l) => (
              <Pressable key={l.label} onPress={() => setLoc(l)} style={{ flex: 1 }}>
                <Card style={{ borderColor: loc.label === l.label ? colors.brand : colors.border, borderWidth: loc.label === l.label ? 2 : 1, backgroundColor: loc.label === l.label ? colors.brandLight : colors.card }}>
                  <Ionicons name="location" size={20} color={colors.brand} />
                  <Text style={{ fontWeight: '700', color: colors.ink, marginTop: space(1) }}>{l.label}</Text>
                </Card>
              </Pressable>
            ))}
          </View>
        </View>

        {error && <Text style={{ color: colors.rose }}>{error}</Text>}
        <Button title="Create profile" icon="checkmark" onPress={submit} loading={busy} disabled={!categoryId} />
        <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'center' }}>Next: submit KYC from your profile to go online.</Text>
      </ScrollView>
    </Screen>
  );
}

const label = { fontSize: 14, fontWeight: '600', color: colors.text };
