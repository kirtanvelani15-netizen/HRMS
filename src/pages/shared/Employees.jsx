import React, { useState, useEffect, useCallback } from 'react';
import { employeeAPI, departmentAPI, reportAPI, hrAPI, worklogAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiUsers, FiStar, FiDownload, FiGrid, FiList, FiMail, FiPhone, FiBriefcase, FiLayers } from 'react-icons/fi';
import { formatDate, formatCurrency, getStatusColor, getInitials, downloadBlob } from '../../utils/helpers';
import toast from 'react-hot-toast';

const EMPTY_FORM = {
  firstName: '', lastName: '', email: '', phone: '', department: '', designation: '',
  joiningDate: '', salary: '', gender: '', dateOfBirth: '', employmentType: 'full-time',
  password: '', skills: '', status: 'active', isTeamLeader: false,
  reportingManager: '',      // used when NOT a team leader (points to another TL employee)
  reportingManagerUser: '',  // used when IS a team leader (points to HR/Admin user)
  pfApplicable: true,        // PF deduction applicable
  uanNumber: '',             // UAN for PF
  tdsApplicable: false       // TDS deduction applicable
};

const EmployeeFormField = ({ field, label, type = 'text', options, required, value, onChange }) => (
  <div>
    <label className="label">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
    {options ? (
      <select value={value || ''} onChange={e => onChange(field, e.target.value)} className="input-field">
        <option value="">Select {label}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    ) : (
      <input type={type} value={value || ''} onChange={e => onChange(field, e.target.value)} className="input-field" placeholder={label} />
    )}
  </div>
);

