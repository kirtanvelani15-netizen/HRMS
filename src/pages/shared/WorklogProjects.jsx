import { useState, useEffect } from 'react';
import { worklogAPI, employeeAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { FiPlus, FiEdit2, FiTrash2, FiBriefcase, FiUsers } from 'react-icons/fi';
import { getInitials } from '../../utils/helpers';
import toast from 'react-hot-toast';

const WorklogProjects = () => {
  const { user } = useAuth();
  const canManage = user?.role !== 'employee';
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', assignedEmployees: [] });
  const [saving, setSaving] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await worklogAPI.getProjects();
      if (res.data.success) setProjects(res.data.data);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    fetch();
    if (canManage) {
      employeeAPI.getAll({ limit: 200 }).then(r => { if (r.data.success) setEmployees(r.data.data); });
    }
  }, [canManage]);

  const openAdd = () => { setEditProject(null); setForm({ name: '', description: '', assignedEmployees: [] }); setShowModal(true); };
  const openEdit = (p) => {
    setEditProject(p);
    setForm({ name: p.name, description: p.description || '', assignedEmployees: p.assignedEmployees?.map(e => e._id) || [] });
    setShowModal(true);
  };

  const toggleEmployee = (id) => {
    setForm(f => ({
      ...f,
      assignedEmployees: f.assignedEmployees.includes(id)
        ? f.assignedEmployees.filter(e => e !== id)
        : [...f.assignedEmployees, id]
    }));
  };

  const handleSave = async () => {
    if (!form.name) return toast.error('Project name is required');
    setSaving(true);
    try {
      if (editProject) {
        await worklogAPI.updateProject(editProject._id, form);
        toast.success('Project updated');
      } else {
        await worklogAPI.createProject(form);
        toast.success('Project created');
      }
      fetch(); setShowModal(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this project?')) return;
    try { await worklogAPI.deleteProject(id); toast.success('Deleted'); fetch(); }
    catch (err) { toast.error(err.response?.data?.message || 'Cannot delete'); }
  };

  const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-red-500', 'bg-indigo-500'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="text-gray-500 text-sm">{projects.length} active projects</p>
        </div>
        {canManage && (
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <FiPlus className="w-4 h-4" /> New Project
          </button>
        )}
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project, i) => (
            <div key={project._id} className="card p-5 hover:shadow-card-hover transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${colors[i % colors.length]} rounded-xl flex items-center justify-center shrink-0`}>
                    <FiBriefcase className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{project.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">by {project.createdBy?.name || 'System'}</p>
                  </div>
                </div>
                {canManage && (
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(project)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"><FiEdit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(project._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"><FiTrash2 className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
              {project.description && <p className="text-sm text-gray-500 mt-3 line-clamp-2">{project.description}</p>}
              <div className="mt-4">
                <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 mb-2">
                  <FiUsers className="w-4 h-4" />
                  <span className="text-xs font-medium">{project.assignedEmployees?.length || 0} members</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {project.assignedEmployees?.slice(0, 5).map(e => (
                    <div key={e._id} title={`${e.firstName} ${e.lastName}`} className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700">
                      {getInitials(`${e.firstName} ${e.lastName}`)}
                    </div>
                  ))}
                  {project.assignedEmployees?.length > 5 && (
                    <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-500">+{project.assignedEmployees.length - 5}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {projects.length === 0 && (
            <div className="col-span-3 text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">📁</p>
              <p className="text-sm">No projects yet</p>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)}
        title={editProject ? 'Edit Project' : 'New Project'} size="md"
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Project Name *</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="e.g. Website Redesign" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-field" rows={2} placeholder="Brief description..." />
          </div>
          <div>
            <label className="label">Assign Employees</label>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-48 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
              {employees.map(e => (
                <label key={e._id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
                  <input type="checkbox" checked={form.assignedEmployees.includes(e._id)} onChange={() => toggleEmployee(e._id)} className="w-4 h-4 text-indigo-600" />
                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700 shrink-0">{getInitials(`${e.firstName} ${e.lastName}`)}</div>
                  <span className="text-sm text-gray-800 dark:text-gray-200">{e.firstName} {e.lastName}</span>
                  <span className="text-xs text-gray-400 ml-auto">{e.department?.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default WorklogProjects;
