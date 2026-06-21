import { useState, useEffect, useCallback } from 'react';
import { worklogAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import DataTable from '../../components/common/DataTable';
import { FiPlus, FiTrash2, FiClock } from 'react-icons/fi';
import { formatDate } from '../../utils/helpers';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

const today = new Date().toISOString().slice(0, 10);
const emptyForm = { project: '', date: today, hours: '', taskDescription: '' };

const LogHours = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({ status: '', page: 1, limit: 15 });
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    worklogAPI.getProjects().then(r => { if (r.data.success) setProjects(r.data.data); });
  }, []);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      // HR users need to pass 'own' to see only their own worklogs (not all employee/TL entries)
      const params = user?.role === 'hr' ? { ...filters, submittedByRole: 'own' } : filters;
      const res = await worklogAPI.getEntries(params);
      if (res.data.success) {
        setEntries(res.data.data);
        setPagination({ currentPage: res.data.currentPage || 1, totalPages: res.data.totalPages || 1, total: res.data.total || 0 });
      }
    } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const handleSubmit = async () => {
    if (!form.project || !form.date || !form.hours || !form.taskDescription)
      return toast.error('All fields are required');
    if (form.hours < 0.5 || form.hours > 24) return toast.error('Hours must be between 0.5 and 24');
    setSaving(true);
    try {
      await worklogAPI.createEntry(form);
      toast.success('Worklog submitted');
      fetchEntries(); setShowModal(false); setForm(emptyForm);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this entry?')) return;
    try { await worklogAPI.deleteEntry(id); toast.success('Deleted'); fetchEntries(); }
    catch (err) { toast.error(err.response?.data?.message || 'Cannot delete'); }
  };

  const totalHours = entries.filter(e => e.status === 'approved').reduce((s, e) => s + e.hours, 0);

  const columns = [
    { header: 'Date', key: 'date', render: v => formatDate(v) },
    { header: 'Project', key: 'project', render: v => <span className="font-medium text-gray-900 dark:text-white">{v?.name || '-'}</span> },
    { header: 'Hours', key: 'hours', render: v => <span className="flex items-center gap-1 font-mono text-sm"><FiClock className="w-3 h-3 text-gray-400" />{v}h</span> },
    { header: 'Task', key: 'taskDescription', render: v => <span className="text-sm text-gray-600 truncate max-w-xs block" title={v}>{v?.slice(0, 60)}{v?.length > 60 ? '...' : ''}</span> },
    { header: 'Status', key: 'status', render: v => <span className={`badge capitalize ${STATUS_COLORS[v]}`}>{v}</span> },
    { header: 'Rejection Reason', key: 'rejectionReason', render: v => v ? <span className="text-xs text-red-600">{v}</span> : '-' },
    {
      header: 'Actions', key: '_id',
      render: (id, row) => row.status === 'pending'
        ? <button onClick={() => handleDelete(id)} className="p-1.5 rounded hover:bg-red-50 text-red-600" title="Delete"><FiTrash2 className="w-4 h-4" /></button>
        : null
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">My Work Log</h1>
          <p className="text-gray-500 text-sm">{pagination.total} total entries</p>
        </div>
        {/* Manual entry button removed - now using timer-based system */}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4">
          <p className="text-xs text-gray-500">Approved Hours (this view)</p>
          <p className="text-2xl font-bold text-emerald-600">{totalHours}h</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500">Pending Entries</p>
          <p className="text-2xl font-bold text-amber-600">{entries.filter(e => e.status === 'pending').length}</p>
        </div>
      </div>

      <div className="card p-4 flex gap-3">
        <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value, page: 1 })} className="input-field w-36">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select value={filters.project} onChange={e => setFilters({ ...filters, project: e.target.value, page: 1 })} className="input-field w-48">
          <option value="">All Projects</option>
          {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>
      </div>

      <DataTable columns={columns} data={entries} loading={loading}
        pagination={pagination} onPageChange={page => setFilters(f => ({ ...f, page }))}
        emptyMessage="No worklog entries yet" emptyIcon="⏱️" />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Log Hours" size="sm"
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSubmit} disabled={saving} className="btn-primary">{saving ? 'Submitting...' : 'Submit'}</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Project *</label>
            <select value={form.project} onChange={e => setForm({ ...form, project: e.target.value })} className="input-field">
              <option value="">Select Project</option>
              {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date *</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="input-field" max={today} />
            </div>
            <div>
              <label className="label">Hours *</label>
              <input type="number" step="0.5" min="0.5" max="24" value={form.hours} onChange={e => setForm({ ...form, hours: e.target.value })} className="input-field" placeholder="e.g. 3.5" />
            </div>
          </div>
          <div>
            <label className="label">Task Description *</label>
            <textarea value={form.taskDescription} onChange={e => setForm({ ...form, taskDescription: e.target.value })} className="input-field" rows={3} placeholder="What did you work on?" maxLength={1000} />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LogHours;
