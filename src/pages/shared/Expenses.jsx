import { useState, useEffect, useCallback } from 'react';
import { expenseAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import DataTable from '../../components/common/DataTable';
import EmptyState from '../../components/common/EmptyState';
import { FiPlus, FiCheck, FiX, FiTrash2, FiPaperclip } from 'react-icons/fi';
import { formatDate, formatCurrency, getStatusColor, getInitials } from '../../utils/helpers';
import toast from 'react-hot-toast';

const CATEGORIES = ['travel', 'food', 'accommodation', 'office-supplies', 'medical', 'training', 'communication', 'other'];
const CAT_COLORS = {
  travel: 'bg-blue-100 text-blue-700',
  food: 'bg-orange-100 text-orange-700',
  accommodation: 'bg-purple-100 text-purple-700',
  'office-supplies': 'bg-gray-100 text-gray-700',
  medical: 'bg-red-100 text-red-700',
  training: 'bg-cyan-100 text-cyan-700',
  communication: 'bg-yellow-100 text-yellow-700',
  other: 'bg-slate-100 text-slate-600',
};

const emptyForm = { title: '', amount: '', category: 'other', date: '', description: '', receipt: null };

const Expenses = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({ status: '', page: 1, limit: 15 });
  const [showModal, setShowModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const isEmployee = user?.role === 'employee';

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await expenseAPI.getAll(filters);
      if (res.data.success) {
        setExpenses(res.data.data);
        setPagination({ currentPage: res.data.currentPage || 1, totalPages: res.data.totalPages || 1, total: res.data.total || 0 });
      }
    } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleSubmit = async () => {
    if (!form.title || !form.amount || !form.date) return toast.error('Title, amount and date are required');
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== null && v !== '') fd.append(k, v); });
      await expenseAPI.create(fd);
      toast.success('Claim submitted successfully');
      setShowModal(false);
      setForm(emptyForm);
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit');
    } finally { setSaving(false); }
  };

  const handleApprove = async (id) => {
    try {
      await expenseAPI.updateStatus(id, { status: 'approved' });
      toast.success('Expense approved');
      fetch();
    } catch { toast.error('Failed'); }
  };

  const handleReject = async () => {
    if (!rejectReason) return toast.error('Provide a reason');
    try {
      await expenseAPI.updateStatus(selectedId, { status: 'rejected', rejectionReason: rejectReason });
      toast.success('Expense rejected');
      setShowRejectModal(false);
      setRejectReason('');
      fetch();
    } catch { toast.error('Failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense claim?')) return;
    try { await expenseAPI.delete(id); toast.success('Deleted'); fetch(); }
    catch (err) { toast.error(err.response?.data?.message || 'Cannot delete'); }
  };

  const totals = {
    pending: expenses.filter(e => e.status === 'pending').reduce((s, e) => s + e.amount, 0),
    approved: expenses.filter(e => e.status === 'approved').reduce((s, e) => s + e.amount, 0),
  };

  const columns = [
    ...(!isEmployee ? [{
      header: 'Employee', key: 'employee',
      render: (val) => val ? (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-xs font-semibold text-primary-700 shrink-0">
            {getInitials(`${val.firstName} ${val.lastName}`)}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{val.firstName} {val.lastName}</p>
            <p className="text-xs text-gray-500">{val.department?.name}</p>
          </div>
        </div>
      ) : '—'
    }] : []),
    { header: 'Title', key: 'title', render: v => <span className="font-medium text-gray-900 dark:text-white">{v}</span> },
    { header: 'Category', key: 'category', render: v => <span className={`badge text-xs capitalize ${CAT_COLORS[v] || ''}`}>{v?.replace('-', ' ')}</span> },
    { header: 'Amount', key: 'amount', render: v => <span className="font-semibold">{formatCurrency(v)}</span> },
    { header: 'Date', key: 'date', render: v => formatDate(v) },
    { header: 'Receipt', key: 'receipt', render: v => v ? <a href={`/${v}`} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline flex items-center gap-1 text-xs"><FiPaperclip className="w-3 h-3" />View</a> : <span className="text-gray-400 text-xs">None</span> },
    { header: 'Status', key: 'status', render: v => <span className={`badge ${getStatusColor(v)}`}>{v}</span> },
    {
      header: 'Actions', key: '_id',
      render: (id, row) => (
        <div className="flex items-center gap-1">
          {!isEmployee && row.status === 'pending' && (
            <>
              <button onClick={() => handleApprove(id)} className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600" title="Approve"><FiCheck className="w-4 h-4" /></button>
              <button onClick={() => { setSelectedId(id); setShowRejectModal(true); }} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Reject"><FiX className="w-4 h-4" /></button>
            </>
          )}
          {isEmployee && row.status === 'pending' && (
            <button onClick={() => handleDelete(id)} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Delete"><FiTrash2 className="w-4 h-4" /></button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-gray-500 text-sm">{pagination.total} total claims</p>
        </div>
        {isEmployee && (
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
            <button onClick={() => { setForm(emptyForm); setShowModal(true); }} className="btn-primary flex items-center justify-center gap-2 flex-1 sm:flex-none">
              <FiPlus className="w-4 h-4" /> Submit Claim
            </button>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4">
          <p className="text-xs text-gray-500">Pending Amount</p>
          <p className="text-xl font-bold text-amber-600">{formatCurrency(totals.pending)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500">Approved Amount</p>
          <p className="text-xl font-bold text-emerald-600">{formatCurrency(totals.approved)}</p>
        </div>
      </div>

      {/* Status filter */}
      <div className="card p-4 flex gap-3">
        <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value, page: 1 })} className="input-field w-36">
          <option value="">All Status</option>
          {['pending', 'approved', 'rejected'].map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={expenses}
        loading={loading}
        pagination={pagination}
        onPageChange={page => setFilters(f => ({ ...f, page }))}
        emptyMessage="No expense claims found"
        emptyIcon="🧾"
      />

      {/* Submit claim modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Submit Expense Claim"
        size="sm"
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSubmit} disabled={saving} className="btn-primary">{saving ? 'Submitting...' : 'Submit'}</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Title *</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input-field" placeholder="e.g. Cab to client office" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Amount (₹) *</label>
              <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="input-field" placeholder="0" />
            </div>
            <div>
              <label className="label">Date *</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="input-field" />
            </div>
          </div>
          <div>
            <label className="label">Category</label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="input-field">
              {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c.replace('-', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-field" rows={2} placeholder="Additional details…" />
          </div>
          <div>
            <label className="label">Receipt (optional)</label>
            <input type="file" accept="image/*,application/pdf" onChange={e => setForm({ ...form, receipt: e.target.files[0] || null })} className="input-field text-sm" />
          </div>
        </div>
      </Modal>

      {/* Reject modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Reject Expense"
        size="sm"
        footer={
          <>
            <button onClick={() => setShowRejectModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleReject} className="btn-danger">Reject</button>
          </>
        }
      >
        <div>
          <label className="label">Reason *</label>
          <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="input-field" rows={3} placeholder="Reason for rejection…" />
        </div>
      </Modal>
    </div>
  );
};

export default Expenses;
