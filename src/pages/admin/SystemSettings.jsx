import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { systemConfigAPI, payrollAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { FiSettings, FiSave, FiGlobe, FiDollarSign, FiCalendar, FiBriefcase } from 'react-icons/fi';
import toast from 'react-hot-toast';

const TIMEZONES = [
  'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo',
  'Europe/London', 'Europe/Paris', 'America/New_York', 'America/Los_Angeles', 'UTC'
];

const LEAVE_TYPES = [
  { key: 'sick',       label: 'Sick Leave' },
  { key: 'casual',     label: 'Casual Leave' },
  { key: 'earned',     label: 'Earned Leave' },
  { key: 'maternity',  label: 'Maternity Leave' },
  { key: 'paternity',  label: 'Paternity Leave' },
  { key: 'emergency',  label: 'Emergency Leave' },
  { key: 'unpaid',     label: 'Unpaid Leave' },
];

const SystemSettings = () => {
  const [config, setConfig] = useState(null);
  const [compliance, setCompliance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingCompliance, setSavingCompliance] = useState(false);
  const [activeTab, setActiveTab] = useState('company');

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [cfgRes, compRes] = await Promise.allSettled([
          systemConfigAPI.get(),
          payrollAPI.getCompliance(),
        ]);
        if (cfgRes.status === 'fulfilled' && cfgRes.value.data.success)
          setConfig(cfgRes.value.data.data);
        if (compRes.status === 'fulfilled' && compRes.value.data.success)
          setCompliance(compRes.value.data.data);
      } catch {
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await systemConfigAPI.update({
        companyName:     config.companyName,
        timezone:        config.timezone,
        workHoursPerDay: config.workHoursPerDay,
        leavePolicy:     config.leavePolicy,
      });
      if (res.data.success) {
        setConfig(res.data.data);
        toast.success('System settings saved');
      }
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCompliance = async (e) => {
    e.preventDefault();
    setSavingCompliance(true);
    try {
      const res = await payrollAPI.saveCompliance(compliance);
      if (res.data.success) {
        setCompliance(res.data.data);
        toast.success('Compliance settings saved');
      }
    } catch {
      toast.error('Failed to save compliance');
    } finally {
      setSavingCompliance(false);
    }
  };

  const updateLeave = (key, val) =>
    setConfig(c => ({ ...c, leavePolicy: { ...c.leavePolicy, [key]: Number(val) } }));

  const updateCompliance = (type, field, val) =>
    setCompliance(c => ({ ...c, [type]: { ...c[type], [field]: val } }));

  if (loading) return <LoadingSpinner text="Loading settings..." />;

  const tabs = [
    { id: 'company',    label: 'Company Info',   icon: FiBriefcase },
    { id: 'leave',      label: 'Leave Policy',   icon: FiCalendar },
    { id: 'compliance', label: 'Compliance',     icon: FiDollarSign },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }} className="space-y-6">

      {/* Header */}
      <div>
        <p className="text-gray-500 text-sm mt-1">Configure company information, leave policy, and compliance rules</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}>
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Company Info Tab */}
      {activeTab === 'company' && config && (
        <form onSubmit={handleSaveConfig} className="card p-6 space-y-5 max-w-2xl">
          <div className="flex items-center gap-2 mb-2">
            <FiGlobe className="text-indigo-500 w-4 h-4" />
            <h2 className="font-semibold text-gray-800 dark:text-white">Company Information</h2>
          </div>

          <div>
            <label className="label">Company Name</label>
            <input value={config.companyName || ''} onChange={e => setConfig(c => ({ ...c, companyName: e.target.value }))}
              className="input-field w-full" placeholder="e.g. JVS Group" />
          </div>

          <div>
            <label className="label">Timezone</label>
            <select value={config.timezone || 'Asia/Kolkata'} onChange={e => setConfig(c => ({ ...c, timezone: e.target.value }))}
              className="input-field w-full">
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Working Hours per Day</label>
            <select value={config.workHoursPerDay || 8}
              onChange={e => setConfig(c => ({ ...c, workHoursPerDay: Number(e.target.value) }))}
              className="input-field w-40">
              {Array.from({ length: (12 - 4) * 4 + 1 }, (_, i) => {
                const val = 4 + i * 0.25;
                const h = Math.floor(val);
                const m = Math.round((val - h) * 60);
                return (
                  <option key={val} value={val}>
                    {h}h {String(m).padStart(2, '0')}m
                  </option>
                );
              })}
            </select>
            <p className="text-xs text-gray-400 mt-1">Used for overtime and work hour calculations</p>
          </div>

          <div className="pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              <FiSave size={15} /> {saving ? 'Saving...' : 'Save Company Settings'}
            </button>
          </div>
        </form>
      )}

      {/* Leave Policy Tab */}
      {activeTab === 'leave' && config && (
        <form onSubmit={handleSaveConfig} className="card p-6 max-w-2xl">
          <div className="flex items-center gap-2 mb-5">
            <FiCalendar className="text-indigo-500 w-4 h-4" />
            <h2 className="font-semibold text-gray-800 dark:text-white">Annual Leave Entitlements</h2>
          </div>
          <div className="space-y-4">
            {LEAVE_TYPES.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 w-40 flex-shrink-0">{label}</label>
                <div className="flex items-center gap-2">
                  <input type="number" min={0} max={365}
                    value={config.leavePolicy?.[key] ?? 0}
                    onChange={e => updateLeave(key, e.target.value)}
                    className="input-field w-24 text-center" />
                  <span className="text-sm text-gray-400">days/year</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              <FiSave size={15} /> {saving ? 'Saving...' : 'Save Leave Policy'}
            </button>
          </div>
        </form>
      )}

      {/* Compliance Tab */}
      {activeTab === 'compliance' && compliance && (
        <form onSubmit={handleSaveCompliance} className="card p-6 max-w-2xl space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <FiDollarSign className="text-indigo-500 w-4 h-4" />
            <h2 className="font-semibold text-gray-800 dark:text-white">Salary Compliance Rules</h2>
          </div>

          {['pf', 'esi', 'pt', 'tax'].map(type => (
            <div key={type} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-gray-800 dark:text-white uppercase">{type}</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-gray-500">Enabled</span>
                  <input type="checkbox" checked={compliance[type]?.enabled ?? true}
                    onChange={e => updateCompliance(type, 'enabled', e.target.checked)}
                    className="w-4 h-4 rounded accent-indigo-600" />
                </label>
              </div>
              {compliance[type]?.enabled && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label text-xs">Calculation Type</label>
                    <select value={compliance[type]?.calculationType || 'percentage'}
                      onChange={e => updateCompliance(type, 'calculationType', e.target.value)}
                      className="input-field w-full text-sm">
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed Amount</option>
                    </select>
                  </div>
                  <div>
                    <label className="label text-xs">
                      Value ({compliance[type]?.calculationType === 'percentage' ? '%' : '₹'})
                    </label>
                    <input type="number" min={0}
                      value={compliance[type]?.value || 0}
                      onChange={e => updateCompliance(type, 'value', Number(e.target.value))}
                      className="input-field w-full text-sm" />
                  </div>
                </div>
              )}
            </div>
          ))}

          <button type="submit" disabled={savingCompliance} className="btn-primary flex items-center gap-2">
            <FiSave size={15} /> {savingCompliance ? 'Saving...' : 'Save Compliance Settings'}
          </button>
        </form>
      )}
    </motion.div>
  );
};

export default SystemSettings;
