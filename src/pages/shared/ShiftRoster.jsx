import { useState, useEffect, useCallback } from 'react';
import { shiftAPI, employeeAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import DataTable from '../../components/common/DataTable';
import { FiPlus, FiEdit2, FiTrash2, FiClock } from 'react-icons/fi';
import { formatDate, getInitials } from '../../utils/helpers';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  scheduled: 'bg-blue-100 text-blue-700',
  'swap-requested': 'bg-amber-100 text-amber-700',
  swapped: 'bg-purple-100 text-purple-700',
  cancelled: 'bg-red-100 text-red-700',
};

const today = new Date().toISOString().slice(0, 10);

const ShiftRoster = () => {
  const { user } = useAuth();
  const isEmployee = user?.role === 'employee';
  const [tab, setTab] = useState('roster');
  const [shifts, setShifts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editShift, setEditShift] = useState(null);
  const [shiftForm, setShiftForm] = useState({ name: '', startTime: '', endTime: '', description: '' });
  const [assignForm, setAssignForm] = useState({ employee: '', shift: '', date: today, notes: '' });
  const [filters, setFilters] = useState({ startDate: today, endDate: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    shiftAPI.getShifts().then(r => { if (r.data.success) setShifts(r.data.data); });
    if (!isEmployee) employeeAPI.getAll({ limit: 200 }).then(r => { if (r.data.success) setEmployees(r.data.data); });
  }, [isEmployee]);

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await shiftAPI.getAssignments(filters);
      if (res.data.success) setAssignments(res.data.data);
    } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { if (tab === 'roster') fetchAssignments(); else setLoading(false); }, [tab, fetchAssignments]);

  const handleSaveShift = async () => {
    if (!shiftForm.name || !shiftForm.startTime || !shiftForm.endTime) return toast.error('Name and times are required');
    setSaving(true);
    try {
      if (editShift) { await shiftAPI.updateShift(editShift._id, shiftForm); toast.success('Shift updated'); }
      else { await shiftAPI.createShift(shiftForm); toast.success('Shift created'); }
      shiftAPI.getShifts().then(r => { if (r.data.success) setShifts(r.data.data); });
      setShowShiftModal(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleAssign = async () => {
    if (!assignForm.employee || !assignForm.shift || !assignForm.date) return toast.error('All fields required');
    setSaving(true);
    try {
      await shiftAPI.createAssignment(assignForm);
      toast.success('Shift assigned');
      fetchAssignments(); setShowAssignModal(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleUpdateStatus = async (id, status) => {
    try { await shiftAPI.updateAssignment(id, { status }); toast.success('Updated'); fetchAssignments(); }
    catch { toast.error('Failed'); }
  };

  const shiftColumns = [
    { header: 'Shift Name', key: 'name', render: v => <span className="font-medium text-gray-900 dark:text-white">{v}</span> },
    { header: 'Start Time', key: 'startTime', render: v => <span className="font-mono text-sm flex items-center gap-1"><FiClock className="w-3 h-3" />{v}</span> },
    { header: 'End Time', key: 'endTime', render: v => <span className="font-mono text-sm">{v}</span> },
    { header: 'Description', key: 'description', render: v => v || '-' },
    ...(!isEmployee ? [{
      header: 'Actions', key: '_id',
      render: (id, row) => (
        <div className="flex gap-1">
          <button onClick={() => { setEditShift(row); setShiftForm({ name: row.name, startTime: row.startTime, endTime: row.endTime, description: row.description || '' }); setShowShiftModal(true); }} className="p-1.5 rounded hover:bg-blue-50 text-blue-600"><FiEdit2 className="w-4 h-4" /></button>
          <button onClick={async () => { if (!window.confirm('Delete shift?')) return; await shiftAPI.deleteShift(id); toast.success('Deleted'); shiftAPI.getShifts().then(r => { if (r.data.success) setShifts(r.data.data); }); }} className="p-1.5 rounded hover:bg-red-50 text-red-600"><FiTrash2 className="w-4 h-4" /></button>
        </div>
      )
    }] : []),
  ];

  const assignmentColumns = [
    ...(!isEmployee ? [{
      header: 'Employee', key: 'employee',
      render: v => v ? (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700 shrink-0">{getInitials(`${v.firstName} ${v.lastName}`)}</div>
          <div><p className="text-sm font-medium text-gray-900 dark:text-white">{v.firstName} {v.lastName}</p><p className="text-xs text-gray-500">{v.department?.name}</p></div>
        </div>
      ) : '-'
    }] : []),
    { header: 'Date', key: 'date', render: v => formatDate(v) },
    { header: 'Shift', key: 'shift', render: v => v ? <span className="font-medium">{v.name} <span className="text-xs text-gray-400">({v.startTime}–{v.endTime})</span></span> : '-' },
    { header: 'Status', key: 'status', render: v => <span className={`badge capitalize ${STATUS_COLORS[v]}`}>{v?.replace('-', ' ')}</span> },
    {
      header: 'Actions', key: '_id',
      render: (id, row) => !isEmployee ? (
        <select value={row.status} onChange={e => handleUpdateStatus(id, e.target.value)} className="input-field text-xs py-1 w-36">
          <option value="scheduled">Scheduled</option>
          <option value="swap-requested">Swap Requested</option>
          <option value="swapped">Swapped</option>
          <option value="cancelled">Cancelled</option>
        </select>
      ) : row.status === 'scheduled' ? (
        <button onClick={() => handleUpdateStatus(id, 'swap-requested')} className="text-xs text-amber-600 hover:underline">Request Swap</button>
      ) : null
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Shift & Roster</h1>
          <p className="text-gray-500 text-sm">{tab === 'shifts' ? `${shifts.length} shift types` : `${assignments.length} assignments`}</p>
        </div>
        {!isEmployee && (
          <div className="flex gap-2">
            <button onClick={() => { setEditShift(null); setShiftForm({ name: '', startTime: '', endTime: '', description: '' }); setShowShiftModal(true); }} className="btn-secondary flex items-center gap-2"><FiPlus className="w-4 h-4" /> New Shift</button>
            <button onClick={() => { setAssignForm({ employee: '', shift: '', date: today, notes: '' }); setShowAssignModal(true); }} className="btn-primary flex items-center gap-2"><FiPlus className="w-4 h-4" /> Assign Shift</button>
          </div>
        )}
      </div>

      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {['roster', 'shifts'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{t}</button>
        ))}
      </div>

      {tab === 'roster' && (
        <>
          <div className="card p-4 flex gap-3 flex-wrap">
            <div><label className="label text-xs">From</label><input type="date" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} className="input-field w-36" /></div>
            <div><label className="label text-xs">To</label><input type="date" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} className="input-field w-36" /></div>
          </div>
          <DataTable columns={assignmentColumns} data={assignments} loading={loading} emptyMessage="No shift assignments found" emptyIcon="📅" />
        </>
      )}
      {tab === 'shifts' && <DataTable columns={shiftColumns} data={shifts} loading={!isEmployee && loading} emptyMessage="No shifts defined" emptyIcon="⏰" />}

      <Modal isOpen={showShiftModal} onClose={() => setShowShiftModal(false)} title={editShift ? 'Edit Shift' : 'New Shift'} size="sm"
        footer={<><button onClick={() => setShowShiftModal(false)} className="btn-secondary">Cancel</button><button onClick={handleSaveShift} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button></>}>
        <div className="space-y-4">
          <div><label className="label">Shift Name *</label><input value={shiftForm.name} onChange={e => setShiftForm({ ...shiftForm, name: e.target.value })} className="input-field" placeholder="e.g. Morning Shift" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Start Time *</label><input type="time" value={shiftForm.startTime} onChange={e => setShiftForm({ ...shiftForm, startTime: e.target.value })} className="input-field" /></div>
            <div><label className="label">End Time *</label><input type="time" value={shiftForm.endTime} onChange={e => setShiftForm({ ...shiftForm, endTime: e.target.value })} className="input-field" /></div>
          </div>
          <div><label className="label">Description</label><textarea value={shiftForm.description} onChange={e => setShiftForm({ ...shiftForm, description: e.target.value })} className="input-field" rows={2} /></div>
        </div>
      </Modal>

      <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title="Assign Shift" size="sm"
        footer={<><button onClick={() => setShowAssignModal(false)} className="btn-secondary">Cancel</button><button onClick={handleAssign} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Assign'}</button></>}>
        <div className="space-y-4">
          <div><label className="label">Employee *</label>
            <select value={assignForm.employee} onChange={e => setAssignForm({ ...assignForm, employee: e.target.value })} className="input-field">
              <option value="">Select Employee</option>{employees.map(e => <option key={e._id} value={e._id}>{e.firstName} {e.lastName}</option>)}
            </select>
          </div>
          <div><label className="label">Shift *</label>
            <select value={assignForm.shift} onChange={e => setAssignForm({ ...assignForm, shift: e.target.value })} className="input-field">
              <option value="">Select Shift</option>{shifts.map(s => <option key={s._id} value={s._id}>{s.name} ({s.startTime}–{s.endTime})</option>)}
            </select>
          </div>
          <div><label className="label">Date *</label><input type="date" value={assignForm.date} onChange={e => setAssignForm({ ...assignForm, date: e.target.value })} className="input-field" /></div>
          <div><label className="label">Notes</label><textarea value={assignForm.notes} onChange={e => setAssignForm({ ...assignForm, notes: e.target.value })} className="input-field" rows={2} /></div>
        </div>
      </Modal>
    </div>
  );
};

export default ShiftRoster;
