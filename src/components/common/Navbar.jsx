import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { notificationAPI } from '../../services/api';
import {
  FiBell, FiCheck, FiMessageSquare, FiSun, FiMoon, FiMenu,
} from 'react-icons/fi';

const ROUTE_LABELS = {
  '/admin': 'Dashboard', '/admin/manage-hr': 'Manage HR', '/admin/employees': 'Employees',
  '/admin/departments': 'Departments', '/admin/attendance': 'Attendance', '/admin/leaves': 'Leave Management',
  '/admin/salary': 'Salary', '/admin/salary-master': 'Salary Master', '/admin/notices': 'Notices',
  '/admin/documents': 'Documents', '/admin/assets': 'Assets', '/admin/expenses': 'Expenses',
  '/admin/holidays': 'Holidays', '/admin/audit-log': 'Audit Log', '/admin/system-settings': 'System Settings',
  '/admin/performance/cycles': 'Performance Cycles', '/admin/performance/overview': 'Performance Overview',
  '/admin/performance/goals': 'Performance Goals', '/admin/worklog/approvals': 'Work Log Approvals',
  '/admin/worklog/reports': 'Work Log Reports', '/admin/recruitment': 'Recruitment',
  '/admin/training': 'Training', '/admin/shifts': 'Shifts', '/admin/exit': 'Exit Management',
  '/admin/grievances': 'Grievances', '/admin/letters': 'Letters', '/admin/settings': 'Settings',
  '/admin/worklog/log': 'Work Log', '/admin/worklog/projects': 'Work Log Projects',
  '/admin/directory': 'Directory', '/admin/performance/reviews': 'Performance Reviews',
  '/admin/analytics': 'System Analytics', '/admin/onboarding': 'Onboarding',
  '/hr/analytics': 'System Analytics', '/hr/onboarding': 'Onboarding',
  '/hr': 'Dashboard', '/hr/employees': 'Employees', '/hr/departments': 'Departments',
  '/hr/attendance': 'Attendance', '/hr/leaves': 'Leave Management', '/hr/salary': 'Salary',
  '/hr/salary-master': 'Salary Master', '/hr/notices': 'Notices', '/hr/documents': 'Documents',
  '/hr/assets': 'Assets', '/hr/holidays': 'Holidays', '/hr/directory': 'Directory',
  '/hr/expenses': 'Expenses', '/hr/settings': 'Settings', '/hr/chat': 'Chat',
  '/hr/performance/goals': 'Performance Goals', '/hr/performance/reviews': 'Performance Reviews',
  '/hr/worklog/log': 'Work Log', '/hr/worklog/approvals': 'Work Log Approvals',
  '/hr/worklog/reports': 'Work Log Reports', '/hr/recruitment': 'Recruitment',
  '/hr/training': 'Training', '/hr/shifts': 'Shifts', '/hr/exit': 'Exit Management',
  '/hr/grievances': 'Grievances', '/hr/letters': 'Letters',
  '/employee': 'Dashboard', '/employee/profile': 'My Profile', '/employee/attendance': 'Attendance',
  '/employee/leaves': 'Leave Requests', '/employee/salary': 'Payslips', '/employee/settings': 'Settings',
  '/employee/assets': 'My Assets', '/employee/chat': 'Chat', '/employee/holidays': 'Holidays',
  '/employee/directory': 'Directory', '/employee/expenses': 'Expenses',
  '/employee/notices': 'Notices', '/employee/documents': 'Documents',
  '/employee/performance/goals': 'Performance Goals', '/employee/performance/reviews': 'Performance Reviews',
  '/employee/worklog/log': 'Work Log', '/employee/worklog/approvals': 'Work Log Approvals',
  '/employee/grievances': 'Grievances', '/employee/shifts': 'My Shifts', '/employee/letters': 'My Letters',
};

const useHoverDropdown = (delay = 120) => {
  const [open, setOpen] = useState(false);
  const timerRef = useRef(null);
  const onMouseEnter = useCallback(() => { clearTimeout(timerRef.current); setOpen(true); }, []);
  const onMouseLeave = useCallback(() => { timerRef.current = setTimeout(() => setOpen(false), delay); }, [delay]);
  useEffect(() => () => clearTimeout(timerRef.current), []);
  return { open, onMouseEnter, onMouseLeave };
};

const ROLE_ACCENT = {
  admin:    { from: '#6366f1', light: '#eef2ff', lightText: '#4338ca' },
  hr:       { from: '#8b5cf6', light: '#f5f3ff', lightText: '#6d28d9' },
  employee: { from: '#0ea5e9', light: '#f0f9ff', lightText: '#0369a1' },
};

