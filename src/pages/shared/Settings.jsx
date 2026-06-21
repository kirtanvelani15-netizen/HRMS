import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { authAPI, notificationAPI, systemConfigAPI, fingerprintAPI } from '../../services/api';
import { FiEdit2, FiLock, FiMoon, FiSun, FiUser, FiSave, FiEye, FiEyeOff, FiShield, FiX, FiBell, FiCamera, FiLink, FiCopy, FiRefreshCw, FiMonitor, FiTrash2, FiPlus } from 'react-icons/fi';
import { getInitials } from '../../utils/helpers';
import toast from 'react-hot-toast';

const Settings = () => {
  const { user, updateUser } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: user?.name || '' });
  const [activeTab, setActiveTab] = useState('profile');
  const [togglingNotif, setTogglingNotif] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarFileRef = useRef();
  const isAdmin = user?.role === 'admin';

  // Device tokens state
  const [deviceTokens, setDeviceTokens] = useState([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [newTokenLabel, setNewTokenLabel] = useState('');
  const [generatingToken, setGeneratingToken] = useState(false);
  const [revealedTokens, setRevealedTokens] = useState({});

  const loadDeviceTokens = async () => {
    setLoadingTokens(true);
    try {
      const res = await fingerprintAPI.getDeviceTokens();
      setDeviceTokens(res.data.data || []);
    } catch {
      toast.error('Failed to load device tokens');
    } finally {
      setLoadingTokens(false);
    }
  };

  const handleGenerateToken = async (e) => {
    e.preventDefault();
    if (!newTokenLabel.trim()) return toast.error('Enter a label for the device');
    setGeneratingToken(true);
    try {
      const res = await fingerprintAPI.generateDeviceToken(newTokenLabel.trim());
      const newToken = res.data.data;
      setDeviceTokens(prev => [newToken, ...prev]);
      setRevealedTokens(prev => ({ ...prev, [newToken._id]: true }));
      setNewTokenLabel('');
      toast.success('Device token generated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate token');
    } finally {
      setGeneratingToken(false);
    }
  };

  const handleDeleteToken = async (id) => {
    if (!confirm('Delete this device token? The device using it will lose access.')) return;
    try {
      await fingerprintAPI.deleteDeviceToken(id);
      setDeviceTokens(prev => prev.filter(t => t._id !== id));
      toast.success('Token deleted');
    } catch {
      toast.error('Failed to delete token');
    }
  };

  // Settings PIN state
  const [pinSet, setPinSet] = useState(false);
  const [pinForm, setPinForm] = useState({ pin: '', confirm: '' });
  const [showPin, setShowPin] = useState(false);
  const [savingPin, setSavingPin] = useState(false);

  const handleSavePin = async (e) => {
    e.preventDefault();
    if (pinForm.pin.length < 4) return toast.error('PIN must be at least 4 characters');
    if (pinForm.pin !== pinForm.confirm) return toast.error('PINs do not match');
    setSavingPin(true);
    try {
      await fingerprintAPI.setSettingsPin(pinForm.pin);
      setPinSet(true);
      setPinForm({ pin: '', confirm: '' });
      toast.success('Settings PIN saved!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save PIN');
    } finally {
      setSavingPin(false);
    }
  };

  const startProfileEdit = () => {
    setProfileForm({ name: user?.name || '' });
    setEditingProfile(true);
  };

  const cancelProfileEdit = () => {
    setProfileForm({ name: user?.name || '' });
    setEditingProfile(false);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('photo', file);
    setUploadingAvatar(true);
    try {
      const res = await authAPI.uploadAvatar(fd);
      if (res.data.success) {
        updateUser({ avatar: res.data.avatar });
        toast.success('Profile picture updated!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload photo');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!profileForm.name.trim()) return toast.error('Name is required');

    setSavingProfile(true);
    try {
      const res = await authAPI.updateProfile({
        name: profileForm.name.trim()
      });

      if (res.data.success) {
        updateUser(res.data.data);
        setEditingProfile(false);
        toast.success('Profile updated successfully!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!pwForm.currentPassword || !pwForm.newPassword) return toast.error('Fill in all fields');
    if (pwForm.newPassword.length < 6) return toast.error('Password must be at least 6 characters');
    if (pwForm.newPassword !== pwForm.confirmPassword) return toast.error('Passwords do not match');
    setSaving(true);
    try {
      const res = await authAPI.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      if (res.data.success) { toast.success('Password changed successfully!'); setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to change password'); }
    finally { setSaving(false); }
  };

  const handleToggleNotifications = async () => {
    setTogglingNotif(true);
    try {
      const res = await notificationAPI.toggle();
      updateUser({ ...user, notificationsEnabled: res.data.notificationsEnabled });
      toast.success(`Notifications ${res.data.notificationsEnabled ? 'enabled' : 'disabled'}`);
    } catch {
      toast.error('Failed to update notification settings');
    } finally {
      setTogglingNotif(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: FiUser },
    { id: 'security', label: 'Security', icon: FiShield },
    { id: 'appearance', label: 'Appearance', icon: FiSun },
    { id: 'notifications', label: 'Notifications', icon: FiBell },
    ...(isAdmin && user?.company ? [{ id: 'invite', label: 'Invite Link', icon: FiLink }] : []),
    ...(isAdmin ? [{ id: 'device-tokens', label: 'Device Tokens', icon: FiMonitor }] : []),
  ];

  useEffect(() => {
    if (activeTab === 'device-tokens' && isAdmin) {
      loadDeviceTokens();
      fingerprintAPI.getPinStatus().then(r => setPinSet(r.data.pinSet)).catch(() => {});
    }
  }, [activeTab]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="page-title">Settings</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === id ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {activeTab === 'profile' && (
        <div className="card p-6 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <h3 className="section-title">Profile Information</h3>
            {editingProfile ? (
              <button onClick={cancelProfileEdit} className="btn-secondary flex items-center gap-2 text-sm">
                <FiX className="w-4 h-4" /> Cancel
              </button>
            ) : (
              <button onClick={startProfileEdit} className="btn-primary flex items-center gap-2 text-sm">
                <FiEdit2 className="w-4 h-4" /> Edit Profile
              </button>
            )}
          </div>
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden ring-4 ring-primary-50">
                {user?.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : <span className="text-primary-700 font-bold text-xl">{getInitials(user?.name)}</span>}
              </div>
              <button
                type="button"
                onClick={() => avatarFileRef.current.click()}
                disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 w-7 h-7 bg-primary-700 rounded-full flex items-center justify-center shadow-lg hover:bg-primary-800 transition-colors disabled:opacity-60"
                title="Change profile picture"
              >
                {uploadingAvatar ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FiCamera className="w-3.5 h-3.5 text-white" />}
              </button>
              <input ref={avatarFileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{editingProfile ? profileForm.name || 'Your name' : user?.name}</p>
              <p className="text-gray-500">{user?.email}</p>
              <span className="badge bg-primary-100 text-primary-700 capitalize mt-1">{user?.role}</span>
            </div>
          </div>

          {editingProfile ? (
            <form onSubmit={handleProfileSave} className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Full Name</label>
                  <input
                    value={profileForm.name}
                    onChange={e => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                    className="input-field"
                    placeholder="Full Name"
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <p className="text-gray-900 dark:text-white font-medium">{user?.email}</p>
                </div>
                <div>
                  <label className="label">Role</label>
                  <p className="text-gray-900 dark:text-white font-medium capitalize">{user?.role}</p>
                </div>
              </div>
              <button type="submit" disabled={savingProfile} className="btn-primary flex items-center gap-2">
                <FiSave className="w-4 h-4" /> {savingProfile ? 'Saving...' : 'Save Profile'}
              </button>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <div>
                <label className="label">Full Name</label>
                <p className="text-gray-900 dark:text-white font-medium">{user?.name}</p>
              </div>
              <div>
                <label className="label">Email</label>
                <p className="text-gray-900 dark:text-white font-medium">{user?.email}</p>
              </div>
              <div>
                <label className="label">Role</label>
                <p className="text-gray-900 dark:text-white font-medium capitalize">{user?.role}</p>
              </div>
              <div>
                <label className="label">Last Login</label>
                <p className="text-gray-900 dark:text-white font-medium">{user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'N/A'}</p>
              </div>
            </div>
          )}

          {user?.role === 'employee' && (
            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500">To update personal details like phone, address or bank info, go to <strong>My Profile</strong>.</p>
            </div>
          )}
        </div>
      )}

      {/* Security tab */}
      {activeTab === 'security' && (
        <div className="card p-6">
          <h3 className="section-title mb-6 flex items-center gap-2"><FiLock className="w-5 h-5" /> Change Password</h3>
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
            {[
              { field: 'currentPassword', label: 'Current Password' },
              { field: 'newPassword', label: 'New Password' },
              { field: 'confirmPassword', label: 'Confirm New Password' }
            ].map(({ field, label }) => (
              <div key={field}>
                <label className="label">{label}</label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={pwForm[field]}
                    onChange={e => setPwForm({ ...pwForm, [field]: e.target.value })}
                    className="input-field pl-9 pr-10"
                    placeholder={label}
                  />
                  {field === 'currentPassword' && (
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPw ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div className="pt-2">
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                <FiSave className="w-4 h-4" /> {saving ? 'Saving...' : 'Change Password'}
              </button>
            </div>
          </form>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Password Requirements</p>
            <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
              <li>• At least 6 characters long</li>
              <li>• Use a mix of uppercase and lowercase letters</li>
              <li>• Include numbers and special characters for better security</li>
            </ul>
          </div>
        </div>
      )}

      {/* Notifications tab */}
      {activeTab === 'notifications' && (
        <div className="card p-6 space-y-6">
          <h3 className="section-title">Notification Settings</h3>

          {/* Master toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <div className="flex items-center gap-3">
              <FiBell className={`w-6 h-6 ${user?.notificationsEnabled ? 'text-primary-500' : 'text-gray-400'}`} />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">In-app Notifications</p>
                <p className="text-sm text-gray-500">{user?.notificationsEnabled ? 'You will receive notifications for key events' : 'All notifications are muted'}</p>
              </div>
            </div>
            <button
              onClick={handleToggleNotifications}
              disabled={togglingNotif}
              className={`relative w-12 h-6 rounded-full transition-colors ${user?.notificationsEnabled ? 'bg-primary-600' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${user?.notificationsEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Granular preferences — shown only when notifications are on */}
          {user?.notificationsEnabled && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Notify me when…</p>
              {[
                { key: 'leaveStatus',   label: 'Leave request is approved or rejected',  desc: 'Get notified on any decision about your leave' },
                { key: 'salaryCredited', label: 'Salary is marked as paid',               desc: 'Receive a notification when your payslip status changes to paid' },
                { key: 'newNotice',     label: 'A new notice is published',               desc: 'Company announcements and policy updates' },
                { key: 'attendanceAlert', label: 'Attendance irregularity is flagged',    desc: 'Late arrivals, missed punches, or absent marks' },
              ].map(({ key, label, desc }) => {
                const prefs = user?.notificationPrefs || {};
                const enabled = prefs[key] !== false; // default on
                return (
                  <div key={key} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                    </div>
                    <button
                      onClick={async () => {
                        const updated = { ...(user?.notificationPrefs || {}), [key]: !enabled };
                        try {
                          await authAPI.updateProfile({ notificationPrefs: updated });
                          updateUser({ ...user, notificationPrefs: updated });
                        } catch { toast.error('Failed to save preference'); }
                      }}
                      className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ml-4 ${enabled ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Invite Link tab — admin only */}
      {activeTab === 'invite' && isAdmin && user?.company && (
        <div className="card p-6 space-y-4">
          <h3 className="section-title">Employee Invite Link</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Share this link with your employees. When they click it, the signup form opens with your company pre-filled automatically.
          </p>
          {user.company?.inviteCode ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl px-4 py-3">
                <FiLink className="w-4 h-4 text-indigo-500 shrink-0" />
                <span className="text-sm text-indigo-700 dark:text-indigo-300 font-mono flex-1 break-all">
                  {window.location.origin}/login?invite={user.company.inviteCode}
                </span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/login?invite=${user.company.inviteCode}`);
                  toast.success('Invite link copied!');
                }}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium"
              >
                <FiCopy className="w-4 h-4" /> Copy Invite Link
              </button>
              <p className="text-xs text-gray-400">Invite Code: <span className="font-mono font-semibold">{user.company.inviteCode}</span></p>
            </div>
          ) : (
            <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 rounded-xl">No invite code assigned yet. Contact the Super Admin.</p>
          )}
        </div>
      )}

      {/* Device Tokens tab — admin only */}
      {activeTab === 'device-tokens' && isAdmin && (
        <div className="space-y-6">
          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="section-title flex items-center gap-2"><FiMonitor className="w-5 h-5" /> Device Tokens</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Tokens used by fingerprint attendance scanners to authenticate with the system.</p>
              </div>
              <button onClick={loadDeviceTokens} disabled={loadingTokens} className="btn-secondary flex items-center gap-2 text-sm">
                <FiRefreshCw className={`w-4 h-4 ${loadingTokens ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>

            {/* Generate new token */}
            <form onSubmit={handleGenerateToken} className="flex gap-2">
              <input
                value={newTokenLabel}
                onChange={e => setNewTokenLabel(e.target.value)}
                placeholder="Device label (e.g. Main Entrance Scanner)"
                className="input-field flex-1"
              />
              <button type="submit" disabled={generatingToken} className="btn-primary flex items-center gap-2 whitespace-nowrap">
                <FiPlus className="w-4 h-4" /> {generatingToken ? 'Generating...' : 'Generate'}
              </button>
            </form>
          </div>

          {/* Token list */}
          {loadingTokens ? (
            <div className="card p-6 text-center text-gray-400">Loading tokens...</div>
          ) : deviceTokens.length === 0 ? (
            <div className="card p-6 text-center text-gray-400">
              <FiMonitor className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No device tokens yet. Generate one above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {deviceTokens.map(t => (
                <div key={t._id} className="card p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FiMonitor className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900 dark:text-white">{t.label}</span>
                      <span className={`badge text-xs ${t.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {t.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setRevealedTokens(prev => ({ ...prev, [t._id]: !prev[t._id] }))}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
                        title={revealedTokens[t._id] ? 'Hide token' : 'Show token'}
                      >
                        {revealedTokens[t._id] ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => { navigator.clipboard.writeText(t.token); toast.success('Token copied!'); }}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
                        title="Copy token"
                      >
                        <FiCopy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteToken(t._id)}
                        className="text-red-400 hover:text-red-600 p-1"
                        title="Delete token"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="font-mono text-xs bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 break-all text-gray-600 dark:text-gray-300">
                    {revealedTokens[t._id] ? t.token : '••••••••••••••••••••••••••••••••••••••••••••••••'}
                  </div>
                  <div className="flex gap-4 text-xs text-gray-400">
                    <span>Created: {new Date(t.createdAt).toLocaleString()}</span>
                    {t.lastUsed && <span>Last used: {new Date(t.lastUsed).toLocaleString()}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Settings PIN section */}
          <div className="card p-6 space-y-4 border-t-0">
            <div>
              <h3 className="section-title flex items-center gap-2"><FiShield className="w-5 h-5" /> Scanner Settings PIN</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Protect the Settings button on the fingerprint scanner device. Anyone who clicks Settings on the exe must enter this PIN.
              </p>
            </div>
            {!pinSet ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl text-sm text-amber-700 dark:text-amber-400">
                <FiShield className="w-4 h-4 shrink-0" /> Settings are currently <strong className="ml-1">unprotected</strong> — set a PIN below.
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl text-sm text-green-700 dark:text-green-400">
                <FiShield className="w-4 h-4 shrink-0" /> PIN is <strong className="ml-1">active</strong> — scanner Settings are protected.
              </div>
            )}
            <form onSubmit={handleSavePin} className="space-y-3 max-w-sm">
              <div>
                <label className="label">New PIN (min 4 characters)</label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={pinForm.pin}
                    onChange={e => setPinForm(p => ({ ...p, pin: e.target.value }))}
                    className="input-field pl-9 pr-10"
                    placeholder="Enter new PIN"
                  />
                  <button type="button" onClick={() => setShowPin(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPin ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Confirm PIN</label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={pinForm.confirm}
                    onChange={e => setPinForm(p => ({ ...p, confirm: e.target.value }))}
                    className="input-field pl-9"
                    placeholder="Confirm PIN"
                  />
                </div>
              </div>
              <button type="submit" disabled={savingPin} className="btn-primary flex items-center gap-2">
                <FiSave className="w-4 h-4" /> {savingPin ? 'Saving...' : pinSet ? 'Change PIN' : 'Set PIN'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Appearance tab */}
      {activeTab === 'appearance' && (
        <div className="card p-6 space-y-6">
          <h3 className="section-title">Appearance Settings</h3>
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <div className="flex items-center gap-3">
              {darkMode ? <FiMoon className="w-6 h-6 text-indigo-500" /> : <FiSun className="w-6 h-6 text-amber-500" />}
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{darkMode ? 'Dark Mode' : 'Light Mode'}</p>
                <p className="text-sm text-gray-500">{darkMode ? 'Using dark theme' : 'Using light theme'}</p>
              </div>
            </div>
            <button onClick={toggleDarkMode}
              className={`relative w-12 h-6 rounded-full transition-colors ${darkMode ? 'bg-primary-600' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
