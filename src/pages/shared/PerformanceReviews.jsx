import { useState, useEffect, useCallback } from 'react';
import { performanceAPI, employeeAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import DataTable from '../../components/common/DataTable';
import { FiPlus, FiEdit2, FiStar } from 'react-icons/fi';
import { formatDate, getInitials } from '../../utils/helpers';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  pending: 'bg-gray-100 text-gray-600',
  'self-submitted': 'bg-blue-100 text-blue-700',
  'manager-reviewed': 'bg-amber-100 text-amber-700',
  finalized: 'bg-emerald-100 text-emerald-700',
};

const RatingSelect = ({ value, onChange }) => (
  <select value={value} onChange={e => onChange(Number(e.target.value))} className="input-field">
    <option value="">Select</option>
    {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} — {['Poor', 'Below Average', 'Average', 'Good', 'Excellent'][n - 1]}</option>)}
  </select>
);

const PerformanceReviews = () => {
  const { user } = useAuth();
  const isEmployee = user?.role === 'employee';
  const [reviews, setReviews] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ cycle: '', employee: '' });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [createForm, setCreateForm] = useState({ employee: '', cycle: '' });
  const [reviewForm, setReviewForm] = useState({ selfRating: '', selfComments: '', managerRating: '', managerComments: '', finalScore: '', status: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    performanceAPI.getCycles().then(r => { if (r.data.success) setCycles(r.data.data); });
    if (!isEmployee) {
      employeeAPI.getAll({ limit: 200 }).then(r => { if (r.data.success) setEmployees(r.data.data); });
    }
  }, [isEmployee]);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await performanceAPI.getReviews(filters);
      if (res.data.success) setReviews(res.data.data);
    } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const openReview = (r) => {
    setSelectedReview(r);
    setReviewForm({
      selfRating: r.selfRating || '',
      selfComments: r.selfComments || '',
      managerRating: r.managerRating || '',
      managerComments: r.managerComments || '',
      finalScore: r.finalScore || '',
      status: r.status,
    });
    setShowReviewModal(true);
  };

  const handleCreate = async () => {
    if (!createForm.employee || !createForm.cycle) return toast.error('Select employee and cycle');
    setSaving(true);
    try {
      await performanceAPI.createReview(createForm);
      toast.success('Review created');
      fetchReviews(); setShowCreateModal(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleUpdateReview = async () => {
    setSaving(true);
    try {
      const payload = isEmployee
        ? { selfRating: reviewForm.selfRating, selfComments: reviewForm.selfComments }
        : { managerRating: reviewForm.managerRating, managerComments: reviewForm.managerComments, finalScore: reviewForm.finalScore, status: reviewForm.status };
      await performanceAPI.updateReview(selectedReview._id, payload);
      toast.success('Review updated');
      fetchReviews(); setShowReviewModal(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const columns = [
    ...(!isEmployee ? [{
      header: 'Employee', key: 'employee',
      render: (v) => v ? (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700 shrink-0">{getInitials(`${v.firstName} ${v.lastName}`)}</div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{v.firstName} {v.lastName}</p>
            <p className="text-xs text-gray-500">{v.department?.name}</p>
          </div>
        </div>
      ) : '-'
    }] : []),
    { header: 'Cycle', key: 'cycle', render: v => <span className="text-sm">{v?.name || '-'}</span> },
    { header: 'Self Rating', key: 'selfRating', render: v => v ? <span className="flex items-center gap-1 text-sm"><FiStar className="text-amber-400 w-3 h-3" />{v}/5</span> : <span className="text-gray-400 text-sm">—</span> },
    { header: 'Manager Rating', key: 'managerRating', render: v => v ? <span className="flex items-center gap-1 text-sm"><FiStar className="text-blue-400 w-3 h-3" />{v}/5</span> : <span className="text-gray-400 text-sm">—</span> },
    { header: 'Final Score', key: 'finalScore', render: v => v ? <span className="font-bold text-indigo-600">{v}/5</span> : <span className="text-gray-400">—</span> },
    { header: 'Status', key: 'status', render: v => <span className={`badge capitalize ${STATUS_COLORS[v] || ''}`}>{v?.replace('-', ' ')}</span> },
    {
      header: 'Actions', key: '_id',
      render: (id, row) => (
        <button onClick={() => openReview(row)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600" title="Review"><FiEdit2 className="w-4 h-4" /></button>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">{isEmployee ? 'My Reviews' : 'Performance Reviews'}</h1>
          <p className="text-gray-500 text-sm">{reviews.length} reviews</p>
        </div>
        {!isEmployee && (
          <button onClick={() => { setCreateForm({ employee: '', cycle: '' }); setShowCreateModal(true); }} className="btn-primary flex items-center gap-2">
            <FiPlus className="w-4 h-4" /> Create Review
          </button>
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
      </div>

      <DataTable columns={columns} data={reviews} loading={loading} emptyMessage="No reviews found" emptyIcon="📋" />

      {/* Create Review Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Performance Review" size="sm"
        footer={
          <>
            <button onClick={() => setShowCreateModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleCreate} disabled={saving} className="btn-primary">{saving ? 'Creating...' : 'Create'}</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Employee *</label>
            <select value={createForm.employee} onChange={e => setCreateForm({ ...createForm, employee: e.target.value })} className="input-field">
              <option value="">Select Employee</option>
              {employees.map(e => <option key={e._id} value={e._id}>{e.firstName} {e.lastName}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Cycle *</label>
            <select value={createForm.cycle} onChange={e => setCreateForm({ ...createForm, cycle: e.target.value })} className="input-field">
              <option value="">Select Cycle</option>
              {cycles.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </Modal>

      {/* Review / Self-Assessment Modal */}
      <Modal isOpen={showReviewModal} onClose={() => setShowReviewModal(false)}
        title={isEmployee ? 'Self Assessment' : 'Manager Review'} size="sm"
        footer={
          <>
            <button onClick={() => setShowReviewModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleUpdateReview} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
          </>
        }
      >
        <div className="space-y-4">
          {isEmployee ? (
            <>
              <div>
                <label className="label">Self Rating (1–5)</label>
                <RatingSelect value={reviewForm.selfRating} onChange={v => setReviewForm({ ...reviewForm, selfRating: v })} />
              </div>
              <div>
                <label className="label">Self Comments</label>
                <textarea value={reviewForm.selfComments} onChange={e => setReviewForm({ ...reviewForm, selfComments: e.target.value })} className="input-field" rows={3} placeholder="Your achievements and challenges this cycle..." />
              </div>
            </>
          ) : (
            <>
              {selectedReview?.selfRating && (
                <div className="card p-3 bg-blue-50 dark:bg-blue-900/20">
                  <p className="text-xs font-semibold text-blue-600 mb-1">Employee Self Assessment</p>
                  <p className="text-sm"><span className="font-medium">Rating:</span> {selectedReview.selfRating}/5</p>
                  <p className="text-sm mt-1 text-gray-600">{selectedReview.selfComments}</p>
                </div>
              )}
              <div>
                <label className="label">Manager Rating (1–5)</label>
                <RatingSelect value={reviewForm.managerRating} onChange={v => setReviewForm({ ...reviewForm, managerRating: v })} />
              </div>
              <div>
                <label className="label">Manager Comments</label>
                <textarea value={reviewForm.managerComments} onChange={e => setReviewForm({ ...reviewForm, managerComments: e.target.value })} className="input-field" rows={3} />
              </div>
              <div>
                <label className="label">Final Score (1–5)</label>
                <RatingSelect value={reviewForm.finalScore} onChange={v => setReviewForm({ ...reviewForm, finalScore: v })} />
              </div>
              <div>
                <label className="label">Status</label>
                <select value={reviewForm.status} onChange={e => setReviewForm({ ...reviewForm, status: e.target.value })} className="input-field">
                  <option value="pending">Pending</option>
                  <option value="self-submitted">Self Submitted</option>
                  <option value="manager-reviewed">Manager Reviewed</option>
                  <option value="finalized">Finalized</option>
                </select>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default PerformanceReviews;