const Employees = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [teamLeaders, setTeamLeaders] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({ search: '', department: '', status: '', employmentType: '', page: 1, limit: 10 });
  const [showModal, setShowModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [activeTab, setActiveTab] = useState('manage');

  // ── Projects state ──────────────────────────────────────────────────────────
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [projectForm, setProjectForm] = useState({ name: '', description: '', assignedEmployees: [] });
  const [projectSaving, setProjectSaving] = useState(false);

  const fetchProjects = async () => {
    setProjectsLoading(true);
    try {
      const res = await worklogAPI.getProjects();
      if (res.data.success) setProjects(res.data.data);
    } finally { setProjectsLoading(false); }
  };

  useEffect(() => { if (activeTab === 'projects') fetchProjects(); }, [activeTab]);

  const openAddProject = () => { setEditProject(null); setProjectForm({ name: '', description: '', assignedEmployees: [] }); setShowProjectModal(true); };
  const openEditProject = (p) => {
    setEditProject(p);
    setProjectForm({ name: p.name, description: p.description || '', assignedEmployees: p.assignedEmployees?.map(e => e._id) || [] });
    setShowProjectModal(true);
  };
  const toggleProjectEmployee = (id) => {
    setProjectForm(f => ({
      ...f,
      assignedEmployees: f.assignedEmployees.includes(id) ? f.assignedEmployees.filter(e => e !== id) : [...f.assignedEmployees, id]
    }));
  };
  const handleProjectSave = async () => {
    if (!projectForm.name) return toast.error('Project name is required');
    setProjectSaving(true);
    try {
      if (editProject) { await worklogAPI.updateProject(editProject._id, projectForm); toast.success('Project updated'); }
      else { await worklogAPI.createProject(projectForm); toast.success('Project created'); }
      fetchProjects(); setShowProjectModal(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setProjectSaving(false); }
  };
  const handleProjectDelete = async (id) => {
    if (!window.confirm('Delete this project?')) return;
    try { await worklogAPI.deleteProject(id); toast.success('Deleted'); fetchProjects(); }
    catch (err) { toast.error(err.response?.data?.message || 'Cannot delete'); }
  };
  const projectColors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-red-500', 'bg-indigo-500'];
  // ────────────────────────────────────────────────────────────────────────────

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, hrRes] = await Promise.all([
        employeeAPI.getAll(filters),
        user.role === 'admin' ? hrAPI.getAll() : Promise.resolve(null)
      ]);
      if (empRes.data.success) {
        let list = empRes.data.data;
        // Merge HR-only users (created via Manage HR, no Employee record) into the list
        if (hrRes?.data?.success) {
          const empUserIds = new Set(list.map(e => e.user?._id || e.user).filter(Boolean).map(String));
          const hrOnly = hrRes.data.data
            .filter(hr => !empUserIds.has(String(hr._id)))
            .map(hr => ({
              _id: hr._id,
              firstName: hr.name?.split(' ')[0] || hr.name,
              lastName: hr.name?.split(' ').slice(1).join(' ') || '',
              email: hr.email,
              avatar: hr.avatar,
              status: hr.isActive ? 'active' : 'inactive',
              user: { _id: hr._id, role: 'hr' },
              _isHROnly: true
            }));
          list = [...list, ...hrOnly];
        }
        setEmployees(list);
        setPagination({ currentPage: empRes.data.currentPage, totalPages: empRes.data.totalPages, total: empRes.data.total + (list.length - empRes.data.data.length) });
      }
    } finally { setLoading(false); }
  }, [filters, user.role]);

  const fetchTeamLeaders = useCallback(async () => {
    try {
      const res = await employeeAPI.getTeamLeaders();
      if (res.data.success) setTeamLeaders(res.data.data);
    } catch (_) {}
  }, []);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);
  useEffect(() => {
    departmentAPI.getAll().then(r => { if (r.data.success) setDepartments(r.data.data); });
    fetchTeamLeaders();
    employeeAPI.getManagers().then(r => { if (r.data.success) setManagers(r.data.data); }).catch(() => {});
  }, [fetchTeamLeaders]);

  const openAdd = () => { setEditEmployee(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = (emp) => {
    setEditEmployee(emp);
    setForm({
      firstName: emp.firstName, lastName: emp.lastName, email: emp.email,
      phone: emp.phone, department: emp.department?._id || '', designation: emp.designation,
      joiningDate: emp.joiningDate ? emp.joiningDate.slice(0, 10) : '',
      salary: emp.salary, gender: emp.gender,
      dateOfBirth: emp.dateOfBirth ? emp.dateOfBirth.slice(0, 10) : '',
      employmentType: emp.employmentType, status: emp.status,
      skills: emp.skills?.join(', ') || '',
      isTeamLeader: emp.isTeamLeader || false,
      reportingManager: emp.reportingManager?._id || emp.reportingManager || '',
      reportingManagerUser: emp.reportingManagerUser?._id || emp.reportingManagerUser || '',
      pfApplicable: emp.pfApplicable ?? true,
      uanNumber: emp.uanNumber || '',
      tdsApplicable: emp.tdsApplicable || false
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.firstName || !form.lastName || !form.email || !form.department || !form.designation) {
      return toast.error('Please fill in all required fields');
    }
    if (form.pfApplicable && !form.uanNumber) {
      return toast.error('UAN Number is required when PF is enabled');
    }
    if (form.uanNumber && form.uanNumber.length !== 12) {
      return toast.error('UAN Number must be exactly 12 digits');
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        skills: form.skills,
        isTeamLeader: form.isTeamLeader,
        // Team leaders report to HR/Admin (User), regular employees report to a TL (Employee)
        reportingManager: form.isTeamLeader ? null : (form.reportingManager || null),
        reportingManagerUser: form.isTeamLeader ? (form.reportingManagerUser || null) : null
      };
      console.log('[DEBUG] handleSave payload - pfApplicable:', payload.pfApplicable, 'uanNumber:', payload.uanNumber, 'tdsApplicable:', payload.tdsApplicable);
      if (editEmployee) {
        const res = await employeeAPI.update(editEmployee._id, payload);
        if (res.data.success) {
          toast.success('Employee updated!');
          fetchEmployees();
          fetchTeamLeaders();
          setShowModal(false);
        }
      } else {
        const res = await employeeAPI.create(payload);
        if (res.data.success) {
          toast.success('Employee created!');
          fetchEmployees();
          fetchTeamLeaders();
          setShowModal(false);
        }
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (emp) => {
    if (!window.confirm(`Terminate ${emp.firstName} ${emp.lastName}?`)) return;
    try {
      await employeeAPI.delete(emp._id);
      toast.success('Employee terminated');
      fetchEmployees();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to delete'); }
  };

  const handleFormChange = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await reportAPI.exportExcel({ type: 'employees' });
      downloadBlob(res.data, 'employees-report.xlsx');
      toast.success('Employee list exported');
    } catch (_) { toast.error('Export failed'); }
    finally { setExporting(false); }
  };

  // For regular employees: TL employees (exclude self)
  const availableTLManagers = teamLeaders.filter(tl => !editEmployee || tl._id !== editEmployee._id);
  // For team leaders: HR/Admin users
  const availableHRAdminManagers = managers;

  const columns = [
    {
      header: 'Employee', key: 'firstName',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden flex-shrink-0">
            {row.avatar
              ? <img src={row.avatar} alt="" className="w-full h-full object-cover" />
              : <span className="text-primary-700 text-sm font-semibold">{getInitials(`${row.firstName} ${row.lastName}`)}</span>}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-medium text-gray-900 dark:text-white">{row.firstName} {row.lastName}</p>
              {row._isHROnly && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">HR</span>
              )}
              {!row._isHROnly && row.isTeamLeader && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                  <FiStar className="w-2.5 h-2.5" /> TL
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">{row._isHROnly ? 'HR Staff' : row.employeeId}</p>
          </div>
        </div>
      )
    },
    { header: 'Designation', key: 'designation' },
    { header: 'Department', key: 'department', render: (val) => val?.name || '-' },
    {
      header: 'Reporting To', key: 'reportingManager',
      render: (val, row) => {
        if (val) return (
          <div>
            <span className="text-sm text-gray-700 dark:text-gray-300">{val.firstName} {val.lastName}</span>
            <span className="ml-1 text-xs text-amber-600">(TL)</span>
          </div>
        );
        if (row.reportingManagerUser) return (
          <div>
            <span className="text-sm text-gray-700 dark:text-gray-300">{row.reportingManagerUser.name}</span>
            <span className="ml-1 text-xs text-blue-600 uppercase">({row.reportingManagerUser.role})</span>
          </div>
        );
        return <span className="text-xs text-gray-400">—</span>;
      }
    },
    { header: 'Email', key: 'email' },
    { header: 'CTC', key: 'salary', render: (val) => formatCurrency(val) },
    { header: 'Joining', key: 'joiningDate', render: (val) => formatDate(val) },
    { header: 'Status', key: 'status', render: (val) => <span className={`badge ${getStatusColor(val)}`}>{val}</span> },
    {
      header: 'Actions', key: '_id',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          {row._isHROnly ? (
            <span className="text-xs text-gray-400 italic">Manage HR</span>
          ) : (
            <>
              <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="Edit"><FiEdit2 className="w-4 h-4" /></button>
              {user.role === 'admin' && (
                <button onClick={() => handleDelete(row)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="Terminate"><FiTrash2 className="w-4 h-4" /></button>
              )}
            </>
          )}
        </div>
      )
    }
  ];

  // ── Directory filtered list ──────────────────────────────────────────────
  const [dirSearch, setDirSearch] = useState('');
  const [dirDept, setDirDept] = useState('');
  const dirFiltered = employees.filter(e => {
    const name = `${e.firstName} ${e.lastName}`.toLowerCase();
    const matchSearch = !dirSearch || name.includes(dirSearch.toLowerCase()) || e.designation?.toLowerCase().includes(dirSearch.toLowerCase()) || e.email?.toLowerCase().includes(dirSearch.toLowerCase());
    const matchDept = !dirDept || e.department?._id === dirDept || e.department === dirDept;
    return matchSearch && matchDept;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-gray-500 text-sm">{pagination.total} {pagination.total === 1 ? 'Employee' : 'Employees'}</p>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
          {activeTab === 'manage' && (
            <>
              <button onClick={handleExport} disabled={exporting} className="btn-secondary flex items-center gap-2 justify-center sm:flex-none">
                {exporting ? <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" /> : <FiDownload className="w-4 h-4" />}
                Export
              </button>
              <button onClick={openAdd} className="btn-primary flex items-center gap-2 justify-center sm:flex-none">
                <FiPlus className="w-4 h-4" /> Add Employee
              </button>
            </>
          )}
          {activeTab === 'projects' && (
            <button onClick={openAddProject} className="btn-primary flex items-center gap-2 flex-1 sm:flex-none justify-center">
              <FiPlus className="w-4 h-4" /> New Project
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {[
          { key: 'manage',    label: 'Manage',    icon: FiList },
          { key: 'directory', label: 'Directory', icon: FiGrid },
          { key: 'projects',  label: 'Projects',  icon: FiLayers },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === key
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* Directory tab */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          <div className="card p-4 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={dirSearch} onChange={e => setDirSearch(e.target.value)}
                placeholder="Search by name, designation, email…" className="input-field pl-9" />
            </div>
            <select value={dirDept} onChange={e => setDirDept(e.target.value)} className="input-field w-44">
              <option value="">All Departments</option>
              {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </div>
          {dirFiltered.length === 0 ? (
            <div className="card p-12 text-center text-gray-400">No employees found</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {dirFiltered.map(emp => (
                <div key={emp._id} className="card p-5 flex flex-col items-center text-center hover:shadow-card-hover transition-shadow">
                  <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden ring-2 ring-primary-100 mb-3">
                    {emp.avatar
                      ? <img src={emp.avatar} alt="" className="w-full h-full object-cover" />
                      : <span className="text-primary-700 font-bold text-lg">{getInitials(`${emp.firstName} ${emp.lastName}`)}</span>
                    }
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{emp.firstName} {emp.lastName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{emp.designation || '—'}</p>
                  {emp.department?.name && (
                    <span className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-xs text-gray-600 dark:text-gray-300">
                      <FiBriefcase className="w-3 h-3" /> {emp.department.name}
                    </span>
                  )}
                  <div className="mt-3 w-full space-y-1.5 text-xs text-gray-500">
                    {emp.email && (
                      <div className="flex items-center gap-2 justify-center truncate">
                        <FiMail className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                        <span className="truncate">{emp.email}</span>
                      </div>
                    )}
                    {emp.phone && (
                      <div className="flex items-center gap-2 justify-center">
                        <FiPhone className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                        <span>{emp.phone}</span>
                      </div>
                    )}
                  </div>
                  {emp.isTeamLeader && (
                    <span className="mt-3 badge bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs">Team Leader</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Projects tab */}
      {activeTab === 'projects' && (
        <div className="space-y-4">
          {projectsLoading ? (
            <div className="card p-12 text-center text-gray-400">Loading...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project, i) => (
                <div key={project._id} className="card p-5 hover:shadow-card-hover transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${projectColors[i % projectColors.length]} rounded-xl flex items-center justify-center shrink-0`}>
                        <FiBriefcase className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{project.name}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">by {project.createdBy?.name || 'System'}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEditProject(project)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"><FiEdit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleProjectDelete(project._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"><FiTrash2 className="w-4 h-4" /></button>
                    </div>
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
          <Modal isOpen={showProjectModal} onClose={() => setShowProjectModal(false)}
            title={editProject ? 'Edit Project' : 'New Project'} size="md"
            footer={
              <>
                <button onClick={() => setShowProjectModal(false)} className="btn-secondary">Cancel</button>
                <button onClick={handleProjectSave} disabled={projectSaving} className="btn-primary">{projectSaving ? 'Saving...' : 'Save'}</button>
              </>
            }
          >
            <div className="space-y-4">
              <div>
                <label className="label">Project Name *</label>
                <input value={projectForm.name} onChange={e => setProjectForm({ ...projectForm, name: e.target.value })} className="input-field" placeholder="e.g. Website Redesign" />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea value={projectForm.description} onChange={e => setProjectForm({ ...projectForm, description: e.target.value })} className="input-field" rows={2} placeholder="Brief description..." />
              </div>
              <div>
                <label className="label">Assign Employees</label>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-48 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                  {employees.map(e => (
                    <label key={e._id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
                      <input type="checkbox" checked={projectForm.assignedEmployees.includes(e._id)} onChange={() => toggleProjectEmployee(e._id)} className="w-4 h-4 text-indigo-600" />
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
      )}

      {activeTab === 'manage' && <>

      {/* Team Leaders summary strip */}
      {teamLeaders.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <FiStar className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Team Leaders ({teamLeaders.length})</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {teamLeaders.map(tl => (
              <div key={tl._id} className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                <div className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center text-xs font-bold text-amber-800">
                  {getInitials(`${tl.firstName} ${tl.lastName}`)}
                </div>
                <div>
                  <p className="text-xs font-medium text-amber-900">{tl.firstName} {tl.lastName}</p>
                  <p className="text-xs text-amber-600">{tl.designation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value, page: 1 })}
            className="input-field pl-9" placeholder="Search name, email, ID..." />
        </div>
        <select value={filters.department} onChange={e => setFilters({ ...filters, department: e.target.value, page: 1 })} className="input-field w-44">
          <option value="">All Departments</option>
          {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
        </select>
        <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value, page: 1 })} className="input-field w-36">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="terminated">Terminated</option>
        </select>
        <select value={filters.employmentType} onChange={e => setFilters({ ...filters, employmentType: e.target.value, page: 1 })} className="input-field w-36">
          <option value="">All Types</option>
          <option value="full-time">Full Time</option>
          <option value="part-time">Part Time</option>
          <option value="contract">Contract</option>
          <option value="intern">Intern</option>
        </select>
        {(filters.search || filters.department || filters.status || filters.employmentType) && (
          <button onClick={() => setFilters({ search: '', department: '', status: '', employmentType: '', page: 1, limit: 10 })} className="btn-secondary text-sm">Clear</button>
        )}
      </div>

      <DataTable columns={columns} data={employees} loading={loading}
        pagination={{ ...pagination }} onPageChange={page => setFilters(f => ({ ...f, page }))}
        emptyMessage="No employees found" emptyIcon="👥" />

      {/* Employee Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}
        title={editEmployee ? 'Edit Employee' : 'Add New Employee'} size="xl"
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : editEmployee ? 'Update Employee' : 'Create Employee'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <EmployeeFormField field="firstName" label="First Name" required value={form.firstName} onChange={handleFormChange} />
          <EmployeeFormField field="lastName" label="Last Name" required value={form.lastName} onChange={handleFormChange} />
          <EmployeeFormField field="email" label="Email" type="email" required value={form.email} onChange={handleFormChange} />
          <EmployeeFormField field="phone" label="Phone" value={form.phone} onChange={handleFormChange} />
          <EmployeeFormField field="department" label="Department" required value={form.department} onChange={handleFormChange}
            options={departments.map(d => ({ value: d._id, label: d.name }))} />
          <EmployeeFormField field="designation" label="Designation" required value={form.designation} onChange={handleFormChange} />
          <EmployeeFormField field="joiningDate" label="Joining Date" type="date" value={form.joiningDate} onChange={handleFormChange} />
          <div>
            <label className="label">Annual CTC (₹)</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. 5,00,000"
              value={form.salary ? Number(form.salary).toLocaleString('en-IN') : ''}
              onChange={e => {
                const raw = e.target.value.replace(/,/g, '');
                if (raw === '' || /^\d+$/.test(raw)) handleFormChange('salary', raw);
              }}
            />
          </div>

          {/* PF Configuration */}
          <div className="sm:col-span-2">
            <div className="flex items-center gap-3 p-3 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700">
              <input
                type="checkbox"
                id="pf-applicable"
                checked={form.pfApplicable || false}
                onChange={(e) => {
                  handleFormChange('pfApplicable', e.target.checked);
                  if (!e.target.checked) handleFormChange('uanNumber', '');
                }}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="pf-applicable" className="text-sm font-medium text-blue-900 dark:text-blue-300">
                PF Applicable (Fixed ₹1,800 if Basic ≥ ₹15,000 or 12% of Basic if Basic &lt; ₹15,000)
              </label>
            </div>
            {form.pfApplicable && (
              <div className="mt-2">
                <label className="label">UAN Number (required)</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g., 100012345678"
                  maxLength="12"
                  value={form.uanNumber || ''}
                  onChange={e => handleFormChange('uanNumber', e.target.value.toUpperCase())}
                />
                <p className="text-xs text-gray-400 mt-1">Universal Account Number (12 digits)</p>
              </div>
            )}
          </div>

          {/* TDS Configuration */}
          <div className="sm:col-span-2">
            <div className="flex items-center gap-3 p-3 rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-700">
              <input
                type="checkbox"
                id="tds-applicable"
                checked={form.tdsApplicable || false}
                onChange={(e) => handleFormChange('tdsApplicable', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
              />
              <label htmlFor="tds-applicable" className="text-sm font-medium text-orange-900 dark:text-orange-300">
                TDS Applicable (calculated automatically based on annual income)
              </label>
            </div>
          </div>

          <EmployeeFormField field="gender" label="Gender" value={form.gender} onChange={handleFormChange}
            options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }]} />
          <EmployeeFormField field="dateOfBirth" label="Date of Birth" type="date" value={form.dateOfBirth} onChange={handleFormChange} />
          <EmployeeFormField field="employmentType" label="Employment Type" value={form.employmentType} onChange={handleFormChange}
            options={[{ value: 'full-time', label: 'Full Time' }, { value: 'part-time', label: 'Part Time' }, { value: 'contract', label: 'Contract' }, { value: 'intern', label: 'Intern' }]} />
          <EmployeeFormField field="status" label="Status" value={form.status} onChange={handleFormChange}
            options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />

          {!editEmployee && <EmployeeFormField field="password" label="Password" type="password" value={form.password} onChange={handleFormChange} />}

          {/* Team Leader toggle */}
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700">
              <div className="flex items-center gap-2">
                <FiStar className="w-4 h-4 text-amber-600" />
                <div>
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-300">Team Leader</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {form.isTeamLeader
                      ? 'HR & Admin will be notified of this promotion. This employee reports to HR/Admin.'
                      : 'This employee leads a team and receives leave notifications from their members'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !form.isTeamLeader;
                  setForm(prev => ({
                    ...prev,
                    isTeamLeader: next,
                    // clear the opposite manager field when switching
                    reportingManager: next ? '' : prev.reportingManager,
                    reportingManagerUser: next ? prev.reportingManagerUser : ''
                  }));
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${form.isTeamLeader ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.isTeamLeader ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>

          {/* Reporting Manager — context-aware based on isTeamLeader */}
          <div className="sm:col-span-2">
            {form.isTeamLeader ? (
              <>
                <label className="label">Reporting Manager <span className="text-gray-400 font-normal">(HR / Admin)</span></label>
                <select
                  value={form.reportingManagerUser || ''}
                  onChange={e => handleFormChange('reportingManagerUser', e.target.value)}
                  className="input-field"
                >
                  <option value="">Select HR / Admin</option>
                  {availableHRAdminManagers.map(m => (
                    <option key={m._id} value={m._id}>
                      {m.name} — {m.role.toUpperCase()} ({m.email})
                    </option>
                  ))}
                </select>
                {availableHRAdminManagers.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">No HR or Admin users found.</p>
                )}
                <p className="text-xs text-amber-600 mt-1">HR and Admin will receive a notification about this Team Leader assignment.</p>
              </>
            ) : (
              <>
                <label className="label">Reporting Manager <span className="text-gray-400 font-normal">(Team Leader)</span></label>
                <select
                  value={form.reportingManager || ''}
                  onChange={e => handleFormChange('reportingManager', e.target.value)}
                  className="input-field"
                >
                  <option value="">No Reporting Manager</option>
                  {availableTLManagers.map(tl => (
                    <option key={tl._id} value={tl._id}>
                      {tl.firstName} {tl.lastName} — {tl.designation} {tl.department?.name ? `(${tl.department.name})` : ''}
                    </option>
                  ))}
                </select>
                {availableTLManagers.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">No team leaders found. Mark an employee as Team Leader first.</p>
                )}
              </>
            )}
          </div>

        </div>
      </Modal>
      </>}
    </div>
  );
};

export default Employees;