const Navbar = ({ onMenuClick }) => {
  const { user } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const location = useLocation();
  const pageTitle = ROUTE_LABELS[location.pathname] || '';
  const accent = ROLE_ACCENT[user?.role] || ROLE_ACCENT.admin;

  const notif = useHoverDropdown();

  const [notifications, setNotifications]   = useState([]);
  const [loadingNotif, setLoadingNotif]     = useState(false);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const fetchNotifications = useCallback(async () => {
    if (!user?.notificationsEnabled) return;
    setLoadingNotif(true);
    try {
      const res = await notificationAPI.getAll({ limit: 15 });
      setNotifications(res.data?.data || []);
    } catch {}
    finally { setLoadingNotif(false); }
  }, [user?.notificationsEnabled]);

  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, 60000);
    return () => clearInterval(id);
  }, [fetchNotifications]);

  useEffect(() => { if (notif.open) fetchNotifications(); }, [notif.open]);

  const handleMarkRead = async (id) => {
    try {
      await notificationAPI.markRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch {}
  };

  const chatLink = { admin: null, hr: '/hr/chat', employee: '/employee/chat' };

  const dark = darkMode;

  return (
    <header
      className="h-14 flex items-center justify-between px-5 sticky top-0 z-20"
      style={{
        background: dark ? 'rgba(12,12,20,0.85)' : 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(16px)',
        borderBottom: dark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.07)',
        boxShadow: dark ? '0 1px 12px rgba(0,0,0,0.35)' : '0 1px 8px rgba(0,0,0,0.05)',
      }}
    >
      {/* ── Left: mobile menu + page title ── */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onMenuClick}
          title="Menu"
          className={`lg:hidden w-8 h-8 shrink-0 rounded-lg flex items-center justify-center transition-all duration-150 ${
            dark ? 'text-gray-300 hover:text-white hover:bg-white/8' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <FiMenu size={18} />
        </button>
        {pageTitle ? (
          <h1 className={`text-[19px] font-bold tracking-tight truncate ${dark ? 'text-white' : 'text-gray-900'}`}>
            {pageTitle}
          </h1>
        ) : (
          <span className={`text-[13px] font-medium ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
            Employee Management System
          </span>
        )}
      </div>

      {/* ── Right: actions ── */}
      <div className="flex items-center gap-1">
        <span className={`hidden sm:block text-[12px] font-medium mr-2 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </span>

        {/* Dark mode icon toggle */}
        <button
          onClick={toggleDarkMode}
          title={dark ? 'Light mode' : 'Dark mode'}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 ${
            dark ? 'text-gray-400 hover:text-yellow-300 hover:bg-white/8' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          {dark ? <FiSun size={15} /> : <FiMoon size={15} />}
        </button>

        {/* Chat */}
        {chatLink[user?.role] && (
          <Link
            to={chatLink[user.role]}
            title="Chat"
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 ${
              dark ? 'text-gray-400 hover:text-gray-100 hover:bg-white/8' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <FiMessageSquare size={15} />
          </Link>
        )}

        {/* Notifications */}
        <div
          className="relative"
          onMouseEnter={notif.onMouseEnter}
          onMouseLeave={notif.onMouseLeave}
        >
          <button
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 relative ${
              dark ? 'text-gray-400 hover:text-gray-100 hover:bg-white/8' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <FiBell size={15} className={user?.notificationsEnabled ? '' : 'opacity-40'} />
            {user?.notificationsEnabled && unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[14px] h-3.5 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center px-0.5 leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {notif.open && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.97 }}
                transition={{ duration: 0.13 }}
                className="absolute right-0 top-full mt-2 w-80 rounded-2xl overflow-hidden z-30"
                style={{
                  background: dark ? 'rgba(15,15,24,0.97)' : '#ffffff',
                  border: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
                  boxShadow: dark ? '0 12px 40px rgba(0,0,0,0.55)' : '0 8px 28px rgba(0,0,0,0.10)',
                }}
              >
                <div className={`flex items-center justify-between px-4 py-3 ${dark ? 'border-b border-white/6' : 'border-b border-gray-100'}`}>
                  <p className={`font-semibold text-[13px] ${dark ? 'text-white' : 'text-gray-900'}`}>Notifications</p>
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} className="text-[11px] font-medium flex items-center gap-1" style={{ color: accent.from }}>
                      <FiCheck size={11} /> Mark all read
                    </button>
                  )}
                </div>

                {!user?.notificationsEnabled ? (
                  <div className={`p-6 text-center text-[13px] ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Notifications disabled</div>
                ) : loadingNotif ? (
                  <div className={`p-6 text-center text-[13px] ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Loading…</div>
                ) : notifications.length === 0 ? (
                  <div className={`p-6 text-center text-[13px] ${dark ? 'text-gray-500' : 'text-gray-400'}`}>No notifications</div>
                ) : (
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.map(n => (
                      <div
                        key={n._id}
                        onClick={() => handleMarkRead(n._id)}
                        className={`px-4 py-3 cursor-pointer transition-colors ${
                          !n.isRead
                            ? dark ? 'bg-white/4 hover:bg-white/7' : 'bg-indigo-50/60 hover:bg-indigo-50'
                            : dark ? 'hover:bg-white/5' : 'hover:bg-gray-50'
                        }`}
                        style={{ borderBottom: dark ? '1px solid rgba(255,255,255,0.04)' : '1px solid #f3f4f6' }}
                      >
                        <div className="flex items-start gap-2.5">
                          {!n.isRead && (
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: accent.from }} />
                          )}
                          <div className={!n.isRead ? '' : 'pl-4'}>
                            <p className={`text-[12.5px] font-medium leading-snug ${dark ? 'text-gray-100' : 'text-gray-900'}`}>{n.title}</p>
                            <p className={`text-[11.5px] mt-0.5 ${dark ? 'text-gray-500' : 'text-gray-500'}`}>{n.message}</p>
                            <p className={`text-[11px] mt-1 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>{new Date(n.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>


      </div>
    </header>
  );
};

export default Navbar;
