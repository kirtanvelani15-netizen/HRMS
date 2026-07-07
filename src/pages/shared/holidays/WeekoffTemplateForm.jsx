import { useState, useEffect } from 'react';
import Modal from '../../../components/common/Modal';

const DAYS = [
  { value: 1, label: 'Mon' }, { value: 2, label: 'Tue' }, { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' }, { value: 5, label: 'Fri' }, { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];

const emptyForm = { name: '', offDays: [] };

const WeekoffTemplateForm = ({ isOpen, editing, onCancel, onSave, saving }) => {
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
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={editing ? 'Edit Weekly Off Template' : 'Create Weekly Off Template'}
      size="md"
      footer={
        <>
          <button onClick={onCancel} className="btn-secondary">Cancel</button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.name.trim()}
            className="btn-primary"
          >
            {saving ? 'Saving...' : 'Save Template'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">Template Name *</label>
          <input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="input-field"
            placeholder="e.g. 5-Day Week, 6-Day Week"
            autoFocus
          />
        </div>

        <div>
          <label className="label mb-3 block">Select Weekly Off Days *</label>
          <div className="flex flex-wrap gap-3">
            {DAYS.map(d => (
              <label key={d.value} className="flex items-center gap-2 text-sm cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-gray-700/30 px-2 py-1 rounded transition-colors">
                <input
                  type="checkbox"
                  checked={form.offDays.includes(d.value)}
                  onChange={() => toggleDay(d.value)}
                  className="w-4 h-4 rounded accent-primary-600"
                />
                <span className="font-medium text-gray-700 dark:text-gray-300">{d.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default WeekoffTemplateForm;
