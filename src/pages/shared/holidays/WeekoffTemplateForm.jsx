import { useState, useEffect } from 'react';

const DAYS = [
  { value: 1, label: 'Mon' }, { value: 2, label: 'Tue' }, { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' }, { value: 5, label: 'Fri' }, { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];

const emptyForm = { name: '', offDays: [] };

const WeekoffTemplateForm = ({ editing, onCancel, onSave, saving }) => {
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    setForm(editing ? { name: editing.name, offDays: editing.offDays || [] } : emptyForm);
  }, [editing]);

  const toggleDay = (value) => {
    setForm(f => ({
      ...f,
      offDays: f.offDays.includes(value) ? f.offDays.filter(d => d !== value) : [...f.offDays, value]
    }));
  };

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-6 h-6 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center shrink-0">2</span>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          {editing ? 'Edit Weekly Off Template' : 'Create New Weekly Off Template'}
        </h2>
      </div>
      <p className="text-sm text-gray-500 mb-4">Select the days that will be considered as weekly off.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Template Name</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="input-field" placeholder="Enter template name" />
        </div>
        <div>
          <label className="label mb-2">Select Weekly Off Days</label>
          <div className="flex flex-wrap gap-3">
            {DAYS.map(d => (
              <label key={d.value} className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
                <input type="checkbox" checked={form.offDays.includes(d.value)} onChange={() => toggleDay(d.value)}
                  className="w-4 h-4 rounded accent-primary-600" />
                {d.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-4">
        <button onClick={onCancel} className="btn-secondary">Cancel</button>
        <button
          onClick={() => onSave(form)}
          disabled={saving || !form.name.trim()}
          className="btn-primary"
        >
          {saving ? 'Saving...' : 'Save Template'}
        </button>
      </div>
    </div>
  );
};

export default WeekoffTemplateForm;
