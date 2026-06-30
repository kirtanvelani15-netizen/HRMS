import { useState, useEffect, useCallback } from 'react';
import { payrollAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { FiDownload, FiRefreshCw, FiInfo } from 'react-icons/fi';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const TABS = ['PF', 'ESIC', 'TDS'];

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

const RuleCard = ({ title, rules }) => (
  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 18px', marginBottom: 18 }}>
    <div style={{ fontWeight: 700, fontSize: 13, color: '#6366f1', marginBottom: 10 }}>{title}</div>
    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
      {rules.map(r => (
        <div key={r.label} style={{ minWidth: 130 }}>
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>{r.label}</div>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{r.value}</div>
        </div>
      ))}
    </div>
  </div>
);

const SummaryBar = ({ data, tab }) => {
  const totalEmp = data.reduce((s, r) => s + (r[tab.toLowerCase()]?.employee || 0), 0);
  const totalEr  = data.reduce((s, r) => s + (r[tab.toLowerCase()]?.employer || 0), 0);
  const totalAll = data.reduce((s, r) => s + (r[tab.toLowerCase()]?.total || 0), 0);
  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
      {[
        { label: 'Employee Contribution', val: fmt(totalEmp), color: '#6366f1' },
        { label: 'Employer Contribution', val: fmt(totalEr), color: '#0ea5e9' },
        { label: 'Total Liability',       val: fmt(totalAll), color: '#10b981' },
      ].map(c => (
        <div key={c.label} style={{ flex: 1, minWidth: 160, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px' }}>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>{c.label}</div>
          <div style={{ fontWeight: 700, fontSize: 20, color: c.color }}>{c.val}</div>
        </div>
      ))}
    </div>
  );
};

export default function StatutoryCompliance() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear]   = useState(now.getFullYear());
  const [tab, setTab]     = useState('PF');
  const [data, setData]   = useState([]);
  const [compliance, setCompliance] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await payrollAPI.calculateCompliance({ month, year });
      setData(res.data.data || []);
      setCompliance(res.data.compliance || null);
    } catch {
      toast.error('Failed to load compliance data');
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  const exportCSV = () => {
    const key = tab.toLowerCase();
    const headers = ['Employee ID', 'Name', 'Department', 'Basic Salary', 'Gross Salary', 'Employee Contribution', 'Employer Contribution', 'Total'];
    const rows = data.map(r => [
      r.employeeCode, r.name, r.department,
      r.basicSalary, r.grossSalary,
      r[key]?.employee, r[key]?.employer, r[key]?.total
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tab}_${MONTHS[month - 1]}_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pfRules = compliance ? [
    { label: 'Rate', value: compliance.pf?.calculationType === 'percentage' ? `${compliance.pf?.value}%` : `₹${compliance.pf?.value}` },
    { label: 'Based On', value: compliance.pf?.percentageOf === 'basicSalary' ? 'Basic Salary' : 'Gross Salary' },
    { label: 'Monthly Cap', value: compliance.pf?.monthlyCap > 0 ? fmt(compliance.pf.monthlyCap) : 'No cap' },
    { label: 'Enabled', value: compliance.pf?.enabled ? 'Yes' : 'No' },
  ] : [];

  const esiRules = compliance ? [
    { label: 'Employee Rate', value: '0.75%' },
    { label: 'Employer Rate', value: '3.25%' },
    { label: 'Wage Ceiling', value: compliance.esi?.monthlyCap > 0 ? fmt(compliance.esi.monthlyCap) : '₹21,000' },
    { label: 'Enabled', value: compliance.esi?.enabled ? 'Yes' : 'No' },
  ] : [];

  const tdsRules = [
    { label: 'Regime', value: 'New Tax Regime' },
    { label: '0–3L', value: '0%' },
    { label: '3–7L', value: '5%' },
    { label: '7–10L', value: '10%' },
    { label: '10–12L', value: '15%' },
    { label: '12–15L', value: '20%' },
    { label: 'Above 15L', value: '30%' },
    { label: 'Health & Ed. Cess', value: '4%' },
  ];

  const tabKey = tab.toLowerCase() === 'esic' ? 'esi' : tab.toLowerCase();

  const years = [];
  for (let y = now.getFullYear() - 2; y <= now.getFullYear() + 1; y++) years.push(y);

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', margin: 0 }}>Statutory Compliance</h1>
          <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Auto-calculated PF, ESIC & TDS for all active employees</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 12px', fontSize: 13, color: '#1e293b', background: '#fff' }}
          >
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 12px', fontSize: 13, color: '#1e293b', background: '#fff' }}
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={load}
            style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            <FiRefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={exportCSV}
            style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}
          >
            <FiDownload size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid #e2e8f0' }}>
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '10px 22px', fontSize: 14, fontWeight: tab === t ? 700 : 500,
              color: tab === t ? '#6366f1' : '#64748b',
              borderBottom: tab === t ? '2px solid #6366f1' : '2px solid transparent',
              marginBottom: -2, transition: 'all 0.15s'
            }}
          >{t}</button>
        ))}
      </div>

      {/* Rule cards */}
      {compliance && (
        <>
          {tab === 'PF'   && <RuleCard title="PF Rules (Provident Fund)" rules={pfRules} />}
          {tab === 'ESIC' && <RuleCard title="ESIC Rules (Employee State Insurance)" rules={esiRules} />}
          {tab === 'TDS'  && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 18px', marginBottom: 18, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <FiInfo size={16} color="#d97706" style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#92400e', marginBottom: 8 }}>TDS Slabs — New Tax Regime FY 2024-25</div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {tdsRules.map(r => (
                    <div key={r.label} style={{ minWidth: 90 }}>
                      <div style={{ fontSize: 11, color: '#b45309' }}>{r.label}</div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#78350f' }}>{r.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Summary bar */}
      {data.length > 0 && <SummaryBar data={data} tab={tab === 'ESIC' ? 'esi' : tab.toLowerCase()} />}

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8', fontSize: 14 }}>Loading...</div>
      ) : data.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8', fontSize: 14 }}>
          No active employees with salary structures found.
        </div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Emp ID', 'Name', 'Department', 'Basic', 'Gross',
                  tab === 'TDS' ? 'Monthly TDS' : 'Emp. Contribution',
                  tab === 'TDS' ? '—' : 'Employer Contribution',
                  'Total'
                ].map((h, i) => (
                  <th key={i} style={{ padding: '11px 14px', textAlign: i >= 3 ? 'right' : 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((r, idx) => {
                const d = r[tabKey] || {};
                return (
                  <tr key={r.employeeId} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa', transition: 'background 0.1s' }}>
                    <td style={{ padding: '10px 14px', color: '#6366f1', fontWeight: 600 }}>{r.employeeCode}</td>
                    <td style={{ padding: '10px 14px', color: '#1e293b', fontWeight: 500 }}>{r.name}</td>
                    <td style={{ padding: '10px 14px', color: '#64748b' }}>{r.department || '—'}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: '#1e293b' }}>{fmt(r.basicSalary)}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: '#1e293b' }}>{fmt(r.grossSalary)}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: '#6366f1', fontWeight: 600 }}>{fmt(d.employee)}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: '#0ea5e9', fontWeight: 600 }}>
                      {tab === 'TDS' ? '—' : fmt(d.employer)}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: '#10b981', fontWeight: 700 }}>{fmt(d.total)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f1f5f9', borderTop: '2px solid #e2e8f0' }}>
                <td colSpan={5} style={{ padding: '11px 14px', fontWeight: 700, color: '#475569' }}>Total ({data.length} employees)</td>
                <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 700, color: '#6366f1' }}>
                  {fmt(data.reduce((s, r) => s + (r[tabKey]?.employee || 0), 0))}
                </td>
                <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 700, color: '#0ea5e9' }}>
                  {tab === 'TDS' ? '—' : fmt(data.reduce((s, r) => s + (r[tabKey]?.employer || 0), 0))}
                </td>
                <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 700, color: '#10b981' }}>
                  {fmt(data.reduce((s, r) => s + (r[tabKey]?.total || 0), 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
