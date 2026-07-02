import React, { useState, useEffect, useCallback } from 'react';
import { leaveAPI, employeeAPI, payrollAPI } from '../../services/api';
import { FiInfo, FiPlus, FiCheck, FiX, FiTrash2 } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import { formatDate, getStatusColor, getLeaveTypeColor, getInitials } from '../../utils/helpers';
import toast from 'react-hot-toast';

const LEAVE_TYPES = ['sick', 'casual', 'earned', 'maternity', 'paternity', 'unpaid', 'emergency'];

const Leaves = () => {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({ status: '', leaveType: '', employee: '', page: 1, limit: 10 });
  const [statusTotals, setStatusTotals] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [leaveBalances, setLeaveBalances] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [form, setForm] = useState({ leaveType: 'sick', startDate: '', endDate: '', reason: '', isHalfDay: false });
  const [saving, setSaving] = useState(false);
  const [myBalance, setMyBalance] = useState(null);

  useEffect(() => {
    if (user.role === 'employee') {
      payrollAPI.getLeaveBalance().then(r => {
        if (r.data?.data?.balances) setMyBalance(r.data.data.balances);
      }).catch(() => {});
    }
  }, [user.role]);

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const [res, pendingRes, approvedRes, rejectedRes] = await Promise.all([
        leaveAPI.getAll(filters),
        leaveAPI.getAll({ status: 'pending', limit: 1 }),
        leaveAPI.getAll({ status: 'approved', limit: 1 }),
        leaveAPI.getAll({ status: 'rejected', limit: 1 }),
      ]);
      if (res.data.success) {
        const data = res.data.data;
        setLeaves(data);
        setPagination({ currentPage: res.data.currentPage || 1, totalPages: res.data.totalPages || 1, total: res.data.total || 0 });
        setStatusTotals({
          pending: pendingRes.data.total || 0,
          approved: approvedRes.data.total || 0,
          rejected: rejectedRes.data.total || 0,
          total: res.data.total || 0,
        });
        if (user.role !== 'employee') {
          const pendingLeaves = data.filter(l => l.status === 'pending' && l.employee?._id);
          const uniqueEmployeeIds = [...new Set(pendingLeaves.map(l => l.employee._id))];
          const balanceResults = await Promise.allSettled(
            uniqueEmployeeIds.map(id => payrollAPI.getLeaveBalance(id))
          );
          const balanceMap = {};
          uniqueEmployeeIds.forEach((id, i) => {
            const result = balanceResults[i];
            if (result.status === 'fulfilled' && result.value.data?.data?.balances) {
              balanceMap[id] = result.value.data.data.balances;
            }
          });
          setLeaveBalances(balanceMap);
        }
      }
    } finally { setLoading(false); }
  }, [filters, user.role]);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);
  useEffect(() => {
    if (user.role !== 'employee') {
      employeeAPI.getAll({ limit: 100 }).then(r => { if (r.data.success) setEmployees(r.data.data); });
    }
  }, [user.role]);

  const handleApply = async () => {
    if (!form.startDate || !form.endDate || !form.reason) return toast.error('Fill in all required fields');
    if (new Date(form.endDate) < new Date(form.startDate)) return toast.error('End date must be after start date');
    setSaving(true);
    try {
      const res = await leaveAPI.apply(form);
      if (res.data.success) { toast.success('Leave application submitted!'); fetchLeaves(); setShowModal(false); }
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to apply'); }
    finally { setSaving(false); }
  };

  const handleApprove = async (id) => {
    try {
      await leaveAPI.updateStatus(id, { status: 'approved' });
      toast.success('Leave approved');
      fetchLeaves();
    } catch (err) { toast.error('Failed'); }
  };

  const handleReject = async () => {
    if (!rejectReason) return toast.error('Provide a reason');
    try {
      await leaveAPI.updateStatus(selectedLeave, { status: 'rejected', rejectionReason: rejectReason });
      toast.success('Leave rejected');
      setShowRejectModal(false);
      setRejectReason('');
      fetchLeaves();
    } catch (err) { toast.error('Failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this leave request?')) return;
    try {
      await leaveAPI.delete(id); toast.success('Deleted'); fetchLeaves();
    } catch (err) { toast.error(err.response?.data?.message || 'Cannot delete'); }
  };

  const columns = [
    ...(user.role !== 'employee' ? [{
      header: 'Employee', key: 'employee',
      render: (val, row) => val ? (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-xs font-semibold text-primary-700 flex-shrink-0">{getInitials(`${val.firstName} ${val.lastName}`)}</div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white text-sm">{val.firstName} {val.lastName}</p>
            <p className="text-xs text-gray-500">{val.department?.name}</p>
            {row.status === 'pending' && leaveBalances[val._id] && (() => {
              const bal = leaveBalances[val._id][row.leaveType];
              const remaining = bal ?? null;
              if (remaining === null) return null;
              const isLow = remaining < (row.totalDays || 1);
              return (
                <span className={`inline-block mt-0.5 text-xs font-medium px-1.5 py-0.5 rounded ${isLow ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  Balance: {remaining} day{remaining !== 1 ? 's' : ''} {isLow ? '⚠' : ''}
                </span>
              );
            })()}
          </div>
        </div>
      ) : '-'
    }] : []),
    { header: 'Type', key: 'leaveType', render: (v) => <span className={`badge ${getLeaveTypeColor(v)} capitalize`}>{v}</span> },
    { header: 'From', key: 'startDate', render: (v) => formatDate(v) },
    { header: 'To', key: 'endDate', render: (v) => formatDate(v) },
    { header: 'Days', key: 'totalDays', render: (v) => `${v || '-'} day(s)` },
    { header: 'Reason', key: 'reason', render: (v) => <span className="truncate max-w-xs block" title={v}>{v?.slice(0, 40)}{v?.length > 40 ? '...' : ''}</span> },
    { header: 'Status', key: 'status', render: (v) => <span className={`badge ${getStatusColor(v)}`}>{v}</span> },
    { header: 'Applied', key: 'createdAt', render: (v) => formatDate(v) },
    {
      header: 'Actions', key: '_id',
      render: (id, row) => (
        <div className="flex items-center gap-1">
          {user.role !== 'employee' && row.status === 'pending' && (
            <>
              <button onClick={() => handleApprove(id)} className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600" title="Approve"><FiCheck className="w-4 h-4" /></button>
              <button onClick={() => { setSelectedLeave(id); setShowRejectModal(true); }} className="p-1.5 rounded hover:bg-red-50 text-red-600" title="Reject"><FiX className="w-4 h-4" /></button>
            </>
          )}
          {row.status === 'pending' && (
            <button onClick={() => handleDelete(id)} className="p-1.5 rounded hover:bg-red-50 text-red-600" title="Delete"><FiTrash2 className="w-4 h-4" /></button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="page-title">Leave Management</h1>
          <p className="text-gray-500 text-sm">{pagination.total} total requests</p>
        </div>
        {user.role !== 'admin' && (
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
            <button onClick={() => { setForm({ leaveType: 'sick', startDate: '', endDate: '', reason: '' }); setShowModal(true); }}
              className="btn-primary flex items-center justify-center gap-2 flex-1 sm:flex-none">
              <FiPlus className="w-4 h-4" /> Apply Leave
            </button>
          </div>
        )}
      </div>

      {/* Employee leave balance chips */}
      {user.role === 'employee' && myBalance && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <FiInfo className="w-4 h-4 text-primary-500" />
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Your Leave Balance</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(myBalance).map(([type, days]) => {
              const isLow = typeof days === 'number' && days <= 2;
              return (
                <div key={type} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                  isLow
                    ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-400'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-400'
                }`}>
                  <span className="capitalize">{type}</span>
                  <span className="font-bold">{days ?? 0}</span>
                  <span className="text-gray-400">Days</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Status summary cards — counts are org-wide totals, not just this page */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          ['Pending',  'pending',  'bg-amber-50 border-amber-100',   'text-amber-700',  statusTotals.pending],
          ['Approved', 'approved', 'bg-emerald-50 border-emerald-100','text-emerald-700',statusTotals.approved],
          ['Rejected', 'rejected', 'bg-red-50 border-red-100',        'text-red-700',    statusTotals.rejected],
          ['All',      '',         'bg-blue-50 border-blue-100',       'text-blue-700',   statusTotals.total],
        ].map(([label, val, bg, text, count]) => (
          <button key={label} onClick={() => setFilters({ ...filters, status: val, page: 1 })}
            className={`card p-4 text-left border ${bg} hover:shadow-md transition-all ${filters.status === val ? 'ring-2 ring-primary-400' : ''}`}>
            <p className={`font-bold text-2xl ${text}`}>{count}</p>
            <p className="text-xs text-gray-600 mt-0.5">{label}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value, page: 1 })} className="input-field w-36">
          <option value="">All Status</option>
          {['pending','approved','rejected','cancelled'].map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
        <select value={filters.leaveType} onChange={e => setFilters({ ...filters, leaveType: e.target.value, page: 1 })} className="input-field w-36">
          <option value="">All Types</option>
          {LEAVE_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
        </select>
        {user.role !== 'employee' && (
          <select value={filters.employee} onChange={e => setFilters({ ...filters, employee: e.target.value, page: 1 })} className="input-field w-48">
            <option value="">All Employees</option>
            {employees.map(e => <option key={e._id} value={e._id}>{e.firstName} {e.lastName}</option>)}
          </select>
        )}
      </div>

      <DataTable columns={columns} data={leaves} loading={loading}
        pagination={pagination} onPageChange={page => setFilters(f => ({ ...f, page }))}
        emptyMessage="No leave requests found" emptyIcon="📋" />

      {/* Apply leave modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Apply for Leave" size="sm"
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleApply} disabled={saving} className="btn-primary">{saving ? 'Submitting...' : 'Submit'}</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Leave Type *</label>
            <select value={form.leaveType} onChange={e => setForm({ ...form, leaveType: e.target.value })} className="input-field">
              {LEAVE_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
            </select>
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
          <div className="flex items-center gap-2">
            <input type="checkbox" id="halfDay" checked={form.isHalfDay || false} onChange={e => setForm({ ...form, isHalfDay: e.target.checked })} className="w-4 h-4 text-primary-600" />
            <label htmlFor="halfDay" className="text-sm text-gray-700 dark:text-gray-300">Half Day</label>
          </div>
          <div>
            <label className="label">Reason *</label>
            <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} className="input-field" rows={3} placeholder="Reason for leave..." />
          </div>
        </div>
      </Modal>

      {/* Reject modal */}
      <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} title="Reject Leave" size="sm"
        footer={
          <>
            <button onClick={() => setShowRejectModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleReject} className="btn-danger">Reject</button>
          </>
        }
      >
        <div>
          <label className="label">Rejection Reason *</label>
          <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="input-field" rows={3} placeholder="Reason for rejection..." />
        </div>
      </Modal>
    </div>
  );
};

export default Leaves;
