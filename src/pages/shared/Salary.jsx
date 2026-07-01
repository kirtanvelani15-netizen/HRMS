import React, { useState, useEffect, useCallback } from 'react';
import { salaryAPI, employeeAPI, payrollAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import { FiPlus, FiEdit2, FiTrash2, FiDownload, FiUpload, FiZap, FiCheckCircle } from 'react-icons/fi';
import { formatCurrency, getStatusColor, getMonthName, getInitials, downloadBlob } from '../../utils/helpers';
import toast from 'react-hot-toast';

const EMPTY_SALARY = {
  employee: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(),
  basicSalary: '', bonus: 0, overtime: 0,
  allowances: { hra: 0, transport: 0, medical: 0, other: 0 },
  deductions: { pf: 0, esi: 0, tax: 0, loan: 0, other: 0 },
  paymentStatus: 'pending', paymentMethod: 'bank-transfer', notes: ''
};

// Derive salary breakdown from annual CTC (mirrors Salary Master formulas)
const calcFromCTC = (annualCTC) => {
  const monthly = Math.round(annualCTC / 12);
  const basic = Math.round(monthly * 0.5);
  const hra = Math.round(basic * 0.2);
  const transport = Math.round(basic * 0.1);
  const bonus = Math.round(basic * 0.05);
  const pf = basic >= 15000 ? 1800 : Math.round(basic * 0.12);
  const usedFixed = basic + hra + transport + bonus;
  const other = Math.max(0, monthly - usedFixed - pf * 2);
  return {
    basicSalary: basic,
    allowances: { hra, transport, medical: 0, other },
    deductions: { pf, esi: 0, tax: 0, loan: 0, other: 0 },
    bonus,
    overtime: 0,
  };
};

const ALLOWANCE_LABELS = { hra: 'HRA', transport: 'Transport', medical: 'Medical', other: 'Other' };
const DEDUCTION_LABELS = { pf: 'PF', esi: 'ESI', tax: 'TDS / Tax', loan: 'Loan', other: 'Other' };

const SalaryField = ({ field, label, path, value, onChange }) => (
  <div>
    <label className="label text-xs">{label}</label>
    <input
      type="number"
      value={value || ''}
      onChange={e => onChange(field, e.target.value, path)}
      className="input-field text-sm"
    />
  </div>
);

const Salary = () => {
  const { user } = useAuth();
  const [salaries, setSalaries] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, total: 0 });
  const [monthlySummary, setMonthlySummary] = useState(null);
  const [filters, setFilters] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), status: '', page: 1, limit: 10 });
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [editSalary, setEditSalary] = useState(null);
  const [form, setForm] = useState(EMPTY_SALARY);
  const [importForm, setImportForm] = useState({ file: null, month: new Date().getMonth() + 1, year: new Date().getFullYear() });
  const [importResult, setImportResult] = useState(null);
  const [markPaidMethod, setMarkPaidMethod] = useState('bank-transfer');
  const [ctcInput, setCtcInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [ytd, setYtd] = useState(null);
  const [myEmpProfile, setMyEmpProfile] = useState(null);
  const [downloadingCtc, setDownloadingCtc] = useState(false);

  useEffect(() => {
    if (user.role === 'employee') {
      salaryAPI.getYTD().then(r => { if (r.data.success) setYtd(r.data.data); }).catch(() => {});
      employeeAPI.getMyProfile().then(r => { if (r.data.success) setMyEmpProfile(r.data.data); }).catch(() => {});
    }
  }, [user.role]);

  const handleDownloadCtc = async () => {
    if (!myEmpProfile?._id) return toast.error('Profile not loaded');
    setDownloadingCtc(true);
    try {
      await payrollAPI.downloadCtcStructure(myEmpProfile._id, `CTC_Structure_${myEmpProfile.employeeId || ''}.pdf`);
      toast.success('CTC Structure downloaded');
    } catch { toast.error('CTC structure not available'); }
    finally { setDownloadingCtc(false); }
  };

  const fetchSalaries = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch current filtered page + full-month totals in parallel
      const [res, totalsRes] = await Promise.all([
        salaryAPI.getAll(filters),
        salaryAPI.getAll({ month: filters.month, year: filters.year, limit: 1000 }),
      ]);
      if (res.data.success) {
        setSalaries(res.data.data);
        setPagination({ currentPage: res.data.currentPage || 1, totalPages: res.data.totalPages || 1, total: res.data.total || 0 });
      }
      if (totalsRes.data.success) {
        const all = totalsRes.data.data;
        setMonthlySummary({
          gross: all.reduce((s, r) => s + (r.grossSalary || 0), 0),
          deductions: all.reduce((s, r) => s + (r.totalDeductions || 0), 0),
          net: all.reduce((s, r) => s + (r.netSalary || 0), 0),
          pending: all.filter(r => r.paymentStatus === 'pending').length,
          paid: all.filter(r => r.paymentStatus === 'paid').length,
          total: all.length,
        });
      }
    } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchSalaries(); }, [fetchSalaries]);
  useEffect(() => {
    if (user.role !== 'employee') {
      employeeAPI.getAll({ limit: 200 }).then(r => { if (r.data.success) setEmployees(r.data.data); });
    }
  }, [user.role]);

  const handleSave = async () => {
    if (!form.employee && user.role !== 'employee') return toast.error('Select employee');
    if (!form.basicSalary) return toast.error('Basic salary is required');
    setSaving(true);
    try {
      if (editSalary) {
        await salaryAPI.update(editSalary._id, form);
        toast.success('Salary updated');
      } else {
        await salaryAPI.create(form);
        toast.success('Salary record created');
      }
      fetchSalaries(); setShowModal(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleGeneratePayroll = async () => {
    setGenerating(true);
    try {
      const res = await payrollAPI.generateMonth({ month: Number(filters.month), year: Number(filters.year) });
      toast.success(res.data.message || 'Payroll generated for all employees');
      setShowGenerateModal(false);
      fetchSalaries();
    } catch (err) { toast.error(err.response?.data?.message || 'Generation failed'); }
    finally { setGenerating(false); }
  };

  const handleMarkAllPaid = async () => {
    setMarkingPaid(true);
    try {
      const res = await salaryAPI.bulkUpdateStatus({ month: Number(filters.month), year: Number(filters.year), status: 'paid', paymentMethod: markPaidMethod });
      toast.success(res.data.message || 'All pending records marked as paid');
      setShowMarkPaidModal(false);
      fetchSalaries();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setMarkingPaid(false); }
  };

  const handleDownloadPayslip = async (id, emp) => {
    setDownloading(id);
    try {
      const res = await salaryAPI.downloadPayslip(id);
      downloadBlob(res.data, `payslip-${emp}-${filters.month}-${filters.year}.pdf`);
      toast.success('Payslip downloaded');
    } catch (err) { toast.error('Download failed'); }
    finally { setDownloading(null); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this salary record?')) return;
    try { await salaryAPI.delete(id); toast.success('Deleted'); fetchSalaries(); }
    catch (err) { toast.error('Failed'); }
  };

  const handleImport = async () => {
    if (!importForm.file) return toast.error('Select an Excel file');
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', importForm.file);
      formData.append('month', importForm.month);
      formData.append('year', importForm.year);
      const res = await salaryAPI.importExcel(formData);
      if (res.data.success) { setImportResult(res.data.data); toast.success(res.data.message || 'Salary imported'); fetchSalaries(); }
    } catch (err) { toast.error(err.response?.data?.message || 'Import failed'); }
    finally { setImporting(false); }
  };

  const handleSalaryFieldChange = useCallback((field, value, path) => {
    if (path) {
      setForm(prev => ({ ...prev, [path]: { ...prev[path], [field]: Number(value) || 0 } }));
    } else {
      setForm(prev => ({ ...prev, [field]: value }));
    }
  }, []);

  const currentMonthName = new Date(0, Number(filters.month) - 1).toLocaleString('default', { month: 'long' });

  const columns = [
    ...(user.role !== 'employee' ? [{
      header: 'Employee', key: 'employee',
      render: (val) => val ? (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-xs font-semibold text-primary-700">{getInitials(`${val.firstName} ${val.lastName}`)}</div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{val.firstName} {val.lastName}</p>
            <p className="text-xs text-gray-500">{val.department?.name}</p>
          </div>
        </div>
      ) : '-'
    }] : []),
    { header: 'Month/Year', key: 'month', render: (v, row) => `${getMonthName(v)} ${row.year}` },
    { header: 'Basic', key: 'basicSalary', render: (v) => formatCurrency(v) },
    { header: 'Gross', key: 'grossSalary', render: (v) => formatCurrency(v) },
    { header: 'Deductions', key: 'totalDeductions', render: (v) => <span className="text-red-600">-{formatCurrency(v)}</span> },
    { header: 'Net Salary', key: 'netSalary', render: (v) => <span className="font-semibold text-emerald-600">{formatCurrency(v)}</span> },
    { header: 'Status', key: 'paymentStatus', render: (v) => <span className={`badge ${getStatusColor(v)}`}>{v}</span> },
    {
      header: 'Actions', key: '_id',
      render: (id, row) => (
        <div className="flex items-center gap-1">
          <button onClick={() => handleDownloadPayslip(id, row.employee?.employeeId || 'emp')}
            disabled={downloading === id} className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600" title="Download Payslip">
            {downloading === id ? <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" /> : <FiDownload className="w-4 h-4" />}
          </button>
          {user.role !== 'employee' && (
            <>
              <button onClick={() => { setEditSalary(row); setForm({ ...row, employee: row.employee?._id }); setShowModal(true); }} className="p-1.5 rounded hover:bg-blue-50 text-blue-600" title="Edit"><FiEdit2 className="w-4 h-4" /></button>
              {user.role === 'admin' && <button onClick={() => handleDelete(id)} className="p-1.5 rounded hover:bg-red-50 text-red-600" title="Delete"><FiTrash2 className="w-4 h-4" /></button>}
            </>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Salary & Payroll</h1>
          <p className="text-gray-500 text-sm">{pagination.total} records</p>
        </div>
        {user.role === 'employee' && (
          <button onClick={handleDownloadCtc} disabled={downloadingCtc} className="btn-secondary flex items-center gap-2 text-indigo-700 border-indigo-200 hover:bg-indigo-50">
            {downloadingCtc ? <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /> : <FiDownload className="w-4 h-4" />}
            Download CTC Structure
          </button>
        )}
        {user.role !== 'employee' && (
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => { setImportForm({ file: null, month: filters.month, year: filters.year }); setImportResult(null); setShowImportModal(true); }}
              className="btn-secondary flex items-center gap-2">
              <FiUpload className="w-4 h-4" /> Import Excel
            </button>
            <button onClick={() => setShowGenerateModal(true)} className="btn-secondary flex items-center gap-2 text-purple-700 border-purple-200 hover:bg-purple-50">
              <FiZap className="w-4 h-4" /> Generate Payroll
            </button>
            {monthlySummary?.pending > 0 && (
              <button onClick={() => setShowMarkPaidModal(true)} className="btn-secondary flex items-center gap-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                <FiCheckCircle className="w-4 h-4" /> Mark All Paid ({monthlySummary.pending})
              </button>
            )}
            <button onClick={() => { setEditSalary(null); setForm(EMPTY_SALARY); setCtcInput(''); setShowModal(true); }} className="btn-primary flex items-center gap-2">
              <FiPlus className="w-4 h-4" /> Add Salary
            </button>
          </div>
        )}
      </div>

      {/* YTD Summary — employee only */}
      {user.role === 'employee' && ytd && ytd.totalMonths > 0 && (
        <div className="card p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Year-to-Date Summary (FY {ytd.fyStart}–{ytd.fyEnd})
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500">Total Gross Earned</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(ytd.totalGross)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Deductions</p>
              <p className="text-lg font-bold text-red-600">-{formatCurrency(ytd.totalDeductions)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Net Received</p>
              <p className="text-lg font-bold text-emerald-600">{formatCurrency(ytd.totalNet)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Months Paid</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{ytd.monthsPaid} / {ytd.totalMonths}</p>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Summary Bar */}
      {user.role !== 'employee' && monthlySummary && monthlySummary.total > 0 && (
        <div className="card p-4 grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div>
            <p className="text-xs text-gray-500">Total Gross</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(monthlySummary.gross)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Deductions</p>
            <p className="text-lg font-bold text-red-600">-{formatCurrency(monthlySummary.deductions)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Net Payable</p>
            <p className="text-lg font-bold text-emerald-600">{formatCurrency(monthlySummary.net)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Paid</p>
            <p className="text-lg font-bold text-emerald-700">{monthlySummary.paid} <span className="text-xs font-normal text-gray-400">/ {monthlySummary.total}</span></p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Pending</p>
            <p className="text-lg font-bold text-amber-600">{monthlySummary.pending} <span className="text-xs font-normal text-gray-400">Records</span></p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <select value={filters.month} onChange={e => setFilters({ ...filters, month: e.target.value, page: 1 })} className="input-field w-36">
          {Array.from({ length: 12 }, (_, i) => <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>)}
        </select>
        <select value={filters.year} onChange={e => setFilters({ ...filters, year: e.target.value, page: 1 })} className="input-field w-28">
          {Array.from({ length: 5 }, (_, i) => {
            const y = new Date().getFullYear() - i;
            return <option key={y} value={y}>{y}</option>;
          })}
        </select>
        <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value, page: 1 })} className="input-field w-36">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="on-hold">On Hold</option>
        </select>
      </div>

      <DataTable columns={columns} data={salaries} loading={loading}
        pagination={pagination} onPageChange={page => setFilters(f => ({ ...f, page }))}
        emptyMessage="No salary records" emptyIcon="💰" />

      {/* Add/Edit Salary Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}
        title={editSalary ? 'Edit Salary' : 'Add Salary'} size="xl"
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
          </>
        }
      >
        <div className="space-y-5">
          {/* Employee + Month/Year */}
          <div className="grid grid-cols-3 gap-3">
            {user.role !== 'employee' && !editSalary && (
              <div className="col-span-3">
                <label className="label">Employee *</label>
                <select value={form.employee} onChange={e => {
                  const emp = employees.find(e2 => e2._id === e.target.value);
                  const ctc = emp?.salary || 0;
                  setCtcInput(ctc ? String(ctc) : '');
                  const calc = ctc ? calcFromCTC(ctc) : {};
                  setForm(prev => ({ ...prev, employee: e.target.value, ...calc }));
                }} className="input-field">
                  <option value="">Select Employee</option>
                  {employees.map(e => <option key={e._id} value={e._id}>{e.firstName} {e.lastName} — {e.designation}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="label">Month</label>
              <select value={form.month} onChange={e => setForm({ ...form, month: e.target.value })} className="input-field">
                {Array.from({ length: 12 }, (_, i) => <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Year</label>
              <select value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} className="input-field">
                {Array.from({ length: 5 }, (_, i) => { const y = new Date().getFullYear() - i; return <option key={y} value={y}>{y}</option>; })}
              </select>
            </div>
          </div>

          {/* CTC input — only when adding */}
          {!editSalary && (
            <div className="rounded-xl border-2 border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 p-4">
              <label className="block text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-1">
                Annual CTC (₹) — auto-calculates all fields below
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 600000"
                value={ctcInput}
                onChange={e => {
                  setCtcInput(e.target.value);
                  const ctc = Number(e.target.value) || 0;
                  if (ctc > 0) setForm(prev => ({ ...prev, ...calcFromCTC(ctc) }));
                }}
                className="input-field text-indigo-900 dark:text-indigo-100 bg-white dark:bg-gray-800 border-indigo-300 dark:border-indigo-600 font-semibold"
              />
              {ctcInput && Number(ctcInput) > 0 && (
                <p className="text-xs text-indigo-500 mt-1">
                  Monthly = ₹{Math.round(Number(ctcInput) / 12).toLocaleString('en-IN')} · Basic = ₹{Math.round(Number(ctcInput) / 12 * 0.5).toLocaleString('en-IN')}
                </p>
              )}
            </div>
          )}

          {/* Calculated fields — shown as editable overrides */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Earnings</h4>
              {!editSalary && <span className="text-xs text-gray-400">Auto-filled · edit to override</span>}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="label text-xs">Basic Salary *</label>
                <input type="number" value={form.basicSalary} onChange={e => setForm({ ...form, basicSalary: e.target.value })} className="input-field text-sm" />
              </div>
              {Object.entries(ALLOWANCE_LABELS).map(([k, label]) => (
                <SalaryField key={k} field={k} label={label} path="allowances" value={form.allowances?.[k]} onChange={handleSalaryFieldChange} />
              ))}
              <SalaryField field="bonus" label="Bonus" value={form.bonus} onChange={handleSalaryFieldChange} />
              <SalaryField field="overtime" label="Overtime Pay" value={form.overtime} onChange={handleSalaryFieldChange} />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Deductions</h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {Object.entries(DEDUCTION_LABELS).map(([k, label]) => (
                <SalaryField key={k} field={k} label={label} path="deductions" value={form.deductions?.[k]} onChange={handleSalaryFieldChange} />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Payment Status</label>
              <select value={form.paymentStatus} onChange={e => setForm({ ...form, paymentStatus: e.target.value })} className="input-field text-sm">
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="on-hold">On Hold</option>
              </select>
            </div>
            <div>
              <label className="label text-xs">Payment Method</label>
              <select value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })} className="input-field text-sm">
                <option value="bank-transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
          </div>
        </div>
      </Modal>

      {/* Generate Payroll Modal */}
      <Modal isOpen={showGenerateModal} onClose={() => setShowGenerateModal(false)}
        title="Generate Payroll for All Employees" size="sm"
        footer={
          <>
            <button onClick={() => setShowGenerateModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleGeneratePayroll} disabled={generating} className="btn-primary">
              {generating ? 'Generating...' : `Generate for ${currentMonthName} ${filters.year}`}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This will auto-generate salary records for all active employees using their saved payroll structure for <strong>{currentMonthName} {filters.year}</strong>.
          </p>
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
            Employees without a saved salary structure will be skipped. Existing records for this month will not be overwritten.
          </div>
        </div>
      </Modal>

      {/* Mark All Paid Modal */}
      <Modal isOpen={showMarkPaidModal} onClose={() => setShowMarkPaidModal(false)}
        title={`Mark All Pending as Paid — ${currentMonthName} ${filters.year}`} size="sm"
        footer={
          <>
            <button onClick={() => setShowMarkPaidModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleMarkAllPaid} disabled={markingPaid} className="btn-primary">
              {markingPaid ? 'Processing...' : `Mark ${monthlySummary?.pending || 0} Records as Paid`}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            All <strong>{monthlySummary?.pending || 0} pending</strong> salary records for {currentMonthName} {filters.year} will be marked as paid.
          </p>
          <div>
            <label className="label">Payment Method</label>
            <select value={markPaidMethod} onChange={e => setMarkPaidMethod(e.target.value)} className="input-field">
              <option value="bank-transfer">Bank Transfer</option>
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Import Modal */}
      <Modal isOpen={showImportModal} onClose={() => setShowImportModal(false)}
        title="Import Salary Excel" size="md"
        footer={
          <>
            <button onClick={() => setShowImportModal(false)} className="btn-secondary">Close</button>
            <button onClick={handleImport} disabled={importing} className="btn-primary">{importing ? 'Importing...' : 'Import'}</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Excel File</label>
            <input type="file" accept=".xls,.xlsx" onChange={e => setImportForm({ ...importForm, file: e.target.files?.[0] || null })} className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Month</label>
              <select value={importForm.month} onChange={e => setImportForm({ ...importForm, month: e.target.value })} className="input-field">
                {Array.from({ length: 12 }, (_, i) => <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Year</label>
              <select value={importForm.year} onChange={e => setImportForm({ ...importForm, year: e.target.value })} className="input-field">
                {Array.from({ length: 5 }, (_, i) => { const y = new Date().getFullYear() - i; return <option key={y} value={y}>{y}</option>; })}
              </select>
            </div>
          </div>
          {importResult && (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-sm">
              <div className="grid grid-cols-4 gap-2 text-center">
                <div><p className="font-semibold text-gray-900 dark:text-white">{importResult.totalRows}</p><p className="text-xs text-gray-500">Rows</p></div>
                <div><p className="font-semibold text-emerald-600">{importResult.imported}</p><p className="text-xs text-gray-500">Imported</p></div>
                <div><p className="font-semibold text-amber-600">{importResult.unmatched}</p><p className="text-xs text-gray-500">Unmatched</p></div>
                <div><p className="font-semibold text-red-600">{importResult.skipped}</p><p className="text-xs text-gray-500">Skipped</p></div>
              </div>
              {importResult.results?.some(r => !r.success) && (
                <div className="mt-3 max-h-36 overflow-auto space-y-1">
                  {importResult.results.filter(r => !r.success).slice(0, 10).map((row, idx) => (
                    <p key={`${row.name}-${idx}`} className="text-xs text-red-600">{row.name}: {row.error}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Salary;
