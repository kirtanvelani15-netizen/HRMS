import { useState, useEffect, useCallback } from 'react';
import { worklogAPI, employeeAPI } from '../../services/api';
import DataTable from '../../components/common/DataTable';
import { FiClock, FiDownload, FiBarChart2 } from 'react-icons/fi';
import { getInitials } from '../../utils/helpers';
import toast from 'react-hot-toast';

const WorklogReports = () => {
  const [report, setReport] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ employee: '', project: '', startDate: '', endDate: '' });

  useEffect(() => {
    employeeAPI.getAll({ limit: 200 }).then(r => { if (r.data.success) setEmployees(r.data.data); });
    worklogAPI.getProjects().then(r => { if (r.data.success) setProjects(r.data.data); });
  }, []);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await worklogAPI.getReport(filters);
      if (res.data.success) setReport(res.data.data);
    } catch { toast.error('Failed to load report'); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const totalHours = report.reduce((s, r) => s + r.totalHours, 0);

  const columns = [
    {
      header: 'Employee', key: 'employee',
      render: (v) => v ? (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700 shrink-0">{getInitials(`${v.firstName} ${v.lastName}`)}</div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{v.firstName} {v.lastName}</p>
            <p className="text-xs text-gray-400">{v.employeeId}</p>
          </div>
        </div>
      ) : '-'
    },
    {
      header: 'Total Hours', key: 'totalHours',
      render: (v) => (
        <span className="flex items-center gap-1.5 font-bold text-indigo-600">
          <FiClock className="w-4 h-4" />{v}h
        </span>
      )
    },
    { header: 'Entries', key: 'entries', render: v => <span className="font-mono text-sm">{v}</span> },
    {
      header: 'Avg per Entry', key: null,
      render: (_, row) => <span className="text-sm text-gray-500">{(row.totalHours / row.entries).toFixed(1)}h</span>
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Work Log Reports</h1>
          <p className="text-gray-500 text-sm">Approved hours summary</p>
        </div>
        <div className="flex items-center gap-2">
          <FiBarChart2 className="text-indigo-500 w-5 h-5" />
          <span className="font-bold text-indigo-600 text-lg">{totalHours}h total</span>
        </div>
      </div>

      <div className="card p-4 flex flex-wrap gap-3">
        <select value={filters.employee} onChange={e => setFilters({ ...filters, employee: e.target.value })} className="input-field w-48">
          <option value="">All Employees</option>
          {employees.map(e => <option key={e._id} value={e._id}>{e.firstName} {e.lastName}</option>)}
        </select>
        <select value={filters.project} onChange={e => setFilters({ ...filters, project: e.target.value })} className="input-field w-48">
          <option value="">All Projects</option>
          {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>
        <input type="date" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} className="input-field w-40" placeholder="From" />
        <input type="date" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} className="input-field w-40" placeholder="To" />
      </div>

      {report.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-indigo-600">{totalHours}h</p>
            <p className="text-xs text-gray-500 mt-1">Total Approved Hours</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{report.length}</p>
            <p className="text-xs text-gray-500 mt-1">Active Employees</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{report.reduce((s, r) => s + r.entries, 0)}</p>
            <p className="text-xs text-gray-500 mt-1">Total Entries</p>
          </div>
        </div>
      )}

      <DataTable columns={columns} data={report} loading={loading}
        emptyMessage="No approved worklog data for the selected filters" emptyIcon="📊" />
    </div>
  );
};

export default WorklogReports;
