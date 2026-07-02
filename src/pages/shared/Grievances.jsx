import { useState, useEffect, useCallback } from 'react';
import { grievanceAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import DataTable from '../../components/common/DataTable';
import { FiPlus, FiEdit2 } from 'react-icons/fi';
import { formatDate, getInitials } from '../../utils/helpers';
import toast from 'react-hot-toast';

const STATUS_COLORS = { open: 'bg-red-100 text-red-700', 'in-progress': 'bg-amber-100 text-amber-700', resolved: 'bg-emerald-100 text-emerald-700', closed: 'bg-gray-100 text-gray-700' };
const PRIORITY_COLORS = { low: 'bg-blue-100 text-blue-700', medium: 'bg-amber-100 text-amber-700', high: 'bg-red-100 text-red-700' };
const CATEGORIES = ['harassment', 'discrimination', 'workplace-safety', 'payroll', 'management', 'facilities', 'other'];

const Grievances = () => {
  const { user } = useAuth();
  const isEmployee = user?.role === 'employee';
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({ status: '', category: '', priority: '', page: 1, limit: 15 });
  const [showModal, setShowModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', category: 'other', priority: 'medium', isAnonymous: false });
  const [resolveForm, setResolveForm] = useState({ status: 'in-progress', resolution: '', priority: 'medium' });
  const [saving, setSaving] = useState(false);

  const fetchGrievances = useCallback(async () => {
    setLoading(true);
    try {
      const res = await grievanceAPI.getAll(filters);
      if (res.data.success) {
        setGrievances(res.data.data);
        setPagination({ currentPage: res.data.currentPage || 1, totalPages: res.data.totalPages || 1, total: res.data.total || 0 });
      }
    } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchGrievances(); }, [fetchGrievances]);

  const handleSubmit = async () => {
    if (!form.title || !form.description) return toast.error('Title and description required');
    setSaving(true);
    try {
      await grievanceAPI.create(form);
      toast.success('Grievance submitted');
      fetchGrievances(); setShowModal(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleResolve = async () => {
    setSaving(true);
    try {
      await grievanceAPI.update(selected._id, resolveForm);
      toast.success('Updated');
      fetchGrievances(); setShowResolveModal(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const columns = [
    ...(!isEmployee ? [{
      header: 'Employee', key: 'employee',
      render: (v, row) => row.isAnonymous ? <span className="text-xs italic text-gray-400">Anonymous</span> : v ? (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700 shrink-0">{getInitials(`${v.firstName} ${v.lastName}`)}</div>
          <span className="text-sm font-medium text-gray-900 dark:text-white">{v.firstName} {v.lastName}</span>
        </div>
      ) : '-'
    }] : []),
    { header: 'Title', key: 'title', render: v => <span className="font-medium text-gray-900 dark:text-white">{v}</span> },
    { header: 'Category', key: 'category', render: v => <span className="badge bg-gray-100 text-gray-700 capitalize">{v?.replace('-', ' ')}</span> },
    { header: 'Priority', key: 'priority', render: v => <span className={`badge capitalize ${PRIORITY_COLORS[v]}`}>{v}</span> },
    { header: 'Status', key: 'status', render: v => <span className={`badge capitalize ${STATUS_COLORS[v]}`}>{v?.replace('-', ' ')}</span> },
    { header: 'Submitted', key: 'createdAt', render: v => formatDate(v) },
    { header: 'Resolved', key: 'resolvedAt', render: v => v ? formatDate(v) : '-' },
    ...(!isEmployee ? [{
      header: 'Actions', key: '_id',
      render: (id, row) => (
        <button onClick={() => { setSelected(row); setResolveForm({ status: row.status, resolution: row.resolution || '', priority: row.priority }); setShowResolveModal(true); }} className="p-1.5 rounded hover:bg-blue-50 text-blue-600"><FiEdit2 className="w-4 h-4" /></button>
      )
    }] : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-gray-500 text-sm">{pagination.total} total</p>
        </div>
        {isEmployee && (
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
            <button onClick={() => { setForm({ title: '', description: '', category: 'other', priority: 'medium', isAnonymous: false }); setShowModal(true); }} className="btn-primary flex items-center justify-center gap-2 flex-1 sm:flex-none"><FiPlus className="w-4 h-4" /> Raise Grievance</button>
          </div>
        )}
      </div>

      <div className="card p-4 flex flex-wrap gap-3">
        <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value, page: 1 })} className="input-field w-36">
          <option value="">All Status</option>
          {['open', 'in-progress', 'resolved', 'closed'].map(s => <option key={s} value={s} className="capitalize">{s.replace('-', ' ')}</option>)}
        </select>
        <select value={filters.priority} onChange={e => setFilters({ ...filters, priority: e.target.value, page: 1 })} className="input-field w-32">
          <option value="">All Priority</option>
          {['low', 'medium', 'high'].map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
        </select>
        <select value={filters.category} onChange={e => setFilters({ ...filters, category: e.target.value, page: 1 })} className="input-field w-44">
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c.replace('-', ' ')}</option>)}
        </select>
      </div>

      <DataTable columns={columns} data={grievances} loading={loading} pagination={pagination} onPageChange={page => setFilters(f => ({ ...f, page }))} emptyMessage="No grievances found" emptyIcon="🛡️" />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Raise a Grievance" size="sm"
        footer={<><button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button><button onClick={handleSubmit} disabled={saving} className="btn-primary">{saving ? 'Submitting...' : 'Submit'}</button></>}>
        <div className="space-y-4">
          <div><label className="label">Title *</label><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input-field" placeholder="Brief summary of the issue" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="input-field">
                {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c.replace('-', ' ')}</option>)}
              </select>
            </div>
            <div><label className="label">Priority</label>
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="input-field">
                {['low', 'medium', 'high'].map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
              </select>
            </div>
          </div>
          <div><label className="label">Description *</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-field" rows={4} placeholder="Describe the issue in detail..." /></div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.isAnonymous} onChange={e => setForm({ ...form, isAnonymous: e.target.checked })} className="w-4 h-4 text-indigo-600" />
            Submit anonymously
          </label>
        </div>
      </Modal>

      <Modal isOpen={showResolveModal} onClose={() => setShowResolveModal(false)} title="Update Grievance" size="sm"
        footer={<><button onClick={() => setShowResolveModal(false)} className="btn-secondary">Cancel</button><button onClick={handleResolve} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button></>}>
        <div className="space-y-4">
          {selected && <div className="card p-3 bg-gray-50 dark:bg-gray-800"><p className="text-sm font-semibold">{selected.title}</p><p className="text-xs text-gray-500 mt-1">{selected.description?.slice(0, 120)}</p></div>}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Status</label>
              <select value={resolveForm.status} onChange={e => setResolveForm({ ...resolveForm, status: e.target.value })} className="input-field">
                {['open', 'in-progress', 'resolved', 'closed'].map(s => <option key={s} value={s} className="capitalize">{s.replace('-', ' ')}</option>)}
              </select>
            </div>
            <div><label className="label">Priority</label>
              <select value={resolveForm.priority} onChange={e => setResolveForm({ ...resolveForm, priority: e.target.value })} className="input-field">
                {['low', 'medium', 'high'].map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
              </select>
            </div>
          </div>
          <div><label className="label">Resolution Notes</label><textarea value={resolveForm.resolution} onChange={e => setResolveForm({ ...resolveForm, resolution: e.target.value })} className="input-field" rows={3} placeholder="How was this resolved?" /></div>
        </div>
      </Modal>
    </div>
  );
};

export default Grievances;
