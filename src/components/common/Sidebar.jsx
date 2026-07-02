import { useState, useRef, useEffect, useCallback } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  FiGrid, FiUsers, FiCalendar, FiFileText,
  FiBell, FiSettings, FiLogOut,
  FiFolder, FiShield, FiUser, FiHome, FiBriefcase, FiMonitor, FiSliders, FiX,
  FiSunrise, FiActivity, FiTool, FiCreditCard, FiTrendingUp, FiClock,
  FiUserPlus, FiAward, FiAlertCircle, FiMail, FiChevronRight, FiChevronDown,
  FiPlus, FiStar, FiZap
} from 'react-icons/fi';
import { getInitials } from '../../utils/helpers';
import toast from 'react-hot-toast';

const RupeeIcon = ({ size = 18 }) => (
  <span style={{ fontSize: size * 0.85, fontWeight: 700, lineHeight: 1 }}>₹</span>
);

/* ── Role accents ─────────────────────────────────────── */
const ROLE_ACCENT = {
  superadmin: { from: '#f59e0b', to: '#d97706', glow: 'rgba(245,158,11,0.3)', light: '#fffbeb', lightText: '#b45309' },
  admin:    { from: '#6366f1', to: '#4f46e5', glow: 'rgba(99,102,241,0.3)',  light: '#eef2ff', lightText: '#4338ca' },
  hr:       { from: '#8b5cf6', to: '#7c3aed', glow: 'rgba(139,92,246,0.3)', light: '#f5f3ff', lightText: '#6d28d9' },
  employee: { from: '#0ea5e9', to: '#0284c7', glow: 'rgba(14,165,233,0.3)', light: '#f0f9ff', lightText: '#0369a1' },
};

/* ── Menu definitions ─────────────────────────────────── */
const adminMenu = [
  // ── Daily use ──
  { label: 'Dashboard', icon: FiGrid, to: '/admin' },
  {
    label: 'People', icon: FiUsers, group: true,
    children: [
      { label: 'Employees',   to: '/admin/employees' },
      { label: 'Departments', to: '/admin/departments' },
      { label: 'Manage HR',   to: '/admin/manage-hr' },
    ]
  },
  {
    label: 'Time & Attendance', icon: FiCalendar, group: true, module: 'attendance',
    children: [
      { label: 'Attendance', to: '/admin/attendance' },
      { label: 'Leave Management', to: '/admin/leaves' },
      { label: 'Shifts',     to: '/admin/shifts' },
      { label: 'Holidays',   to: '/admin/holidays' },
    ]
  },
  {
    label: 'Finance', icon: FiCreditCard, group: true, module: 'finance',
    children: [
      { label: 'Salary',        to: '/admin/salary' },
      { label: 'Salary Master', to: '/admin/salary-master' },
      { label: 'Expenses',      to: '/admin/expenses' },
    ]
  },
  // ── Regular use ──
  { label: 'Notices', icon: FiBell, to: '/admin/notices', module: 'notices' },
  {
    label: 'Documents & Assets', icon: FiFolder, group: true, module: 'documents',
    children: [
      { label: 'Documents', to: '/admin/documents' },
      { label: 'Assets',    to: '/admin/assets' },
      { label: 'Letters',   to: '/admin/letters' },
    ]
  },
  {
    label: 'Performance', icon: FiTrendingUp, group: true, module: 'performance',
    children: [
      { label: 'Cycles',   to: '/admin/performance/cycles' },
      { label: 'Overview', to: '/admin/performance/overview' },
      { label: 'Goals',    to: '/admin/performance/goals' },
      { label: 'Reviews',  to: '/admin/performance/reviews' },
    ]
  },
  {
    label: 'Work Log', icon: FiClock, group: true, module: 'worklog',
    children: [
      { label: 'My Work Log', to: '/admin/worklog/log' },
      { label: 'Approvals',   to: '/admin/worklog/approvals' },
      { label: 'Reports',     to: '/admin/worklog/reports' },
    ]
  },
  // ── Occasional use ──
  {
    label: 'HR Ops', icon: FiBriefcase, group: true,
    children: [
      { label: 'Recruitment', to: '/admin/recruitment', module: 'recruitment' },
      { label: 'Training',    to: '/admin/training',    module: 'training' },
      { label: 'Exit Management',   to: '/admin/exit',        module: 'exit' },
      { label: 'Grievances',  to: '/admin/grievances',  module: 'grievances' },
    ]
  },
  { label: 'Analytics',       icon: FiActivity, to: '/admin/analytics',       module: 'analytics' },
  { label: 'Onboarding',      icon: FiUsers,    to: '/admin/onboarding',      module: 'onboarding' },
  { label: 'Audit Log',       icon: FiActivity, to: '/admin/audit-log' },
  { label: 'System Settings', icon: FiTool,     to: '/admin/system-settings' },
  { label: 'Companies',       icon: FiShield,   to: '/admin/companies', superAdminOnly: true },
  { label: 'Settings',        icon: FiSettings, to: '/admin/settings' },
];

