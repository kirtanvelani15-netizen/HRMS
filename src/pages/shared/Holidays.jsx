import { useState, useEffect } from 'react';
import { holidayAPI, weekoffAPI, departmentAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import { FiPlus, FiTrash2, FiEdit2, FiCalendar, FiGift, FiClock, FiSave, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';

const TYPE_COLORS = {
  public: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  optional: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  restricted: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
const daysDiff = (d) => {
  const diff = Math.ceil((new Date(d) - new Date()) / 86400000);
  if (diff === 0) return 'Today!';
  if (diff === 1) return 'Tomorrow';
  if (diff < 0) return null;
  return `in ${diff} days`;
};

const emptyForm = { name: '', date: '', type: 'public', description: '' };

const Holidays = () => {
  const { user } = useAuth();
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const canManage = user?.role === 'admin' || user?.role === 'hr';

  // ── Weekoff state ──────────────────────────────────────────────────────────
  const [weekoff, setWeekoff] = useState({ companyWeekoff: 'both', exceptions: [] });
  const [weekoffSaving, setWeekoffSaving] = useState(false);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    weekoffAPI.get().then(r => { if (r.data.success) setWeekoff(r.data.data); }).catch(() => {});
    departmentAPI.getAll().then(r => { if (r.data.success) setDepartments(r.data.data); }).catch(() => {});
  }, []);

  const addException = () => {
    setWeekoff(w => ({ ...w, exceptions: [...w.exceptions, { department: '', weekoff: 'sunday-only' }] }));
  };

  const removeException = (idx) => {
    setWeekoff(w => ({ ...w, exceptions: w.exceptions.filter((_, i) => i !== idx) }));
  };

  const updateException = (idx, field, value) => {
    setWeekoff(w => ({
      ...w,
      exceptions: w.exceptions.map((e, i) => i === idx ? { ...e, [field]: value } : e)
    }));
  };

  const saveWeekoff = async () => {
    const valid = weekoff.exceptions.every(e => e.department);
    if (!valid) return toast.error('Please select a department for each exception');
    setWeekoffSaving(true);
    try {
      await weekoffAPI.update(weekoff);
      toast.success('Weekoff settings saved');
    } catch { toast.error('Failed to save'); }
    finally { setWeekoffSaving(false); }
  };
  // ──────────────────────────────────────────────────────────────────────────

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await holidayAPI.getAll({ year });
      if (res.data.success) setHolidays(res.data.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [year]);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (h) => { setEditing(h._id); setForm({ name: h.name, date: h.date?.slice(0,10), type: h.type, description: h.description || '' }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.name || !form.date) return toast.error('Name and date are required');
    setSaving(true);
    try {
      if (editing) {
        await holidayAPI.update(editing, form);
        toast.success('Holiday updated');
      } else {
        await holidayAPI.create(form);
        toast.success('Holiday added');
      }
      setShowModal(false);
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this holiday?')) return;
    try { await holidayAPI.delete(id); toast.success('Deleted'); fetch(); }
    catch { toast.error('Failed to delete'); }
  };

  // Group by month
  const grouped = holidays.reduce((acc, h) => {
    const m = new Date(h.date).getMonth();
    if (!acc[m]) acc[m] = [];
    acc[m].push(h);
    return acc;
  }, {});

  const upcoming = holidays.filter(h => new Date(h.date) >= new Date()).slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-gray-500 text-sm">{holidays.length} holidays in {year}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="input-field w-28"
          >
            {[year - 1, year, year + 1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {canManage && (
            <button onClick={openAdd} className="btn-primary flex items-center justify-center gap-2 flex-1 sm:flex-none">
              <FiPlus className="w-4 h-4" /> Add Holiday
            </button>
          )}
        </div>
      </div>

      {/* Weekoff Settings — admin/hr only */}
      {canManage && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <FiClock className="w-5 h-5 text-primary-500" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Weekly Off Settings</h2>
          </div>

          {/* Company-wide rule */}
          <div>
            <label className="label mb-2">Company-wide Week Off</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'both',        label: 'Saturday & Sunday', desc: 'Both days off for everyone' },
                { value: 'sunday-only', label: 'Sunday Only',       desc: 'Only Sunday is a week off' },
              ].map(opt => (
                <button key={opt.value} onClick={() => setWeekoff(w => ({ ...w, companyWeekoff: opt.value }))}
                  className={`flex flex-col gap-1 p-3 rounded-xl border-2 text-left transition-all ${
                    weekoff.companyWeekoff === opt.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                  }`}>
                  <span className={`text-sm font-semibold ${weekoff.companyWeekoff === opt.value ? 'text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'}`}>
                    {opt.label}
                  </span>
                  <span className="text-xs text-gray-400">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Department exceptions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label">Department Exceptions</label>
              <button onClick={addException}
                className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium">
                <FiPlus className="w-3.5 h-3.5" /> Add Exception
              </button>
            </div>
            {weekoff.exceptions.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No exceptions — all departments follow the company rule.</p>
            ) : (
              <div className="space-y-2">
                {weekoff.exceptions.map((ex, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <select value={ex.department?._id || ex.department}
                      onChange={e => updateException(idx, 'department', e.target.value)}
                      className="input-field flex-1 text-sm">
                      <option value="">Select Department</option>
                      {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                    </select>
                    <select value={ex.weekoff}
                      onChange={e => updateException(idx, 'weekoff', e.target.value)}
                      className="input-field w-44 text-sm">
                      <option value="both">Sat & Sun Off</option>
                      <option value="sunday-only">Sunday Only</option>
                      <option value="none">No Week Off</option>
                    </select>
                    <button onClick={() => removeException(idx)}
                      className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors">
                      <FiX className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-400 mt-2">
              Exception overrides the company rule for that department (e.g. Support team works Saturdays).
            </p>
          </div>

          <div className="flex justify-end">
            <button onClick={saveWeekoff} disabled={weekoffSaving}
              className="btn-primary flex items-center gap-2">
              {weekoffSaving ? <FiClock className="w-4 h-4 animate-spin" /> : <FiSave className="w-4 h-4" />}
              {weekoffSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}

      {/* Upcoming strip */}
      {upcoming.length > 0 && (
        <div className="card p-4">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
            <FiGift className="w-4 h-4 text-primary-500" /> Upcoming Holidays
          </p>
          <div className="flex flex-wrap gap-3">
            {upcoming.map(h => {
              const countdown = daysDiff(h.date);
              return (
                <div key={h._id} className="flex items-center gap-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 rounded-xl px-4 py-2.5">
                  <FiCalendar className="w-4 h-4 text-primary-500 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{h.name}</p>
                    <p className="text-xs text-gray-500">{fmtDate(h.date)}{countdown ? <span className="ml-1 text-primary-600 font-medium">· {countdown}</span> : ''}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Month-grouped list */}
      {loading ? (
        <div className="card p-12 text-center text-gray-400">Loading...</div>
      ) : holidays.length === 0 ? (
        <EmptyState
          icon="🗓️"
          title="No holidays added yet"
          description={canManage ? 'Click "Add Holiday" to populate the calendar.' : 'No holidays have been added for this year.'}
        />
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([monthIdx, items]) => (
            <div key={monthIdx} className="card overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 dark:bg-gray-700/40 border-b border-gray-100 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{MONTHS[Number(monthIdx)]}</h3>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {items.map(h => {
                  const past = new Date(h.date) < new Date();
                  const countdown = daysDiff(h.date);
                  return (
                    <div key={h._id} className={`flex items-center gap-4 px-5 py-3 ${past ? 'opacity-50' : ''}`}>
                      <div className="w-12 text-center shrink-0">
                        <p className="text-xs text-gray-400">{new Date(h.date).toLocaleDateString('en-IN', { weekday: 'short' })}</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{new Date(h.date).getDate()}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{h.name}</p>
                          <span className={`badge text-xs capitalize ${TYPE_COLORS[h.type]}`}>{h.type}</span>
                          {countdown && <span className="text-xs text-primary-600 font-medium">{countdown}</span>}
                        </div>
                        {h.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{h.description}</p>}
                      </div>
                      {canManage && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => openEdit(h)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                            <FiEdit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(h._id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600">
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Holiday' : 'Add Holiday'}
        size="sm"
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Holiday Name *</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="e.g. Diwali" />
          </div>
          <div>
            <label className="label">Date *</label>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="label">Type</label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input-field">
              <option value="public">Public Holiday</option>
              <option value="optional">Optional Holiday</option>
              <option value="restricted">Restricted Holiday</option>
            </select>
          </div>
          <div>
            <label className="label">Description</label>
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-field" placeholder="Optional note" />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Holidays;
