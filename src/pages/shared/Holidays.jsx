import { useState, useEffect } from 'react';
import { holidayAPI, weekoffTemplateAPI, departmentAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import WeekoffTemplateList from './holidays/WeekoffTemplateList';
import WeekoffTemplateForm from './holidays/WeekoffTemplateForm';
import DepartmentAssignment from './holidays/DepartmentAssignment';
import HolidayTable from './holidays/HolidayTable';
import toast from 'react-hot-toast';

const emptyHolidayForm = { name: '', date: '', type: 'public', description: '', applicableTo: { scope: 'all', locations: [] } };

const Holidays = () => {
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'hr';

  const [year, setYear] = useState(new Date().getFullYear());
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyHolidayForm);
  const [saving, setSaving] = useState(false);
  const [locationsText, setLocationsText] = useState('');

  const [templates, setTemplates] = useState([]);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateSaving, setTemplateSaving] = useState(false);

  const [departments, setDepartments] = useState([]);
  const [assignmentSaving, setAssignmentSaving] = useState(false);

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const res = await holidayAPI.getAll({ year });
      if (res.data.success) setHolidays(res.data.data);
    } finally { setLoading(false); }
  };

  const fetchTemplates = async () => {
    try {
      const res = await weekoffTemplateAPI.getAll();
      if (res.data.success) setTemplates(res.data.data);
    } catch { /* silent */ }
  };

  const fetchDepartments = async () => {
    try {
      const res = await departmentAPI.getAll();
      if (res.data.success) setDepartments(res.data.data);
    } catch { /* silent */ }
  };

  useEffect(() => { fetchHolidays(); }, [year]);
  useEffect(() => { if (canManage) { fetchTemplates(); fetchDepartments(); } }, [canManage]);

  // ── Weekoff templates ────────────────────────────────────────────────────
  const openCreateTemplate = () => { setEditingTemplate(null); setShowTemplateForm(true); };
  const openEditTemplate = (t) => { setEditingTemplate(t); setShowTemplateForm(true); };
  const cancelTemplateForm = () => { setEditingTemplate(null); setShowTemplateForm(false); };

  const saveTemplate = async (data) => {
    if (!data.offDays.length) return toast.error('Select at least one weekly off day');
    setTemplateSaving(true);
    try {
      if (editingTemplate) {
        await weekoffTemplateAPI.update(editingTemplate._id, data);
        toast.success('Template updated');
      } else {
        await weekoffTemplateAPI.create(data);
        toast.success('Template created');
      }
      setShowTemplateForm(false);
      setEditingTemplate(null);
      fetchTemplates();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save template');
    } finally { setTemplateSaving(false); }
  };

  const deleteTemplate = async (t) => {
    if (!window.confirm(`Delete template "${t.name}"?`)) return;
    try {
      await weekoffTemplateAPI.delete(t._id);
      toast.success('Template deleted');
      fetchTemplates();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete template');
    }
  };

  // ── Department assignment ────────────────────────────────────────────────
  const saveAssignment = async (assignments) => {
    setAssignmentSaving(true);
    try {
      await departmentAPI.assignWeekoff(assignments);
      toast.success('Weekoff assignments saved');
      fetchDepartments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save assignment');
    } finally { setAssignmentSaving(false); }
  };

  // ── Holidays ──────────────────────────────────────────────────────────────
  const openAdd = () => { setEditing(null); setForm(emptyHolidayForm); setLocationsText(''); setShowModal(true); };
  const openEdit = (h) => {
    setEditing(h._id);
    setForm({
      name: h.name, date: h.date?.slice(0, 10), type: h.type, description: h.description || '',
      applicableTo: h.applicableTo || { scope: 'all', locations: [] }
    });
    setLocationsText((h.applicableTo?.locations || []).join(', '));
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.date) return toast.error('Name and date are required');
    setSaving(true);
    try {
      const payload = {
        ...form,
        applicableTo: {
          scope: form.applicableTo.scope,
          locations: form.applicableTo.scope === 'specific-locations'
            ? locationsText.split(',').map(s => s.trim()).filter(Boolean)
            : []
        }
      };
      if (editing) {
        await holidayAPI.update(editing, payload);
        toast.success('Holiday updated');
      } else {
        await holidayAPI.create(payload);
        toast.success('Holiday added');
      }
      setShowModal(false);
      fetchHolidays();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this holiday?')) return;
    try { await holidayAPI.delete(id); toast.success('Deleted'); fetchHolidays(); }
    catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Holiday Calendar</h1>
          <p className="text-gray-500 text-sm">Manage holidays and weekly off templates</p>
        </div>
      </div>

      {canManage && (
        <>
          <WeekoffTemplateList
            templates={templates}
            onCreate={openCreateTemplate}
            onEdit={openEditTemplate}
            onDelete={deleteTemplate}
          />

          {showTemplateForm && (
            <WeekoffTemplateForm
              editing={editingTemplate}
              onCancel={cancelTemplateForm}
              onSave={saveTemplate}
              saving={templateSaving}
            />
          )}

          <DepartmentAssignment
            departments={departments}
            templates={templates}
            onSave={saveAssignment}
            saving={assignmentSaving}
          />
        </>
      )}

      {loading ? (
        <div className="card p-12 text-center text-gray-400">Loading...</div>
      ) : (
        <HolidayTable
          holidays={holidays}
          year={year}
          onYearChange={setYear}
          canManage={canManage}
          onAdd={openAdd}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Add/Edit Holiday modal */}
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
              <option value="national">National Holiday</option>
              <option value="festival">Festival</option>
              <option value="optional">Optional Holiday</option>
              <option value="restricted">Restricted Holiday</option>
              <option value="state">State Holiday</option>
            </select>
          </div>
          <div>
            <label className="label">Applicable To</label>
            <select
              value={form.applicableTo.scope}
              onChange={e => setForm({ ...form, applicableTo: { ...form.applicableTo, scope: e.target.value } })}
              className="input-field"
            >
              <option value="all">All Departments</option>
              <option value="specific-locations">Specific Locations</option>
            </select>
            {form.applicableTo.scope === 'specific-locations' && (
              <input
                value={locationsText}
                onChange={e => setLocationsText(e.target.value)}
                className="input-field mt-2"
                placeholder="e.g. Maharashtra Offices, Delhi Branch"
              />
            )}
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