const hrMenu = [
  // ── Daily use ──
  { label: 'Dashboard', icon: FiGrid, to: '/hr' },
  {
    label: 'People', icon: FiUsers, group: true,
    children: [
      { label: 'Employees',   to: '/hr/employees' },
      { label: 'Departments', to: '/hr/departments' },
    ]
  },
  {
    label: 'Time & Attendance', icon: FiCalendar, group: true, module: 'attendance',
    children: [
      { label: 'Attendance', to: '/hr/attendance' },
      { label: 'Leave Management', to: '/hr/leaves' },
      { label: 'Shifts',     to: '/hr/shifts' },
      { label: 'Holidays',   to: '/hr/holidays' },
    ]
  },
  {
    label: 'Finance', icon: FiCreditCard, group: true, module: 'finance',
    children: [
      { label: 'Salary',               to: '/hr/salary' },
      { label: 'Salary Master',        to: '/hr/salary-master' },
      { label: 'Expenses',             to: '/hr/expenses' },
      { label: 'Statutory Compliance', to: '/hr/statutory-compliance' },
    ]
  },
  // ── Regular use ──
  { label: 'Notices', icon: FiBell, to: '/hr/notices', module: 'notices' },
  {
    label: 'Documents & Assets', icon: FiFolder, group: true, module: 'documents',
    children: [
      { label: 'Documents', to: '/hr/documents' },
      { label: 'Assets',    to: '/hr/assets' },
      { label: 'Letters',   to: '/hr/letters' },
    ]
  },
  {
    label: 'Performance', icon: FiTrendingUp, group: true, module: 'performance',
    children: [
      { label: 'Goals',   to: '/hr/performance/goals' },
      { label: 'Reviews', to: '/hr/performance/reviews' },
    ]
  },
  {
    label: 'Work Log', icon: FiClock, group: true, module: 'worklog',
    children: [
      { label: 'My Work Log', to: '/hr/worklog/log' },
      { label: 'Approvals',   to: '/hr/worklog/approvals' },
      { label: 'Reports',     to: '/hr/worklog/reports' },
    ]
  },
  // ── Occasional use ──
  {
    label: 'HR Ops', icon: FiBriefcase, group: true,
    children: [
      { label: 'Recruitment', to: '/hr/recruitment', module: 'recruitment' },
      { label: 'Training',    to: '/hr/training',    module: 'training' },
      { label: 'Exit Management',   to: '/hr/exit',        module: 'exit' },
      { label: 'Grievances',  to: '/hr/grievances',  module: 'grievances' },
    ]
  },
  { label: 'Analytics',  icon: FiActivity, to: '/hr/analytics',  module: 'analytics' },
  { label: 'Onboarding', icon: FiUserPlus, to: '/hr/onboarding', module: 'onboarding' },
  { label: 'Settings',   icon: FiSettings, to: '/hr/settings' },
];

