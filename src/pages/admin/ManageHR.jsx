import React, { useState, useEffect } from 'react';
import { hrAPI, employeeAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { FiPlus, FiSearch, FiUserCheck, FiTrash2, FiKey, FiClock } from 'react-icons/fi';
import { getInitials } from '../../utils/helpers';
import toast from 'react-hot-toast';

const ManageHR = () => {
  const [hrUsers, setHrUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [employees, setEmployees] = useState([]);
  const [empSearch, setEmpSearch] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Reset password state
  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const fetchHR = async () => {
    setLoading(true);
    try {
      const res = await hrAPI.getAll();
      setHrUsers(res.data?.data || []);
    } catch {
      toast.error('Failed to load HR staff');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await employeeAPI.getAll({ limit: 200 });
      setEmployees(res.data?.data || res.data?.employees || []);
    } catch (err) {
      console.error('fetchEmployees error:', err?.response?.data || err.message);
    }
  };

  useEffect(() => { fetchHR(); fetchEmployees(); }, []);

  const handleToggleStatus = async (id, isActive) => {
    try {
      const res = await hrAPI.toggleStatus(id);
      toast.success(`HR staff ${res.data.isActive ? 'activated' : 'deactivated'}`);
      setHrUsers(prev => prev.map(u => u._id === id ? { ...u, isActive: res.data.isActive } : u));
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleAddHR = async (e) => {
    e.preventDefault();
    if (!selectedEmployee) return toast.error('Please select an employee');
    setSaving(true);
    try {
      const res = await hrAPI.add({ employeeId: selectedEmployee });
      toast.success(res.data?.message || 'HR staff added successfully');
      setShowAddModal(false);
      setSelectedEmployee('');
      setEmpSearch('');
      fetchHR();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add HR staff');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await hrAPI.delete(deleteTarget._id);
      toast.success(`${deleteTarget.name} removed`);
      setHrUsers(prev => prev.filter(u => u._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete HR staff');
    } finally {
      setDeleting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) return toast.error('Password must be at least 6 characters');
    setResetting(true);
    try {
      await hrAPI.resetPassword(resetTarget._id, newPassword);
      toast.success('Password reset successfully');
      setResetTarget(null);
      setNewPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setResetting(false);
    }
  };

  const filtered = hrUsers.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Manage HR</h1>
          <p className="text-gray-500 text-sm">Manage HR staff accounts and permissions</p>
        </div>
        <button onClick={() => { setShowAddModal(true); setSelectedEmployee(''); setEmpSearch(''); }} className="btn-primary flex items-center gap-2">
          <FiPlus className="w-4 h-4" /> Add HR Staff
        </button>
      </div>

      {/* Info banner */}
      <div className="card p-5 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-purple-100">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <FiUserCheck className="w-5 h-5 text-purple-700" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">HR Module Access</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">HR staff can manage employees, attendance, leaves, payroll, and notices. As Super Admin you can add, deactivate, reset passwords, or remove HR accounts.</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
          <div className="relative w-72">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="input-field pl-9" placeholder="Search HR staff..." />
          </div>
          <span className="ml-auto text-sm text-gray-500">{filtered.length} staff</span>
        </div>

        {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            <FiUserCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No HR Staff Found</p>
            <p className="text-sm mt-1">Click "Add HR Staff" to create an HR account.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {['HR Staff', 'Email', 'Last Login', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.map(row => (
                  <tr key={row._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {row.avatar
                            ? <img src={row.avatar} alt="" className="w-full h-full object-cover" />
                            : <span className="text-purple-700 text-sm font-semibold">{getInitials(row.name)}</span>}
                        </div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">{row.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{row.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <FiClock size={12} className="flex-shrink-0" />
                        {fmtDate(row.lastLogin)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${row.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {row.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => handleToggleStatus(row._id, row.isActive)}
                          className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                            row.isActive ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-green-600 bg-green-50 hover:bg-green-100'
                          }`}>
                          {row.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button onClick={() => { setResetTarget(row); setNewPassword(''); }}
                          title="Reset Password"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                          <FiKey size={14} />
                        </button>
                        <button onClick={() => setDeleteTarget(row)}
                          title="Delete HR Account"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add HR Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add HR Staff</h2>
            <form onSubmit={handleAddHR} className="space-y-4">
              <div>
                <label className="label">Select Employee</label>
                <input
                  value={empSearch}
                  onChange={e => { setEmpSearch(e.target.value); setSelectedEmployee(''); }}
                  className="input-field w-full mb-2"
                  placeholder="Search by name or employee ID..."
                />
                <div className="border border-gray-200 dark:border-gray-600 rounded-lg max-h-48 overflow-y-auto">
                  {employees
                    .filter(emp => {
                      const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
                      const q = empSearch.toLowerCase();
                      return !q || fullName.includes(q) || emp.employeeId?.toLowerCase().includes(q);
                    })
                    .map(emp => (
                      <button
                        key={emp._id}
                        type="button"
                        onClick={() => { setSelectedEmployee(emp._id); setEmpSearch(`${emp.firstName} ${emp.lastName} (${emp.employeeId})`); }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors flex items-center justify-between ${selectedEmployee === emp._id ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
                      >
                        <span>{emp.firstName} {emp.lastName}</span>
                        <span className="text-xs text-gray-400">{emp.employeeId}</span>
                      </button>
                    ))}
                  {employees.filter(emp => {
                    const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
                    const q = empSearch.toLowerCase();
                    return !q || fullName.includes(q) || emp.employeeId?.toLowerCase().includes(q);
                  }).length === 0 && (
                    <p className="px-3 py-4 text-sm text-gray-400 text-center">No employees found</p>
                  )}
                </div>
                {selectedEmployee && (
                  <p className="text-xs text-gray-500 mt-1">
                    Email: <span className="font-medium">{employees.find(e => e._id === selectedEmployee)?.email}</span>
                    &nbsp;· Their existing password remains unchanged.
                  </p>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 btn-primary">{saving ? 'Adding...' : 'Add HR Staff'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiTrash2 className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white text-center mb-2">Delete HR Account</h2>
            <p className="text-sm text-gray-500 text-center mb-6">
              Are you sure you want to permanently delete <strong>{deleteTarget.name}</strong>? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 btn-secondary">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 btn-danger">
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Reset Password</h2>
            <p className="text-sm text-gray-500 mb-4">Set a new password for <strong>{resetTarget.name}</strong></p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="label">New Password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  className="input-field w-full" placeholder="Min 6 characters" autoFocus />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setResetTarget(null)} className="flex-1 btn-secondary">Cancel</button>
                <button type="submit" disabled={resetting} className="flex-1 btn-primary">{resetting ? 'Resetting...' : 'Reset Password'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageHR;
