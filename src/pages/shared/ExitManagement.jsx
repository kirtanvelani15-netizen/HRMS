import { useState, useEffect, useCallback } from 'react';
import { exitAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import DataTable from '../../components/common/DataTable';
import { FiPlus, FiEdit2, FiCheck, FiX } from 'react-icons/fi';
import { formatDate, getInitials } from '../../utils/helpers';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  rejected: 'bg-red-100 text-red-700',
  completed: 'bg-emerald-100 text-emerald-700',
};

const today = new Date().toISOString().slice(0, 10);

const ExitManagement = () => {
  const { user } = useAuth();
  const isEmployee = user?.role === 'employee';
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '' });
  const [showModal, setShowModal] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ resignationDate: today, lastWorkingDay: '', reason: '' });
  const [processForm, setProcessForm] = useState({ status: '', exitInterviewNotes: '', finalSettlementAmount: '', assetsReturned: false, accessRevoked: false, rejectionReason: '' });
  const [saving, setSaving] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await exitAPI.getAll(filters);
      if (res.data.success) setRequests(res.data.data);
    } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleSubmit = async () => {
    if (!form.resignationDate || !form.lastWorkingDay || !form.reason) return toast.error('All fields required');
    setSaving(true);
    try {
      await exitAPI.create(form);
      toast.success('Resignation submitted');
      fetchRequests(); setShowModal(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleProcess = async () => {
    setSaving(true);
    try {
      await exitAPI.update(selected._id, processForm);
      toast.success('Updated');
      fetchRequests(); setShowProcessModal(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const columns = [
    ...(!isEmployee ? [{
      header: 'Employee', key: 'employee',
      render: v => v ? (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center text-xs font-semibold text-red-700 shrink-0">{getInitials(`${v.firstName} ${v.lastName}`)}</div>
          <div><p className="text-sm font-medium text-gray-900 dark:text-white">{v.firstName} {v.lastName}</p><p className="text-xs text-gray-500">{v.department?.name}</p></div>
        </div>
      ) : '-'
    }] : []),
    { header: 'Resignation Date', key: 'resignationDate', render: v => formatDate(v) },
    { header: 'Last Working Day', key: 'lastWorkingDay', render: v => formatDate(v) },
    { header: 'Reason', key: 'reason', render: v => <span className="text-sm text-gray-600 truncate max-w-xs block">{v?.slice(0, 50)}</span> },
    { header: 'Status', key: 'status', render: v => <span className={`badge capitalize ${STATUS_COLORS[v]}`}>{v}</span> },
    { header: 'Assets Returned', key: 'assetsReturned', render: v => v ? <FiCheck className="text-emerald-600 w-4 h-4" /> : <FiX className="text-red-400 w-4 h-4" /> },
    { header: 'Access Revoked', key: 'accessRevoked', render: v => v ? <FiCheck className="text-emerald-600 w-4 h-4" /> : <FiX className="text-red-400 w-4 h-4" /> },
    ...(!isEmployee ? [{
      header: 'Actions', key: '_id',
      render: (id, row) => (
        <button onClick={() => { setSelected(row); setProcessForm({ status: row.status, exitInterviewNotes: row.exitInterviewNotes || '', finalSettlementAmount: row.finalSettlementAmount || '', assetsReturned: row.assetsReturned, accessRevoked: row.accessRevoked, rejectionReason: row.rejectionReason || '' }); setShowProcessModal(true); }} className="p-1.5 rounded hover:bg-blue-50 text-blue-600"><FiEdit2 className="w-4 h-4" /></button>
      )
    }] : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-gray-500 text-sm">{requests.length} requests</p>
        </div>
        {isEmployee && !requests.some(r => ['pending', 'approved'].includes(r.status)) && (
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
            <button onClick={() => { setForm({ resignationDate: today, lastWorkingDay: '', reason: '' }); setShowModal(true); }} className="btn-danger flex items-center gap-2"><FiPlus className="w-4 h-4" /> Submit Resignation</button>
          </div>
        )}
      </div>

      <div className="card p-4 flex gap-3">
        <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} className="input-field w-36">
          <option value="">All Status</option>
          {['pending', 'approved', 'rejected', 'completed'].map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
      </div>

      <DataTable columns={columns} data={requests} loading={loading} emptyMessage="No exit requests" emptyIcon="🚪" />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Submit Resignation" size="sm"
        footer={<><button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button><button onClick={handleSubmit} disabled={saving} className="btn-danger">{saving ? 'Submitting...' : 'Submit'}</button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Resignation Date *</label><input type="date" value={form.resignationDate} onChange={e => setForm({ ...form, resignationDate: e.target.value })} className="input-field" /></div>
            <div><label className="label">Last Working Day *</label><input type="date" value={form.lastWorkingDay} onChange={e => setForm({ ...form, lastWorkingDay: e.target.value })} className="input-field" /></div>
          </div>
          <div><label className="label">Reason *</label><textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} className="input-field" rows={4} placeholder="Reason for resignation..." /></div>
        </div>
      </Modal>

      <Modal isOpen={showProcessModal} onClose={() => setShowProcessModal(false)} title="Process Exit Request" size="sm"
        footer={<><button onClick={() => setShowProcessModal(false)} className="btn-secondary">Cancel</button><button onClick={handleProcess} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button></>}>
        <div className="space-y-4">
          <div><label className="label">Status</label>
            <select value={processForm.status} onChange={e => setProcessForm({ ...processForm, status: e.target.value })} className="input-field">
              {['pending', 'approved', 'rejected', 'completed'].map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
            </select>
          </div>
          <div><label className="label">Exit Interview Notes</label><textarea value={processForm.exitInterviewNotes} onChange={e => setProcessForm({ ...processForm, exitInterviewNotes: e.target.value })} className="input-field" rows={3} /></div>
          <div><label className="label">Final Settlement (₹)</label><input type="number" value={processForm.finalSettlementAmount} onChange={e => setProcessForm({ ...processForm, finalSettlementAmount: e.target.value })} className="input-field" /></div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={processForm.assetsReturned} onChange={e => setProcessForm({ ...processForm, assetsReturned: e.target.checked })} className="w-4 h-4 text-indigo-600" /> Assets Returned</label>
            <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={processForm.accessRevoked} onChange={e => setProcessForm({ ...processForm, accessRevoked: e.target.checked })} className="w-4 h-4 text-indigo-600" /> Access Revoked</label>
          </div>
          {processForm.status === 'rejected' && <div><label className="label">Rejection Reason</label><textarea value={processForm.rejectionReason} onChange={e => setProcessForm({ ...processForm, rejectionReason: e.target.value })} className="input-field" rows={2} /></div>}
        </div>
      </Modal>
    </div>
  );
};

export default ExitManagement;
