import { useState, useEffect } from 'react';
import { worklogAPI, employeeAPI, departmentAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { FiPlus, FiTrash2, FiEdit2, FiClock, FiFilter } from 'react-icons/fi';
import { formatDate } from '../../utils/helpers';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = [
  { value: 'done', label: 'Done', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'wip', label: 'WIP', color: 'bg-blue-100 text-blue-700' },
  { value: 'pending', label: 'Pending', color: 'bg-amber-100 text-amber-700' }
];

const TASK_TYPES = ['Development', 'Testing', 'Documentation', 'Design', 'Deployment', 'Support', 'Meeting', 'Other'];

const emptyForm = {
  clientName: '',
  productName: '',
  projectTitle: '',
  workType: '',
  companyName: '',
  taskType: '',
  leadName: '',
  status: 'pending',
  date: new Date().toISOString().slice(0, 10),
  hours: '',
  description: '',
  attachFile: null,
  attachPhoto: null
};

const WorkLog = () => {
  const { user } = useAuth();
  const isHR = user?.role === 'hr';
  const isTeamLeader = user?.role === 'employee' && user?.isTeamLeader;

  const [entries, setEntries] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({ status: '', date: '', page: 1 });
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, total: 0 });

  useEffect(() => {
    fetchInitialData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchEntries();
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchInitialData = async () => {
    try {
      const [projectRes, deptRes] = await Promise.all([
        worklogAPI.getProjects(),
        departmentAPI.getAll()
      ]);

      if (projectRes.data.success) setProjects(projectRes.data.data);
      if (deptRes.data.success) setDepartments(deptRes.data.data);

      // Mock client data - in real scenario, fetch from API
      setClients([
        { id: 1, name: 'Acme Corp' },
        { id: 2, name: 'Tech Solutions' },
        { id: 3, name: 'Digital Innovations' },
        { id: 4, name: 'Cloud Services Inc' }
      ]);
    } catch (err) {
      console.error('Error fetching initial data:', err);
    }
  };

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const res = await worklogAPI.getEntries(filters);
      if (res.data.success) {
        setEntries(res.data.data || []);
        setPagination({
          currentPage: res.data.currentPage || 1,
          totalPages: res.data.totalPages || 1,
          total: res.data.total || 0
        });
      }
    } catch (err) {
      console.error('Error fetching entries:', err);
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditEntry(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (entry) => {
    setEditEntry(entry);
    setForm({
      clientName: entry.clientName || '',
      productName: entry.productName || '',
      projectTitle: entry.projectTitle || '',
      workType: entry.workType || '',
      companyName: entry.companyName || '',
      taskType: entry.taskType || '',
      leadName: entry.leadName || '',
      status: entry.status || 'pending',
      date: entry.date || new Date().toISOString().slice(0, 10),
      hours: entry.hours || '',
      description: entry.description || '',
      attachFile: null,
      attachPhoto: null
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    // Validation
    const requiredFields = ['clientName', 'productName', 'projectTitle', 'companyName', 'taskType'];
    const emptyFields = requiredFields.filter(field => !form[field]);

    if (emptyFields.length > 0) {
      return toast.error(`Required fields: ${emptyFields.join(', ')}`);
    }

    if (form.hours && (form.hours < 0.5 || form.hours > 24)) {
      return toast.error('Hours must be between 0.5 and 24');
    }

    setSaving(true);
    try {
      const formData = new FormData();
      Object.keys(form).forEach(key => {
        if (key !== 'attachFile' && key !== 'attachPhoto') {
          formData.append(key, form[key]);
        }
      });

      if (form.attachFile) formData.append('attachFile', form.attachFile);
      if (form.attachPhoto) formData.append('attachPhoto', form.attachPhoto);

      if (editEntry) {
        await worklogAPI.updateEntry(editEntry._id, formData);
        toast.success('Worklog updated');
      } else {
        await worklogAPI.createEntry(formData);
        toast.success('Worklog created');
      }

      fetchEntries();
      setShowModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save worklog');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this worklog entry?')) return;

    try {
      await worklogAPI.deleteEntry(id);
      toast.success('Entry deleted');
      fetchEntries();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot delete entry');
    }
  };

  const columns = [
    { header: 'Date', key: 'date', render: v => formatDate(v) },
    { header: 'Client', key: 'clientName', render: v => <span className="font-medium">{v || '-'}</span> },
    { header: 'Project', key: 'projectTitle', render: v => <span>{v || '-'}</span> },
    { header: 'Task Type', key: 'taskType', render: v => <span className="text-sm text-gray-600">{v || '-'}</span> },
    {
      header: 'Status',
      key: 'status',
      render: v => {
        const option = STATUS_OPTIONS.find(s => s.value === v);
        return option ? <span className={`badge ${option.color}`}>{option.label}</span> : '-';
      }
    },
    {
      header: 'Hours',
      key: 'hours',
      render: v => v ? <span className="flex items-center gap-1"><FiClock className="w-3 h-3" />{v}h</span> : '-'
    },
    {
      header: 'Actions',
      key: '_id',
      render: (id, row) => (
        <div className="flex gap-1">
          <button onClick={() => openEdit(row)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600" title="Edit">
            <FiEdit2 className="w-4 h-4" />
          </button>
          <button onClick={() => handleDelete(id)} className="p-1.5 rounded hover:bg-red-50 text-red-600" title="Delete">
            <FiTrash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="page-title">Work Log</h1>
          <p className="text-gray-500 text-sm">{pagination.total} total entries</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
          <button onClick={openAdd} className="btn-primary flex items-center justify-center gap-2 flex-1 sm:flex-none">
            <FiPlus className="w-4 h-4" /> New Entry
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <FiFilter className="w-4 h-4 text-gray-500" />
        </div>
        <select
          value={filters.status}
          onChange={e => setFilters({ ...filters, status: e.target.value, page: 1 })}
          className="input-field w-40"
        >
          <option value="">All Status</option>
          {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <input
          type="date"
          value={filters.date}
          onChange={e => setFilters({ ...filters, date: e.target.value, page: 1 })}
          className="input-field w-40"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-xs text-gray-500">Total Entries</p>
          <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500">Completed</p>
          <p className="text-2xl font-bold text-emerald-600">{entries.filter(e => e.status === 'done').length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500">In Progress</p>
          <p className="text-2xl font-bold text-blue-600">{entries.filter(e => e.status === 'wip').length}</p>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSpinner />
      ) : entries.length > 0 ? (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                {columns.map((col, i) => (
                  <th key={i} className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {entries.map((entry, idx) => (
                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  {columns.map((col, i) => (
                    <td key={i} className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      {col.render(entry[col.key], entry)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-gray-500">No worklog entries yet</p>
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editEntry ? 'Edit Work Log' : 'New Work Log'}
        size="lg"
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSubmit} disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </>
        }
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Employee Section */}
          <div className="border-b pb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Employee Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Client Name *</label>
                <select
                  value={form.clientName}
                  onChange={e => setForm({ ...form, clientName: e.target.value })}
                  className="input-field"
                >
                  <option value="">Search Client</option>
                  {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Product Name *</label>
                <select
                  value={form.productName}
                  onChange={e => setForm({ ...form, productName: e.target.value })}
                  className="input-field"
                >
                  <option value="">---Select Product---</option>
                  <option value="Web App">Web App</option>
                  <option value="Mobile App">Mobile App</option>
                  <option value="Desktop App">Desktop App</option>
                  <option value="API">API</option>
                </select>
              </div>
              <div>
                <label className="label">Work Type</label>
                <select
                  value={form.workType}
                  onChange={e => setForm({ ...form, workType: e.target.value })}
                  className="input-field"
                >
                  <option value="">---Select Work---</option>
                  <option value="Development">Development</option>
                  <option value="Testing">Testing</option>
                  <option value="Design">Design</option>
                </select>
              </div>
              <div>
                <label className="label">Company Name *</label>
                <select
                  value={form.companyName}
                  onChange={e => setForm({ ...form, companyName: e.target.value })}
                  className="input-field"
                >
                  <option value="">-Select Company-</option>
                  {departments.map(d => <option key={d._id} value={d.name}>{d.name}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-3">
              <label className="label">Attach File</label>
              <input
                type="file"
                onChange={e => setForm({ ...form, attachFile: e.target.files[0] })}
                className="input-field"
              />
              {form.attachFile && <p className="text-xs text-gray-500 mt-1">{form.attachFile.name}</p>}
            </div>
          </div>

          {/* Team Lead Section */}
          <div className="border-b pb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Team Lead / HR Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Lead Name</label>
                <input
                  type="text"
                  value={form.leadName}
                  onChange={e => setForm({ ...form, leadName: e.target.value })}
                  className="input-field"
                  placeholder="Team lead name"
                />
              </div>
              <div>
                <label className="label">Project Title *</label>
                <select
                  value={form.projectTitle}
                  onChange={e => setForm({ ...form, projectTitle: e.target.value })}
                  className="input-field"
                >
                  <option value="">---Select Project---</option>
                  {projects.map(p => <option key={p._id} value={p.name}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Task Type *</label>
                <select
                  value={form.taskType}
                  onChange={e => setForm({ ...form, taskType: e.target.value })}
                  className="input-field"
                >
                  <option value="">-Select Task Type-</option>
                  {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-3">
              <label className="label">Attach Photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={e => setForm({ ...form, attachPhoto: e.target.files[0] })}
                className="input-field"
              />
              {form.attachPhoto && <p className="text-xs text-gray-500 mt-1">{form.attachPhoto.name}</p>}
            </div>
          </div>

          {/* Work Details */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Work Details</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Hours</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  value={form.hours}
                  onChange={e => setForm({ ...form, hours: e.target.value })}
                  className="input-field"
                  placeholder="e.g. 3.5"
                />
              </div>
              <div>
                <label className="label">Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value })}
                  className="input-field"
                >
                  {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-3">
              <label className="label">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="input-field"
                rows={3}
                placeholder="What did you work on?"
                maxLength={1000}
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default WorkLog;
