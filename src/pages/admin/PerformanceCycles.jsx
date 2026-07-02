import { useState, useEffect } from 'react';
import { performanceAPI } from '../../services/api';
import Modal from '../../components/common/Modal';
import DataTable from '../../components/common/DataTable';
import { FiPlus, FiEdit2, FiTrash2, FiPlay, FiLock } from 'react-icons/fi';
import { formatDate } from '../../utils/helpers';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-600',
  active: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-red-100 text-red-700',
};

const emptyForm = { name: '', startDate: '', endDate: '', status: 'draft' };

const PerformanceCycles = () => {
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editCycle, setEditCycle] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await performanceAPI.getCycles();
      if (res.data.success) setCycles(res.data.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const openAdd = () => { setEditCycle(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (c) => {
    setEditCycle(c);
    setForm({ name: c.name, startDate: c.startDate?.slice(0, 10), endDate: c.endDate?.slice(0, 10), status: c.status });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.startDate || !form.endDate) return toast.error('All fields are required');
    setSaving(true);
    try {
      if (editCycle) {
        await performanceAPI.updateCycle(editCycle._id, form);
        toast.success('Cycle updated');
      } else {
        await performanceAPI.createCycle(form);
        toast.success('Cycle created');
      }
      fetch(); setShowModal(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (cycle, status) => {
    try {
      await performanceAPI.updateCycle(cycle._id, { status });
      toast.success(`Cycle ${status}`);
      fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this cycle?')) return;
    try { await performanceAPI.deleteCycle(id); toast.success('Deleted'); fetch(); }
    catch (err) { toast.error(err.response?.data?.message || 'Cannot delete active cycle'); }
  };

  const columns = [
    { header: 'Cycle Name', key: 'name', render: v => <span className="font-medium text-gray-900 dark:text-white">{v}</span> },
    { header: 'Start Date', key: 'startDate', render: v => formatDate(v) },
    { header: 'End Date', key: 'endDate', render: v => formatDate(v) },
    { header: 'Status', key: 'status', render: v => <span className={`badge capitalize ${STATUS_COLORS[v]}`}>{v}</span> },
    { header: 'Created By', key: 'createdBy', render: v => v?.name || '-' },
    {
      header: 'Actions', key: '_id',
      render: (id, row) => (
        <div className="flex items-center gap-1">
          {row.status === 'draft' && (
            <button onClick={() => handleStatusChange(row, 'active')} className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600" title="Activate"><FiPlay className="w-4 h-4" /></button>
          )}
          {row.status === 'active' && (
            <button onClick={() => handleStatusChange(row, 'closed')} className="p-1.5 rounded hover:bg-gray-100 text-gray-600" title="Close"><FiLock className="w-4 h-4" /></button>
          )}
          <button onClick={() => openEdit(row)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600" title="Edit"><FiEdit2 className="w-4 h-4" /></button>
          <button onClick={() => handleDelete(id)} className="p-1.5 rounded hover:bg-red-50 text-red-600" title="Delete"><FiTrash2 className="w-4 h-4" /></button>
        </div>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-gray-500 text-sm">{cycles.length} cycles</p>
        <button onClick={openAdd} className="btn-primary flex items-center justify-center gap-2 flex-1 sm:flex-none w-full sm:w-auto">
          <FiPlus className="w-4 h-4" /> New Cycle
        </button>
      </div>

      <DataTable columns={columns} data={cycles} loading={loading} emptyMessage="No performance cycles yet" emptyIcon="🔄" />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)}
        title={editCycle ? 'Edit Cycle' : 'New Performance Cycle'} size="sm"
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Cycle Name *</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="e.g. Q1 2026 Review" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Date *</label>
              <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="label">End Date *</label>
              <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} className="input-field" />
            </div>
          </div>
          {editCycle && (
            <div>
              <label className="label">Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="input-field">
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default PerformanceCycles;
