import { useState, useEffect } from 'react';
import { performanceAPI, employeeAPI } from '../../services/api';
import DataTable from '../../components/common/DataTable';
import { getInitials } from '../../utils/helpers';
import { FiStar } from 'react-icons/fi';

const SCORE_COLOR = (s) => {
  if (!s) return 'text-gray-400';
  if (s >= 4.5) return 'text-emerald-600';
  if (s >= 3.5) return 'text-blue-600';
  if (s >= 2.5) return 'text-amber-600';
  return 'text-red-600';
};

const STATUS_COLORS = {
  pending: 'bg-gray-100 text-gray-600',
  'self-submitted': 'bg-blue-100 text-blue-700',
  'manager-reviewed': 'bg-amber-100 text-amber-700',
  finalized: 'bg-emerald-100 text-emerald-700',
};

const PerformanceOverview = () => {
  const [cycles, setCycles] = useState([]);
  const [selectedCycle, setSelectedCycle] = useState('');
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    performanceAPI.getCycles().then(r => {
      if (r.data.success) {
        setCycles(r.data.data);
        const active = r.data.data.find(c => c.status === 'active');
        if (active) setSelectedCycle(active._id);
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedCycle) return;
    setLoading(true);
    performanceAPI.getReviews({ cycle: selectedCycle })
      .then(r => { if (r.data.success) setReviews(r.data.data); })
      .finally(() => setLoading(false));
  }, [selectedCycle]);

  const avg = reviews.filter(r => r.finalScore).reduce((s, r, _, a) => s + r.finalScore / a.length, 0);

  const columns = [
    {
      header: 'Employee', key: 'employee',
      render: (v) => v ? (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700 shrink-0">
            {getInitials(`${v.firstName} ${v.lastName}`)}
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white text-sm">{v.firstName} {v.lastName}</p>
            <p className="text-xs text-gray-500">{v.department?.name}</p>
          </div>
        </div>
      ) : '-'
    },
    { header: 'Self Rating', key: 'selfRating', render: v => v ? <span className="flex items-center gap-1"><FiStar className="text-amber-400" />{v}/5</span> : <span className="text-gray-400">—</span> },
    { header: 'Manager Rating', key: 'managerRating', render: v => v ? <span className="flex items-center gap-1"><FiStar className="text-blue-400" />{v}/5</span> : <span className="text-gray-400">—</span> },
    { header: 'Final Score', key: 'finalScore', render: v => v ? <span className={`font-bold text-lg ${SCORE_COLOR(v)}`}>{v}/5</span> : <span className="text-gray-400">—</span> },
    { header: 'Status', key: 'status', render: v => <span className={`badge capitalize ${STATUS_COLORS[v] || ''}`}>{v?.replace('-', ' ')}</span> },
    { header: 'Manager Notes', key: 'managerComments', render: v => <span className="truncate max-w-xs block text-sm text-gray-500" title={v}>{v?.slice(0, 50) || '—'}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="page-title">Performance Overview</h1>
          <p className="text-gray-500 text-sm">{reviews.length} reviews</p>
        </div>
        <select value={selectedCycle} onChange={e => setSelectedCycle(e.target.value)} className="input-field w-full sm:w-56">
          <option value="">Select Cycle</option>
          {cycles.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
      </div>

      {reviews.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-indigo-600">{reviews.length}</p>
            <p className="text-xs text-gray-500 mt-1">Total Reviews</p>
          </div>
          <div className="card p-4 text-center">
            <p className={`text-2xl font-bold ${SCORE_COLOR(avg)}`}>{avg ? avg.toFixed(1) : '—'}</p>
            <p className="text-xs text-gray-500 mt-1">Avg Final Score</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{reviews.filter(r => r.status === 'finalized').length}</p>
            <p className="text-xs text-gray-500 mt-1">Finalized</p>
          </div>
        </div>
      )}

      <DataTable columns={columns} data={reviews} loading={loading}
        emptyMessage={selectedCycle ? 'No reviews for this cycle' : 'Select a cycle to view reviews'} emptyIcon="📊" />
    </div>
  );
};

export default PerformanceOverview;
