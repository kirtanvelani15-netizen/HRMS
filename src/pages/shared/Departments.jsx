import React, { useState, useEffect } from 'react';
import { departmentAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { FiPlus, FiEdit2, FiTrash2, FiBriefcase, FiUsers, FiDollarSign } from 'react-icons/fi';
import { formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';

const Departments = () => {
  const { user } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editDept, setEditDept] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', description: '', location: '', budget: '' });
  const [saving, setSaving] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await departmentAPI.getAll();
      if (res.data.success) setDepartments(res.data.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const openAdd = () => { setEditDept(null); setForm({ name: '', code: '', description: '', location: '', budget: '' }); setShowModal(true); };
  const openEdit = (d) => { setEditDept(d); setForm({ name: d.name, code: d.code, description: d.description || '', location: d.location || '', budget: d.budget || '' }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.name || !form.code) return toast.error('Name and code are required');
    setSaving(true);
    try {
      if (editDept) {
        const res = await departmentAPI.update(editDept._id, form);
        if (res.data.success) { toast.success('Department updated!'); fetch(); setShowModal(false); }
      } else {
        const res = await departmentAPI.create(form);
        if (res.data.success) { toast.success('Department created!'); fetch(); setShowModal(false); }
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete department "${name}"?`)) return;
    try {
      await departmentAPI.delete(id);
      toast.success('Department deleted');
      fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Cannot delete'); }
  };

  const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-red-500', 'bg-indigo-500'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-gray-500 text-sm">{departments.length} {departments.length === 1 ? 'Department' : 'Departments'}</p>
        </div>
        {user.role === 'admin' && (
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
            <button onClick={openAdd} className="btn-primary flex items-center gap-2 flex-1 sm:flex-none justify-center">
              <FiPlus className="w-4 h-4" /> Add Department
            </button>
          </div>
        )}
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept, i) => (
            <div key={dept._id} className="card p-5 hover:shadow-card-hover transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${colors[i % colors.length]} rounded-xl flex items-center justify-center`}>
                    <FiBriefcase className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{dept.name}</h3>
                    <span className="text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">{dept.code}</span>
                  </div>
                </div>
                {user.role === 'admin' && (
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(dept)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"><FiEdit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(dept._id, dept.name)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"><FiTrash2 className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
              {dept.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 line-clamp-2">{dept.description}</p>}
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                  <FiUsers className="w-4 h-4" />
                  <span className="text-sm font-medium">{dept.employeeCount || 0} {(dept.employeeCount || 0) === 1 ? 'Employee' : 'Employees'}</span>
                </div>
                {dept.location && <span className="text-xs text-gray-400">📍 {dept.location}</span>}
              </div>
              {dept.budget > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <FiDollarSign size={11} /> Budget Utilization
                    </span>
                    <span className={`text-xs font-semibold ${
                      (dept.salarySpent / dept.budget) * 100 >= 100 ? 'text-red-600' :
                      (dept.salarySpent / dept.budget) * 100 >= 80 ? 'text-amber-600' : 'text-emerald-600'
                    }`}>
                      {Math.min(Math.round((dept.salarySpent / dept.budget) * 100), 100)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${
                      (dept.salarySpent / dept.budget) * 100 >= 100 ? 'bg-red-500' :
                      (dept.salarySpent / dept.budget) * 100 >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`} style={{ width: `${Math.min((dept.salarySpent / dept.budget) * 100, 100)}%` }} />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-400">Spent: {formatCurrency(dept.salarySpent)}</span>
                    <span className="text-xs text-gray-400">Budget: {formatCurrency(dept.budget)}</span>
                  </div>
                </div>
              )}
              {dept.isActive ? (
                <span className="mt-2 inline-block badge bg-emerald-100 text-emerald-700">Active</span>
              ) : (
                <span className="mt-2 inline-block badge bg-red-100 text-red-700">Inactive</span>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)}
        title={editDept ? 'Edit Department' : 'Add Department'} size="md"
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
          </>
        }
      >
        <div className="space-y-4">
          {[{ field: 'name', label: 'Department Name', req: true }, { field: 'code', label: 'Code (e.g. ENG)', req: true }, { field: 'description', label: 'Description' }, { field: 'location', label: 'Location' }].map(({ field, label, req }) => (
            <div key={field}>
              <label className="label">{label}{req && <span className="text-red-500 ml-0.5">*</span>}</label>
              <input type="text" value={form[field] || ''} onChange={e => setForm({ ...form, [field]: e.target.value })} className="input-field" placeholder={label} />
            </div>
          ))}
          <div>
            <label className="label">Annual Budget (₹)</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. 50,00,000"
              value={form.budget ? Number(form.budget).toLocaleString('en-IN') : ''}
              onChange={e => {
                const raw = e.target.value.replace(/,/g, '');
                if (raw === '' || /^\d+$/.test(raw)) setForm({ ...form, budget: raw });
              }}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Departments;
