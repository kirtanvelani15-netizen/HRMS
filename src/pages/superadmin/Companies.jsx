import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiToggleLeft, FiToggleRight, FiUserPlus, FiX, FiCopy, FiRefreshCw, FiLink } from 'react-icons/fi';

const ALL_MODULES = [
  { key: 'attendance',  label: 'Attendance & Leaves' },
  { key: 'finance',     label: 'Salary & Finance' },
  { key: 'recruitment', label: 'Recruitment' },
  { key: 'training',    label: 'Training' },
  { key: 'performance', label: 'Performance' },
  { key: 'documents',   label: 'Documents & Assets' },
  { key: 'worklog',     label: 'Work Log' },
  { key: 'notices',     label: 'Notices' },
  { key: 'grievances',  label: 'Grievances' },
  { key: 'exit',        label: 'Exit Management' },
  { key: 'analytics',   label: 'Analytics' },
  { key: 'onboarding',  label: 'Onboarding' },
];

const ModuleCheckbox = ({ moduleKey, label, checked, onChange }) => (
  <label className="flex items-center gap-2 cursor-pointer select-none">
    <input
      type="checkbox"
      checked={checked}
      onChange={e => onChange(moduleKey, e.target.checked)}
      className="w-4 h-4 rounded accent-indigo-600"
    />
    <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
  </label>
);

const CreateCompanyModal = ({ onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(false);

  const toggleModule = (key, checked) =>
    setModules(prev => checked ? [...prev, key] : prev.filter(m => m !== key));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Company name is required');
    setLoading(true);
    try {
      const res = await api.post('/super-admin/companies', { name, modules });
      if (res.data.success) {
        toast.success('Company created!');
        onCreated(res.data.data);
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create company');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Create Company</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><FiX /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Acme Corp"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Modules</p>
            <div className="grid grid-cols-2 gap-2">
              {ALL_MODULES.map(m => (
                <ModuleCheckbox key={m.key} moduleKey={m.key} label={m.label} checked={modules.includes(m.key)} onChange={toggleModule} />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 dark:border-gray-600 rounded-xl py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl py-2 text-sm font-medium">
              {loading ? 'Creating...' : 'Create Company'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EditModulesModal = ({ company, onClose, onUpdated }) => {
  const [modules, setModules] = useState(company.modules || []);
  const [loading, setLoading] = useState(false);

  const toggleModule = (key, checked) =>
    setModules(prev => checked ? [...prev, key] : prev.filter(m => m !== key));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.put(`/super-admin/companies/${company._id}`, { modules });
      if (res.data.success) {
        toast.success('Modules updated!');
        onUpdated(res.data.data);
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Edit Modules — {company.name}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><FiX /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {ALL_MODULES.map(m => (
              <ModuleCheckbox key={m.key} moduleKey={m.key} label={m.label} checked={modules.includes(m.key)} onChange={toggleModule} />
            ))}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 dark:border-gray-600 rounded-xl py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl py-2 text-sm font-medium">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CreateAdminModal = ({ company, onClose }) => {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post(`/super-admin/companies/${company._id}/create-admin`, form);
      if (res.data.success) {
        toast.success(`Admin created: ${res.data.data.email}`);
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create admin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Create Admin — {company.name}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><FiX /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          {['name', 'email', 'password'].map(field => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 capitalize">{field}</label>
              <input
                type={field === 'password' ? 'password' : 'text'}
                value={form[field]}
                onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 dark:border-gray-600 rounded-xl py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl py-2 text-sm font-medium">
              {loading ? 'Creating...' : 'Create Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Companies = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editCompany, setEditCompany] = useState(null);
  const [createAdminFor, setCreateAdminFor] = useState(null);

  useEffect(() => {
    api.get('/super-admin/companies')
      .then(r => { if (r.data.success) setCompanies(r.data.data); })
      .catch(() => toast.error('Failed to load companies'))
      .finally(() => setLoading(false));
  }, []);

  const regenerateCode = async (company) => {
    try {
      const res = await api.post(`/super-admin/companies/${company._id}/regenerate-code`);
      if (res.data.success) {
        setCompanies(prev => prev.map(c => c._id === company._id ? res.data.data : c));
        toast.success('Invite link regenerated!');
      }
    } catch {
      toast.error('Failed to regenerate');
    }
  };

  const toggleActive = async (company) => {
    try {
      const res = await api.put(`/super-admin/companies/${company._id}`, { isActive: !company.isActive });
      if (res.data.success) setCompanies(prev => prev.map(c => c._id === company._id ? res.data.data : c));
      toast.success(res.data.data.isActive ? 'Company activated' : 'Company deactivated');
    } catch {
      toast.error('Failed to update');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Companies</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage tenants and their module access</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium"
        >
          <FiPlus className="w-4 h-4" /> New Company
        </button>
      </div>

      {companies.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center text-gray-400 border border-gray-100 dark:border-gray-700">
          No companies yet. Create your first one.
        </div>
      ) : (
        <div className="grid gap-4">
          {companies.map(company => (
            <div key={company._id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{company.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${company.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                      {company.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">slug: {company.slug}</p>

                  {/* Invite link */}
                  {company.inviteCode && (
                    <div className="mt-2 flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl px-3 py-2">
                      <FiLink className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="text-xs text-indigo-700 dark:text-indigo-300 font-mono flex-1 truncate">
                        {window.location.origin}/login?invite={company.inviteCode}
                      </span>
                      <button
                        onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/login?invite=${company.inviteCode}`); toast.success('Invite link copied!'); }}
                        className="p-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-800 text-indigo-500"
                        title="Copy invite link"
                      >
                        <FiCopy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => regenerateCode(company)}
                        className="p-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-800 text-indigo-500"
                        title="Regenerate code"
                      >
                        <FiRefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {company.modules.length === 0
                      ? <span className="text-xs text-gray-400">No modules assigned</span>
                      : company.modules.map(m => (
                        <span key={m} className="text-xs bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-800">
                          {ALL_MODULES.find(x => x.key === m)?.label || m}
                        </span>
                      ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => setCreateAdminFor(company)} title="Create Admin" className="p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600"><FiUserPlus className="w-4 h-4" /></button>
                  <button onClick={() => setEditCompany(company)} title="Edit Modules" className="p-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-600"><FiEdit2 className="w-4 h-4" /></button>
                  <button onClick={() => toggleActive(company)} title={company.isActive ? 'Deactivate' : 'Activate'} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
                    {company.isActive ? <FiToggleRight className="w-5 h-5 text-emerald-500" /> : <FiToggleLeft className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateCompanyModal
          onClose={() => setShowCreate(false)}
          onCreated={c => setCompanies(prev => [c, ...prev])}
        />
      )}
      {editCompany && (
        <EditModulesModal
          company={editCompany}
          onClose={() => setEditCompany(null)}
          onUpdated={c => setCompanies(prev => prev.map(x => x._id === c._id ? c : x))}
        />
      )}
      {createAdminFor && (
        <CreateAdminModal
          company={createAdminFor}
          onClose={() => setCreateAdminFor(null)}
        />
      )}
    </div>
  );
};

export default Companies;
