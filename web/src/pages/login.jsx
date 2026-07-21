import { Button, Field, Input } from '@/components/ui';
import { Api, session } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { ArrowLeft, ArrowRight, Hammer, ShieldCheck, Sparkles, Star } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [step, setStep] = useState('phone');
  const [role, setRole] = useState('CUSTOMER');
  const [phone, setPhone] = useState('+91');
  const [code, setCode] = useState('');
  const [devOtp, setDevOtp] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function requestOtp() {
    setError(null);
    setLoading(true);
    try {
      const r = await Api.requestOtp(phone.trim(), role);
      setDevOtp(r.data.devOtp ?? null);
      if (r.data.devOtp) setCode(r.data.devOtp);
      setStep('otp');
    } catch (e) {
      setError(e.message ?? 'Could not send OTP');
    } finally {
      setLoading(false);
    }
  }

  async function verify() {
    setError(null);
    setLoading(true);
    try {
      const r = await Api.verifyOtp(phone.trim(), code.trim(), role);
      session.set(r.data.accessToken, r.data.refreshToken, r.data.user);
      setUser(r.data.user);
      const u = r.data.user;
      navigate(u.role === 'OPS_ADMIN' || u.role === 'SUPER_ADMIN' ? '/admin' : '/app');
    } catch (e) {
      setError(e.message ?? 'Invalid code');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-700 to-brand-950 p-12 text-white lg:flex">
        <div className="hero-grid absolute inset-0 opacity-20" />
        <Link to="/" className="relative flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
            <Hammer className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold">KaarigarKo</span>
        </Link>
        <div className="relative">
          <h2 className="text-3xl font-bold leading-tight">Help is on the way.</h2>
          <p className="mt-3 max-w-sm text-brand-200">
            Sign in with your phone to book verified pros, track them live, and pay securely.
          </p>
          <div className="mt-8 space-y-3 text-sm">
            <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-300" /> Background-verified professionals</p>
            <p className="flex items-center gap-2"><Star className="h-4 w-4 text-amber-300" /> Rated and reviewed by real customers</p>
            <p className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-brand-200" /> Live tracking and fair, upfront pricing</p>
          </div>
        </div>
        <p className="relative text-xs text-brand-300">Demo: admin +919000000001 · customer +919000000002 · worker +919000000003</p>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center bg-slate-50 px-6 py-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 lg:hidden">
            <ArrowLeft className="h-4 w-4" /> Back home
          </Link>

          {step === 'phone' ? (
            <div className="animate-fade-up">
              <h1 className="text-2xl font-bold text-slate-900">Welcome 👋</h1>
              <p className="mt-1 text-slate-500">Enter your phone to get a one-time code.</p>

              <div className="mt-6 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                {['CUSTOMER', 'WORKER'].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    className={`h-10 rounded-lg text-sm font-semibold transition ${role === r ? 'bg-white text-brand-700 shadow-soft' : 'text-slate-500'}`}
                  >
                    {r === 'CUSTOMER' ? 'I need a pro' : "I'm a pro"}
                  </button>
                ))}
              </div>

              <div className="mt-5">
                <Field label="Phone number" hint="Use the E.164 format, e.g. +919000000002">
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91…" inputMode="tel" />
                </Field>
              </div>

              {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

              <Button className="mt-6 w-full" loading={loading} onClick={requestOtp}>
                Send code <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="animate-fade-up">
              <button onClick={() => setStep('phone')} className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
                <ArrowLeft className="h-4 w-4" /> {phone}
              </button>
              <h1 className="text-2xl font-bold text-slate-900">Enter the code</h1>
              <p className="mt-1 text-slate-500">We sent a 6-digit code to your phone.</p>

              {devOtp && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Dev mode — your code is <span className="font-bold tracking-widest">{devOtp}</span>
                </div>
              )}

              <div className="mt-5">
                <Field label="6-digit code">
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    className="text-center text-lg tracking-[0.5em]"
                    inputMode="numeric"
                  />
                </Field>
              </div>

              {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

              <Button className="mt-6 w-full" loading={loading} onClick={verify} disabled={code.length !== 6}>
                Verify & continue
              </Button>
              <button onClick={requestOtp} className="mt-3 w-full text-center text-sm text-slate-500 hover:text-brand-600">
                Resend code
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
