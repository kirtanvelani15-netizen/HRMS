import { useState, useEffect, useCallback } from 'react';
import { recruitmentAPI, employeeAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import DataTable from '../../components/common/DataTable';
import { FiPlus, FiTrash2, FiCheck, FiClock } from 'react-icons/fi';
import { formatDate, getInitials } from '../../utils/helpers';
import toast from 'react-hot-toast';

const Onboarding = () => {
  const { user } = useAuth();
  const isEmployee = user?.role === 'employee';
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ employee: '', title: '', description: '', dueDate: '', assignedTo: 'employee' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEmployee) employeeAPI.getAll({ limit: 200 }).then(r => { if (r.data.success) setEmployees(r.data.data); });
  }, [isEmployee]);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = selectedEmployee ? { employee: selectedEmployee } : {};
      const res = await recruitmentAPI.getOnboardingTasks(params);
      if (res.data.success) setTasks(res.data.data);
    } finally { setLoading(false); }
  }, [selectedEmployee]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleToggleComplete = async (task) => {
    try {
      await recruitmentAPI.updateOnboardingTask(task._id, { completed: !task.completed });
      toast.success(task.completed ? 'Marked incomplete' : 'Marked complete');
      fetchTasks();
    } catch { toast.error('Failed'); }
  };

  const handleCreate = async () => {
    if (!form.title || (!isEmployee && !form.employee)) return toast.error('Fill required fields');
    setSaving(true);
    try {
      await recruitmentAPI.createOnboardingTask(form);
      toast.success('Task created');
      fetchTasks(); setShowModal(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete task?')) return;
    try { await recruitmentAPI.deleteOnboardingTask(id); toast.success('Deleted'); fetchTasks(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const completed = tasks.filter(t => t.completed).length;

  const columns = [
    ...(!isEmployee ? [{
      header: 'Employee', key: 'employee',
      render: v => v ? (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700 shrink-0">{getInitials(`${v.firstName} ${v.lastName}`)}</div>
          <span className="text-sm font-medium text-gray-900 dark:text-white">{v.firstName} {v.lastName}</span>
        </div>
      ) : '-'
    }] : []),
    { header: 'Task', key: 'title', render: (v, row) => <span className={`font-medium ${row.completed ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>{v}</span> },
    { header: 'Assigned To', key: 'assignedTo', render: v => <span className="badge bg-gray-100 text-gray-700 capitalize">{v}</span> },
    { header: 'Due Date', key: 'dueDate', render: v => v ? formatDate(v) : '-' },
    { header: 'Status', key: 'completed', render: v => v ? <span className="badge bg-emerald-100 text-emerald-700 flex items-center gap-1 w-fit"><FiCheck className="w-3 h-3" />Done</span> : <span className="badge bg-amber-100 text-amber-700 flex items-center gap-1 w-fit"><FiClock className="w-3 h-3" />Pending</span> },
    {
      header: 'Actions', key: '_id',
      render: (id, row) => (
        <div className="flex gap-1">
          <button onClick={() => handleToggleComplete(row)} className={`p-1.5 rounded ${row.completed ? 'hover:bg-amber-50 text-amber-600' : 'hover:bg-emerald-50 text-emerald-600'}`} title={row.completed ? 'Mark incomplete' : 'Mark complete'}><FiCheck className="w-4 h-4" /></button>
          {!isEmployee && <button onClick={() => handleDelete(id)} className="p-1.5 rounded hover:bg-red-50 text-red-600"><FiTrash2 className="w-4 h-4" /></button>}
        </div>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="page-title">Onboarding Tasks</h1>
          <p className="text-gray-500 text-sm">{completed}/{tasks.length} tasks completed</p>
        </div>
        {!isEmployee && (
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
            <button onClick={() => { setForm({ employee: '', title: '', description: '', dueDate: '', assignedTo: 'employee' }); setShowModal(true); }} className="btn-primary flex items-center justify-center gap-2 flex-1 sm:flex-none">
              <FiPlus className="w-4 h-4" /> Add Task
            </button>
          </div>
        )}
      </div>

      {tasks.length > 0 && (
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${(completed / tasks.length) * 100}%` }} />
        </div>
      )}

      {!isEmployee && (
        <div className="card p-4">
          <select value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)} className="input-field w-56">
            <option value="">All Employees</option>
            {employees.map(e => <option key={e._id} value={e._id}>{e.firstName} {e.lastName}</option>)}
          </select>
        </div>
      )}

      <DataTable columns={columns} data={tasks} loading={loading} emptyMessage="No onboarding tasks found" emptyIcon="✅" />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Onboarding Task" size="sm"
        footer={<><button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button><button onClick={handleCreate} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Add'}</button></>}>
        <div className="space-y-4">
          <div><label className="label">Employee *</label>
            <select value={form.employee} onChange={e => setForm({ ...form, employee: e.target.value })} className="input-field">
              <option value="">Select Employee</option>{employees.map(e => <option key={e._id} value={e._id}>{e.firstName} {e.lastName}</option>)}
            </select>
          </div>
          <div><label className="label">Task Title *</label><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input-field" placeholder="e.g. Complete IT setup form" /></div>
          <div><label className="label">Description</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-field" rows={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Due Date</label><input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} className="input-field" /></div>
            <div><label className="label">Assigned To</label>
              <select value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value })} className="input-field">
                <option value="employee">Employee</option><option value="hr">HR</option><option value="admin">Admin</option>
              </select>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Onboarding;
