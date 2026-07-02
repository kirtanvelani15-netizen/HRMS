import { useState, useEffect, useCallback } from 'react';
import { performanceAPI, employeeAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import DataTable from '../../components/common/DataTable';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { formatDate, getInitials } from '../../utils/helpers';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  'not-started': 'bg-gray-100 text-gray-600',
  'in-progress': 'bg-blue-100 text-blue-700',
  'completed': 'bg-emerald-100 text-emerald-700',
};

const emptyForm = { employee: '', cycle: '', title: '', description: '', target: '', weight: 1, status: 'not-started' };

const PerformanceGoals = () => {
  const { user } = useAuth();
  const isEmployee = user?.role === 'employee';
  const [goals, setGoals] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ cycle: '', employee: '' });
  const [showModal, setShowModal] = useState(false);
  const [editGoal, setEditGoal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    performanceAPI.getCycles().then(r => { if (r.data.success) setCycles(r.data.data); });
    if (!isEmployee) {
      employeeAPI.getAll({ limit: 200 }).then(r => { if (r.data.success) setEmployees(r.data.data); });
    }
  }, [isEmployee]);

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await performanceAPI.getGoals(filters);
      if (res.data.success) setGoals(res.data.data);
    } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  const openAdd = () => { setEditGoal(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (g) => {
    setEditGoal(g);
    setForm({ employee: g.employee?._id || '', cycle: g.cycle?._id || '', title: g.title, description: g.description || '', target: g.target || '', weight: g.weight, status: g.status });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title || (!isEmployee && (!form.employee || !form.cycle))) return toast.error('Fill in required fields');
    setSaving(true);
    try {
      if (editGoal) {
        await performanceAPI.updateGoal(editGoal._id, isEmployee ? { status: form.status } : form);
        toast.success('Goal updated');
      } else {
        await performanceAPI.createGoal(form);
        toast.success('Goal created');
      }
      fetchGoals(); setShowModal(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this goal?')) return;
    try { await performanceAPI.deleteGoal(id); toast.success('Deleted'); fetchGoals(); }
    catch (err) { toast.error(err.response?.data?.message || 'Cannot delete'); }
  };

  const columns = [
    ...(!isEmployee ? [{
      header: 'Employee', key: 'employee',
      render: (v) => v ? (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700 shrink-0">{getInitials(`${v.firstName} ${v.lastName}`)}</div>
          <span className="text-sm font-medium text-gray-900 dark:text-white">{v.firstName} {v.lastName}</span>
        </div>
      ) : '-'
    }] : []),
    { header: 'Goal', key: 'title', render: v => <span className="font-medium text-gray-900 dark:text-white">{v}</span> },
    { header: 'Cycle', key: 'cycle', render: v => <span className="text-sm">{v?.name || '-'}</span> },
    { header: 'Target', key: 'target', render: v => <span className="text-sm text-gray-600">{v || '—'}</span> },
    { header: 'Weight', key: 'weight', render: v => <span className="font-mono text-sm">{v}</span> },
    { header: 'Status', key: 'status', render: v => <span className={`badge capitalize ${STATUS_COLORS[v]}`}>{v?.replace('-', ' ')}</span> },
    { header: 'Assigned', key: 'createdAt', render: v => formatDate(v) },
    {
      header: 'Actions', key: '_id',
      render: (id, row) => (
        <div className="flex items-center gap-1">
          <button onClick={() => openEdit(row)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600" title="Edit"><FiEdit2 className="w-4 h-4" /></button>
          {!isEmployee && <button onClick={() => handleDelete(id)} className="p-1.5 rounded hover:bg-red-50 text-red-600" title="Delete"><FiTrash2 className="w-4 h-4" /></button>}
        </div>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-gray-500 text-sm">{goals.length} goals</p>
        </div>
        {!isEmployee && (
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
            <button onClick={openAdd} className="btn-primary flex items-center justify-center gap-2 flex-1 sm:flex-none">
              <FiPlus className="w-4 h-4" /> Assign Goal
            </button>
          </div>
        )}
      </div>

      <div className="card p-4 flex flex-wrap gap-3">
        <select value={filters.cycle} onChange={e => setFilters({ ...filters, cycle: e.target.value })} className="input-field w-48">
          <option value="">All Cycles</option>
          {cycles.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        {!isEmployee && (
          <select value={filters.employee} onChange={e => setFilters({ ...filters, employee: e.target.value })} className="input-field w-48">
            <option value="">All Employees</option>
            {employees.map(e => <option key={e._id} value={e._id}>{e.firstName} {e.lastName}</option>)}
          </select>
        )}
        <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} className="input-field w-40">
          <option value="">All Status</option>
          <option value="not-started">Not Started</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <DataTable columns={columns} data={goals} loading={loading} emptyMessage="No goals found" emptyIcon="🎯" />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)}
        title={editGoal ? (isEmployee ? 'Update Progress' : 'Edit Goal') : 'Assign Goal'} size="sm"
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
          </>
        }
      >
        <div className="space-y-4">
          {isEmployee ? (
            <div>
              <label className="label">Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="input-field">
                <option value="not-started">Not Started</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          ) : (
            <>
              <div>
                <label className="label">Employee *</label>
                <select value={form.employee} onChange={e => setForm({ ...form, employee: e.target.value })} className="input-field">
                  <option value="">Select Employee</option>
                  {employees.map(e => <option key={e._id} value={e._id}>{e.firstName} {e.lastName}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Cycle *</label>
                <select value={form.cycle} onChange={e => setForm({ ...form, cycle: e.target.value })} className="input-field">
                  <option value="">Select Cycle</option>
                  {cycles.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Goal Title *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input-field" placeholder="e.g. Improve code review turnaround" />
              </div>
              <div>
                <label className="label">Target / Measurable Outcome</label>
                <input value={form.target} onChange={e => setForm({ ...form, target: e.target.value })} className="input-field" placeholder="e.g. Review within 24 hours, 95% of the time" />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-field" rows={2} />
              </div>
              <div>
                <label className="label">Weight (1–10)</label>
                <input type="number" min={1} max={10} value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} className="input-field" />
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default PerformanceGoals;
