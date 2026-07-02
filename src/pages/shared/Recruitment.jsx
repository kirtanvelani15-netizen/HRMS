import { useState, useEffect, useCallback, useRef } from 'react';
import { recruitmentAPI, departmentAPI, employeeAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import DataTable from '../../components/common/DataTable';
import AIScreeningResults from '../../components/recruitment/AIScreeningResults';
import { FiPlus, FiEdit2, FiTrash2, FiUsers, FiChevronRight, FiCheck, FiClock, FiCpu, FiUpload, FiX } from 'react-icons/fi';
import { formatDate, getInitials } from '../../utils/helpers';
import toast from 'react-hot-toast';

const STAGES = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'];
const STAGE_COLORS = {
  applied: 'bg-gray-100 text-gray-700',
  screening: 'bg-blue-100 text-blue-700',
  interview: 'bg-amber-100 text-amber-700',
  offer: 'bg-purple-100 text-purple-700',
  hired: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};
const STATUS_COLORS = { open: 'bg-emerald-100 text-emerald-700', closed: 'bg-red-100 text-red-700', 'on-hold': 'bg-amber-100 text-amber-700' };

const emptyPosting = { title: '', department: '', location: '', experience: '', type: 'full-time', openings: 1, summary: '', responsibilities: '', requiredSkills: '', preferredSkills: '', qualifications: '', experienceRequirements: '' };
const emptyApplicant = { name: '', email: '', phone: '', jobPosting: '', stage: 'applied', notes: '', interviewDate: '' };
const emptyTask = { employee: '', title: '', description: '', dueDate: '', assignedTo: 'employee' };

const TABS = ['postings', 'applicants', 'onboarding', 'ai-screening'];

const Recruitment = () => {
  const { user } = useAuth();
  const isEmployee = user?.role === 'employee';
  const [tab, setTab] = useState(isEmployee ? 'onboarding' : 'postings');

  // Data
  const [postings, setPostings] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedPosting, setSelectedPosting] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');

  // Modals
  const [showPostingModal, setShowPostingModal] = useState(false);
  const [showApplicantModal, setShowApplicantModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editPosting, setEditPosting] = useState(null);
  const [editApplicant, setEditApplicant] = useState(null);

  // Forms
  const [postingForm, setPostingForm] = useState(emptyPosting);
  const [applicantForm, setApplicantForm] = useState(emptyApplicant);
  const [taskForm, setTaskForm] = useState(emptyTask);
  const [saving, setSaving] = useState(false);

  // AI Screening
  const [aiJdMode, setAiJdMode] = useState('posting'); // 'posting' | 'manual'
  const [aiSelectedPosting, setAiSelectedPosting] = useState('');
  const [aiManualJd, setAiManualJd] = useState('');
  const [aiFiles, setAiFiles] = useState([]);
  const [aiScreening, setAiScreening] = useState(false);
  const [aiResults, setAiResults] = useState(null);
  const [aiStats, setAiStats] = useState(null);
  const aiFileInputRef = useRef(null);

  useEffect(() => {
    departmentAPI.getAll().then(r => { if (r.data.success) setDepartments(r.data.data); });
    if (!isEmployee) {
      recruitmentAPI.getPostings().then(r => { if (r.data.success) setPostings(r.data.data); });
      employeeAPI.getAll({ limit: 200 }).then(r => { if (r.data.success) setEmployees(r.data.data); });
    }
  }, [isEmployee]);

  const fetchApplicants = useCallback(async () => {
    setLoading(true);
    try {
      const params = selectedPosting ? { jobPosting: selectedPosting } : {};
      const res = await recruitmentAPI.getApplicants(params);
      if (res.data.success) setApplicants(res.data.data);
    } finally { setLoading(false); }
  }, [selectedPosting]);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = selectedEmployee ? { employee: selectedEmployee } : {};
      const res = await recruitmentAPI.getOnboardingTasks(params);
      if (res.data.success) setTasks(res.data.data);
    } finally { setLoading(false); }
  }, [selectedEmployee]);

  useEffect(() => {
    if (tab === 'postings') setLoading(false);
    else if (tab === 'applicants') fetchApplicants();
    else if (tab === 'onboarding') fetchTasks();
    else if (tab === 'ai-screening') setLoading(false);
  }, [tab, fetchApplicants, fetchTasks]);

  // ── Postings ────────────────────────────────────────────────────────────────
  const handleSavePosting = async () => {
    if (!postingForm.title || !postingForm.department) return toast.error('Title and department are required');
    setSaving(true);
    try {
      if (editPosting) { await recruitmentAPI.updatePosting(editPosting._id, postingForm); toast.success('Posting updated'); }
      else { await recruitmentAPI.createPosting(postingForm); toast.success('Posting created'); }
      recruitmentAPI.getPostings().then(r => { if (r.data.success) setPostings(r.data.data); });
      setShowPostingModal(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDeletePosting = async (id) => {
    if (!window.confirm('Delete posting?')) return;
    await recruitmentAPI.deletePosting(id).catch(() => {});
    toast.success('Deleted');
    recruitmentAPI.getPostings().then(r => { if (r.data.success) setPostings(r.data.data); });
  };

  // ── Applicants ──────────────────────────────────────────────────────────────
  const handleSaveApplicant = async () => {
    if (!applicantForm.name || !applicantForm.email || !applicantForm.jobPosting) return toast.error('Name, email and job required');
    setSaving(true);
    try {
      if (editApplicant) { await recruitmentAPI.updateApplicant(editApplicant._id, applicantForm); toast.success('Updated'); }
      else { await recruitmentAPI.createApplicant(applicantForm); toast.success('Added'); }
      fetchApplicants(); setShowApplicantModal(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  // ── Onboarding Tasks ────────────────────────────────────────────────────────
  const handleSaveTask = async () => {
    if (!taskForm.title || (!isEmployee && !taskForm.employee)) return toast.error('Fill required fields');
    setSaving(true);
    try {
      await recruitmentAPI.createOnboardingTask(taskForm);
      toast.success('Task created');
      fetchTasks(); setShowTaskModal(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleToggleTask = async (task) => {
    try {
      await recruitmentAPI.updateOnboardingTask(task._id, { completed: !task.completed });
      toast.success(task.completed ? 'Marked incomplete' : 'Marked complete');
      fetchTasks();
    } catch { toast.error('Failed'); }
  };

  const handleAiScreen = async () => {
    const jd = aiManualJd;
    if (!jd.trim()) return toast.error('Please provide a job description');
    if (aiFiles.length === 0) return toast.error('Please upload at least one resume');
    setAiScreening(true);
    setAiResults(null);
    try {
      const formData = new FormData();
      formData.append('jobDescription', jd);
      aiFiles.forEach(f => formData.append('resumes', f));
      const res = await recruitmentAPI.screenCandidates(formData);
      if (res.data.success) {
        setAiResults(res.data.data);
        setAiStats({ total: res.data.totalResumes, analyzed: res.data.analyzed, batches: res.data.batches });
        toast.success(`Analyzed ${res.data.analyzed} resumes`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'AI screening failed');
    } finally {
      setAiScreening(false);
    }
  };

  const handleDeleteTask = async (id) => {
    if (!window.confirm('Delete task?')) return;
    await recruitmentAPI.deleteOnboardingTask(id).catch(() => {});
    toast.success('Deleted'); fetchTasks();
  };

  // ── Columns ─────────────────────────────────────────────────────────────────
  const postingColumns = [
    { header: 'Role', key: 'title', render: v => <span className="font-medium text-gray-900 dark:text-white">{v}</span> },
    { header: 'Department', key: 'department', render: v => v?.name || '-' },
    { header: 'Type', key: 'type', render: v => <span className="badge bg-blue-100 text-blue-700 capitalize">{v}</span> },
    { header: 'Openings', key: 'openings', render: v => <span className="font-mono">{v}</span> },
    { header: 'Location', key: 'location', render: v => v || '-' },
    { header: 'Status', key: 'status', render: v => <span className={`badge capitalize ${STATUS_COLORS[v]}`}>{v}</span> },
    { header: 'Posted', key: 'createdAt', render: v => formatDate(v) },
    {
      header: 'Actions', key: '_id',
      render: (id, row) => (
        <div className="flex gap-1">
          <button onClick={() => { setEditPosting(row); setPostingForm({ title: row.title, department: row.department?._id, location: row.location || '', experience: row.experience || '', type: row.type, openings: row.openings, status: row.status, summary: row.summary || '', responsibilities: row.responsibilities || '', requiredSkills: row.requiredSkills || '', preferredSkills: row.preferredSkills || '', qualifications: row.qualifications || '', experienceRequirements: row.experienceRequirements || '' }); setShowPostingModal(true); }} className="p-1.5 rounded hover:bg-blue-50 text-blue-600"><FiEdit2 className="w-4 h-4" /></button>
          <button onClick={() => handleDeletePosting(id)} className="p-1.5 rounded hover:bg-red-50 text-red-600"><FiTrash2 className="w-4 h-4" /></button>
          <button onClick={() => { setSelectedPosting(id); setTab('applicants'); }} className="p-1.5 rounded hover:bg-gray-100 text-gray-600" title="View applicants"><FiChevronRight className="w-4 h-4" /></button>
        </div>
      )
    },
  ];

  const applicantColumns = [
    { header: 'Name', key: 'name', render: v => <span className="font-medium text-gray-900 dark:text-white">{v}</span> },
    { header: 'Email', key: 'email', render: v => <span className="text-sm text-gray-600">{v}</span> },
    { header: 'Phone', key: 'phone', render: v => v || '-' },
    { header: 'Job', key: 'jobPosting', render: v => <span className="text-sm">{v?.title || '-'}</span> },
    { header: 'Stage', key: 'stage', render: v => <span className={`badge capitalize ${STAGE_COLORS[v]}`}>{v}</span> },
    { header: 'Interview', key: 'interviewDate', render: v => v ? formatDate(v) : '-' },
    { header: 'Applied', key: 'createdAt', render: v => formatDate(v) },
    {
      header: 'Actions', key: '_id',
      render: (id, row) => (
        <div className="flex gap-1">
          <button onClick={() => { setEditApplicant(row); setApplicantForm({ name: row.name, email: row.email, phone: row.phone || '', jobPosting: row.jobPosting?._id, stage: row.stage, notes: row.notes || '', interviewDate: row.interviewDate?.slice(0, 10) || '' }); setShowApplicantModal(true); }} className="p-1.5 rounded hover:bg-blue-50 text-blue-600"><FiEdit2 className="w-4 h-4" /></button>
          <button onClick={async () => { if (!window.confirm('Delete?')) return; await recruitmentAPI.deleteApplicant(id); toast.success('Deleted'); fetchApplicants(); }} className="p-1.5 rounded hover:bg-red-50 text-red-600"><FiTrash2 className="w-4 h-4" /></button>
        </div>
      )
    },
  ];

  const completedTasks = tasks.filter(t => t.completed).length;
  const taskColumns = [
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
    {
      header: 'Status', key: 'completed',
      render: v => v
        ? <span className="badge bg-emerald-100 text-emerald-700 flex items-center gap-1 w-fit"><FiCheck className="w-3 h-3" />Done</span>
        : <span className="badge bg-amber-100 text-amber-700 flex items-center gap-1 w-fit"><FiClock className="w-3 h-3" />Pending</span>
    },
    {
      header: 'Actions', key: '_id',
      render: (id, row) => (
        <div className="flex gap-1">
          <button onClick={() => handleToggleTask(row)} className={`p-1.5 rounded ${row.completed ? 'hover:bg-amber-50 text-amber-600' : 'hover:bg-emerald-50 text-emerald-600'}`} title={row.completed ? 'Mark incomplete' : 'Mark complete'}><FiCheck className="w-4 h-4" /></button>
          {!isEmployee && <button onClick={() => handleDeleteTask(id)} className="p-1.5 rounded hover:bg-red-50 text-red-600"><FiTrash2 className="w-4 h-4" /></button>}
        </div>
      )
    },
  ];

  const tabLabels = { postings: 'Job Postings', applicants: 'Applicants', onboarding: 'Onboarding Tasks', 'ai-screening': 'AI Screening' };
  const visibleTabs = isEmployee ? ['onboarding'] : TABS;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="page-title">Recruitment & Onboarding</h1>
          <p className="text-gray-500 text-sm">
            {tab === 'postings' && `${postings.length} job postings`}
            {tab === 'applicants' && `${applicants.length} applicants`}
            {tab === 'onboarding' && `${completedTasks}/${tasks.length} tasks completed`}
            {tab === 'ai-screening' && 'AI-powered resume screening'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
          {tab === 'postings' && !isEmployee && (
            <button onClick={() => { setEditPosting(null); setPostingForm(emptyPosting); setShowPostingModal(true); }} className="btn-primary flex items-center justify-center gap-2 flex-1 sm:flex-none"><FiPlus className="w-4 h-4" /> Post Job</button>
          )}
          {tab === 'applicants' && !isEmployee && (
            <button onClick={() => { setEditApplicant(null); setApplicantForm(emptyApplicant); setShowApplicantModal(true); }} className="btn-primary flex items-center justify-center gap-2 flex-1 sm:flex-none"><FiUsers className="w-4 h-4" /> Add Applicant</button>
          )}
          {tab === 'onboarding' && !isEmployee && (
            <button onClick={() => { setTaskForm(emptyTask); setShowTaskModal(true); }} className="btn-primary flex items-center justify-center gap-2 flex-1 sm:flex-none"><FiPlus className="w-4 h-4" /> Add Task</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {visibleTabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {tabLabels[t]}
          </button>
        ))}
      </div>

      {/* Progress bar for onboarding */}
      {tab === 'onboarding' && tasks.length > 0 && (
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${(completedTasks / tasks.length) * 100}%` }} />
        </div>
      )}

      {/* Filters */}
      {tab === 'applicants' && !isEmployee && (
        <div className="card p-4">
          <select value={selectedPosting} onChange={e => setSelectedPosting(e.target.value)} className="input-field w-56">
            <option value="">All Jobs</option>
            {postings.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
          </select>
        </div>
      )}
      {tab === 'onboarding' && !isEmployee && (
        <div className="card p-4">
          <select value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)} className="input-field w-56">
            <option value="">All Employees</option>
            {employees.map(e => <option key={e._id} value={e._id}>{e.firstName} {e.lastName}</option>)}
          </select>
        </div>
      )}

      {/* Tables */}
      {tab === 'postings' && <DataTable columns={postingColumns} data={postings} loading={loading} emptyMessage="No job postings yet" emptyIcon="💼" />}
      {tab === 'applicants' && <DataTable columns={applicantColumns} data={applicants} loading={loading} emptyMessage="No applicants found" emptyIcon="👤" />}
      {tab === 'onboarding' && <DataTable columns={taskColumns} data={tasks} loading={loading} emptyMessage="No onboarding tasks" emptyIcon="✅" />}

      {/* AI Screening Tab */}
      {tab === 'ai-screening' && (
        <div className="space-y-6">
          <div className="card p-6 space-y-5">
            <div className="flex items-center gap-2 text-indigo-600 font-semibold">
              <FiCpu className="w-5 h-5" /> AI Resume Screener
            </div>

            {/* JD — select from existing postings */}
            <div className="space-y-2">
              <label className="label">Select Job Posting *</label>
              <select
                value={aiSelectedPosting}
                onChange={e => {
                  const id = e.target.value;
                  setAiSelectedPosting(id);
                  if (id) {
                    const p = postings.find(x => x._id === id);
                    if (p) {
                      const jdParts = [
                        `Job Title: ${p.title}`,
                        p.location ? `Location: ${p.location}` : '',
                        p.experience ? `Experience: ${p.experience}` : '',
                        `Employment Type: ${p.type}`,
                        p.summary ? `\nJob Summary:\n${p.summary}` : '',
                        p.responsibilities ? `\nKey Responsibilities:\n${p.responsibilities}` : '',
                        p.requiredSkills ? `\nRequired Skills:\n${p.requiredSkills}` : '',
                        p.preferredSkills ? `\nPreferred Skills:\n${p.preferredSkills}` : '',
                        p.qualifications ? `\nQualifications:\n${p.qualifications}` : '',
                        p.experienceRequirements ? `\nExperience Requirements:\n${p.experienceRequirements}` : '',
                      ].filter(Boolean).join('\n');
                      setAiManualJd(jdParts);
                    }
                  } else {
                    setAiManualJd('');
                  }
                }}
                className="input-field w-full max-w-md"
              >
                <option value="">Choose a posting...</option>
                {postings.map(p => <option key={p._id} value={p._id}>{p.title}{p.department?.name ? ` — ${p.department.name}` : ''}</option>)}
              </select>
              {aiManualJd.trim() && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">JD Preview — exact text sent to AI</p>
                  <pre className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap max-h-32 overflow-y-auto">{aiManualJd}</pre>
                </div>
              )}
            </div>

            {/* Resume Upload */}
            <div>
              <label className="label">Upload Resumes (PDF or DOCX)</label>
              <div
                onClick={() => aiFileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); setAiFiles(prev => [...prev, ...Array.from(e.dataTransfer.files).filter(f => /\.(pdf|doc|docx)$/i.test(f.name))]); }}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-400 transition-colors"
              >
                <FiUpload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Drag & drop resumes here or <span className="text-indigo-600 font-medium">browse files</span></p>
                <p className="text-xs text-gray-400 mt-1">PDF and DOCX supported — any number of files</p>
                <input
                  ref={aiFileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={e => setAiFiles(prev => [...prev, ...Array.from(e.target.files)])}
                />
              </div>

              {aiFiles.length > 0 && (
                <div className="mt-3 space-y-1.5 max-h-48 overflow-y-auto">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{aiFiles.length} file{aiFiles.length > 1 ? 's' : ''} selected</p>
                  {aiFiles.map((f, i) => (
                    <div key={i} className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-800 rounded px-3 py-1.5">
                      <span className="text-gray-700 dark:text-gray-300 truncate">{f.name}</span>
                      <button onClick={() => setAiFiles(prev => prev.filter((_, idx) => idx !== i))} className="ml-2 text-gray-400 hover:text-red-500 shrink-0"><FiX className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                  <button onClick={() => setAiFiles([])} className="text-xs text-red-500 hover:underline">Clear all</button>
                </div>
              )}
            </div>

            <button
              onClick={handleAiScreen}
              disabled={aiScreening || aiFiles.length === 0 || !aiSelectedPosting}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              <FiCpu className="w-4 h-4" />
              {aiScreening ? `Analyzing ${aiFiles.length} resumes...` : `Analyze ${aiFiles.length > 0 ? aiFiles.length + ' ' : ''}Candidates`}
            </button>

            {aiScreening && (
              <div className="flex items-center gap-3 text-sm text-indigo-600">
                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                AI is reading and scoring resumes — this may take 30–60 seconds for large batches...
              </div>
            )}
          </div>

          {aiStats && (
            <div className="flex gap-4 text-sm text-gray-500">
              <span>{aiStats.total} uploaded</span>
              <span>•</span>
              <span>{aiStats.analyzed} analyzed</span>
              <span>•</span>
              <span>{aiStats.batches} batch{aiStats.batches !== 1 ? 'es' : ''} processed</span>
            </div>
          )}

          {aiResults && (
            <AIScreeningResults
              results={aiResults}
              jobPostingId={aiSelectedPosting}
              onApplicantAdded={() => recruitmentAPI.getApplicants().then(r => { if (r.data.success) setApplicants(r.data.data); })}
            />
          )}
        </div>
      )}

      {/* Job Posting Modal */}
      <Modal isOpen={showPostingModal} onClose={() => setShowPostingModal(false)} title={editPosting ? 'Edit Job Posting' : 'New Job Posting'} size="lg"
        footer={<><button onClick={() => setShowPostingModal(false)} className="btn-secondary">Cancel</button><button onClick={handleSavePosting} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button></>}>
        <div className="space-y-4">
          {/* Row 1 */}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Job Title *</label><input value={postingForm.title} onChange={e => setPostingForm({ ...postingForm, title: e.target.value })} className="input-field" placeholder="e.g. HR Executive" /></div>
            <div><label className="label">Location</label><input value={postingForm.location} onChange={e => setPostingForm({ ...postingForm, location: e.target.value })} className="input-field" placeholder="e.g. Ahmedabad / Remote" /></div>
          </div>
          {/* Row 2 */}
          <div className="grid grid-cols-3 gap-3">
            <div><label className="label">Department *</label>
              <select value={postingForm.department} onChange={e => setPostingForm({ ...postingForm, department: e.target.value })} className="input-field">
                <option value="">Select</option>{departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
            </div>
            <div><label className="label">Employment Type</label>
              <select value={postingForm.type} onChange={e => setPostingForm({ ...postingForm, type: e.target.value })} className="input-field">
                {['full-time', 'part-time', 'contract', 'internship'].map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
              </select>
            </div>
            <div><label className="label">Openings</label><input type="number" min={1} value={postingForm.openings} onChange={e => setPostingForm({ ...postingForm, openings: e.target.value })} className="input-field" /></div>
          </div>
          {/* Experience */}
          <div><label className="label">Experience</label><input value={postingForm.experience} onChange={e => setPostingForm({ ...postingForm, experience: e.target.value })} className="input-field" placeholder="e.g. 2-4 years" /></div>
          {/* Job Summary */}
          <div><label className="label">Job Summary</label><textarea value={postingForm.summary} onChange={e => setPostingForm({ ...postingForm, summary: e.target.value })} className="input-field" rows={2} placeholder="Brief overview of the role..." /></div>
          {/* Key Responsibilities */}
          <div><label className="label">Key Responsibilities</label><textarea value={postingForm.responsibilities} onChange={e => setPostingForm({ ...postingForm, responsibilities: e.target.value })} className="input-field" rows={3} placeholder="List the main responsibilities..." /></div>
          {/* Required Skills */}
          <div><label className="label">Required Skills</label><textarea value={postingForm.requiredSkills} onChange={e => setPostingForm({ ...postingForm, requiredSkills: e.target.value })} className="input-field" rows={2} placeholder="e.g. Recruitment, HRMS, Payroll, MS Excel..." /></div>
          {/* Preferred Skills */}
          <div><label className="label">Preferred Skills</label><textarea value={postingForm.preferredSkills} onChange={e => setPostingForm({ ...postingForm, preferredSkills: e.target.value })} className="input-field" rows={2} placeholder="Nice-to-have skills..." /></div>
          {/* Qualifications */}
          <div><label className="label">Qualifications</label><textarea value={postingForm.qualifications} onChange={e => setPostingForm({ ...postingForm, qualifications: e.target.value })} className="input-field" rows={2} placeholder="e.g. MBA in HR, BBA, any graduate..." /></div>
          {/* Experience Requirements */}
          <div><label className="label">Experience Requirements</label><textarea value={postingForm.experienceRequirements} onChange={e => setPostingForm({ ...postingForm, experienceRequirements: e.target.value })} className="input-field" rows={2} placeholder="Detailed experience requirements..." /></div>
          {/* Status (edit only) */}
          {editPosting && <div><label className="label">Status</label>
            <select value={postingForm.status} onChange={e => setPostingForm({ ...postingForm, status: e.target.value })} className="input-field">
              {['open', 'closed', 'on-hold'].map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
            </select>
          </div>}
        </div>
      </Modal>

      {/* Applicant Modal */}
      <Modal isOpen={showApplicantModal} onClose={() => setShowApplicantModal(false)} title={editApplicant ? 'Edit Applicant' : 'Add Applicant'} size="sm"
        footer={<><button onClick={() => setShowApplicantModal(false)} className="btn-secondary">Cancel</button><button onClick={handleSaveApplicant} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button></>}>
        <div className="space-y-4">
          <div><label className="label">Name *</label><input value={applicantForm.name} onChange={e => setApplicantForm({ ...applicantForm, name: e.target.value })} className="input-field" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Email *</label><input type="email" value={applicantForm.email} onChange={e => setApplicantForm({ ...applicantForm, email: e.target.value })} className="input-field" /></div>
            <div><label className="label">Phone</label><input value={applicantForm.phone} onChange={e => setApplicantForm({ ...applicantForm, phone: e.target.value })} className="input-field" /></div>
          </div>
          <div><label className="label">Job Posting *</label>
            <select value={applicantForm.jobPosting} onChange={e => setApplicantForm({ ...applicantForm, jobPosting: e.target.value })} className="input-field">
              <option value="">Select Job</option>{postings.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Stage</label>
              <select value={applicantForm.stage} onChange={e => setApplicantForm({ ...applicantForm, stage: e.target.value })} className="input-field">
                {STAGES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
              </select>
            </div>
            <div><label className="label">Interview Date</label><input type="date" value={applicantForm.interviewDate} onChange={e => setApplicantForm({ ...applicantForm, interviewDate: e.target.value })} className="input-field" /></div>
          </div>
          <div><label className="label">Notes</label><textarea value={applicantForm.notes} onChange={e => setApplicantForm({ ...applicantForm, notes: e.target.value })} className="input-field" rows={2} /></div>
        </div>
      </Modal>

      {/* Onboarding Task Modal */}
      <Modal isOpen={showTaskModal} onClose={() => setShowTaskModal(false)} title="Add Onboarding Task" size="sm"
        footer={<><button onClick={() => setShowTaskModal(false)} className="btn-secondary">Cancel</button><button onClick={handleSaveTask} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Add'}</button></>}>
        <div className="space-y-4">
          <div><label className="label">Employee *</label>
            <select value={taskForm.employee} onChange={e => setTaskForm({ ...taskForm, employee: e.target.value })} className="input-field">
              <option value="">Select Employee</option>{employees.map(e => <option key={e._id} value={e._id}>{e.firstName} {e.lastName}</option>)}
            </select>
          </div>
          <div><label className="label">Task Title *</label><input value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} className="input-field" placeholder="e.g. Complete IT setup form" /></div>
          <div><label className="label">Description</label><textarea value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} className="input-field" rows={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Due Date</label><input type="date" value={taskForm.dueDate} onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })} className="input-field" /></div>
            <div><label className="label">Assigned To</label>
              <select value={taskForm.assignedTo} onChange={e => setTaskForm({ ...taskForm, assignedTo: e.target.value })} className="input-field">
                <option value="employee">Employee</option><option value="hr">HR</option><option value="admin">Admin</option>
              </select>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Recruitment;
