import { useState, useEffect, useCallback } from 'react';
import { worklogAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import DataTable from '../../components/common/DataTable';
import { FiCheck, FiX, FiClock } from 'react-icons/fi';
import { formatDate, getInitials } from '../../utils/helpers';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

const WorklogApprovals = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);

  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({ startDate: '', endDate: '', page: 1, limit: 15 });
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');



  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...filters };
      const res = await worklogAPI.getEntries(params);
      if (res.data.success) {
        setEntries(res.data.data);
        setPagination({ currentPage: res.data.currentPage || 1, totalPages: res.data.totalPages || 1, total: res.data.total || 0 });
      }
    } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const handleApprove = async (id) => {
    try {
      await worklogAPI.updateStatus(id, { status: 'approved' });
      toast.success('Approved');
      fetchEntries();
    } catch { toast.error('Failed'); }
  };

  const handleReject = async () => {
    if (!rejectReason) return toast.error('Provide a reason');
    try {
      await worklogAPI.updateStatus(selectedId, { status: 'rejected', rejectionReason: rejectReason });
      toast.success('Rejected');
      setShowRejectModal(false);
      setRejectReason('');
      fetchEntries();
    } catch { toast.error('Failed'); }
  };

  const ROLE_LABELS = { employee: 'Employee', team_leader: 'Team Leader', hr: 'HR' };

  const columns = [
    {
      header: 'Submitted By', key: 'employee',
      render: (v, row) => v ? (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700 shrink-0">{getInitials(`${v.firstName} ${v.lastName}`)}</div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{v.firstName} {v.lastName}</p>
            <p className="text-xs text-gray-500">{v.department?.name}</p>
            {row.submittedByRole && row.submittedByRole !== 'employee' && (
              <span className="text-xs font-semibold text-indigo-600">{ROLE_LABELS[row.submittedByRole]}</span>
            )}
          </div>
        </div>
      ) : '-'
    },
    { header: 'Date', key: 'date', render: v => formatDate(v) },
    { header: 'Project', key: 'project', render: v => <span className="font-medium text-sm">{v?.name || '-'}</span> },
    { header: 'Hours', key: 'hours', render: v => <span className="flex items-center gap-1 font-mono text-sm"><FiClock className="w-3 h-3 text-gray-400" />{v}h</span> },
    { header: 'Task', key: 'taskDescription', render: v => <span className="text-sm text-gray-600 truncate max-w-xs block" title={v}>{v?.slice(0, 50)}{v?.length > 50 ? '...' : ''}</span> },
    { header: 'Status', key: 'status', render: v => <span className={`badge capitalize ${STATUS_COLORS[v]}`}>{v}</span> },
    {
      header: 'Actions', key: '_id',
      render: (id, row) => row.status === 'pending' ? (
        <div className="flex items-center gap-1">
          <button onClick={() => handleApprove(id)} className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600" title="Approve"><FiCheck className="w-4 h-4" /></button>
          <button onClick={() => { setSelectedId(id); setShowRejectModal(true); }} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Reject"><FiX className="w-4 h-4" /></button>
        </div>
      ) : null
    },
  ];

  const pendingCount = entries.filter(e => e.status === 'pending').length;

  // Description of what this approvals page shows
  const getSubtitle = () => {
    if (user?.role === 'admin') return 'Review work logs from all employees, team leaders, and HR';
    if (user?.role === 'hr') return 'Review work logs from employees and team leaders';
    return 'Review work logs from your team members';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Work Log Approval</h1>
          <p className="text-gray-500 text-sm">{getSubtitle()}</p>
        </div>
        {pendingCount > 0 && (
          <span className="badge bg-amber-100 text-amber-700">{pendingCount} pending</span>
        )}
      </div>

      <div className="card p-4 flex flex-wrap gap-3">
        <input
          type="date"
          value={filters.startDate}
          onChange={e => setFilters({ ...filters, startDate: e.target.value, page: 1 })}
          className="input-field w-40"
          title="From date"
        />
        <input
          type="date"
          value={filters.endDate}
          onChange={e => setFilters({ ...filters, endDate: e.target.value, page: 1 })}
          className="input-field w-40"
          title="To date"
          min={filters.startDate || undefined}
        />
        {(filters.startDate || filters.endDate) && (
          <button
            onClick={() => setFilters(f => ({ ...f, startDate: '', endDate: '', page: 1 }))}
            className="text-xs text-gray-500 hover:text-red-500 transition-colors"
          >
            Clear dates
          </button>
        )}
      </div>

      <DataTable columns={columns} data={entries} loading={loading}
        pagination={pagination} onPageChange={page => setFilters(f => ({ ...f, page }))}
        emptyMessage="No entries found" emptyIcon="✅" />

      <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} title="Reject Work Log" size="sm"
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

export default WorklogApprovals;
