'use client';
import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import React from 'react';
import { useUi } from '@hit/ui-kit';
import { decodeReportPrefill, encodeReportPrefill } from '@hit/feature-pack-dashboards';
export function ReportBuilder() {
    const { Page, Card, Button, Spinner, Badge } = useUi();
    const [key, setKey] = React.useState('');
    const [title, setTitle] = React.useState('Report Builder');
    const [filter, setFilter] = React.useState(null);
    const [format, setFormat] = React.useState('number');
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [reportTz, setReportTz] = React.useState('UTC');
    const [points, setPoints] = React.useState([]);
    const [page, setPage] = React.useState(1);
    const pageSize = 50;
    const [total, setTotal] = React.useState(0);
    React.useEffect(() => {
        if (typeof window === 'undefined')
            return;
        const sp = new URLSearchParams(window.location.search);
        const k = (sp.get('key') || '').trim();
        setKey(k);
        const prefillRaw = sp.get('prefill');
        if (prefillRaw) {
            const pre = decodeReportPrefill(prefillRaw);
            if (pre) {
                if (typeof pre.title === 'string')
                    setTitle(pre.title);
                if (pre.format === 'usd' || pre.format === 'number')
                    setFormat(pre.format);
                setFilter(pre.pointFilter);
            }
        }
    }, []);
    const loadSaved = React.useCallback(async () => {
        if (!key)
            return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/dashboard-definitions/${encodeURIComponent(key)}`);
            const json = await res.json().catch(() => ({}));
            if (!res.ok)
                throw new Error(json?.error || `Failed (${res.status})`);
            const def = json?.data?.definition;
            if (def?.kind === 'report_v0' && def?.model && typeof def.model === 'object') {
                if (typeof def.model.title === 'string')
                    setTitle(def.model.title);
                if (def.model.format === 'usd' || def.model.format === 'number')
                    setFormat(def.model.format);
                if (def.model.pointFilter && typeof def.model.pointFilter === 'object')
                    setFilter(def.model.pointFilter);
            }
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
        finally {
            setLoading(false);
        }
    }, [key]);
    React.useEffect(() => {
        if (key)
            loadSaved();
    }, [key]);
    const run = React.useCallback(async (nextPage = 1) => {
        if (!filter)
            return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/metrics/drilldown', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pointFilter: filter, page: nextPage, pageSize, includeContributors: false }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok)
                throw new Error(json?.error || `metrics/drilldown ${res.status}`);
            setPoints(Array.isArray(json?.points) ? json.points : []);
            setReportTz(String(json?.meta?.reportTimezone || 'UTC'));
            const p = json?.pagination;
            setPage(typeof p?.page === 'number' ? p.page : nextPage);
            setTotal(typeof p?.total === 'number' ? p.total : 0);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
            setPoints([]);
            setTotal(0);
        }
        finally {
            setLoading(false);
        }
    }, [filter]);
    const save = React.useCallback(async () => {
        if (!key)
            return;
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
            if (!res.ok)
                throw new Error(json?.error || `Failed (${res.status})`);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
        finally {
            setLoading(false);
        }
    }, [key, title, format, filter]);
    const shareLink = React.useMemo(() => {
        if (!filter)
            return '';
        const prefill = encodeReportPrefill({ title, format, pointFilter: filter });
        return `/reports/builder?prefill=${prefill}`;
    }, [filter, title, format]);
    return (_jsxs(Page, { title: title, description: "Report Builder (v0): drilldown-first view of a point filter", children: [_jsxs("div", { style: { padding: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }, children: [key ? _jsxs(Badge, { variant: "info", children: ["saved: ", key] }) : _jsx(Badge, { variant: "warning", children: "unsaved" }), _jsxs(Badge, { variant: "default", children: ["report tz: ", reportTz] }), _jsx(Button, { variant: "secondary", onClick: () => run(1), disabled: loading || !filter, children: "Run" }), key ? _jsx(Button, { onClick: save, disabled: loading, children: "Save" }) : null, shareLink ? (_jsx(Button, { variant: "secondary", onClick: () => {
                            if (typeof window !== 'undefined') {
                                window.history.replaceState({}, '', shareLink);
                            }
                        }, children: "Copyable URL" })) : null] }), error ? _jsx("div", { style: { padding: '0 16px', color: '#ef4444', fontSize: 13 }, children: error }) : null, _jsx("div", { style: { padding: 16 }, children: _jsx(Card, { title: "Point filter", description: "This is the drilldown unit. Over time, the builder will generate this from charts/tables/metrics selection.", children: _jsx("div", { style: { padding: 14 }, children: _jsx("code", { style: { fontSize: 12, display: 'block', whiteSpace: 'pre-wrap' }, children: JSON.stringify(filter || {}, null, 2) }) }) }) }), _jsx("div", { style: { padding: 16 }, children: _jsx(Card, { title: `Underlying points (${total.toLocaleString()})`, description: `Paged points (page ${page}).`, children: _jsxs("div", { style: { padding: 14 }, children: [loading ? _jsx(Spinner, {}) : null, !loading && !filter ? (_jsx("div", { style: { fontSize: 13, opacity: 0.75 }, children: "Open this page from a dashboard drilldown (\u201COpen in Report Writer\u201D), or create a report and save a pointFilter." })) : null, !loading && filter ? (_jsxs(_Fragment, { children: [_jsxs("div", { style: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginBottom: 10 }, children: [_jsx(Button, { variant: "secondary", disabled: loading || page <= 1, onClick: () => run(page - 1), children: "Prev" }), _jsx(Button, { variant: "secondary", disabled: loading || (page * pageSize) >= total, onClick: () => run(page + 1), children: "Next" })] }), _jsx("div", { style: { overflowX: 'auto', border: '1px solid rgba(148,163,184,0.18)', borderRadius: 10 }, children: _jsxs("table", { style: { width: '100%', borderCollapse: 'collapse', fontSize: 12 }, children: [_jsx("thead", { children: _jsxs("tr", { style: { textAlign: 'left', background: 'rgba(148,163,184,0.10)' }, children: [_jsx("th", { style: { padding: '8px 10px' }, children: "Date" }), _jsx("th", { style: { padding: '8px 10px' }, children: "Value" }), _jsx("th", { style: { padding: '8px 10px' }, children: "Entity" }), _jsx("th", { style: { padding: '8px 10px' }, children: "Data Source" }), _jsx("th", { style: { padding: '8px 10px' }, children: "Dimensions" })] }) }), _jsx("tbody", { children: points.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 5, style: { padding: 12, opacity: 0.7 }, children: "No points found." }) })) : points.map((p) => (_jsxs("tr", { style: { borderTop: '1px solid rgba(148,163,184,0.18)' }, children: [_jsx("td", { style: { padding: '8px 10px', whiteSpace: 'nowrap' }, children: String(p.date || '') }), _jsx("td", { style: { padding: '8px 10px', whiteSpace: 'nowrap' }, children: format === 'usd'
                                                                    ? new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(p.value ?? 0))
                                                                    : new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(Number(p.value ?? 0)) }), _jsxs("td", { style: { padding: '8px 10px', whiteSpace: 'nowrap' }, children: [_jsx("span", { style: { opacity: 0.7 }, children: String(p.entityKind || '') }), _jsx("span", { children: ":" }), _jsx("span", { style: { marginLeft: 6 }, children: String(p.entityId || '') })] }), _jsx("td", { style: { padding: '8px 10px', whiteSpace: 'nowrap' }, children: String(p.dataSourceId || '') }), _jsx("td", { style: { padding: '8px 10px' }, children: _jsx("code", { style: { fontSize: 11 }, children: JSON.stringify(p.dimensions || {}) }) })] }, String(p.id)))) })] }) })] })) : null] }) }) })] }));
}
export default ReportBuilder;
