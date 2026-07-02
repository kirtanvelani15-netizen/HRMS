import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { employeeAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { FiEdit2, FiSave, FiCamera, FiUser, FiPhone, FiMapPin, FiBriefcase, FiCreditCard, FiCalendar, FiAward } from 'react-icons/fi';
import { formatDate, getInitials } from '../../utils/helpers';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});
  const fileRef = useRef();

  useEffect(() => {
    const load = async () => {
      if (user?.employee?._id || user?.employee) {
        try {
          const id = user.employee?._id || user.employee;
          const res = await employeeAPI.getById(id);
          if (res.data.success) {
            setEmployee(res.data.data);
            setForm({
              phone: res.data.data.phone,
              address: res.data.data.address || {},
              emergencyContact: res.data.data.emergencyContact || {},
              bankDetails: res.data.data.bankDetails || {}
            });
          }
        } finally { setLoading(false); }
      } else { setLoading(false); }
    };
    load();
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const id = employee?._id;
      const res = await employeeAPI.update(id, form);
      if (res.data.success) { setEmployee(res.data.data); setEditing(false); toast.success('Profile updated!'); }
    } catch (err) { toast.error('Failed to update profile'); }
    finally { setSaving(false); }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('photo', file);
    try {
      const res = await employeeAPI.uploadPhoto(employee._id, fd);
      if (res.data.success) { updateUser({ avatar: res.data.avatar }); toast.success('Photo updated!'); }
    } catch (err) { toast.error('Failed to upload photo'); }
  };

  if (loading) return <LoadingSpinner />;
  if (!employee) return <div className="text-center py-12 text-gray-500">Employee record not found.</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="page-title">My Profile</h1>
        {editing ? (
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
            <button onClick={() => setEditing(false)} className="btn-secondary text-sm flex-1 sm:flex-none justify-center">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary text-sm flex items-center gap-2 flex-1 sm:flex-none justify-center">
              <FiSave className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
            <button onClick={() => setEditing(true)} className="btn-secondary text-sm flex items-center gap-2 flex-1 sm:flex-none justify-center">
              <FiEdit2 className="w-4 h-4" /> Edit Profile
            </button>
          </div>
        )}
      </div>

      {/* Header */}
      <div className="card p-6">
        <div className="flex items-start gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden ring-4 ring-primary-100">
              {user?.avatar
                ? <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display='none'; }}/>
                : <span className="text-primary-700 font-bold text-2xl">{getInitials(user?.name)}</span>
              }
            </div>
            <button onClick={() => fileRef.current.click()} className="absolute bottom-0 right-0 w-7 h-7 bg-primary-700 rounded-full flex items-center justify-center shadow-lg hover:bg-primary-800 transition-colors">
              <FiCamera className="w-3.5 h-3.5 text-white" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{employee.firstName} {employee.lastName}</h2>
            <p className="text-gray-500">{employee.designation}</p>
            <p className="text-sm text-gray-400 mt-1">{employee.department?.name} • {employee.employeeId}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="badge bg-blue-100 text-blue-700 capitalize">{employee.employmentType}</span>
              <span className={`badge ${employee.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{employee.status}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Employment Details — read-only */}
      <div className="card p-6">
        <h3 className="section-title mb-4 flex items-center gap-2"><FiBriefcase className="w-5 h-5" /> Employment Details</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Employee ID</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{employee.employeeId || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Department</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{employee.department?.name || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Designation</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{employee.designation || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Employment Type</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white capitalize">{employee.employmentType || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Joining Date</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatDate(employee.joiningDate) || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Status</p>
            <span className={`badge text-xs ${employee.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{employee.status}</span>
          </div>
          {employee.reportingManager && (
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Reporting Manager</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {employee.reportingManager.firstName} {employee.reportingManager.lastName}
              </p>
            </div>
          )}
          {employee.workLocation && (
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Work Location</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white capitalize">{employee.workLocation}</p>
            </div>
          )}
        </div>
        {employee.skills?.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 mb-2 flex items-center gap-1"><FiAward className="w-3 h-3" /> Skills</p>
            <div className="flex flex-wrap gap-2">
              {employee.skills.map((skill, i) => (
                <span key={i} className="px-2 py-0.5 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 rounded-full text-xs font-medium">{skill}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Info */}
        <div className="card p-6">
          <h3 className="section-title mb-4 flex items-center gap-2"><FiUser className="w-5 h-5" /> Personal Information</h3>
          <div className="space-y-3 text-sm">
            <InfoRow label="Email" value={employee.email} />
            <InfoRow label="Joining Date" value={formatDate(employee.joiningDate)} />
            <InfoRow label="Date of Birth" value={formatDate(employee.dateOfBirth)} />
            <InfoRow label="Gender" value={employee.gender} className="capitalize" />
            <div>
              <label className="label">Phone</label>
              {editing ? <input value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} className="input-field" />
                : <p className="text-gray-900 dark:text-white">{employee.phone}</p>}
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="card p-6">
          <h3 className="section-title mb-4 flex items-center gap-2"><FiMapPin className="w-5 h-5" /> Address</h3>
          {editing ? (
            <div className="space-y-3">
              {['street', 'city', 'state', 'zipCode', 'country'].map(field => (
                <div key={field}>
                  <label className="label capitalize">{field}</label>
                  <input value={form.address?.[field] || ''} onChange={e => setForm({ ...form, address: { ...form.address, [field]: e.target.value } })} className="input-field" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              {employee.address?.street && <p>{employee.address.street}</p>}
              <p>{[employee.address?.city, employee.address?.state, employee.address?.zipCode].filter(Boolean).join(', ')}</p>
              <p>{employee.address?.country}</p>
              {!employee.address?.street && <p className="text-gray-400">No address on file</p>}
            </div>
          )}
        </div>

        {/* Emergency Contact */}
        <div className="card p-6">
          <h3 className="section-title mb-4 flex items-center gap-2"><FiPhone className="w-5 h-5" /> Emergency Contact</h3>
          {editing ? (
            <div className="space-y-3">
              {['name', 'relationship', 'phone'].map(field => (
                <div key={field}>
                  <label className="label capitalize">{field}</label>
                  <input value={form.emergencyContact?.[field] || ''} onChange={e => setForm({ ...form, emergencyContact: { ...form.emergencyContact, [field]: e.target.value } })} className="input-field" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <InfoRow label="Name" value={employee.emergencyContact?.name} />
              <InfoRow label="Relationship" value={employee.emergencyContact?.relationship} />
              <InfoRow label="Phone" value={employee.emergencyContact?.phone} />
            </div>
          )}
        </div>

        {/* Bank Details */}
        <div className="card p-6">
          <h3 className="section-title mb-4 flex items-center gap-2"><FiCreditCard className="w-5 h-5" /> Bank Details</h3>
          {editing ? (
            <div className="space-y-3">
              {['bankName', 'accountNumber', 'ifscCode', 'accountHolderName'].map(field => (
                <div key={field}>
                  <label className="label">{field.replace(/([A-Z])/g, ' $1').trim()}</label>
                  <input value={form.bankDetails?.[field] || ''} onChange={e => setForm({ ...form, bankDetails: { ...form.bankDetails, [field]: e.target.value } })} className="input-field" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <InfoRow label="Bank" value={employee.bankDetails?.bankName} />
              <InfoRow label="Account No." value={employee.bankDetails?.accountNumber ? `****${employee.bankDetails.accountNumber.slice(-4)}` : '-'} />
              <InfoRow label="IFSC" value={employee.bankDetails?.ifscCode} />
              <InfoRow label="Holder Name" value={employee.bankDetails?.accountHolderName} />
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

const InfoRow = ({ label, value, className }) => (
  <div className="flex justify-between">
    <span className="text-gray-500">{label}</span>
    <span className={`font-medium text-gray-900 dark:text-white ${className || ''}`}>{value || '-'}</span>
  </div>
);

export default Profile;
