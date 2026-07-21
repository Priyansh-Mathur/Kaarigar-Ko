import { Api, tokens } from '../api';
import { useAuth } from '../auth';
import { registerForPush } from '../push';
import { colors, radius, space } from '../theme';
import { Button, Field, Input } from '../ui';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

export default function LoginScreen() {
  const { setUser } = useAuth();
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('+91');
  const [code, setCode] = useState('');
  const [devOtp, setDevOtp] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function send() {
    setError(null);
    setLoading(true);
    try {
      const r = await Api.requestOtp(phone.trim(), 'CUSTOMER');
      setDevOtp(r.data.devOtp ?? null);
      if (r.data.devOtp) setCode(r.data.devOtp);
      setStep('otp');
    } catch (e) {
      setError(e.message ?? 'Could not send code');
    } finally {
      setLoading(false);
    }
  }

  async function verify() {
    setError(null);
    setLoading(true);
    try {
      const r = await Api.verifyOtp(phone.trim(), code.trim(), 'CUSTOMER');
      await tokens.set(r.data.accessToken, r.data.refreshToken);
      void registerForPush();
      setUser(r.data.user);
    } catch (e) {
      setError(e.message ?? 'Invalid code');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.brand }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ flex: 1, padding: space(6), paddingTop: space(20), justifyContent: 'flex-end' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2), marginBottom: space(6) }}>
            <View style={{ width: 44, height: 44, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="hammer" size={22} color="#fff" />
            </View>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>KaarigarKo</Text>
          </View>
          <Text style={{ color: '#fff', fontSize: 30, fontWeight: '800' }}>Help is on the way.</Text>
          <Text style={{ color: '#c7d2fe', fontSize: 15, marginTop: space(2) }}>Sign in to book verified local pros.</Text>
        </View>

        <View style={{ backgroundColor: colors.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: space(6), gap: space(4) }}>
          {step === 'phone' ? (
            <>
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.ink }}>Welcome 👋</Text>
              <Field label="Phone number">
                <Input value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+91…" autoFocus />
              </Field>
              <Text style={{ color: colors.muted, fontSize: 12 }}>Demo customer: +919000000002</Text>
              {error && <Text style={{ color: colors.rose }}>{error}</Text>}
              <Button title="Send code" icon="arrow-forward" onPress={send} loading={loading} />
            </>
          ) : (
            <>
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.ink }}>Enter the code</Text>
              <Text style={{ color: colors.text }}>Sent to {phone}</Text>
              {devOtp && (
                <View style={{ backgroundColor: colors.amberBg, borderRadius: radius.md, padding: space(3) }}>
                  <Text style={{ color: colors.amber }}>Dev code: <Text style={{ fontWeight: '800', letterSpacing: 2 }}>{devOtp}</Text></Text>
                </View>
              )}
              <Field label="6-digit code">
                <Input value={code} onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" placeholder="••••••" style={{ textAlign: 'center', fontSize: 20, letterSpacing: 8 }} />
              </Field>
              {error && <Text style={{ color: colors.rose }}>{error}</Text>}
              <Button title="Verify & continue" onPress={verify} loading={loading} disabled={code.length !== 6} />
              <Button title="Change number" variant="ghost" onPress={() => setStep('phone')} />
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
