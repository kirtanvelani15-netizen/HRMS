import React, { useState, useEffect } from 'react';
import { FiCheck, FiDownload, FiRefreshCw, FiPlay } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { payrollAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

const Salary = () => {
  const { user } = useAuth();
  const [payrolls, setPayrolls] = useState([]);
  const [filters, setFilters] = useState({ month: '', year: new Date().getFullYear(), status: '' });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [generatingMonth, setGeneratingMonth] = useState(false);
  const [approvingMonth, setApprovingMonth] = useState(false);
  const [ytdData, setYtdData] = useState(null);
  const [ytdLoading, setYtdLoading] = useState(false);

  useEffect(() => {
    fetchPayrolls();
    fetchYTD();
  }, [filters, page]);

  const fetchPayrolls = async () => {
    setLoading(true);
    try {
      const res = await payrollAPI.getAll({ ...filters, page, limit: 10 });
      setPayrolls(res.data?.data || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      toast.error('Failed to load payroll');
    } finally {
      setLoading(false);
    }
  };

  const fetchYTD = async () => {
    setYtdLoading(true);
    try {
      const res = await payrollAPI.getYTD();
      setYtdData(res.data?.data);
    } catch (err) {
      console.error('YTD fetch failed:', err);
    } finally {
      setYtdLoading(false);
    }
  };

  const handleGenerateMonth = async () => {
    if (!filters.month || !filters.year) {
      return toast.error('Select month and year');
    }
    setGeneratingMonth(true);
    try {
      const res = await payrollAPI.generateMonth({
        month: Number(filters.month),
        year: Number(filters.year)
      });
      const results = res.data?.data || [];
      const generated = results.filter(r => r.status === 'generated').length;
      const skipped = results.filter(r => r.status === 'skipped-locked').length;
      const failed = results.filter(r => r.status === 'failed').length;

      let msg = `Generated: ${generated}`;
      if (skipped) msg += `, Skipped (locked): ${skipped}`;
      if (failed) msg += `, Failed: ${failed}`;

      toast.success(msg);
      await fetchPayrolls();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Generation failed');
    } finally {
      setGeneratingMonth(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await payrollAPI.approve(id);
      toast.success('Payroll approved');
      await fetchPayrolls();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve');
    }
  };

  const handleMarkPaid = async (ids) => {
    try {
      await payrollAPI.bulkUpdateStatus(ids, 'paid');
      toast.success('Marked as paid');
      await fetchPayrolls();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleDownloadPayslip = async (id) => {
    try {
      await payrollAPI.downloadPayslip(id, `Payslip_${Date.now()}.pdf`);
      toast.success('Payslip downloaded');
    } catch (err) {
      toast.error('Failed to download payslip');
    }
  };

  const handleApproveMonth = async () => {
    if (!filters.month || !filters.year) {
      return toast.error('Select month and year');
    }
    setApprovingMonth(true);
    try {
      const res = await payrollAPI.approveMonth({
        month: Number(filters.month),
        year: Number(filters.year)
      });
      const results = res.data?.data || [];
      const approved = results.filter(r => r.success).length;
      toast.success(`Approved ${approved} payroll records`);
      await fetchPayrolls();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve');
    } finally {
      setApprovingMonth(false);
    }
  };

  const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

  const pendingApprovalCount = payrolls.filter(p => p.status === 'pending_approval').length;

  return (
    <div className="space-y-6 p-6">
      {/* Header & Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Monthly Salary</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Generate, approve, and manage employee payroll</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleGenerateMonth}
            disabled={generatingMonth || !filters.month}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-60 transition-colors"
          >
            {generatingMonth ? <FiRefreshCw className="w-4 h-4 animate-spin" /> : <FiPlay className="w-4 h-4" />}
            {generatingMonth ? 'Generating...' : 'Generate Month'}
          </button>
          {pendingApprovalCount > 0 && (
            <button
              onClick={handleApproveMonth}
              disabled={approvingMonth || !filters.month}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-60 transition-colors"
            >
              {approvingMonth ? <FiRefreshCw className="w-4 h-4 animate-spin" /> : <FiCheck className="w-4 h-4" />}
              {approvingMonth ? 'Approving...' : `Approve All (${pendingApprovalCount})`}
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Month</label>
            <select
              value={filters.month}
              onChange={(e) => {
                setFilters({ ...filters, month: e.target.value });
                setPage(1);
              }}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
            >
              <option value="">All Months</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                <option key={m} value={m}>
                  {new Date(0, m - 1).toLocaleDateString('en', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Year</label>
            <input
              type="number"
              value={filters.year}
              onChange={(e) => {
                setFilters({ ...filters, year: Number(e.target.value) });
                setPage(1);
              }}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => {
                setFilters({ ...filters, status: e.target.value });
                setPage(1);
              }}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
            >
              <option value="">All Statuses</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payroll Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Employee</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Month</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">Gross</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">Deductions</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">Net</th>
                <th className="px-4 py-3 text-center font-medium text-gray-700 dark:text-gray-300">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-gray-500">
                    <FiRefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading payroll records...
                  </td>
                </tr>
              ) : payrolls.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-gray-500">
                    No payroll records found
                  </td>
                </tr>
              ) : (
                payrolls.map(p => (
                  <tr key={p._id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {p.employee?.firstName} {p.employee?.lastName}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {new Date(0, p.month - 1).toLocaleDateString('en', { month: 'short' })} {p.year}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                      {fmt(p.grossSalary)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                      {fmt(p.totalDeductions)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                      {fmt(p.netSalary)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {p.status === 'pending_approval' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
                          Pending
                        </span>
                      )}
                      {p.status === 'approved' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                          Approved
                        </span>
                      )}
                      {p.status === 'paid' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                          Paid
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 items-center flex-wrap">
                        {p.status === 'pending_approval' && (
                          <button
                            onClick={() => handleApprove(p._id)}
                            className="text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                          >
                            Approve
                          </button>
                        )}
                        {p.status === 'approved' && (
                          <>
                            <button
                              onClick={() => handleMarkPaid([p._id])}
                              className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                            >
                              Mark Paid
                            </button>
                            <button
                              onClick={() => handleDownloadPayslip(p._id)}
                              className="text-xs px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors flex items-center gap-1"
                            >
                              <FiDownload className="w-3 h-3" /> Slip
                            </button>
                          </>
                        )}
                        {p.status === 'paid' && (
                          <button
                            onClick={() => handleDownloadPayslip(p._id)}
                            className="text-xs px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors flex items-center gap-1"
                          >
                            <FiDownload className="w-3 h-3" /> Slip
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 10 && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, total)} of {total} records
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-60"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                {page}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * 10 >= total}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-60"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* YTD Summary */}
      {ytdLoading ? (
        <div className="text-center py-8">
          <FiRefreshCw className="w-5 h-5 animate-spin mx-auto text-gray-400" />
        </div>
      ) : ytdData ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Year-to-Date ({ytdData.fiscalYear})
          </h2>

          {/* Summary Boxes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Total Gross</p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {fmt(ytdData.totals?.grossSalary || 0)}
              </p>
            </div>
            <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Total Deductions</p>
              <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                {fmt(ytdData.totals?.totalDeductions || 0)}
              </p>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Total Net</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                {fmt(ytdData.totals?.netSalary || 0)}
              </p>
            </div>
          </div>

          {/* Month Breakdown Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Month</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-700 dark:text-gray-300">Gross</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-700 dark:text-gray-300">Deductions</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-700 dark:text-gray-300">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {ytdData.months?.map(m => (
                  <tr key={`${m.month}-${m.year}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-2 text-gray-900 dark:text-white font-medium">
                      {m.monthName} {m.year}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-600 dark:text-gray-400">
                      {fmt(m.grossSalary)}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-600 dark:text-gray-400">
                      {fmt(m.totalDeductions)}
                    </td>
                    <td className="px-4 py-2 text-right font-semibold text-gray-900 dark:text-white">
                      {fmt(m.netSalary)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Salary;