const employeeMenu = [
  // ── Daily use ──
  { label: 'Dashboard',  icon: FiHome, to: '/employee' },
  {
    label: 'Time & Attendance', icon: FiCalendar, group: true, module: 'attendance',
    children: [
      { label: 'Attendance',     to: '/employee/attendance' },
      { label: 'Leave Requests', to: '/employee/leaves' },
      { label: 'My Shifts',      to: '/employee/shifts' },
      { label: 'Holidays',       to: '/employee/holidays' },
    ]
  },
  {
    label: 'Work Log', icon: FiClock, group: true, module: 'worklog',
    children: [
      { label: 'My Work Log', to: '/employee/worklog/log' },
      { label: 'Approvals',   to: '/employee/worklog/approvals' },
    ]
  },
  // ── Regular use ──
  { label: 'Notices', icon: FiBell, to: '/employee/notices', module: 'notices' },
  {
    label: 'Finance', icon: FiCreditCard, group: true, module: 'finance',
    children: [
      { label: 'Payslips', to: '/employee/salary' },
      { label: 'Expenses', to: '/employee/expenses' },
    ]
  },
  {
    label: 'Documents & Assets', icon: FiFolder, group: true, module: 'documents',
    children: [
      { label: 'Documents',  to: '/employee/documents' },
      { label: 'My Assets',  to: '/employee/assets' },
      { label: 'My Letters', to: '/employee/letters' },
    ]
  },
  {
    label: 'Performance', icon: FiTrendingUp, group: true, module: 'performance',
    children: [
      { label: 'My Goals',   to: '/employee/performance/goals' },
      { label: 'My Reviews', to: '/employee/performance/reviews' },
    ]
  },
  // ── Occasional use ──
  { label: 'Grievances', icon: FiBriefcase, to: '/employee/grievances', module: 'grievances' },
  { label: 'My Profile', icon: FiUser,      to: '/employee/profile' },
  { label: 'Settings',   icon: FiSettings,  to: '/employee/settings' },
];

const superadminMenu = [
  { label: 'Companies', icon: FiShield, to: '/superadmin/companies' },
  ...adminMenu.filter(item => !item.superAdminOnly),
];

const menuMap = { superadmin: superadminMenu, admin: adminMenu, hr: hrMenu, employee: employeeMenu };

