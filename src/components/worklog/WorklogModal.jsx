import React, { useState } from 'react';
import { FiX } from 'react-icons/fi';
import { worklogAPI } from '../../services/api';
import toast from 'react-hot-toast';

const WorklogModal = ({ activeWorklog, onClose, elapsedTime }) => {
  const [form, setForm] = useState({
    taskType: '',
    projectTitle: '',
    description: '',
    status: 'pending',
    attachPhoto: null,
  });
  const [saving, setSaving] = useState(false);

  // Calculate elapsed time from activeWorklog startTime to ensure accuracy
  const calculatedElapsedTime = activeWorklog?.startTime
    ? Math.floor((new Date() - new Date(activeWorklog.startTime)) / 1000)
    : elapsedTime;

  const hours = Math.round((calculatedElapsedTime / 3600) * 100) / 100;

  const formatTimeDisplay = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    if (!form.taskType || !form.projectTitle || !form.description) {
      return toast.error('Please fill all required fields');
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        hours: Math.round((calculatedElapsedTime / 3600) * 100) / 100,
        endTime: new Date(),
      };

      await worklogAPI.updateEntry(activeWorklog._id, payload);
      toast.success('Worklog updated successfully!');
      onClose(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update worklog');
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(prev => ({ ...prev, attachPhoto: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => onClose(false)} />

      {/* Modal Content */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Complete Work Details</h2>
          <button
            onClick={() => onClose(false)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Time Summary */}
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl p-4">
            <p className="text-sm text-emerald-700 dark:text-emerald-300">
              <span className="font-semibold">{formatTimeDisplay(calculatedElapsedTime)}</span> of work logged ({hours}h)
            </p>
          </div>

          {/* Task Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Task Status <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="pending"
                  checked={form.status === 'pending'}
                  onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-900 dark:text-white">Pending</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="wip"
                  checked={form.status === 'wip'}
                  onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-900 dark:text-white">WIP</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="done"
                  checked={form.status === 'done'}
                  onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-900 dark:text-white">Done</span>
              </label>
            </div>
          </div>

          {/* Task Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Task Type <span className="text-red-500">*</span>
            </label>
            <select
              value={form.taskType}
              onChange={(e) => setForm(prev => ({ ...prev, taskType: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select Task Type</option>
              <option value="development">Development</option>
              <option value="testing">Testing</option>
              <option value="documentation">Documentation</option>
              <option value="meeting">Meeting</option>
              <option value="code_review">Code Review</option>
              <option value="bug_fix">Bug Fix</option>
              <option value="support">Support</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Project Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Project/Task Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.projectTitle}
              onChange={(e) => setForm(prev => ({ ...prev, projectTitle: e.target.value }))}
              placeholder="e.g., Feature X Development, Bug Fix #123"
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              What did you work on? <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe your work in detail..."
              rows={4}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Attach Photo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Attach Photo (Optional)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full"
            />
            {form.attachPhoto && (
              <div className="mt-3 relative w-32 h-32 rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-600">
                <img src={form.attachPhoto} alt="Preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => setForm(prev => ({ ...prev, attachPhoto: null }))}
                  className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                >
                  <FiX className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => onClose(false)}
              disabled={saving}
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
            >
              {saving ? 'Saving...' : 'Save & Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorklogModal;
