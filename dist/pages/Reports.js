'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { useUi } from '@hit/ui-kit';
function slugify(s) {
    return String(s || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '') || 'report';
}
export function Reports(props = {}) {
    const { Page, Card, Button, Input, Modal, Spinner, Badge } = useUi();
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [items, setItems] = React.useState([]);
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
            const res = await fetch('/api/dashboard-definitions', { credentials: 'include' });
            const json = await res.json().catch(() => ({}));
            if (!res.ok)
                throw new Error(json?.error || `Failed (${res.status})`);
            const list = Array.isArray(json.data) ? json.data : [];
            const reports = list.filter((d) => typeof d?.key === 'string' && d.key.startsWith('report.'));
            setItems(reports);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
            setItems([]);
        }
        finally {
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
                credentials: 'include',
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
            if (!res.ok)
                throw new Error(json?.error || `Failed (${res.status})`);
            setCreateOpen(false);
            await load();
            // Go straight into the builder.
            const href = `/reports/builder?key=${encodeURIComponent(key)}`;
            if (props.onNavigate)
                props.onNavigate(href);
            else if (typeof window !== 'undefined')
                window.location.href = href;
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
        finally {
            setCreateBusy(false);
        }
    };
    return (_jsxs(Page, { title: "Reports", description: "Saved reports (v0: drilldown-first)", children: [_jsxs("div", { style: { padding: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }, children: [_jsx(Button, { onClick: () => setCreateOpen(true), children: "New report" }), _jsx(Button, { variant: "secondary", onClick: load, disabled: loading, children: "Refresh" })] }), error ? _jsx("div", { style: { padding: '0 16px', color: '#ef4444', fontSize: 13 }, children: error }) : null, _jsx("div", { style: { padding: 16 }, children: _jsx(Card, { title: "Saved reports", description: "Reports are stored as dashboard definitions with key prefix `report.` (temporary pre-1.0 storage).", children: _jsxs("div", { style: { padding: 14 }, children: [loading ? _jsx(Spinner, {}) : null, !loading && items.length === 0 ? (_jsx("div", { style: { fontSize: 13, opacity: 0.75 }, children: "No reports yet." })) : null, !loading && items.length > 0 ? (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 10 }, children: items.map((r) => (_jsxs("div", { style: {
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 10,
                                        border: '1px solid rgba(148,163,184,0.18)',
                                        borderRadius: 12,
                                        padding: '10px 12px',
                                    }, children: [_jsxs("div", { style: { minWidth: 0 }, children: [_jsxs("div", { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }, children: [_jsx("strong", { style: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, children: r.name }), r.visibility === 'private' ? _jsx(Badge, { variant: "warning", children: "private" }) : _jsx(Badge, { variant: "default", children: "public" }), r.isOwner ? _jsx(Badge, { variant: "success", children: "yours" }) : r.isShared ? _jsx(Badge, { variant: "info", children: "shared" }) : null] }), _jsx("div", { style: { fontSize: 12, opacity: 0.75, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, children: r.description || r.key })] }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [_jsx(Button, { variant: "secondary", onClick: () => {
                                                        const href = `/reports/builder?key=${encodeURIComponent(r.key)}`;
                                                        if (props.onNavigate)
                                                            props.onNavigate(href);
                                                        else if (typeof window !== 'undefined')
                                                            window.location.href = href;
                                                    }, children: "Open" }), _jsx(Button, { variant: "secondary", disabled: true, title: "Scheduling will be wired to Tasks later.", children: "Schedule (soon)" })] })] }, r.key))) })) : null] }) }) }), _jsx(Modal, { open: createOpen, onClose: () => setCreateOpen(false), title: "Create report", description: "Creates a private report definition (v0).", children: _jsxs("div", { style: { padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }, children: [_jsx(Input, { label: "Name", value: createName, onChange: (e) => setCreateName(e.target.value) }), _jsx(Input, { label: "Description", value: createDesc, onChange: (e) => setCreateDesc(e.target.value) }), _jsxs("div", { style: { display: 'flex', gap: 10, justifyContent: 'flex-end' }, children: [_jsx(Button, { variant: "secondary", onClick: () => setCreateOpen(false), disabled: createBusy, children: "Cancel" }), _jsx(Button, { onClick: createReport, disabled: createBusy || !createName.trim(), children: createBusy ? 'Creating…' : 'Create' })] })] }) })] }));
}
export default Reports;