/* ── Floating submenu for collapsed groups ────────────── */
const FloatingSubmenu = ({ label, children, anchorRef, onClose, dark, accent }) => {
  const [top, setTop] = useState(0);

  useEffect(() => {
    if (anchorRef.current) {
      const r = anchorRef.current.getBoundingClientRect();
      setTop(r.top);
    }
  }, [anchorRef]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: -6, scale: 0.97 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: -6, scale: 0.97 }}
        transition={{ duration: 0.13 }}
        style={{
          position: 'fixed', left: 68, top,
          zIndex: 9999,
          background: dark ? 'rgba(15,15,22,0.97)' : '#ffffff',
          border: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
          boxShadow: dark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 28px rgba(0,0,0,0.10)',
        }}
        className="rounded-2xl py-2 min-w-[172px] overflow-hidden backdrop-blur-xl"
      >
        <p className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest mb-0.5 border-b ${
          dark ? 'border-white/8 text-gray-500' : 'border-gray-100 text-gray-400'
        }`} style={{ color: accent.from }}>
          {label}
        </p>
        {children.map(c => (
          <NavLink
            key={c.to}
            to={c.to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-4 py-2 text-[12.5px] font-medium transition-all duration-100 ${
                isActive
                  ? dark ? 'text-white bg-white/8' : 'text-gray-900 bg-gray-50'
                  : dark ? 'text-gray-400 hover:text-white hover:bg-white/6' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: isActive ? accent.from : dark ? '#4b5563' : '#d1d5db' }} />
                {c.label}
              </>
            )}
          </NavLink>
        ))}
      </motion.div>
    </AnimatePresence>
  );
};

/* ── Collapsed nav item ───────────────────────────────── */
const CollapsedItem = ({ label, icon: Icon, to, dark, accent }) => {
  const ref = useRef(null);
  const [hovered, setHovered] = useState(false);
  const [top, setTop] = useState(0);

  const handleEnter = () => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      setTop(r.top + r.height / 2 - 12);
    }
    setHovered(true);
  };

  return (
    <div ref={ref} onMouseEnter={handleEnter} onMouseLeave={() => setHovered(false)} className="relative">
      <NavLink
        to={to}
        end={to?.split('/').length === 2}
        className={({ isActive }) =>
          `flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-150 ${
            isActive ? 'shadow-md' : dark ? 'text-gray-500 hover:text-gray-200 hover:bg-white/7' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
          }`
        }
        style={({ isActive }) => isActive ? {
          background: dark ? `${accent.from}22` : accent.light,
          color: accent.from,
          border: `1px solid ${accent.from}30`,
        } : {}}
      >
        <Icon size={17} className="shrink-0" />
      </NavLink>
      {hovered && (
        <span
          className={`pointer-events-none px-2.5 py-1 text-[11px] font-semibold rounded-lg whitespace-nowrap shadow-lg ${
            dark ? 'bg-gray-800 text-white border border-white/10' : 'bg-gray-900 text-white'
          }`}
          style={{ position: 'fixed', left: 72, top, zIndex: 99999 }}
        >
          {label}
        </span>
      )}
    </div>
  );
};

/* ── Collapsed group item ─────────────────────────────── */
const CollapsedGroup = ({ label, icon: Icon, children, dark, accent, onClose }) => {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [tooltipTop, setTooltipTop] = useState(0);
  const ref = useRef(null);
  const isActive = children.some(c => location.pathname.startsWith(c.to));

  const handleEnter = () => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      setTooltipTop(r.top + r.height / 2 - 12);
    }
    setOpen(true);
  };

  return (
    <div ref={ref} className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        onClick={() => {}}
        className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-150 ${
          isActive
            ? 'shadow-md'
            : dark ? 'text-gray-500 hover:text-gray-200 hover:bg-white/7' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
        }`}
        style={isActive ? {
          background: dark ? `${accent.from}22` : accent.light,
          color: accent.from,
          border: `1px solid ${accent.from}30`,
        } : {}}
      >
        <Icon size={17} />
      </button>
      {open && !children && (
        <span
          className={`pointer-events-none px-2.5 py-1 text-[11px] font-semibold rounded-lg whitespace-nowrap shadow-lg ${
            dark ? 'bg-gray-800 text-white border border-white/10' : 'bg-gray-900 text-white'
          }`}
          style={{ position: 'fixed', left: 72, top: tooltipTop, zIndex: 99999 }}
        >
          {label}
        </span>
      )}
      {open && (
        <FloatingSubmenu
          label={label}
          children={children}
          anchorRef={ref}
          onClose={() => { setOpen(false); onClose?.(); }}
          dark={dark}
          accent={accent}
        />
      )}
    </div>
  );
};

