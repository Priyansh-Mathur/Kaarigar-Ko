import { Avatar, Button, Card, EmptyState, Skeleton } from '@/components/ui';
import { Api } from '@/lib/api';
import { dateTime } from '@/lib/format';
import { BadgeCheck, ExternalLink, FileCheck2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function AdminKyc() {
  const [docs, setDocs] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = () => Api.adminKyc('PENDING').then((r) => setDocs(r.data)).catch(() => setDocs([]));
  useEffect(() => {
    load();
  }, []);

  async function approve(id) {
    setBusy(id);
    try {
      await Api.approveKyc(id);
      await load();
    } finally {
      setBusy(null);
    }
  }
  async function reject(id) {
    const reason = window.prompt('Reason for rejection?');
    if (!reason) return;
    setBusy(id);
    try {
      await Api.rejectKyc(id, reason);
      await load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900">KYC queue</h1>
      <p className="text-sm text-slate-500">Review and verify professional documents.</p>

      <div className="mt-6 space-y-3">
        {!docs ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : docs.length === 0 ? (
          <EmptyState icon={<BadgeCheck className="h-10 w-10" />} title="All clear!" description="No pending KYC documents to review." />
        ) : (
          docs.map((d) => (
            <Card key={d.id} className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Avatar name={d.worker?.user?.name} size={44} />
                <div>
                  <p className="font-semibold text-slate-900">{d.worker?.user?.name ?? 'Worker'}</p>
                  <p className="text-xs text-slate-400">{d.worker?.user?.phone} · submitted {dateTime(d.createdAt)}</p>
                  <a href={d.fileUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
                    <FileCheck2 className="h-3 w-3" /> {d.docType} <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => reject(d.id)} disabled={busy === d.id}>Reject</Button>
                <Button size="sm" loading={busy === d.id} onClick={() => approve(d.id)}>Approve</Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
