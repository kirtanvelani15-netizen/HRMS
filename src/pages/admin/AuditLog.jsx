import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { auditAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { getInitials } from '../../utils/helpers';
import { FiActivity, FiSearch, FiFilter, FiRefreshCw, FiUser, FiClock } from 'react-icons/fi';

const ACTION_LABELS = {
  CREATE_EMPLOYEE:      { label: 'Employee Created',      color: 'bg-emerald-100 text-emerald-700' },
  TERMINATE_EMPLOYEE:   { label: 'Employee Terminated',   color: 'bg-red-100 text-red-700' },
  REGISTER_HR:          { label: 'HR Registered',         color: 'bg-indigo-100 text-indigo-700' },
  DELETE_HR:            { label: 'HR Deleted',            color: 'bg-red-100 text-red-700' },
  RESET_HR_PASSWORD:    { label: 'Password Reset',        color: 'bg-amber-100 text-amber-700' },
  APPROVE_LEAVE:        { label: 'Leave Approved',        color: 'bg-emerald-100 text-emerald-700' },
  REJECT_LEAVE:         { label: 'Leave Rejected',        color: 'bg-red-100 text-red-700' },
  MARK_SALARY_PAID:     { label: 'Salary Paid',           color: 'bg-blue-100 text-blue-700' },
  VERIFY_DOCUMENT:      { label: 'Document Verified',     color: 'bg-purple-100 text-purple-700' },
  ASSIGN_ASSET:         { label: 'Asset Assigned',        color: 'bg-teal-100 text-teal-700' },
  RETURN_ASSET:         { label: 'Asset Returned',        color: 'bg-gray-100 text-gray-700' },
  UPDATE_SYSTEM_CONFIG: { label: 'System Config Updated', color: 'bg-orange-100 text-orange-700' },
};

const ENTITY_FILTERS = ['', 'Employee', 'HR', 'Leave', 'Salary', 'Document', 'Asset', 'SystemConfig'];

const AuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const LIMIT = 20;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (entityFilter) params.entity = entityFilter;
      const res = await auditAPI.getAll(params);
      if (res.data.success) {
        setLogs(res.data.data);
        setTotal(res.data.total);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [page, entityFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filtered = search
    ? logs.filter(l =>
        l.details?.toLowerCase().includes(search.toLowerCase()) ||
        l.performedBy?.name?.toLowerCase().includes(search.toLowerCase()) ||
        l.action?.toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  const totalPages = Math.ceil(total / LIMIT);

  const fmtDate = (d) => new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }} className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <FiActivity className="text-indigo-600 w-6 h-6" /> Audit Log
          </h1>
          <p className="text-gray-500 text-sm mt-1">Track all system actions performed by admins and HR staff</p>
        </div>
        <button onClick={fetchLogs}
          className="btn-secondary flex items-center gap-2 text-sm">
          <FiRefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="input-field pl-9 w-full" placeholder="Search by action, user, or details..." />
        </div>
        <div className="flex items-center gap-2">
          <FiFilter className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <select value={entityFilter} onChange={e => { setEntityFilter(e.target.value); setPage(1); }}
            className="input-field pr-8">
            <option value="">All Entities</option>
            {ENTITY_FILTERS.filter(Boolean).map(e => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>
        <span className="text-sm text-gray-500 ml-auto">{total} total entries</span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <FiActivity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No audit entries found</p>
            <p className="text-sm mt-1">Actions will appear here as they occur</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  {['Time', 'Action', 'Entity', 'Details', 'Performed By'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.map((log, i) => {
                  const badge = ACTION_LABELS[log.action] || { label: log.action, color: 'bg-gray-100 text-gray-600' };
                  return (
                    <motion.tr key={log._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <FiClock size={11} className="flex-shrink-0" />
                          {fmtDate(log.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                          {log.entity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate">
                        {log.details || '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {log.performedBy ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                              {log.performedBy.avatar
                                ? <img src={log.performedBy.avatar} alt="" className="w-full h-full object-cover rounded-full" />
                                : <span className="text-indigo-700 text-xs font-semibold">{getInitials(log.performedBy.name)}</span>}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white leading-tight">{log.performedBy.name}</p>
                              <p className="text-xs text-gray-400 capitalize">{log.performedBy.role}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-gray-400">
                            <FiUser size={12} /> System
                          </div>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="btn-secondary text-xs px-3 py-1 disabled:opacity-40">Previous</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="btn-secondary text-xs px-3 py-1 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AuditLog;