/* ── Expanded nav item ────────────────────────────────── */
const ExpandedItem = ({ label, icon: Icon, to, dark, accent, onClick }) => (
  <NavLink
    to={to}
    end={to?.split('/').length === 2}
    onClick={onClick}
    className={({ isActive }) =>
      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 group ${
        isActive ? 'shadow-sm' : dark ? 'text-gray-400 hover:text-gray-100 hover:bg-white/6' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100/80'
      }`
    }
    style={({ isActive }) => isActive ? {
      background: dark ? `${accent.from}18` : accent.light,
      color: accent.from,
      border: `1px solid ${accent.from}28`,
    } : {}}
  >
    {({ isActive }) => (
      <>
        <span className="shrink-0 transition-colors" style={isActive ? { color: accent.from } : {}}>
          <Icon size={15} />
        </span>
        <span className="flex-1 truncate">{label}</span>
        {isActive && (
          <span className="w-1.5 h-1.5 rounded-full shrink-0 ml-auto" style={{ background: accent.from }} />
        )}
      </>
    )}
  </NavLink>
);

/* ── Expanded group item ──────────────────────────────── */
const ExpandedGroup = ({ label, icon: Icon, children, dark, accent, onClick }) => {
  const location = useLocation();
  const isActive = children.some(c => location.pathname.startsWith(c.to));
  const [open, setOpen] = useState(isActive);

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 ${
          isActive
            ? ''
            : dark ? 'text-gray-400 hover:text-gray-100 hover:bg-white/6' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100/80'
        }`}
        style={isActive ? { color: accent.from, background: dark ? `${accent.from}12` : accent.light } : {}}
      >
        <Icon size={15} className="shrink-0" style={isActive ? { color: accent.from } : { color: dark ? '#6b7280' : '#9ca3af' }} />
        <span className="flex-1 text-left truncate">{label}</span>
        <motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.18 }}>
          <FiChevronRight size={12} style={{ color: dark ? '#4b5563' : '#d1d5db' }} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className={`ml-8 mt-0.5 pl-3 space-y-0.5 pb-1 border-l`}
              style={{ borderColor: dark ? 'rgba(255,255,255,0.07)' : '#e5e7eb' }}>
              {children.map(c => (
                <NavLink
                  key={c.to}
                  to={c.to}
                  onClick={onClick}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-100 ${
                      isActive
                        ? ''
                        : dark ? 'text-gray-500 hover:text-gray-200 hover:bg-white/5' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                    }`
                  }
                  style={({ isActive }) => isActive ? { color: accent.from, background: dark ? `${accent.from}12` : accent.light } : {}}
                >
                  {({ isActive }) => (
                    <>
                      <span className="w-1 h-1 rounded-full shrink-0"
                        style={{ background: isActive ? accent.from : dark ? '#4b5563' : '#d1d5db' }} />
                      {c.label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ── Sidebar content ──────────────────────────────────── */
const SidebarContent = ({ expanded, dark, accent, menu, user, onClose, isMobile }) => {
  const navigate = useNavigate();
  const { logout, hasModule } = useAuth();

  // Filter menu items by module access and superAdminOnly flag
  const filteredMenu = menu.map(item => {
    if (item.superAdminOnly && !user?.isSuperAdmin) return null;
    if (item.module && !hasModule(item.module)) return null;
    if (item.group && item.children) {
      const visibleChildren = item.children.filter(c => !c.module || hasModule(c.module));
      if (visibleChildren.length === 0) return null;
      return { ...item, children: visibleChildren };
    }
    return item;
  }).filter(Boolean);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-full select-none">

      {/* ── User profile strip (expanded only) ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0 overflow-hidden"
          >
            <div className="px-3 py-4 flex items-center gap-3"
              style={{ borderBottom: dark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)' }}>
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 overflow-hidden text-white font-semibold text-sm"
                style={{ background: accent.from }}
              >
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  getInitials(user?.name || 'User')
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate ${dark ? 'text-white' : 'text-gray-900'}`}>
                  {user?.name || 'User'}
                </p>
                <p className={`text-xs truncate ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {user?.role || 'Employee'}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Nav ── */}
      <nav
        className="flex-1 overflow-y-auto py-2 space-y-0.5"
        style={{
          scrollbarWidth: 'none',
          padding: expanded ? '8px 10px' : '8px 8px',
        }}
      >
        {filteredMenu.map(item =>
          item.group
            ? expanded
              ? <ExpandedGroup key={item.label} {...item} dark={dark} accent={accent} onClick={onClose} />
              : <CollapsedGroup key={item.label} {...item} dark={dark} accent={accent} onClose={onClose} />
            : expanded
              ? <ExpandedItem key={item.to} {...item} dark={dark} accent={accent} onClick={onClose} />
              : <CollapsedItem key={item.to} {...item} dark={dark} accent={accent} />
        )}
      </nav>

      {/* ── Footer ── */}
      <div
        className="shrink-0 pb-4 pt-2"
        style={{
          borderTop: dark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
          padding: expanded ? '8px 10px 16px' : '8px 8px 16px',
        }}
      >
        <button
          onClick={handleLogout}
          title="Sign Out"
          className={`flex items-center gap-3 rounded-xl text-[13px] font-medium transition-all duration-150 group ${
            dark ? 'text-gray-500 hover:text-red-400 hover:bg-red-500/8' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
          } ${expanded ? 'w-full px-3 py-2.5' : 'w-10 h-10 justify-center'}`}
        >
          <FiLogOut size={15} className="shrink-0" />
          {expanded && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );
};

/* ── Root Sidebar ─────────────────────────────────────── */
const COLLAPSED_W = 64;
const EXPANDED_W  = 248;

const Sidebar = ({ mobileOpen, onClose, onExpandChange }) => {
  const [expanded, setExpanded] = useState(false);
  const { darkMode } = useTheme();
  const { user } = useAuth();

  const dark   = darkMode;
  const accent = ROLE_ACCENT[user?.role] || ROLE_ACCENT.admin;
  const menu   = menuMap[user?.role] || [];

  const bg = dark
    ? 'linear-gradient(180deg, #0f0f18 0%, #0c0c14 100%)'
    : '#f9fafb';
  const borderRight = dark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e5e7eb';
  const boxShadow   = dark ? '4px 0 20px rgba(0,0,0,0.45)' : '4px 0 16px rgba(0,0,0,0.05)';

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    onExpandChange?.(next);
  };

  return (
    <>
      {/* ── Desktop ── */}
      <motion.aside
        animate={{ width: expanded ? EXPANDED_W : COLLAPSED_W }}
        transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
        className="hidden lg:block fixed left-0 top-0 h-screen z-30 overflow-visible"
        style={{ background: bg, borderRight, boxShadow }}
      >
        <SidebarContent
          expanded={expanded}
          dark={dark}
          accent={accent}
          menu={menu}
          user={user}
        />

        {/* Toggle pill */}
        <button
          onClick={toggle}
          title={expanded ? 'Collapse' : 'Expand'}
          className={`hidden lg:flex absolute -right-3 top-[68px] z-40 w-6 h-6 items-center justify-center rounded-full shadow-md transition-all duration-150 ${
            dark
              ? 'bg-gray-800 border border-white/10 text-gray-400 hover:bg-gray-700 hover:text-white'
              : 'bg-white border border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-700'
          }`}
        >
          <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.25 }}>
            <FiChevronRight size={12} />
          </motion.span>
        </button>
      </motion.aside>

      {/* ── Mobile overlay ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className={`fixed inset-0 backdrop-blur-sm z-40 lg:hidden ${dark ? 'bg-black/55' : 'bg-black/35'}`}
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -EXPANDED_W }} animate={{ x: 0 }} exit={{ x: -EXPANDED_W }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            className="fixed left-0 top-0 h-screen z-50 lg:hidden overflow-hidden"
            style={{ width: EXPANDED_W, background: bg, borderRight, boxShadow: '8px 0 28px rgba(0,0,0,0.14)' }}
          >
            {/* close button */}
            <button
              onClick={onClose}
              className={`absolute top-3.5 right-3 z-10 p-1.5 rounded-lg transition-colors ${
                dark ? 'text-gray-400 hover:text-white hover:bg-white/8' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <FiX size={15} />
            </button>
            <SidebarContent
              expanded={true}
              dark={dark}
              accent={accent}
              menu={menu}
              user={user}
              onClose={onClose}
              isMobile
            />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
