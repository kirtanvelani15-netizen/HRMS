import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { reportAPI, documentAPI, salaryAPI, auditAPI, employeeAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  FiUsers, FiUserCheck, FiCalendar, FiFileText, FiDollarSign, FiBriefcase,
  FiTrendingUp, FiTrendingDown, FiShield, FiSettings, FiActivity,
  FiAlertCircle, FiArrowRight, FiGrid, FiRefreshCw, FiChevronDown, FiChevronUp,
  FiGift, FiAward, FiClock, FiCheckCircle, FiAlertTriangle
} from 'react-icons/fi';
import { formatCurrency, getInitials } from '../../utils/helpers';
import { CHART_COLORS, CHART_TOOLTIP_STYLE, CHART_GRID_COLOR } from '../../utils/chartColors';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, LineChart, Line
} from 'recharts';

const COLLAPSED_KEY = 'adminDashboardCollapsed';

// ── Sub-components ──────────────────────────────────────────────────────────

const StatCard = ({ title, value, subtitle, icon: Icon, color = '#8b5cf6', trend, trendUp, to, children }) => (
  <div
    className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col gap-3 overflow-hidden"
  >
    <div className="flex items-center justify-between">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-gray-100 dark:bg-gray-700">
        <Icon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
      </div>
      {trend !== undefined && (
        <span className="flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
          {trendUp ? <FiTrendingUp className="w-3 h-3" /> : <FiTrendingDown className="w-3 h-3" />}
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    <div>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{title}</p>
      <p className="text-3xl font-bold text-gray-900 dark:text-white mt-0.5">{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
    {children}
    {to && !children && (
      <Link to={to} className="flex items-center gap-1 text-xs font-medium mt-auto text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
        View details <FiArrowRight className="w-3 h-3" />
      </Link>
    )}
  </div>
);

const SectionCard = ({ id, title, subtitle, children, action, collapsed, onToggle }) => (
  <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
    <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700">
      <div>
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{title}</p>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {action}
        {id && (
          <button onClick={() => onToggle(id)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            {collapsed ? <FiChevronDown size={16} /> : <FiChevronUp size={16} />}
          </button>
        )}
      </div>
    </div>
    {!collapsed && <div className="p-5">{children}</div>}
  </div>
);

const timeAgo = (date) => {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const actionIcon = (action = '') => {
  if (action.includes('DELETE') || action.includes('REMOVE')) return { icon: FiAlertCircle, color: '#ef4444' };
  if (action.includes('LEAVE') || action.includes('APPROVE')) return { icon: FiCheckCircle, color: '#10b981' };
  if (action.includes('SALARY') || action.includes('PAYROLL')) return { icon: FiDollarSign, color: '#8b5cf6' };
  if (action.includes('HR') || action.includes('REGISTER')) return { icon: FiShield, color: '#ec4899' };
  return { icon: FiActivity, color: '#6366f1' };
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

// ── Main Component ───────────────────────────────────────────────────────────

const AdminDashboard = () => {
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const [data, setData] = useState(null);
  const [pendingSalaries, setPendingSalaries] = useState(0);
  const [unverifiedDocs, setUnverifiedDocs] = useState(0);
  const [activityFeed, setActivityFeed] = useState([]);
  const [celebrations, setCelebrations] = useState({ birthdays: [], anniversaries: [] });
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [celebTab, setCelebTab] = useState('birthdays');
  const [collapsed, setCollapsed] = useState(() => {
    try { return JSON.parse(localStorage.getItem(COLLAPSED_KEY)) || {}; } catch { return {}; }
  });

  const toggleCollapse = useCallback((id) => {
    setCollapsed(prev => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(COLLAPSED_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [overviewRes, salaryRes, docsRes, auditRes, celebRes] = await Promise.allSettled([
        reportAPI.getOverview(),
        salaryAPI.getAll({ paymentStatus: 'pending', limit: 1 }),
        documentAPI.getAll({ isVerified: false, limit: 1 }),
        auditAPI.getAll({ limit: 8 }),
        employeeAPI.getCelebrations(),
      ]);
      if (overviewRes.status === 'fulfilled' && overviewRes.value.data.success)
        setData(overviewRes.value.data.data);
      if (salaryRes.status === 'fulfilled')
        setPendingSalaries(salaryRes.value.data?.total || 0);
      if (docsRes.status === 'fulfilled')
        setUnverifiedDocs(docsRes.value.data?.total || 0);
      if (auditRes.status === 'fulfilled')
        setActivityFeed(auditRes.value.data?.data || []);
      if (celebRes.status === 'fulfilled')
        setCelebrations(celebRes.value.data?.data || { birthdays: [], anniversaries: [] });
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <LoadingSpinner text="Loading dashboard..." />;

  // ── Derived data ──────────────────────────────────────────────────────────

  const leaveStats = data?.leaveStats || [];
  const approved = leaveStats.find(l => l._id === 'approved')?.count || 0;
  const pending = leaveStats.find(l => l._id === 'pending')?.count || 0;
  const cancelled = leaveStats.find(l => l._id === 'cancelled')?.count || 0;
  const rejected = leaveStats.find(l => l._id === 'rejected')?.count || 0;
  const totalApps = approved + pending + cancelled + rejected || 1;
  const appData = [
    { name: 'Approved', count: approved, pct: Math.round((approved / totalApps) * 100), color: CHART_COLORS[0] },
    { name: 'Pending', count: pending, pct: Math.round((pending / totalApps) * 100), color: CHART_COLORS[2] },
    { name: 'Cancelled', count: cancelled, pct: Math.round((cancelled / totalApps) * 100), color: CHART_COLORS[4] },
    { name: 'Rejected', count: rejected, pct: Math.round((rejected / totalApps) * 100), color: CHART_COLORS[3] },
  ];

  const totalEmp = data?.totalEmployees || 0;
  const presentToday = data?.presentToday || 0;
  const absentToday = Math.max(0, totalEmp - presentToday);
  const attendanceRate = data?.attendanceRate ?? (totalEmp > 0 ? Math.round((presentToday / totalEmp) * 100) : 0);
  const attendanceColor = attendanceRate >= 80 ? '#10b981' : attendanceRate >= 60 ? '#f59e0b' : '#ef4444';

  const workingFormatData = [
    { name: 'Present', value: presentToday },
    { name: 'Absent', value: absentToday },
  ];
  const staffTurnover = (data?.salaryTrend || []).map(m => ({ month: m.month, value: Math.round(m.netSalary / 1000) || 0 }));

  const payrollPaid = data?.payrollPaid || 0;
  const payrollTotal = data?.payrollTotal || 0;
  const payrollPct = payrollTotal > 0 ? Math.round((payrollPaid / payrollTotal) * 100) : 0;

  const pendingActions = [
    { label: 'Pending Leaves', count: data?.pendingLeaves || 0, to: '/admin/leaves', color: '#f59e0b', icon: FiFileText },
    { label: 'Unverified Documents', count: unverifiedDocs, to: '/admin/documents', color: '#f97316', icon: FiFileText },
    { label: 'Pending Salaries', count: pendingSalaries, to: '/admin/salary', color: '#8b5cf6', icon: FiDollarSign },
  ];

  const refreshedText = lastRefreshed
    ? `Updated ${timeAgo(lastRefreshed)}`
    : '';

  return (
    <div className="space-y-6 min-h-screen">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-3 mt-1">
            {refreshedText && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <FiClock size={11} /> {refreshedText}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            <FiRefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <Link to="/admin/system-settings" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            <FiSettings size={14} /> Settings
          </Link>
          <Link to="/admin/audit-log" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors shadow-sm">
            <FiActivity size={14} /> Audit Log
          </Link>
        </div>
      </div>

      {/* ── Pending Actions Summary ─────────────────────────────────────────── */}
      {(() => {
        const hasActions = pendingActions.some(a => a.count > 0);
        return (
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
              {hasActions
                ? <><FiAlertTriangle size={14} className="text-gray-400" /> Action Required</>
                : <><FiCheckCircle size={14} className="text-gray-400" /> All Clear</>
              }
            </p>
            {!hasActions ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <FiCheckCircle size={15} /> No pending actions — everything is up to date!
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {pendingActions.map(({ label, count, to, color, icon: Icon }) => (
                  <Link key={to} to={to}
                    className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 hover:shadow-sm transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                        <Icon size={14} className="text-gray-500 dark:text-gray-400" />
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-300">{label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold min-w-[28px] text-center px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">{count}</span>
                      <FiArrowRight size={13} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Top KPI cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Employees" value={totalEmp} subtitle="Active staff" icon={FiUsers} color="#6366f1" trend={15} trendUp={true} to="/admin/employees" />

        {/* Attendance rate card */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col gap-3 overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-gray-100 dark:bg-gray-700">
              <FiCalendar className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
              {attendanceRate}%
            </span>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Present Today</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-0.5">{presentToday}</p>
            <p className="text-xs text-gray-400 mt-0.5">{absentToday} absent of {totalEmp}</p>
          </div>
          <div className="mt-auto">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Attendance rate</span>
              <span>{attendanceRate}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gray-400 dark:bg-gray-500 transition-all duration-500" style={{ width: `${attendanceRate}%` }} />
            </div>
          </div>
        </div>

        <StatCard title="Pending Leaves" value={data?.pendingLeaves || 0} subtitle="Awaiting approval" icon={FiFileText} color="#f59e0b" trend={10} trendUp={false} to="/admin/leaves" />

        {/* Payroll status card */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col gap-3 overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-gray-100 dark:bg-gray-700">
              <FiDollarSign className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </div>
            <span className="flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              <FiTrendingUp className="w-3 h-3" /> 3%
            </span>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Monthly Payroll</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-0.5">{formatCurrency(data?.monthlySalary)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{payrollPaid} of {payrollTotal} paid</p>
          </div>
          <div className="mt-auto">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Payment progress</span>
              <span>{payrollPct}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gray-400 dark:bg-gray-500 transition-all duration-500" style={{ width: `${payrollPct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Second KPI row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Departments" value={data?.departments || 0} subtitle="Active depts" icon={FiBriefcase} color="#06b6d4" />
        <StatCard title="HR Staff" value={data?.totalHR || 0} subtitle="HR team size" icon={FiUserCheck} color="#ec4899" />
        <StatCard title="Absent Today" value={absentToday} subtitle="Not checked in" icon={FiAlertCircle} color="#ef4444" />
        <StatCard title="Unverified Docs" value={unverifiedDocs} subtitle="Need review" icon={FiFileText} color="#f97316" to="/admin/documents" />
      </div>

      {/* ── Main 2-col layout ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* ── Left column ────────────────────────────────────────────────────── */}
        <div className="lg:col-span-8 space-y-5">

          {/* Charts row 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">

            {/* Attendance donut */}
            <SectionCard id="attendDonut" title="Today's Attendance" subtitle="Present vs Absent" collapsed={collapsed['attendDonut']} onToggle={toggleCollapse}>
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={workingFormatData} cx="50%" cy="50%" innerRadius={44} outerRadius={66} dataKey="value" startAngle={90} endAngle={-270}>
                      <Cell fill={attendanceColor} />
                      <Cell fill="#f1f5f9" />
                    </Pie>
                    <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" fill="#9ca3af" fontSize={10}>Present</text>
                    <text x="50%" y="57%" textAnchor="middle" dominantBaseline="middle" fill="#111827" fontSize={19} fontWeight="bold">{presentToday}</text>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex gap-4 mt-1">
                  <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: attendanceColor }} />Present</span>
                  <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded-full bg-slate-200 inline-block" />Absent</span>
                </div>
              </div>
            </SectionCard>

            {/* Dept distribution */}
            <SectionCard id="deptDist" title="By Department" subtitle="Employee distribution" collapsed={collapsed['deptDist']} onToggle={toggleCollapse}>
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie data={data?.deptDistribution || []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={66}>
                    {(data?.deptDistribution || []).map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE(darkMode)} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </SectionCard>

            {/* Leave Applications */}
            <SectionCard id="leaveApps" title="Leave Applications" subtitle="Status breakdown"
              action={<Link to="/admin/leaves" className="text-xs text-primary-600 hover:underline font-medium">View all</Link>}
              collapsed={collapsed['leaveApps']} onToggle={toggleCollapse}>
              <div className="space-y-4">
                <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                  {appData.map((a, i) => (
                    <div key={i} style={{ width: `${a.pct}%`, backgroundColor: a.color }} className="rounded-full" />
                  ))}
                </div>
                <div className="space-y-3">
                  {appData.map((a, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: a.color }} />
                        {a.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{a.count}</span>
                        <span className="text-xs text-gray-400 w-8 text-right">{a.pct}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>
          </div>

          {/* Attendance trend */}
          <SectionCard id="attendTrend" title="Monthly Attendance Trend" subtitle="Last 6 months" collapsed={collapsed['attendTrend']} onToggle={toggleCollapse}>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data?.monthlyAttendance || []}>
                <defs>
                  <linearGradient id="attendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_COLOR(darkMode)} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE(darkMode)} />
                <Area type="monotone" dataKey="present" stroke={CHART_COLORS[0]} fill="url(#attendGrad)" strokeWidth={2.5} name="Present" dot={{ r: 3, fill: CHART_COLORS[0] }} />
              </AreaChart>
            </ResponsiveContainer>
          </SectionCard>

          {/* Salary expenditure */}
          <SectionCard id="salaryExp" title="Salary Expenditure" subtitle="6-month trend (₹ thousands)" collapsed={collapsed['salaryExp']} onToggle={toggleCollapse}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={staffTurnover} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_COLOR(darkMode)} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}k`} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE(darkMode)} formatter={(v) => [`₹${v}k`, 'Net Salary']} />
                <Bar dataKey="value" fill={CHART_COLORS[0]} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>

          {/* Employee Growth */}
          <SectionCard id="empGrowth" title="Employee Growth" subtitle="Headcount over last 12 months" collapsed={collapsed['empGrowth']} onToggle={toggleCollapse}>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data?.employeeGrowth || []}>
                <defs>
                  <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_COLOR(darkMode)} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE(darkMode)} />
                <Line type="monotone" dataKey="count" stroke={CHART_COLORS[1]} strokeWidth={2.5} dot={{ r: 3, fill: CHART_COLORS[1] }} name="Employees" />
              </LineChart>
            </ResponsiveContainer>
          </SectionCard>

          {/* Top Absent Departments */}
          <SectionCard id="absentDepts" title="Top Absent Departments" subtitle="Today's absences by department" collapsed={collapsed['absentDepts']} onToggle={toggleCollapse}>
            {(data?.topAbsentDepts || []).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No absences recorded today 🎉</p>
            ) : (
              <div className="space-y-3">
                {(data?.topAbsentDepts || []).map((dept, i) => {
                  const pct = totalEmp > 0 ? Math.round((dept.count / totalEmp) * 100) : 0;
                  const colors = ['#ef4444', '#f59e0b', '#f97316'];
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center text-white flex-shrink-0" style={{ backgroundColor: colors[i] }}>
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700 dark:text-gray-200">{dept.name}</span>
                          <span className="text-gray-500">{dept.count} absent</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(pct * 3, 100)}%`, backgroundColor: colors[i] }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>

        {/* ── Right column ────────────────────────────────────────────────────── */}
        <div className="lg:col-span-4 space-y-5">

          {/* Birthdays & Anniversaries */}
          <SectionCard id="celebrations" title="Celebrations" subtitle="Next 7 days" collapsed={collapsed['celebrations']} onToggle={toggleCollapse}>
            <div className="flex gap-1 mb-4 bg-gray-100 dark:bg-gray-700/50 rounded-xl p-1">
              {[{ key: 'birthdays', label: '🎂 Birthdays', icon: FiGift }, { key: 'anniversaries', label: '🏆 Anniversaries', icon: FiAward }].map(tab => (
                <button key={tab.key} onClick={() => setCelebTab(tab.key)}
                  className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors ${celebTab === tab.key ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {(celebrations[celebTab] || []).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No {celebTab} in the next 7 days</p>
              ) : (
                (celebrations[celebTab] || []).map(emp => (
                  <div key={emp._id} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {emp.avatar
                        ? <img src={emp.avatar} alt="" className="w-full h-full object-cover" />
                        : <span className="text-indigo-700 text-xs font-semibold">{getInitials(`${emp.firstName} ${emp.lastName}`)}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{emp.firstName} {emp.lastName}</p>
                      <p className="text-xs text-gray-400 truncate">{emp.department} · {formatDate(emp.date)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {emp.isToday && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">Today!</span>
                      )}
                      {celebTab === 'anniversaries' && emp.years > 0 && (
                        <span className="text-xs text-gray-400">{emp.years}yr</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>

          {/* Recent Activity Feed */}
          <SectionCard id="activity" title="Recent Activity" subtitle="Latest system actions"
            action={<Link to="/admin/audit-log" className="text-xs text-primary-600 hover:underline font-medium">View all</Link>}
            collapsed={collapsed['activity']} onToggle={toggleCollapse}>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {activityFeed.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No recent activity</p>
              ) : (
                activityFeed.map((entry, i) => {
                  const { icon: AIcon, color } = actionIcon(entry.action);
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-gray-100 dark:bg-gray-700">
                        <AIcon size={13} className="text-gray-500 dark:text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-200 leading-snug">
                          {entry.performedBy?.name || 'System'}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{entry.details || entry.action}</p>
                      </div>
                      <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5">{timeAgo(entry.createdAt)}</span>
                    </div>
                  );
                })
              )}
            </div>
          </SectionCard>

          {/* Quick Actions */}
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">Quick Actions</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Employees', to: '/admin/employees', icon: FiUsers, color: '#6366f1' },
                { label: 'Leaves', to: '/admin/leaves', icon: FiFileText, color: '#f59e0b' },
                { label: 'Attendance', to: '/admin/attendance', icon: FiCalendar, color: '#10b981' },
                { label: 'Salary', to: '/admin/salary', icon: FiDollarSign, color: '#8b5cf6' },
                { label: 'Manage HR', to: '/admin/manage-hr', icon: FiShield, color: '#ec4899' },
                { label: 'Departments', to: '/admin/departments', icon: FiGrid, color: '#06b6d4' },
              ].map(({ label, to, icon: Icon, color }) => (
                <Link key={to} to={to}
                  className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl ring-1 ring-gray-100 dark:ring-gray-700 hover:ring-primary-200 dark:hover:ring-primary-700/50 hover:bg-primary-50/50 dark:hover:bg-primary-900/10 hover:shadow-sm transition-all text-center group">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform bg-gray-100 dark:bg-gray-700">
                    <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
