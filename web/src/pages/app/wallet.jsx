import { Card, EmptyState, Skeleton } from '@/components/ui';
import { api } from '@/lib/api';
import { dateTime, rupees } from '@/lib/format';
import { ArrowDownLeft, ArrowUpRight, Wallet as WalletIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

const CREDIT_TYPES = ['CREDIT', 'REFUND', 'REFERRAL'];

export default function WalletPage() {
  const [wallet, setWallet] = useState(null);
  const [txns, setTxns] = useState(null);

  useEffect(() => {
    api('/wallet', { auth: true }).then((r) => setWallet(r.data)).catch(() => setWallet({ balance: 0 }));
    api('/wallet/transactions', { auth: true }).then((r) => setTxns(r.data)).catch(() => setTxns([]));
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Wallet</h1>

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 p-7 text-white">
        <div className="hero-grid absolute inset-0 opacity-20" />
        <div className="relative">
          <p className="text-brand-200">Available balance</p>
          {!wallet ? <Skeleton className="mt-2 h-9 w-32 bg-white/20" /> : <p className="mt-1 text-4xl font-extrabold">{rupees(wallet.balance)}</p>}
          <p className="mt-4 text-sm text-brand-200">Credits, refunds and referral rewards live here.</p>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Transactions</h2>
        {!txns ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : txns.length === 0 ? (
          <EmptyState icon={<WalletIcon className="h-10 w-10" />} title="No transactions yet" description="Refunds and referral rewards will appear here." />
        ) : (
          <div className="space-y-2.5">
            {txns.map((t) => {
              const credit = CREDIT_TYPES.includes(t.type);
              return (
                <Card key={t.id} className="flex items-center justify-between py-3.5">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-full ${credit ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                      {credit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                    </span>
                    <div>
                      <p className="text-sm font-semibold capitalize text-slate-800">{t.type.toLowerCase()}</p>
                      <p className="text-xs text-slate-400">{dateTime(t.createdAt)}</p>
                    </div>
                  </div>
                  <span className={`font-semibold ${credit ? 'text-emerald-600' : 'text-slate-700'}`}>
                    {credit ? '+' : '−'}{rupees(t.amount)}
                  </span>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
