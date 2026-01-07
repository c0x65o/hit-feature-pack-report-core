'use client';

import React from 'react';
import { useUi } from '@hit/ui-kit';
import { decodeReportPrefill, encodeReportPrefill } from '@hit/feature-pack-dashboard-core';

export function ReportBuilder() {
  const { Page, Card, Button, Spinner, Badge } = useUi();

  const [key, setKey] = React.useState<string>('');
  const [title, setTitle] = React.useState<string>('Report Builder');

  const [filter, setFilter] = React.useState<any | null>(null);
  const [format, setFormat] = React.useState<'number' | 'usd'>('number');

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [reportTz, setReportTz] = React.useState<string>('UTC');
  const [points, setPoints] = React.useState<any[]>([]);

  const [page, setPage] = React.useState(1);
  const pageSize = 50;
  const [total, setTotal] = React.useState(0);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    const k = (sp.get('key') || '').trim();
    setKey(k);

    const prefillRaw = sp.get('prefill');
    if (prefillRaw) {
      const pre = decodeReportPrefill(prefillRaw);
      if (pre) {
        if (typeof pre.title === 'string') setTitle(pre.title);
        if (pre.format === 'usd' || pre.format === 'number') setFormat(pre.format);
        setFilter(pre.pointFilter);
      }
    }
  }, []);

  const loadSaved = React.useCallback(async () => {
    if (!key) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard-definitions/${encodeURIComponent(key)}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `Failed (${res.status})`);
      const def = json?.data?.definition;
      if (def?.kind === 'report_v0' && def?.model && typeof def.model === 'object') {
        if (typeof def.model.title === 'string') setTitle(def.model.title);
        if (def.model.format === 'usd' || def.model.format === 'number') setFormat(def.model.format);
        if (def.model.pointFilter && typeof def.model.pointFilter === 'object') setFilter(def.model.pointFilter);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [key]);

  React.useEffect(() => {
    if (key) loadSaved();
  }, [key]);

  const run = React.useCallback(async (nextPage = 1) => {
    if (!filter) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/metrics/drilldown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pointFilter: filter, page: nextPage, pageSize, includeContributors: false }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `metrics/drilldown ${res.status}`);
      setPoints(Array.isArray(json?.points) ? json.points : []);
      setReportTz(String(json?.meta?.reportTimezone || 'UTC'));
      const p = json?.pagination;
      setPage(typeof p?.page === 'number' ? p.page : nextPage);
      setTotal(typeof p?.total === 'number' ? p.total : 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPoints([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const save = React.useCallback(async () => {
    if (!key) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard-definitions/${encodeURIComponent(key)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // v0: store builder state in definition.model
          definition: { kind: 'report_v0', version: 0, model: { title, format, pointFilter: filter } },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `Failed (${res.status})`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [key, title, format, filter]);

  const shareLink = React.useMemo(() => {
    if (!filter) return '';
    const prefill = encodeReportPrefill({ title, format, pointFilter: filter });
    return `/reports/builder?prefill=${prefill}`;
  }, [filter, title, format]);

  return (
    <Page title={title} description="Report Builder (v0): drilldown-first view of a point filter">
      <div style={{ padding: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {key ? <Badge variant="info">saved: {key}</Badge> : <Badge variant="warning">unsaved</Badge>}
        <Badge variant="default">report tz: {reportTz}</Badge>
        <Button variant="secondary" onClick={() => run(1)} disabled={loading || !filter}>Run</Button>
        {key ? <Button onClick={save} disabled={loading}>Save</Button> : null}
        {shareLink ? (
          <Button
            variant="secondary"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.history.replaceState({}, '', shareLink);
              }
            }}
          >
            Copyable URL
          </Button>
        ) : null}
      </div>

      {error ? <div style={{ padding: '0 16px', color: '#ef4444', fontSize: 13 }}>{error}</div> : null}

      <div style={{ padding: 16 }}>
        <Card title="Point filter" description="This is the drilldown unit. Over time, the builder will generate this from charts/tables/metrics selection.">
          <div style={{ padding: 14 }}>
            <code style={{ fontSize: 12, display: 'block', whiteSpace: 'pre-wrap' }}>{JSON.stringify(filter || {}, null, 2)}</code>
          </div>
        </Card>
      </div>

      <div style={{ padding: 16 }}>
        <Card title={`Underlying points (${total.toLocaleString()})`} description={`Paged points (page ${page}).`}>
          <div style={{ padding: 14 }}>
            {loading ? <Spinner /> : null}
            {!loading && !filter ? (
              <div style={{ fontSize: 13, opacity: 0.75 }}>
                Open this page from a dashboard drilldown (“Open in Report Writer”), or create a report and save a pointFilter.
              </div>
            ) : null}

            {!loading && filter ? (
              <>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginBottom: 10 }}>
                  <Button variant="secondary" disabled={loading || page <= 1} onClick={() => run(page - 1)}>Prev</Button>
                  <Button variant="secondary" disabled={loading || (page * pageSize) >= total} onClick={() => run(page + 1)}>Next</Button>
                </div>

                <div style={{ overflowX: 'auto', border: '1px solid rgba(148,163,184,0.18)', borderRadius: 10 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ textAlign: 'left', background: 'rgba(148,163,184,0.10)' }}>
                        <th style={{ padding: '8px 10px' }}>Date</th>
                        <th style={{ padding: '8px 10px' }}>Value</th>
                        <th style={{ padding: '8px 10px' }}>Entity</th>
                        <th style={{ padding: '8px 10px' }}>Data Source</th>
                        <th style={{ padding: '8px 10px' }}>Dimensions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {points.length === 0 ? (
                        <tr><td colSpan={5} style={{ padding: 12, opacity: 0.7 }}>No points found.</td></tr>
                      ) : points.map((p: any) => (
                        <tr key={String(p.id)} style={{ borderTop: '1px solid rgba(148,163,184,0.18)' }}>
                          <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{String(p.date || '')}</td>
                          <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                            {format === 'usd'
                              ? new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(p.value ?? 0))
                              : new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(Number(p.value ?? 0))}
                          </td>
                          <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                            <span style={{ opacity: 0.7 }}>{String(p.entityKind || '')}</span>
                            <span>:</span>
                            <span style={{ marginLeft: 6 }}>{String(p.entityId || '')}</span>
                          </td>
                          <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{String(p.dataSourceId || '')}</td>
                          <td style={{ padding: '8px 10px' }}>
                            <code style={{ fontSize: 11 }}>{JSON.stringify(p.dimensions || {})}</code>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}
          </div>
        </Card>
      </div>
    </Page>
  );
}

export default ReportBuilder;

