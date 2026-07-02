import React, { useState, useEffect, useCallback } from 'react';
import { reportAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { FiDownload, FiUsers, FiCalendar, FiDollarSign, FiFileText } from 'react-icons/fi';
import { formatCurrency, downloadBlob } from '../../utils/helpers';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import toast from 'react-hot-toast';

const DEPT_COLORS = ['#1e40af','#047857','#b45309','#7c3aed','#be123c','#0e7490','#a16207','#15803d'];

const LEAVE_TYPES = ['sick', 'casual', 'earned', 'maternity', 'paternity', 'emergency'];

const Reports = () => {
  const [attReport, setAttReport] = useState([]);
  const [salReport, setSalReport] = useState([]);
  const [salTotals, setSalTotals] = useState({});
  const [leaveBalReport, setLeaveBalReport] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [leaveBalLoading, setLeaveBalLoading] = useState(false);
  const [filters, setFilters] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });
  const [exporting, setExporting] = useState('');
  const [activeTab, setActiveTab] = useState('attendance');

  const months = Array.from({ length: 12 }, (_, i) => ({ val: i + 1, label: new Date(0, i).toLocaleString('default', { month: 'long' }) }));
  const currentMonthLabel = months.find(m => m.val == filters.month)?.label;

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const [att, sal, ov] = await Promise.all([
        reportAPI.getAttendance(filters),
        reportAPI.getSalary(filters),
        reportAPI.getOverview(),
      ]);
      if (att.data.success) setAttReport(att.data.data);
      if (sal.data.success) { setSalReport(sal.data.data); setSalTotals(sal.data.totals || {}); }
      if (ov.data.success) setOverview(ov.data.data);
    } finally { setLoading(false); }
  }, [filters]);

  const loadLeaveBalance = useCallback(async () => {
    if (leaveBalReport.length) return; // already loaded
    setLeaveBalLoading(true);
    try {
      const res = await reportAPI.getLeaveBalance();
      if (res.data.success) setLeaveBalReport(res.data.data);
    } catch (_) { toast.error('Failed to load leave balance data'); }
    finally { setLeaveBalLoading(false); }
  }, [leaveBalReport.length]);

  useEffect(() => { loadReports(); }, [loadReports]);

  useEffect(() => {
    if (activeTab === 'leave-balance') loadLeaveBalance();
  }, [activeTab, loadLeaveBalance]);

  const handleExport = async (type) => {
    setExporting(type);
    try {
      const params = type === 'leave-balance' ? { type } : { type, ...filters };
      const res = await reportAPI.exportExcel(params);
      const filename = type === 'leave-balance'
        ? 'leave-balance-report.xlsx'
        : `${type}-report-${filters.month}-${filters.year}.xlsx`;
      downloadBlob(res.data, filename);
      toast.success('Report exported!');
    } catch (_) { toast.error('Export failed'); }
    finally { setExporting(''); }
  };

  // Attendance totals row
  const attTotals = attReport.reduce((acc, r) => ({
    present: acc.present + (r.present || 0),
    absent: acc.absent + (r.absent || 0),
    late: acc.late + (r.late || 0),
    halfDay: acc.halfDay + (r.halfDay || 0),
    totalHours: acc.totalHours + parseFloat(r.totalHours || 0),
  }), { present: 0, absent: 0, late: 0, halfDay: 0, totalHours: 0 });

  const TABS = [
    { key: 'attendance', label: 'Attendance' },
    { key: 'salary', label: 'Salary' },
    { key: 'leave-balance', label: 'Leave Balance' },
    { key: 'charts', label: 'Charts' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="text-gray-500 text-sm">Generate and export detailed reports</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
          <select value={filters.month} onChange={e => setFilters(f => ({ ...f, month: Number(e.target.value) }))} className="input-field w-36">
            {months.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
          </select>
          <select value={filters.year} onChange={e => setFilters(f => ({ ...f, year: Number(e.target.value) }))} className="input-field w-28">
            {Array.from({ length: 5 }, (_, i) => { const y = new Date().getFullYear() - i; return <option key={y} value={y}>{y}</option>; })}
          </select>
        </div>
      </div>

      {/* Export Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { type: 'employees',     label: 'Employee Report',      icon: FiUsers,     color: 'blue',   desc: 'All active employees' },
          { type: 'attendance',    label: 'Attendance Report',     icon: FiCalendar,  color: 'green',  desc: `${currentMonthLabel} ${filters.year}` },
          { type: 'salary',        label: 'Salary Report',         icon: FiDollarSign,color: 'purple', desc: `${currentMonthLabel} ${filters.year}` },
          { type: 'leave-balance', label: 'Leave Balance Report',  icon: FiFileText,  color: 'amber',  desc: 'Current balances' },
        ].map(({ type, label, icon: Icon, color, desc }) => (
          <div key={type} className="card p-4">
            <div className={`w-9 h-9 bg-${color}-50 rounded-xl flex items-center justify-center mb-3`}>
              <Icon className={`w-4 h-4 text-${color}-600`} />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{label}</h3>
            <p className="text-xs text-gray-500 mt-0.5 mb-3">{desc}</p>
            <button onClick={() => handleExport(type)} disabled={exporting === type}
              className="btn-secondary w-full text-xs flex items-center justify-center gap-1.5">
              {exporting === type
                ? <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                : <FiDownload className="w-3 h-3" />}
              Export Excel
            </button>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {loading && activeTab !== 'leave-balance' ? <LoadingSpinner /> : (
        <>
          {/* ATTENDANCE TAB */}
          {activeTab === 'attendance' && (
            <div className="card">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="section-title">Attendance Summary — {currentMonthLabel} {filters.year}</h3>
                <button onClick={() => handleExport('attendance')} disabled={exporting === 'attendance'} className="btn-secondary text-sm flex items-center gap-2">
                  <FiDownload className="w-4 h-4" /> Export
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700">
                      {['Employee', 'Department', 'Present', 'Absent', 'Late', 'Half Day', 'Hours'].map(h => (
                        <th key={h} className="table-header">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {attReport.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-8 text-gray-500">No attendance data for this period</td></tr>
                    ) : attReport.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="table-cell font-medium">{r.name}</td>
                        <td className="table-cell text-gray-500">{r.department}</td>
                        <td className="table-cell"><span className="text-emerald-600 font-medium">{r.present}</span></td>
                        <td className="table-cell"><span className="text-red-600 font-medium">{r.absent}</span></td>
                        <td className="table-cell"><span className="text-amber-600 font-medium">{r.late}</span></td>
                        <td className="table-cell">{r.halfDay}</td>
                        <td className="table-cell">{r.totalHours}h</td>
                      </tr>
                    ))}
                  </tbody>
                  {attReport.length > 0 && (
                    <tfoot>
                      <tr className="bg-gray-50 dark:bg-gray-700 font-semibold">
                        <td className="table-cell" colSpan={2}>Totals</td>
                        <td className="table-cell text-emerald-600">{attTotals.present}</td>
                        <td className="table-cell text-red-600">{attTotals.absent}</td>
                        <td className="table-cell text-amber-600">{attTotals.late}</td>
                        <td className="table-cell">{attTotals.halfDay}</td>
                        <td className="table-cell">{attTotals.totalHours.toFixed(1)}h</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* SALARY TAB */}
          {activeTab === 'salary' && (
            <div className="card">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <h3 className="section-title">Salary Report — {currentMonthLabel} {filters.year}</h3>
                  {salTotals.net > 0 && (
                    <div className="flex gap-4 text-sm mt-1">
                      <span className="text-gray-500">Gross: <strong className="text-gray-900 dark:text-white">{formatCurrency(salTotals.gross)}</strong></span>
                      <span className="text-gray-500">Deductions: <strong className="text-red-600">{formatCurrency(salTotals.deductions)}</strong></span>
                      <span className="text-gray-500">Net: <strong className="text-emerald-600">{formatCurrency(salTotals.net)}</strong></span>
                    </div>
                  )}
                </div>
                <button onClick={() => handleExport('salary')} disabled={exporting === 'salary'} className="btn-secondary text-sm flex items-center gap-2">
                  <FiDownload className="w-4 h-4" /> Export
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700">
                      {['Employee', 'Department', 'Basic', 'Gross', 'Deductions', 'Net Salary', 'Status'].map(h => (
                        <th key={h} className="table-header">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {salReport.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-8 text-gray-500">No salary data for this period</td></tr>
                    ) : salReport.map((s, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="table-cell font-medium">{s.employee?.firstName} {s.employee?.lastName}</td>
                        <td className="table-cell text-gray-500">{s.employee?.department?.name}</td>
                        <td className="table-cell">{formatCurrency(s.basicSalary)}</td>
                        <td className="table-cell">{formatCurrency(s.grossSalary)}</td>
                        <td className="table-cell text-red-600">-{formatCurrency(s.totalDeductions)}</td>
                        <td className="table-cell font-semibold text-emerald-600">{formatCurrency(s.netSalary)}</td>
                        <td className="table-cell">
                          <span className={`badge ${s.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{s.paymentStatus}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {salReport.length > 0 && (
                    <tfoot>
                      <tr className="bg-gray-50 dark:bg-gray-700 font-semibold">
                        <td className="table-cell" colSpan={2}>Totals</td>
                        <td className="table-cell">{formatCurrency(salReport.reduce((s, r) => s + (r.basicSalary || 0), 0))}</td>
                        <td className="table-cell">{formatCurrency(salTotals.gross)}</td>
                        <td className="table-cell text-red-600">-{formatCurrency(salTotals.deductions)}</td>
                        <td className="table-cell text-emerald-600">{formatCurrency(salTotals.net)}</td>
                        <td className="table-cell"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* LEAVE BALANCE TAB */}
          {activeTab === 'leave-balance' && (
            <div className="card">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="section-title">Leave Balance — All Employees</h3>
                <button onClick={() => handleExport('leave-balance')} disabled={exporting === 'leave-balance'} className="btn-secondary text-sm flex items-center gap-2">
                  <FiDownload className="w-4 h-4" /> Export
                </button>
              </div>
              {leaveBalLoading ? <LoadingSpinner /> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700">
                        <th className="table-header">Employee</th>
                        <th className="table-header">Department</th>
                        {LEAVE_TYPES.map(t => <th key={t} className="table-header capitalize">{t}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {leaveBalReport.length === 0 ? (
                        <tr><td colSpan={8} className="text-center py-8 text-gray-500">No leave balance data found</td></tr>
                      ) : leaveBalReport.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="table-cell font-medium">{row.employee.firstName} {row.employee.lastName}</td>
                          <td className="table-cell text-gray-500">{row.employee.department?.name || '—'}</td>
                          {LEAVE_TYPES.map(t => {
                            const val = row.balances?.[t] ?? 0;
                            return (
                              <td key={t} className="table-cell">
                                <span className={val === 0 ? 'text-red-500 font-medium' : 'text-gray-700 dark:text-gray-300'}>{val}</span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* CHARTS TAB */}
          {activeTab === 'charts' && overview && (
            <div className="space-y-6">
              {/* Monthly Attendance Trend */}
              <div className="card p-6">
                <h3 className="section-title mb-4">Monthly Attendance Trend (Last 6 Months)</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={overview.monthlyAttendance || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="present" name="Present" fill="#1e40af" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Headcount by Department */}
                <div className="card p-6">
                  <h3 className="section-title mb-4">Headcount by Department</h3>
                  {(overview.deptDistribution || []).length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">No department data</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={overview.deptDistribution}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          label={({ name, value }) => `${name} (${value})`}
                          labelLine={false}
                        >
                          {(overview.deptDistribution || []).map((_, idx) => (
                            <Cell key={idx} fill={DEPT_COLORS[idx % DEPT_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Salary Trend */}
                <div className="card p-6">
                  <h3 className="section-title mb-4">Net Salary Payout Trend (Last 6 Months)</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={overview.salaryTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={v => formatCurrency(v)} />
                      <Line type="monotone" dataKey="netSalary" name="Net Salary" stroke="#047857" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Leave Status Distribution */}
              {(overview.leaveStats || []).length > 0 && (
                <div className="card p-6">
                  <h3 className="section-title mb-4">Leave Requests by Status</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={overview.leaveStats.map(s => ({ name: s._id, count: s.count }))} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={70} />
                      <Tooltip />
                      <Bar dataKey="count" name="Requests" fill="#7c3aed" radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Reports;
