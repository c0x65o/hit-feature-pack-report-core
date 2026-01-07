'use client';

import React from 'react';
import { useUi } from '@hit/ui-kit';

type DashboardListItem = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  scope: any;
  visibility: string;
  isSystem: boolean;
  ownerUserId: string;
  shareCount: number;
  isOwner: boolean;
  isShared: boolean;
  canEdit: boolean;
};

function slugify(s: string): string {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '') || 'report';
}

export function Reports(props: { onNavigate?: (href: string) => void } = {}) {
  const { Page, Card, Button, Input, Modal, Spinner, Badge } = useUi();

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<DashboardListItem[]>([]);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [createName, setCreateName] = React.useState('New Report');
  const [createDesc, setCreateDesc] = React.useState('');
  const [createBusy, setCreateBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Reuse dashboard_definitions as the v0 “report definitions” store.
      // Convention: report keys start with `report.`.
      const res = await fetch('/api/dashboard-definitions');
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `Failed (${res.status})`);
      const list = Array.isArray(json.data) ? (json.data as DashboardListItem[]) : [];
      const reports = list.filter((d) => typeof d?.key === 'string' && d.key.startsWith('report.'));
      setItems(reports);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, []);

  const createReport = async () => {
    setCreateBusy(true);
    setError(null);
    try {
      const key = `report.${slugify(createName)}.${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`;
      const res = await fetch('/api/dashboard-definitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          name: createName,
          description: createDesc,
          visibility: 'private',
          scope: { kind: 'global' },
          // Minimal “report definition” shell.
          definition: {
            kind: 'report_v0',
            version: 0,
            // Builder will store its query model here over time.
            model: {},
          },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `Failed (${res.status})`);
      setCreateOpen(false);
      await load();
      // Go straight into the builder.
      const href = `/reports/builder?key=${encodeURIComponent(key)}`;
      if (props.onNavigate) props.onNavigate(href);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreateBusy(false);
    }
  };

  return (
    <Page title="Reports" description="Saved reports (v0: drilldown-first)">
      <div style={{ padding: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <Button onClick={() => setCreateOpen(true)}>New report</Button>
        <Button variant="secondary" onClick={load} disabled={loading}>Refresh</Button>
      </div>

      {error ? <div style={{ padding: '0 16px', color: '#ef4444', fontSize: 13 }}>{error}</div> : null}

      <div style={{ padding: 16 }}>
        <Card title="Saved reports" description="Reports are stored as dashboard definitions with key prefix `report.` (temporary pre-1.0 storage).">
          <div style={{ padding: 14 }}>
            {loading ? <Spinner /> : null}
            {!loading && items.length === 0 ? (
              <div style={{ fontSize: 13, opacity: 0.75 }}>No reports yet.</div>
            ) : null}

            {!loading && items.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {items.map((r) => (
                  <div
                    key={r.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      border: '1px solid rgba(148,163,184,0.18)',
                      borderRadius: 12,
                      padding: '10px 12px',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <strong style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</strong>
                        {r.visibility === 'private' ? <Badge variant="warning">private</Badge> : <Badge variant="default">public</Badge>}
                        {r.isOwner ? <Badge variant="success">yours</Badge> : r.isShared ? <Badge variant="info">shared</Badge> : null}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.description || r.key}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          const href = `/reports/builder?key=${encodeURIComponent(r.key)}`;
                          if (props.onNavigate) props.onNavigate(href);
                        }}
                      >
                        Open
                      </Button>
                      <Button variant="secondary" disabled title="Scheduling will be wired to Tasks later.">
                        Schedule (soon)
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create report"
        description="Creates a private report definition (v0)."
      >
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Input label="Name" value={createName} onChange={(e: any) => setCreateName(e.target.value)} />
          <Input label="Description" value={createDesc} onChange={(e: any) => setCreateDesc(e.target.value)} />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={createBusy}>Cancel</Button>
            <Button onClick={createReport} disabled={createBusy || !createName.trim()}>
              {createBusy ? 'Creating…' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </Page>
  );
}

export default Reports;

