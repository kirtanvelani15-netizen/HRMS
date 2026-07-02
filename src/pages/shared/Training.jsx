import { useState, useEffect, useCallback } from 'react';
import { trainingAPI, employeeAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import DataTable from '../../components/common/DataTable';
import { FiPlus, FiEdit2, FiTrash2, FiBook } from 'react-icons/fi';
import { formatDate, getInitials } from '../../utils/helpers';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  enrolled: 'bg-blue-100 text-blue-700',
  'in-progress': 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  dropped: 'bg-red-100 text-red-700',
};

const Training = () => {
  const { user } = useAuth();
  const isEmployee = user?.role === 'employee';
  const [tab, setTab] = useState('courses');
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [editCourse, setEditCourse] = useState(null);
  const [courseForm, setCourseForm] = useState({ title: '', description: '', category: '', duration: '', instructor: '', materials: '' });
  const [enrollForm, setEnrollForm] = useState({ course: '', employee: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    trainingAPI.getCourses().then(r => { if (r.data.success) setCourses(r.data.data); });
    if (!isEmployee) employeeAPI.getAll({ limit: 200 }).then(r => { if (r.data.success) setEmployees(r.data.data); });
  }, [isEmployee]);

  const fetchEnrollments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await trainingAPI.getEnrollments();
      if (res.data.success) setEnrollments(res.data.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (tab === 'enrollments') fetchEnrollments(); else setLoading(false); }, [tab, fetchEnrollments]);

  const handleSaveCourse = async () => {
    if (!courseForm.title) return toast.error('Title is required');
    setSaving(true);
    try {
      if (editCourse) { await trainingAPI.updateCourse(editCourse._id, courseForm); toast.success('Course updated'); }
      else { await trainingAPI.createCourse(courseForm); toast.success('Course created'); }
      trainingAPI.getCourses().then(r => { if (r.data.success) setCourses(r.data.data); });
      setShowCourseModal(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleEnroll = async () => {
    if (!enrollForm.course || !enrollForm.employee) return toast.error('Select course and employee');
    setSaving(true);
    try {
      await trainingAPI.createEnrollment(enrollForm);
      toast.success('Enrolled successfully');
      fetchEnrollments(); setShowEnrollModal(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Already enrolled or failed'); }
    finally { setSaving(false); }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await trainingAPI.updateEnrollment(id, { status });
      toast.success('Status updated');
      fetchEnrollments();
    } catch { toast.error('Failed'); }
  };

  const courseColumns = [
    { header: 'Course', key: 'title', render: v => <span className="font-medium text-gray-900 dark:text-white">{v}</span> },
    { header: 'Category', key: 'category', render: v => v ? <span className="badge bg-indigo-100 text-indigo-700">{v}</span> : '-' },
    { header: 'Duration', key: 'duration', render: v => v || '-' },
    { header: 'Instructor', key: 'instructor', render: v => v || '-' },
    { header: 'Created', key: 'createdAt', render: v => formatDate(v) },
    ...(!isEmployee ? [{
      header: 'Actions', key: '_id',
      render: (id, row) => (
        <div className="flex gap-1">
          <button onClick={() => { setEditCourse(row); setCourseForm({ title: row.title, description: row.description || '', category: row.category || '', duration: row.duration || '', instructor: row.instructor || '', materials: row.materials || '' }); setShowCourseModal(true); }} className="p-1.5 rounded hover:bg-blue-50 text-blue-600"><FiEdit2 className="w-4 h-4" /></button>
          <button onClick={async () => { if (!window.confirm('Delete course?')) return; await trainingAPI.deleteCourse(id); toast.success('Deleted'); trainingAPI.getCourses().then(r => { if (r.data.success) setCourses(r.data.data); }); }} className="p-1.5 rounded hover:bg-red-50 text-red-600"><FiTrash2 className="w-4 h-4" /></button>
        </div>
      )
    }] : []),
  ];

  const enrollmentColumns = [
    ...(!isEmployee ? [{
      header: 'Employee', key: 'employee',
      render: v => v ? (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700 shrink-0">{getInitials(`${v.firstName} ${v.lastName}`)}</div>
          <div><p className="text-sm font-medium text-gray-900 dark:text-white">{v.firstName} {v.lastName}</p><p className="text-xs text-gray-500">{v.department?.name}</p></div>
        </div>
      ) : '-'
    }] : []),
    { header: 'Course', key: 'course', render: v => <span className="font-medium text-gray-900 dark:text-white">{v?.title || '-'}</span> },
    { header: 'Category', key: 'course', render: v => v?.category ? <span className="badge bg-indigo-100 text-indigo-700">{v.category}</span> : '-' },
    { header: 'Status', key: 'status', render: v => <span className={`badge capitalize ${STATUS_COLORS[v]}`}>{v?.replace('-', ' ')}</span> },
    { header: 'Score', key: 'score', render: v => v != null ? `${v}%` : '-' },
    { header: 'Completed', key: 'completedAt', render: v => v ? formatDate(v) : '-' },
    {
      header: 'Actions', key: '_id',
      render: (id, row) => (
        <select value={row.status} onChange={e => handleUpdateStatus(id, e.target.value)} className="input-field text-xs py-1 w-32">
          <option value="enrolled">Enrolled</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="dropped">Dropped</option>
        </select>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="page-title">Training & Learning</h1>
          <p className="text-gray-500 text-sm">{tab === 'courses' ? `${courses.length} courses` : `${enrollments.length} enrollments`}</p>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
          {!isEmployee && <button onClick={() => { setEditCourse(null); setCourseForm({ title: '', description: '', category: '', duration: '', instructor: '', materials: '' }); setShowCourseModal(true); }} className="btn-primary flex items-center justify-center gap-2 sm:flex-none"><FiPlus className="w-4 h-4" /> New Course</button>}
          {!isEmployee && <button onClick={() => { setEnrollForm({ course: '', employee: '' }); setShowEnrollModal(true); }} className="btn-secondary flex items-center justify-center gap-2 sm:flex-none"><FiBook className="w-4 h-4" /> Enroll</button>}
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {['courses', 'enrollments'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{t}</button>
        ))}
      </div>

      {tab === 'courses' && <DataTable columns={courseColumns} data={courses} loading={loading} emptyMessage="No courses yet" emptyIcon="📚" />}
      {tab === 'enrollments' && <DataTable columns={enrollmentColumns} data={enrollments} loading={loading} emptyMessage="No enrollments" emptyIcon="🎓" />}

      <Modal isOpen={showCourseModal} onClose={() => setShowCourseModal(false)} title={editCourse ? 'Edit Course' : 'New Course'} size="sm"
        footer={<><button onClick={() => setShowCourseModal(false)} className="btn-secondary">Cancel</button><button onClick={handleSaveCourse} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button></>}>
        <div className="space-y-4">
          <div><label className="label">Course Title *</label><input value={courseForm.title} onChange={e => setCourseForm({ ...courseForm, title: e.target.value })} className="input-field" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Category</label><input value={courseForm.category} onChange={e => setCourseForm({ ...courseForm, category: e.target.value })} className="input-field" placeholder="e.g. Technical" /></div>
            <div><label className="label">Duration</label><input value={courseForm.duration} onChange={e => setCourseForm({ ...courseForm, duration: e.target.value })} className="input-field" placeholder="e.g. 4 hours" /></div>
          </div>
          <div><label className="label">Instructor</label><input value={courseForm.instructor} onChange={e => setCourseForm({ ...courseForm, instructor: e.target.value })} className="input-field" /></div>
          <div><label className="label">Description</label><textarea value={courseForm.description} onChange={e => setCourseForm({ ...courseForm, description: e.target.value })} className="input-field" rows={2} /></div>
          <div><label className="label">Materials / Link</label><input value={courseForm.materials} onChange={e => setCourseForm({ ...courseForm, materials: e.target.value })} className="input-field" placeholder="URL or description" /></div>
        </div>
      </Modal>

      <Modal isOpen={showEnrollModal} onClose={() => setShowEnrollModal(false)} title="Enroll Employee" size="sm"
        footer={<><button onClick={() => setShowEnrollModal(false)} className="btn-secondary">Cancel</button><button onClick={handleEnroll} disabled={saving} className="btn-primary">{saving ? 'Enrolling...' : 'Enroll'}</button></>}>
        <div className="space-y-4">
          <div><label className="label">Employee *</label>
            <select value={enrollForm.employee} onChange={e => setEnrollForm({ ...enrollForm, employee: e.target.value })} className="input-field">
              <option value="">Select Employee</option>{employees.map(e => <option key={e._id} value={e._id}>{e.firstName} {e.lastName}</option>)}
            </select>
          </div>
          <div><label className="label">Course *</label>
            <select value={enrollForm.course} onChange={e => setEnrollForm({ ...enrollForm, course: e.target.value })} className="input-field">
              <option value="">Select Course</option>{courses.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Training;
