import React, { useState, useEffect, useCallback } from 'react';
import { FiSave, FiRefreshCw, FiInfo, FiPlus, FiTrash2, FiLock, FiClock, FiDollarSign, FiEye, FiEyeOff, FiKey } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { payrollAPI, employeeAPI } from '../../services/api';

const SESSION_KEY = 'salaryMasterUnlocked';

// ─── Password Gate ────────────────────────────────────────────────────────────
const PasswordGate = ({ isSet, onUnlocked, onSetPassword }) => {
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleUnlock = async () => {
    if (!pin) return toast.error('Enter your password');
    setLoading(true);
    try {
      const res = await payrollAPI.verifySalaryMasterPin(pin);
      if (res.data?.valid) {
        sessionStorage.setItem(SESSION_KEY, '1');
        onUnlocked();
      } else {
        toast.error('Incorrect password');
      }
    } catch {
      toast.error('Failed to verify password');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async () => {
    if (!pin) return toast.error('Enter a password');
    if (pin.length < 4) return toast.error('Password must be at least 4 characters');
    if (pin !== confirm) return toast.error('Passwords do not match');
    setLoading(true);
    try {
      await payrollAPI.setSalaryMasterPin(pin);
      toast.success('Password set successfully');
      sessionStorage.setItem(SESSION_KEY, '1');
      onSetPassword();
      onUnlocked();
    } catch {
      toast.error('Failed to set password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-4">
            <FiLock className="w-7 h-7 text-primary-600 dark:text-primary-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {isSet ? 'Salary Master is Protected' : 'Set Salary Master Password'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 text-center">
            {isSet ? 'Enter your password to access salary components' : 'Create a password to protect this page'}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              {isSet ? 'Password' : 'New Password'}
            </label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={pin}
                onChange={e => setPin(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (isSet ? handleUnlock() : (confirm ? handleSetPassword() : null))}
                placeholder="Enter password"
                autoFocus
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 pr-10 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
              />
              <button type="button" onClick={() => setShow(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {show ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {!isSet && (
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSetPassword()}
                  placeholder="Confirm password"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 pr-10 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                />
                <button type="button" onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showConfirm ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <button
            onClick={isSet ? handleUnlock : handleSetPassword}
            disabled={loading}
            className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? <FiRefreshCw className="w-4 h-4 animate-spin" /> : <FiLock className="w-4 h-4" />}
            {loading ? 'Please wait…' : isSet ? 'Unlock' : 'Set Password'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Change Password Modal ────────────────────────────────────────────────────
const ChangePasswordModal = ({ onClose, onChanged }) => {
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!pin) return toast.error('Enter a new password');
    if (pin.length < 4) return toast.error('Password must be at least 4 characters');
    if (pin !== confirm) return toast.error('Passwords do not match');
    setLoading(true);
    try {
      await payrollAPI.setSalaryMasterPin(pin);
      toast.success('Password changed. Please re-enter to continue.');
      sessionStorage.removeItem(SESSION_KEY);
      onChanged();
      onClose();
    } catch {
      toast.error('Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <FiKey className="w-5 h-5 text-primary-500" /> Change Salary Master Password
        </h3>
        <div className="space-y-3">
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={pin}
              onChange={e => setPin(e.target.value)}
              placeholder="New password"
              autoFocus
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 pr-10 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
            />
            <button type="button" onClick={() => setShow(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {show ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
            </button>
          </div>
          <input
            type={show ? 'text' : 'password'}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="Confirm new password"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
          />
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">Cancel</button>
            <button onClick={handleSubmit} disabled={loading}
              className="flex-1 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg disabled:opacity-60 flex items-center justify-center gap-1">
              {loading ? <FiRefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
              {loading ? 'Saving…' : 'Change Password'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Slugify component name to a key
const toKey = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

const CALC_TYPES = [
  { value: 'fixed', label: 'Fixed ₹' },
  { value: 'percentage_ctc', label: '% of CTC' },
  { value: 'percentage_basic', label: '% of Basic' },
  { value: 'percentage_gross', label: '% of Gross' },
  { value: 'remaining', label: 'Remaining' },
];

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

// Debounce utility
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Convert API component shape to internal shape
const apiToInternal = (c) => ({
  key: c.key,
  name: c.name,
  calculationType: c.calculationType === 'percentage'
    ? (c.percentageOf === 'ctc' ? 'percentage_ctc' : c.percentageOf === 'grossSalary' ? 'percentage_gross' : 'percentage_basic')
    : c.calculationType,
  value: c.value,
  order: c.order || 0,
});

// Convert internal shape to API shape
const internalToApi = (c) => {
  const isPercent = c.calculationType.startsWith('percentage_');
  const percentageOf = c.calculationType === 'percentage_ctc' ? 'ctc'
    : c.calculationType === 'percentage_gross' ? 'grossSalary'
    : 'basicSalary';
  return {
    key: c.key,
    name: c.name,
    calculationType: isPercent ? 'percentage' : c.calculationType,
    value: Number(c.value) || 0,
    percentageOf: isPercent ? percentageOf : 'basicSalary',
    order: c.order || 0,
  };
};

// Single component row
const ComponentRow = ({ comp, isLocked, onChange, onDelete, previewValue }) => {
  const calcType = CALC_TYPES.find(t => t.value === comp.calculationType) || CALC_TYPES[0];
  const showValue = comp.calculationType !== 'remaining';

  return (
    <div className="flex items-center gap-2 py-2.5 border-b border-gray-100 dark:border-gray-700 last:border-0 group">
      <div className="flex-1 min-w-0">
        {isLocked ? (
          <div className="flex items-center gap-1.5">
            <FiLock className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{comp.name}</span>
          </div>
        ) : (
          <input
            type="text"
            value={comp.name}
            onChange={(e) => onChange({ ...comp, name: e.target.value, key: toKey(e.target.value) })}
            placeholder="Component name"
            className="w-full text-sm font-medium bg-transparent border-b border-transparent hover:border-gray-300 focus:border-primary-400 outline-none text-gray-800 dark:text-gray-200 py-0.5"
          />
        )}
      </div>

      <select
        value={comp.calculationType}
        onChange={(e) => onChange({ ...comp, calculationType: e.target.value })}
        disabled={isLocked}
        className="text-xs border border-gray-200 dark:border-gray-600 rounded px-1.5 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {CALC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>

      {showValue ? (
        <input
          type="number"
          min="0"
          value={comp.value}
          onChange={(e) => onChange({ ...comp, value: e.target.value })}
          disabled={isLocked}
          placeholder="0"
          className="w-20 text-right text-sm border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-primary-400 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
        />
      ) : (
        <span className="w-20 text-right text-xs text-gray-400 italic">Auto</span>
      )}

      <span className="w-20 text-right text-sm font-semibold text-primary-600 dark:text-primary-400 tabular-nums">
        {fmt(previewValue || 0)}
      </span>

      {!isLocked && (
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 transition-all"
          title="Remove component"
        >
          <FiTrash2 className="w-3.5 h-3.5" />
        </button>
      )}
      {isLocked && <span className="w-6" />}
    </div>
  );
};

// Add component inline form
const AddComponentForm = ({ onAdd, onCancel }) => {
  const [name, setName] = useState('');
  const [calcType, setCalcType] = useState('fixed');
  const [value, setValue] = useState('');

  const submit = () => {
    if (!name.trim()) return toast.error('Enter component name');
    onAdd({ key: toKey(name), name: name.trim(), calculationType: calcType, value: Number(value) || 0, order: 999 });
    setName(''); setCalcType('fixed'); setValue('');
  };

  return (
    <div className="flex items-center gap-2 mt-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Component name (e.g. Fuel Allowance)"
        className="flex-1 text-sm border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-primary-400 outline-none"
        onKeyDown={e => e.key === 'Enter' && submit()}
        autoFocus
      />
      <select
        value={calcType}
        onChange={e => setCalcType(e.target.value)}
        className="text-xs border border-gray-200 dark:border-gray-600 rounded px-1.5 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
      >
        {CALC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
      {calcType !== 'remaining' && (
        <input
          type="number"
          min="0"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="0"
          className="w-20 text-right text-sm border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-primary-400 outline-none"
        />
      )}
      <button onClick={submit} className="px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded hover:bg-primary-700 transition-colors">Add</button>
      <button onClick={onCancel} className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400">Cancel</button>
    </div>
  );
};

const SalaryMaster = () => {
  const [pinStatus, setPinStatus] = useState(null); // null=loading, {isSet}
  const [unlocked, setUnlocked] = useState(() => !!sessionStorage.getItem(SESSION_KEY));
  const [showChangePin, setShowChangePin] = useState(false);

  const [templateId, setTemplateId] = useState(null);
  const [basicSalaryLocked, setBasicSalaryLocked] = useState(false);
  const [components, setComponents] = useState([]);
  const [deductions, setDeductions] = useState([]);
  const [overtimeType, setOvertimeType] = useState('salary');
  const [previewCTC, setPreviewCTC] = useState(50000);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddComp, setShowAddComp] = useState(false);
  const [showAddDeduct, setShowAddDeduct] = useState(false);
  const [setupStatus, setSetupStatus] = useState([]);
  const [previewData, setPreviewData] = useState(null); // Backend-calculated preview

  // Assign Template state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignEmployee, setAssignEmployee] = useState('');
  const [assignCTC, setAssignCTC] = useState('');
  const [assignOvertimeRate, setAssignOvertimeRate] = useState('0');
  const [assignLoading, setAssignLoading] = useState(false);
  const [employees, setEmployees] = useState([]);

  // Fetch payroll calculation from backend
  const fetchPayrollCalculation = useCallback(debounce(async (comps, deducts, ctc) => {
    if (comps.length === 0 || ctc <= 0) {
      setPreviewData(null);
      return;
    }
    try {
      // Convert component format to API format
      const earningsArr = comps.map(c => ({
        key: c.key,
        name: c.name,
        calculationType: c.calculationType.startsWith('percentage_')
          ? 'percentage'
          : c.calculationType,
        value: Number(c.value) || 0,
        percentageOf: c.calculationType === 'percentage_ctc' ? 'ctc'
          : c.calculationType === 'percentage_gross' ? 'grossSalary'
          : 'basicSalary',
        order: c.order || 0
      }));

      const deductionsArr = deducts.map(d => ({
        key: d.key,
        name: d.name,
        calculationType: d.calculationType.startsWith('percentage_')
          ? 'percentage'
          : d.calculationType,
        value: Number(d.value) || 0,
        percentageOf: d.calculationType === 'percentage_ctc' ? 'ctc'
          : d.calculationType === 'percentage_gross' ? 'grossSalary'
          : 'basicSalary',
        order: d.order || 0,
        isSystemManaged: d.isSystemManaged || false
      }));

      const res = await payrollAPI.calculatePayroll({
        ctc: Number(ctc) || 0,
        earningsArr,
        deductionsArr,
        pfApplicable: true, // TODO: Make configurable per employee/structure
        esiApplicable: false,
        ptApplicable: false,
        tdsApplicable: false
      });

      if (res.data?.success) {
        setPreviewData(res.data.data);
      }
    } catch (err) {
      console.error('Preview calculation error:', err);
      // Silently fail - show previous data or null
    }
  }, 500), []);

  // Check pin status on mount
  useEffect(() => {
    payrollAPI.getSalaryMasterPinStatus()
      .then(res => setPinStatus({ isSet: !!res.data?.isSet }))
      .catch(() => setPinStatus({ isSet: false }));
  }, []);

  // Fetch setup status
  useEffect(() => {
    if (unlocked && payrollAPI.getSetupStatus) {
      payrollAPI.getSetupStatus()
        .then(res => setSetupStatus(res.data?.data || []))
        .catch(() => {});
    }
  }, [unlocked]);

  const loadTemplate = useCallback(async () => {
    setLoading(true);
    try {
      const res = await payrollAPI.getTemplates({ active: true });
      const t = res.data?.data?.[0];
      if (t) {
        setTemplateId(t._id);
        setBasicSalaryLocked(!!t.basicSalaryLocked);
        setOvertimeType(t.overtimeType || 'salary');
        setComponents((t.components || []).map(apiToInternal));
        setDeductions((t.deductions || []).map(apiToInternal));
      }
    } catch {
      toast.error('Failed to load salary template');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (unlocked) loadTemplate();
  }, [unlocked, loadTemplate]);

  // Fetch payroll preview from backend when components/deductions/CTC change
  useEffect(() => {
    if (unlocked && components.length > 0) {
      fetchPayrollCalculation(components, deductions, previewCTC);
    }
  }, [components, deductions, previewCTC, unlocked, fetchPayrollCalculation]);

  // Fetch employees for assign modal
  useEffect(() => {
    if (unlocked && showAssignModal) {
      employeeAPI.getAll({ limit: 1000 })
        .then(res => setEmployees(res.data?.data || []))
        .catch(() => toast.error('Failed to load employees'));
    }
  }, [unlocked, showAssignModal]);

  // Assign template to employee
  const handleAssignTemplate = async () => {
    if (!assignEmployee) return toast.error('Select an employee');
    if (!assignCTC || Number(assignCTC) <= 0) return toast.error('Enter valid CTC');
    if (!templateId) return toast.error('Save the Salary Master template first');

    setAssignLoading(true);
    try {
      await payrollAPI.assignTemplateToEmployee({
        employee: assignEmployee,
        template: templateId,
        ctc: Number(assignCTC),
        overtimeRate: Number(assignOvertimeRate) || 0
      });
      toast.success('Salary structure assigned to employee');
      setShowAssignModal(false);
      setAssignEmployee('');
      setAssignCTC('');
      setAssignOvertimeRate('0');
      // Refresh setup status
      if (payrollAPI.getSetupStatus) {
        payrollAPI.getSetupStatus()
          .then(res => setSetupStatus(res.data?.data || []))
          .catch(() => {});
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign template');
    } finally {
      setAssignLoading(false);
    }
  };

  // Clear session on unmount so navigating away + back re-prompts password
  useEffect(() => {
    return () => { sessionStorage.removeItem(SESSION_KEY); };
  }, []);

  // Show password gate if pin status not loaded yet
  if (pinStatus === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <FiRefreshCw className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    );
  }

  // Show gate if not unlocked
  if (!unlocked) {
    return (
      <PasswordGate
        isSet={pinStatus.isSet}
        onUnlocked={() => setUnlocked(true)}
        onSetPassword={() => setPinStatus({ isSet: true })}
      />
    );
  }

  const updateComp = (idx, updated) => setComponents(prev => prev.map((c, i) => i === idx ? updated : c));
  const deleteComp = (idx) => setComponents(prev => prev.filter((_, i) => i !== idx));
  const addComp = (comp) => { setComponents(prev => [...prev, comp]); setShowAddComp(false); };

  const updateDeduct = (idx, updated) => setDeductions(prev => prev.map((d, i) => i === idx ? updated : d));
  const deleteDeduct = (idx) => setDeductions(prev => prev.filter((_, i) => i !== idx));
  const addDeduct = (d) => { setDeductions(prev => [...prev, d]); setShowAddDeduct(false); };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      name: 'Default Salary Master',
      overtimeType,
      components: components.map((c, i) => ({ ...internalToApi(c), order: i })),
      deductions: deductions.map((d, i) => ({ ...internalToApi(d), order: i })),
    };
    try {
      if (templateId) {
        await payrollAPI.updateTemplate(templateId, payload);
      } else {
        const res = await payrollAPI.createTemplate(payload);
        setTemplateId(res.data?.data?._id);
        setBasicSalaryLocked(true);
      }
      toast.success('Salary master saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <FiRefreshCw className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6">

      {showChangePin && (
        <ChangePasswordModal
          onClose={() => setShowChangePin(false)}
          onChanged={() => setUnlocked(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Salary Master</h1>
          <p className="text-sm text-gray-500 mt-1">
            Define your company's salary components. These apply to all employees when CTC is assigned.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAssignModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 border border-blue-300 dark:border-blue-600 text-sm font-medium rounded-lg text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
            <FiPlus className="w-4 h-4" /> Assign Template
          </button>
          <button onClick={() => setShowChangePin(true)}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <FiKey className="w-4 h-4" /> Change Password
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60">
            {saving ? <FiRefreshCw className="w-4 h-4 animate-spin" /> : <FiSave className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Save Master'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">

          {/* EARNINGS */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <FiDollarSign className="w-5 h-5 text-emerald-500" />
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Gross Earnings Components</h2>
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-4">Add all components that form the employee's gross pay</p>

            {components.length === 0 && !showAddComp && (
              <p className="text-sm text-gray-400 italic text-center py-4">No components yet. Add your first component below.</p>
            )}

            {components.map((comp, idx) => {
              const isLocked = basicSalaryLocked && comp.key === 'basic_salary';
              const preview = previewData?.breakdown?.earnings?.find(p => p.key === comp.key);
              return (
                <ComponentRow
                  key={comp.key + idx}
                  comp={comp}
                  isLocked={isLocked}
                  onChange={(updated) => updateComp(idx, updated)}
                  onDelete={() => deleteComp(idx)}
                  previewValue={preview?.value || 0}
                />
              );
            })}

            {showAddComp
              ? <AddComponentForm onAdd={addComp} onCancel={() => setShowAddComp(false)} />
              : (
                <button onClick={() => setShowAddComp(true)}
                  className="mt-3 flex items-center gap-1.5 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 font-medium">
                  <FiPlus className="w-4 h-4" /> Add Component
                </button>
              )}

            <div className="mt-4 flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-4 py-3">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total Gross Earnings</span>
              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">{fmt(previewData?.grossSalary || 0)}</span>
            </div>
          </div>

          {/* DEDUCTIONS */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-5 h-5 text-red-500 font-bold text-lg flex items-center justify-center leading-none">−</span>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Deduction Components</h2>
            </div>
            <p className="text-xs text-gray-400 mb-4">Add all deductions — PF, PT, TDS, Loan, ESI, etc. No defaults; you define what applies.</p>

            {deductions.length === 0 && !showAddDeduct && (
              <p className="text-sm text-gray-400 italic text-center py-4">No deductions yet. Add your first deduction below.</p>
            )}

            {deductions.map((d, idx) => {
              const preview = previewData?.breakdown?.deductions?.find(p => p.key === d.key);
              return (
                <ComponentRow
                  key={d.key + idx}
                  comp={d}
                  isLocked={false}
                  onChange={(updated) => updateDeduct(idx, updated)}
                  onDelete={() => deleteDeduct(idx)}
                  previewValue={preview?.calculated || 0}
                />
              );
            })}

            {showAddDeduct
              ? <AddComponentForm onAdd={addDeduct} onCancel={() => setShowAddDeduct(false)} />
              : (
                <button onClick={() => setShowAddDeduct(true)}
                  className="mt-3 flex items-center gap-1.5 text-sm text-red-500 dark:text-red-400 hover:text-red-600 font-medium">
                  <FiPlus className="w-4 h-4" /> Add Deduction
                </button>
              )}

            <div className="mt-4 flex items-center justify-between bg-red-50 dark:bg-red-900/10 rounded-lg px-4 py-3">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total Deductions</span>
              <span className="text-base font-bold text-red-600 dark:text-red-400">{fmt(previewData?.totalDeductions || 0)}</span>
            </div>
          </div>


          {/* OVERTIME */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <FiClock className="w-5 h-5 text-primary-500" />
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Overtime Handling</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'salary', title: 'Add to Salary', desc: 'Overtime pay added to monthly salary' },
                { key: 'leave', title: 'Earned Leave', desc: 'Overtime hours converted to earned leave' },
              ].map(({ key, title, desc }) => (
                <button key={key} onClick={() => setOvertimeType(key)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center ${
                    overtimeType === key
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                  }`}>
                  {key === 'salary'
                    ? <span className={`text-xl font-bold ${overtimeType === key ? 'text-primary-600' : 'text-gray-400'}`}>₹</span>
                    : <FiClock className={`w-6 h-6 ${overtimeType === key ? 'text-primary-600' : 'text-gray-400'}`} />
                  }
                  <span className={`text-sm font-medium ${overtimeType === key ? 'text-primary-700 dark:text-primary-300' : 'text-gray-600 dark:text-gray-400'}`}>{title}</span>
                  <span className="text-xs text-gray-400">{desc}</span>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Live Preview */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sticky top-6">
            <div className="flex items-center gap-2 mb-4">
              <FiInfo className="w-5 h-5 text-primary-500" />
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Live Preview</h2>
            </div>

            {setupStatus.length > 0 && setupStatus.some(s => !s.hasStructure) && (
              <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 p-4">
                <div className="flex items-start gap-3">
                  <div className="text-yellow-600 dark:text-yellow-400 font-bold text-lg">⚠️</div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-300 mb-2">Pending Salary Setup</h3>
                    <div className="space-y-1.5">
                      {setupStatus
                        .filter(s => !s.hasStructure)
                        .slice(0, 5)
                        .map(emp => (
                          <p key={emp.employeeId} className="text-xs text-yellow-800 dark:text-yellow-200">
                            {emp.employeeName} — No salary structure configured
                          </p>
                        ))}
                    </div>
                    {setupStatus.filter(s => !s.hasStructure).length > 5 && (
                      <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">
                        +{setupStatus.filter(s => !s.hasStructure).length - 5} more employees pending setup
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="mb-5">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Sample Monthly CTC (₹)</label>
              <input type="number" min="0" value={previewCTC}
                onChange={(e) => setPreviewCTC(Number(e.target.value) || 0)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>

            {/* Earnings preview */}
            {previewData?.breakdown?.earnings && previewData.breakdown.earnings.length > 0 && (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-2">Gross Earnings</p>
                <div className="space-y-1.5 mb-3">
                  {previewData.breakdown.earnings.map(c => (
                    <div key={c.key} className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                      <span>{c.name}</span>
                      <span className="font-medium">{fmt(c.value)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-sm font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded px-2 py-1.5 mb-4">
                  <span>Total Gross</span><span>{fmt(previewData.grossSalary)}</span>
                </div>
              </>
            )}

            {/* Deductions preview */}
            {previewData?.breakdown?.deductions && previewData.breakdown.deductions.length > 0 && (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-red-500 dark:text-red-400 mb-2">Deductions</p>
                <div className="space-y-1.5 mb-3">
                  {previewData.breakdown.deductions.map(d => (
                    <div key={d.key} className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                      <span>{d.name}</span>
                      <span className="font-medium text-red-500">− {fmt(d.calculated)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-sm font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 rounded px-2 py-1.5 mb-4">
                  <span>Total Deductions</span><span>{fmt(previewData.totalDeductions)}</span>
                </div>
              </>
            )}

            {previewData && (
              <div className="rounded-xl bg-primary-600 dark:bg-primary-700 px-4 py-4 text-white">
                <p className="text-xs font-medium opacity-80 mb-1">Gross − Deductions = Net Salary</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold">Net Salary</span>
                  <span className="text-xl font-bold">{fmt(previewData.netSalary)}</span>
                </div>
                <p className="text-xs opacity-70 mt-1">{fmt(previewData.grossSalary)} − {fmt(previewData.totalDeductions)} = {fmt(previewData.netSalary)}</p>
              </div>
            )}

            {!previewData && (
              <p className="text-sm text-gray-400 italic text-center py-8">Add components to see live preview</p>
            )}

            {basicSalaryLocked && (
              <div className="mt-3 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <FiLock className="w-3 h-3 flex-shrink-0" />
                Basic Salary percentage is locked after first save.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assign Template Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FiDollarSign className="w-5 h-5 text-blue-600" />
              Assign Template to Employee
            </h3>

            <div className="space-y-4">
              {/* Employee Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Select Employee *
                </label>
                <select
                  value={assignEmployee}
                  onChange={(e) => setAssignEmployee(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Choose an employee...</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>
                      {emp.firstName} {emp.lastName} ({emp.designation || 'N/A'})
                    </option>
                  ))}
                </select>
              </div>

              {/* CTC Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Annual CTC (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  value={assignCTC}
                  onChange={(e) => setAssignCTC(e.target.value)}
                  placeholder="e.g., 500000"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Overtime Rate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Overtime Rate (₹/hour)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={assignOvertimeRate}
                  onChange={(e) => setAssignOvertimeRate(e.target.value)}
                  placeholder="Optional"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Info */}
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  <strong>ℹ️</strong> This will calculate and assign the salary breakdown based on the current Salary Master template to this employee.
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowAssignModal(false)}
                className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignTemplate}
                disabled={assignLoading}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {assignLoading ? <FiRefreshCw className="w-4 h-4 animate-spin" /> : <FiDollarSign className="w-4 h-4" />}
                {assignLoading ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryMaster;
