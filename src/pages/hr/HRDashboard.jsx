import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { reportAPI, leaveAPI, notificationAPI, payrollAPI, eventAPI, recruitmentAPI, employeeAPI, attendanceAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import WorklogTimer from '../../components/worklog/WorklogTimer';
import Modal from '../../components/common/Modal';
import {
  FiUsers, FiCalendar, FiFileText, FiCheck, FiX, FiTrendingUp, FiTrendingDown,
  FiUserPlus, FiDollarSign, FiLock, FiGrid, FiActivity, FiEdit2, FiMoreHorizontal,
  FiChevronRight, FiChevronLeft, FiBell, FiPlus
} from 'react-icons/fi';
import { formatDate, getInitials } from '../../utils/helpers';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

/* ─── salary helpers ─────────────────────────────────────────── */
const smCalcPF = (basic) => basic >= 15000 ? 1800 : Math.round(basic * 0.12);
const smCalcAll = (monthlyCTC, manual) => {
  const m = Number(monthlyCTC) || 0;
  const basic = Math.round(m * 0.5);
  const hra = Math.round(basic * 0.2);
  const travelling = Math.round(basic * 0.1);
  const bonus = Math.round(basic * 0.05);
  const conveyance = Number(manual.conveyance) || 0;
  const childEdu = Number(manual.childEducation) || 0;
  const medical = Number(manual.medical) || 0;
  const telephone = Number(manual.telephone) || 0;
  const sumComponents = basic + hra + conveyance + childEdu + travelling + medical + telephone + bonus;
  const specialAllowance = Math.max(0, m - sumComponents);
  const grossTotal = sumComponents + specialAllowance;
  const pf = smCalcPF(basic);
  const professionalTax = 200;
  return { basic, hra, travelling, bonus, conveyance, childEdu, medical, telephone, specialAllowance, grossTotal, pf, professionalTax };
};
const smFmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

/* ─── calendar helpers ───────────────────────────────────────── */
const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const EVENT_COLORS = { meeting: '#6366f1', deadline: '#ef4444', reminder: '#f59e0b', holiday: '#10b981', other: '#8b5cf6' };
const getWeekDates = (offset = 0) => {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
};

/* ─── mini components ────────────────────────────────────────── */
const Avatar = ({ name, src, size = 'md', color = '#6366f1' }) => {
  const sz = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-14 h-14 text-base' : 'w-10 h-10 text-sm';
  return src
    ? <img src={src} alt={name} className={`${sz} rounded-full object-cover`} />
    : (
      <div className={`${sz} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0`}
        style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
        {getInitials(name)}
      </div>
    );
};

const KpiCard = ({ title, value, sub, icon: Icon, accent = '#6366f1', trend, trendUp }) => (
  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
    <div className="flex items-start justify-between mb-3">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: accent + '18' }}>
        <Icon className="w-5 h-5" style={{ color: accent }} />
      </div>
      {trend !== undefined && (
        <span className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-full ${trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
          {trendUp ? <FiTrendingUp className="w-3 h-3" /> : <FiTrendingDown className="w-3 h-3" />}
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
    <p className="text-sm text-gray-500 mt-0.5">{title}</p>
    {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
  </div>
);

const Card = ({ title, subtitle, action, children, noPad = false, className = '' }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>
    {(title || action) && (
      <div className="px-5 py-4 flex items-center justify-between border-b border-gray-50">
        <div>
          {title && <p className="text-sm font-semibold text-gray-800">{title}</p>}
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
    )}
    <div className={noPad ? '' : 'p-5'}>{children}</div>
  </div>
);

/* ─── progress ring ──────────────────────────────────────────── */
const ProgressRing = ({ size = 130, stroke = 12 }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const segments = [
    { pct: 30, color: '#6366f1' },
    { pct: 45, color: '#10b981' },
    { pct: 25, color: '#f59e0b' },
  ];
  const els = [];
  let cumulative = 0;
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    const dash = (s.pct / 100) * circ;
    const gap = circ - dash;
    const offset = circ - (cumulative / 100) * circ;
    els.push(
      <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={s.color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${gap}`}
        strokeDashoffset={offset}
        strokeLinecap="butt" />
    );
    cumulative += s.pct;
  }
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
      {els}
    </svg>
  );
};

/* ══════════════════════════════════════════════════════════════ */
const HRDashboard = () => {
  const { user, hasModule } = useAuth();
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [rejectLeave, setRejectLeave] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [ctcModal, setCtcModal] = useState(null);
  const [ctcValue, setCtcValue] = useState('');
  const [ctcManual, setCtcManual] = useState({ conveyance: 0, childEducation: 0, medical: 0, telephone: 0 });
  const [ctcSaving, setCtcSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [onboardingTab, setOnboardingTab] = useState('new');
  const [checklistTasks, setChecklistTasks] = useState([]);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [events, setEvents] = useState([]);
  const [eventModal, setEventModal] = useState(false);
  const [eventDate, setEventDate] = useState(null);
  const [eventForm, setEventForm] = useState({ title: '', time: '', type: 'meeting' });
  const [editingEvent, setEditingEvent] = useState(null);
  const [onboardingStatus, setOnboardingStatus] = useState({ newEmployees: [], existingEmployees: [], overallProgress: { total: 0, completed: 0, pct: 0 } });

  useEffect(() => {
    const load = async () => {
      try {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const [ovRes, lvRes, notifyRes, attRes] = await Promise.all([
          reportAPI.getOverview(),
          leaveAPI.getAll({ status: 'pending', limit: 5 }),
          notificationAPI.getAll({ limit: 8 }),
          attendanceAPI.getAll({ date: todayStr, limit: 1 })
        ]);
        if (ovRes.data.success) setOverview(ovRes.data.data);
        if (lvRes.data.success) setPendingLeaves(lvRes.data.data);
        if (notifyRes.data.success) setNotifications(notifyRes.data.data);
        if (attRes.data.success) {
          const records = attRes.data.data;
          setTodayAttendance(Array.isArray(records) ? records[0] || null : records || null);
        }
        employeeAPI.getOnboardingStatus()
          .then(r => { if (r.data.success) setOnboardingStatus(r.data.data); }).catch(() => {});
        recruitmentAPI.getOnboardingTasks({ assignedTo: 'hr' })
          .then(r => { if (r.data.success) setChecklistTasks(r.data.data); }).catch(() => {});
      } finally { setLoading(false); }
    };
    load();
  }, []);

  useEffect(() => {
    const dates = getWeekDates(weekOffset);
    eventAPI.getAll({ startDate: dates[0].toISOString().split('T')[0], endDate: dates[6].toISOString().split('T')[0] })
      .then(res => { if (res.data.success) setEvents(res.data.data); }).catch(() => {});
  }, [weekOffset]);

  const handleLeaveApprove = async (id) => {
    try {
      await leaveAPI.updateStatus(id, { status: 'approved' });
      toast.success('Leave approved');
      setPendingLeaves(prev => prev.filter(l => l._id !== id));
    } catch { toast.error('Failed to update leave'); }
  };

  const handleLeaveReject = async () => {
    if (!rejectReason.trim()) return toast.error('Provide a rejection reason');
    try {
      await leaveAPI.updateStatus(rejectLeave, { status: 'rejected', rejectionReason: rejectReason });
      toast.success('Leave rejected');
      setPendingLeaves(prev => prev.filter(l => l._id !== rejectLeave));
      setRejectLeave(null);
      setRejectReason('');
    } catch { toast.error('Failed to update leave'); }
  };

  const openCtcModal = async (notification) => {
    setCtcValue('');
    setCtcManual({ conveyance: 0, childEducation: 0, medical: 0, telephone: 0 });
    setCtcModal(notification);
    try {
      const res = await payrollAPI.getTemplates({ active: true });
      const t = res.data?.data?.[0];
      if (t) {
        setCtcManual({
          conveyance: t.components?.conveyance?.value ?? 0,
          childEducation: t.components?.childEducation?.value ?? 0,
          medical: t.components?.medical?.value ?? 0,
          telephone: t.components?.telephoneInternet?.value ?? 0,
        });
      }
    } catch (_) {}
  };

  const handleCtcSave = async () => {
    if (!ctcValue || Number(ctcValue) <= 0) return toast.error('Enter a valid monthly CTC');
    const empId = ctcModal?.employee?._id;
    if (!empId) return toast.error('Employee not found');
    setCtcSaving(true);
    try {
      const c = smCalcAll(ctcValue, ctcManual);
      const toFixed = (v) => ({ calculationType: 'fixed', value: v, percentageOf: 'basicSalary' });
      await payrollAPI.saveStructure({
        employee: empId,
        basicSalary: c.basic,
        overtimeRate: 0,
        earnings: {
          hra: toFixed(c.hra), conveyance: toFixed(c.conveyance),
          childEducation: toFixed(c.childEdu), lta: toFixed(c.travelling),
          medical: toFixed(c.medical), telephoneInternet: toFixed(c.telephone),
          bonus: toFixed(c.bonus), specialAllowance: toFixed(c.specialAllowance), pli: toFixed(0),
        },
        employerContributions: {
          pf: { calculationType: 'percentage', value: 12, percentageOf: 'basicSalary' },
          esi: toFixed(0), statutoryBenefits: toFixed(200), retentionBonus: toFixed(0),
        },
      });
      if (ctcModal?._id) {
        await notificationAPI.markRead(ctcModal._id);
        setNotifications(prev => prev.map(n => n._id === ctcModal._id ? { ...n, isRead: true } : n));
      }
      toast.success('Salary structure saved for ' + (ctcModal?.employee?.firstName || 'employee'));
      const empId = ctcModal?.employee?._id;
      const empCode = ctcModal?.employee?.employeeId || empId;
      const empName = `${ctcModal?.employee?.firstName || ''}_${ctcModal?.employee?.lastName || ''}`.trim();
      payrollAPI.downloadCtcStructure(empId, `CTC_${empName}_${empCode}.pdf`).catch(() => {});
      setCtcModal(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save salary structure');
    } finally { setCtcSaving(false); }
  };

  /* ── event handlers ── */
  const refreshEvents = async () => {
    const dates = getWeekDates(weekOffset);
    const res = await eventAPI.getAll({ startDate: dates[0].toISOString().split('T')[0], endDate: dates[6].toISOString().split('T')[0] });
    if (res.data.success) setEvents(res.data.data);
  };

  const openAddEventModal = (date) => {
    setEditingEvent(null);
    setEventDate(date);
    setEventForm({ title: '', time: '', type: 'meeting' });
    setEventModal(true);
  };

  const openEditEventModal = (ev, e) => {
    e.stopPropagation();
    setEditingEvent(ev);
    setEventDate(new Date(ev.date));
    setEventForm({ title: ev.title, time: ev.time || '', type: ev.type });
    setEventModal(true);
  };

  const handleEventSave = async () => {
    if (!eventForm.title.trim()) return toast.error('Title is required');
    const payload = { title: eventForm.title, date: eventDate.toISOString().split('T')[0], time: eventForm.time, type: eventForm.type };
    try {
      if (editingEvent) {
        await eventAPI.update(editingEvent._id, payload);
        toast.success('Event updated');
      } else {
        await eventAPI.create(payload);
        toast.success('Event added');
      }
      setEventModal(false);
      await refreshEvents();
    } catch { toast.error('Failed to save event'); }
  };

  const handleEventDelete = async (id) => {
    try {
      await eventAPI.delete(id);
      setEvents(prev => prev.filter(ev => ev._id !== id));
      setEventModal(false);
      toast.success('Event deleted');
    } catch { toast.error('Failed to delete event'); }
  };

  if (loading) return <LoadingSpinner text="Loading HR Dashboard..." />;

  /* ── derived data ── */
  const totalEmployees = overview?.totalEmployees || 0;
  const presentToday = overview?.presentToday || 0;
  const pendingLeavesCount = overview?.pendingLeaves || 0;
  const newEmployees = overview?.salariedEmployees || 0;

  const { overallProgress, newEmployees: newOnboardingEmployees, existingEmployees: existingOnboardingEmployees } = onboardingStatus;
  const progressPct = overallProgress.pct;
  const completedTasks = overallProgress.completed;
  const totalOnboardingTasks = overallProgress.total;
  const activeTabEmployees = onboardingTab === 'new' ? newOnboardingEmployees : existingOnboardingEmployees;
  const weekStart = (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); d.setHours(0,0,0,0); return d; })();
  const weekEnd = (() => { const d = new Date(weekStart); d.setDate(d.getDate() + 6); return d; })();
  const fmtDate = d => { const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return `${String(d.getDate()).padStart(2,'0')} ${months[d.getMonth()]} ${d.getFullYear()}`; };

  const attendanceDonut = [
    { name: 'Present', value: presentToday },
    { name: 'Absent', value: Math.max(0, totalEmployees - presentToday) },
  ];

  const monthlyBars = (overview?.monthlyAttendance || []).map(m => ({
    month: m.month,
    Present: m.present,
    Absent: Math.max(0, Math.round(m.present * 0.3)),
  }));

  const leaveStats = overview?.leaveStats || [];
  const approved = leaveStats.find(l => l._id === 'approved')?.count || 0;
  const pending = leaveStats.find(l => l._id === 'pending')?.count || 0;
  const cancelled = leaveStats.find(l => l._id === 'cancelled')?.count || 0;
  const rejected = leaveStats.find(l => l._id === 'rejected')?.count || 0;
  const totalLeave = approved + pending + cancelled + rejected || 1;
  const leaveBreakdown = [
    { name: 'Approved', count: approved, pct: Math.round((approved / totalLeave) * 100), color: '#6366f1' },
    { name: 'Pending', count: pending, pct: Math.round((pending / totalLeave) * 100), color: '#10b981' },
    { name: 'Cancelled', count: cancelled, pct: Math.round((cancelled / totalLeave) * 100), color: '#f59e0b' },
    { name: 'Rejected', count: rejected, pct: Math.round((rejected / totalLeave) * 100), color: '#ef4444' },
  ];

  const salaryTrend = (overview?.salaryTrend || []).map(m => ({
    month: m.month,
    value: Math.round(m.netSalary / 1000) || 0,
  }));

  const unreadNotifs = notifications.filter(n => !n.isRead);
  const weekDates = getWeekDates(weekOffset);
  const today = new Date();
  const todayStr = today.toDateString();

  const hrName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'HR Manager' : 'HR Manager';
  const hrRole = user?.role || 'HR Manager';
  const hrEmail = user?.email || '';

  /* task board — sourced from current-week calendar events */
  const taskStatuses = ['To Do', 'In Progress', 'Completed', 'Incomplete'];
  const taskColors = { 'To Do': '#6366f1', 'In Progress': '#f59e0b', 'Completed': '#10b981', 'Incomplete': '#ef4444' };
  const eventTypeToStatus = { reminder: 'To Do', meeting: 'In Progress', deadline: 'Completed', holiday: 'Incomplete', other: 'To Do' };
  const weekEvents = events.filter(ev => {
    const d = new Date(ev.date); return d >= weekStart && d <= weekEnd;
  });
  const tasksByStatus = {
    'To Do': weekEvents.filter(ev => eventTypeToStatus[ev.type] === 'To Do'),
    'In Progress': weekEvents.filter(ev => eventTypeToStatus[ev.type] === 'In Progress'),
    'Completed': weekEvents.filter(ev => eventTypeToStatus[ev.type] === 'Completed'),
    'Incomplete': weekEvents.filter(ev => eventTypeToStatus[ev.type] === 'Incomplete'),
  };

  const handleChecklistToggle = async (task) => {
    const updated = { ...task, completed: !task.completed };
    setChecklistTasks(prev => prev.map(t => t._id === task._id ? { ...t, completed: updated.completed } : t));
    try {
      await recruitmentAPI.updateOnboardingTask(task._id, { completed: updated.completed });
    } catch {
      setChecklistTasks(prev => prev.map(t => t._id === task._id ? task : t));
      toast.error('Failed to update task');
    }
  };

  const handleChecklistAdd = async () => {
    if (!newTaskTitle.trim()) return;
    setChecklistLoading(true);
    try {
      const res = await recruitmentAPI.createOnboardingTask({ title: newTaskTitle.trim(), assignedTo: 'hr', completed: false });
      if (res.data.success) { setChecklistTasks(prev => [...prev, res.data.data]); setNewTaskTitle(''); setAddingTask(false); }
    } catch { toast.error('Failed to add task'); }
    finally { setChecklistLoading(false); }
  };

  const handleChecklistDelete = async (id) => {
    setChecklistTasks(prev => prev.filter(t => t._id !== id));
    try { await recruitmentAPI.deleteOnboardingTask(id); }
    catch { toast.error('Failed to delete'); recruitmentAPI.getOnboardingTasks({ assignedTo: 'hr' }).then(r => { if (r.data.success) setChecklistTasks(r.data.data); }); }
  };

  return (
    <div className="min-h-screen bg-[#f4f6fb]">
      {/* ═══ TOP WELCOME BAR ═══════════════════════════════════ */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Dashboard
          </h1>
          <div className="flex items-center gap-2 mt-1">
            {totalOnboardingTasks > 0 ? (
              <>
                <span className="text-xs text-gray-500">Onboarding progress</span>
                <div className="w-32 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: `${progressPct}%` }} />
                </div>
                <span className="text-xs font-semibold text-gray-500">{completedTasks}/{totalOnboardingTasks} ({progressPct}%)</span>
              </>
            ) : (
              <span className="text-xs text-gray-400">No onboarding tasks</span>
            )}
          </div>
        </div>
      </div>

      {/* ═══ WORK TIMER ═════════════════════════════════════════ */}
      {hasModule('worklog') && (
        <div className="px-6 pb-4">
          <WorklogTimer todayAttendance={todayAttendance} onRefresh={() => window.location.reload()} />
        </div>
      )}

      {/* ═══ MAIN GRID ═════════════════════════════════════════ */}
      <div className="px-6 pb-6 grid grid-cols-12 gap-5">

        {/* ── LEFT COLUMN (col 1-8) ── */}
        <div className="col-span-12 xl:col-span-8 space-y-5">

          {/* KPI CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KpiCard title="Total Employees" value={totalEmployees} trend={15} trendUp icon={FiUsers} accent="#6366f1" />
            <KpiCard title="Pending Leaves" value={pendingLeavesCount} trend={10} trendUp={false} icon={FiFileText} accent="#f59e0b" />
            <KpiCard title="New Hires" value={newEmployees} trend={12} trendUp icon={FiUserPlus} accent="#10b981" />
            <KpiCard title="Present Today" value={presentToday} sub={`of ${totalEmployees}`} trend={5} trendUp icon={FiCalendar} accent="#8b5cf6" />
          </div>

          {/* CALENDAR / SCHEDULE */}
          <Card
            title="Calendar / Schedule"
            action={
              <div className="flex items-center gap-1">
                <button onClick={() => setWeekOffset(w => w - 1)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
                  <FiChevronLeft className="w-4 h-4 text-gray-400" />
                </button>
                <button onClick={() => setWeekOffset(w => w + 1)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
                  <FiChevronRight className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            }
            noPad
          >
            <div className="px-5 py-4 grid grid-cols-7 gap-2">
              {weekDates.map((d, i) => {
                const isToday = d.toDateString() === todayStr;
                const dayStr = d.toISOString().split('T')[0];
                const dayEvents = events.filter(ev => new Date(ev.date).toISOString().split('T')[0] === dayStr);
                return (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{WEEK_DAYS[i]}</span>
                    <button
                      onClick={() => openAddEventModal(d)}
                      title="Add event"
                      className={`w-9 h-14 rounded-2xl flex flex-col items-center justify-end pb-1.5 text-sm font-semibold transition-all ${
                        isToday
                          ? 'bg-gradient-to-b from-indigo-500 to-indigo-700 text-white shadow-lg shadow-indigo-200 scale-105'
                          : 'bg-white border border-gray-100 text-gray-700 hover:border-indigo-200 hover:text-indigo-600'
                      }`}>
                      <span>{d.getDate()}</span>
                      {dayEvents.length > 0 && (
                        <div className="flex gap-0.5 mt-0.5">
                          {dayEvents.slice(0, 3).map((ev, idx) => (
                            <span
                              key={idx}
                              onClick={(e) => openEditEventModal(ev, e)}
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0 cursor-pointer"
                              style={{ background: isToday ? 'rgba(255,255,255,0.8)' : (EVENT_COLORS[ev.type] || '#6366f1') }}
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* TEAM */}
          <div className="grid grid-cols-1 gap-5">
            {/* Team */}
            <Card title="Team"
              action={<button className="text-xs text-indigo-600 font-medium hover:underline flex items-center gap-1"><FiEdit2 className="w-3 h-3" /> Edit</button>}>
              {pendingLeaves.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-gray-400">
                  <FiUsers className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-sm">No team members found</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {pendingLeaves.slice(0, 3).map((l, i) => {
                    const colors = ['#f59e0b', '#8b5cf6', '#10b981'];
                    const name = `${l.employee?.firstName || ''} ${l.employee?.lastName || ''}`.trim();
                    return (
                      <div key={i} className="flex flex-col items-center gap-2 text-center">
                        <Avatar name={name} size="lg" color={colors[i % 3]} />
                        <div>
                          <p className="text-xs font-semibold text-gray-800 truncate w-20">{name}</p>
                          <p className="text-[10px] text-gray-400">{l.employee?.department || 'Employee'}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* TASK BOARD */}
          <Card title="Task Board"
            subtitle={`${fmtDate(weekStart)} — ${fmtDate(weekEnd)}`}
            noPad>
            <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {taskStatuses.map(status => {
                const color = taskColors[status];
                const items = tasksByStatus[status];
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-gray-600">{status}</span>
                      <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white" style={{ background: color }}>
                        {items.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {items.length === 0 ? (
                        <div className="bg-gray-50 rounded-xl p-3 border border-dashed border-gray-200 text-center">
                          <p className="text-[10px] text-gray-400">No events</p>
                        </div>
                      ) : items.map(ev => (
                        <div key={ev._id} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                          <p className="text-xs font-medium text-gray-700 truncate">{ev.title}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: color + '18', color }}>
                              {ev.type}
                            </span>
                            {ev.time && <span className="text-[10px] text-gray-400">{ev.time}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* RECENT ACTIVITY / PENDING LEAVES */}
          <Card title="Recent Activity — Pending Leaves"
            subtitle="Requires your action"
            action={pendingLeaves.length > 0 && (
              <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">{pendingLeaves.length}</span>
            )}
            noPad>
            {pendingLeaves.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <FiFileText className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">No pending leave requests</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {pendingLeaves.map(leave => (
                  <div key={leave._id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={`${leave.employee?.firstName} ${leave.employee?.lastName}`} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {leave.employee?.firstName} {leave.employee?.lastName}
                        </p>
                        <p className="text-xs text-gray-400">{leave.leaveType} · {leave.totalDays}d · {formatDate(leave.startDate)}</p>
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button onClick={() => handleLeaveApprove(leave._id)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-medium transition-colors">
                        <FiCheck className="w-3 h-3" /> Good
                      </button>
                      <button onClick={() => { setRejectLeave(leave._id); setRejectReason(''); }}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-medium transition-colors">
                        <FiX className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* CHARTS ROW — fills remaining left column space */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Attendance donut */}
            <Card title="Today's Attendance" subtitle="Present vs Absent">
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={attendanceDonut} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value" startAngle={90} endAngle={-270}>
                      <Cell fill="#6366f1" />
                      <Cell fill="#e2e8f0" />
                    </Pie>
                    <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" fill="#9ca3af" fontSize={10}>Total</text>
                    <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" fill="#111827" fontSize={20} fontWeight="bold">{totalEmployees}</text>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex gap-5 mt-1">
                  <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />Present ({presentToday})</span>
                  <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded-full bg-slate-200 inline-block" />Absent ({Math.max(0, totalEmployees - presentToday)})</span>
                </div>
              </div>
            </Card>

            {/* Leave breakdown */}
            <Card title="Leave Applications" subtitle="Status breakdown"
              action={<Link to="/hr/leaves" className="text-xs text-indigo-600 hover:underline font-medium">View all</Link>}>
              <div className="space-y-3">
                <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                  {leaveBreakdown.map((a, i) => (
                    <div key={i} style={{ width: `${a.pct || 25}%`, backgroundColor: a.color }} className="rounded-full" />
                  ))}
                </div>
                {leaveBreakdown.map((a, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs text-gray-600">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: a.color }} />
                      {a.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-700">{a.count}</span>
                      <span className="text-[10px] text-gray-400 w-7 text-right">{a.pct}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

        </div>

        {/* ── RIGHT COLUMN (col 9-12) ── */}
        <div className="col-span-12 xl:col-span-4 space-y-5">

          {/* PROFILE CARD */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <Avatar name={hrName} size="lg" color="#6366f1" />
                <div>
                  <p className="text-sm font-bold text-gray-900">{hrName}</p>
                  <p className="text-xs text-gray-400">{hrRole}</p>
                </div>
              </div>
              <button onClick={() => navigate('/hr/settings')} className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <FiChevronRight className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-500 mb-1">Personal Information</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div>
                  <p className="text-gray-400">First Name</p>
                  <p className="font-medium text-gray-800">{user?.firstName || 'HR'}</p>
                </div>
                <div>
                  <p className="text-gray-400">Last Name</p>
                  <p className="font-medium text-gray-800">{user?.lastName || 'Manager'}</p>
                </div>
                <div>
                  <p className="text-gray-400">Email Address</p>
                  <p className="font-medium text-gray-800 truncate">{hrEmail || 'hr@company.com'}</p>
                </div>
                <div>
                  <p className="text-gray-400">Phone</p>
                  <p className="font-medium text-gray-800">{user?.phone || '—'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-400">Role</p>
                  <p className="font-medium text-gray-800">{hrRole}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ONBOARDING */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-gray-800">Onboarding</p>
              <span className="text-[10px] text-gray-400">{fmtDate(new Date())}</span>
            </div>
            <div className="flex gap-2 mb-4">
              <button onClick={() => setOnboardingTab('new')} className={`flex-1 text-xs py-1.5 rounded-lg font-semibold transition-colors ${onboardingTab === 'new' ? 'bg-indigo-600 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'}`}>New Employees</button>
              <button onClick={() => setOnboardingTab('existing')} className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors ${onboardingTab === 'existing' ? 'bg-indigo-600 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'}`}>Existing Employee</button>
            </div>
            {activeTabEmployees.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                  <div>
                    <p className="text-gray-400 mb-1">Start Date</p>
                    <p className="font-semibold text-gray-700">{fmtDate(weekStart)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 mb-1">End Date</p>
                    <p className="font-semibold text-gray-700">{fmtDate(weekEnd)}</p>
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  {activeTabEmployees.slice(0, 3).map(emp => (
                    <div key={emp._id} className="flex items-center justify-between gap-2 bg-gray-50 rounded-xl px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{emp.firstName} {emp.lastName}</p>
                        <p className="text-[10px] text-gray-400">{emp.employeeId}</p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${emp.completedTasks === emp.totalTasks ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {emp.completedTasks}/{emp.totalTasks}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-xs text-gray-400 text-center py-3 mb-4">No {onboardingTab === 'new' ? 'new' : 'existing'} employees with pending onboarding</p>
            )}
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-gray-500">Overall Progress</p>
              <p className="text-[10px] text-gray-400">{completedTasks}/{totalOnboardingTasks} tasks</p>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">{progressPct}%</p>

            {/* Notifications that need CTC */}
            {unreadNotifs.filter(n => n.type === 'employee-onboarding').length > 0 && (
              <div className="mt-4 space-y-2">
                {unreadNotifs.filter(n => n.type === 'employee-onboarding').slice(0, 2).map(notif => (
                  <div key={notif._id} className="flex items-center justify-between gap-2 bg-indigo-50 rounded-xl px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{notif.title}</p>
                      <p className="text-[10px] text-gray-400 truncate">{notif.message}</p>
                    </div>
                    <button onClick={() => openCtcModal(notif)}
                      className="flex items-center gap-1 text-[10px] px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex-shrink-0">
                      ₹ Set CTC
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CHECKLIST */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-gray-800">Checklist</p>
              <span className="text-[10px] text-gray-400">{fmtDate(new Date())}</span>
            </div>
            <div className="space-y-3">
              {checklistTasks.length === 0 && !addingTask && (
                <p className="text-xs text-gray-400 text-center py-2">No tasks yet. Click + Add to create one.</p>
              )}
              {checklistTasks.map(task => {
                const color = task.completed ? '#10b981' : '#6366f1';
                return (
                  <div key={task._id} className="flex items-center justify-between gap-3 group">
                    <span className={`text-xs flex-1 ${task.completed ? 'line-through text-gray-400' : 'text-gray-600'}`}>{task.title}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleChecklistDelete(task._id)}
                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-xs transition-opacity px-1"
                        title="Delete">✕</button>
                      <button
                        onClick={() => handleChecklistToggle(task)}
                        className="w-8 h-4 rounded-full relative transition-colors duration-200 flex-shrink-0"
                        style={{ background: task.completed ? color : '#e5e7eb' }}>
                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all duration-200 ${task.completed ? 'right-0.5' : 'left-0.5'}`} />
                      </button>
                    </div>
                  </div>
                );
              })}
              {addingTask && (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    autoFocus
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleChecklistAdd(); if (e.key === 'Escape') { setAddingTask(false); setNewTaskTitle(''); } }}
                    className="flex-1 text-xs border border-indigo-300 rounded px-2 py-1 outline-none focus:border-indigo-500"
                    placeholder="Task name..."
                  />
                  <button onClick={handleChecklistAdd} disabled={checklistLoading} className="text-xs text-white bg-indigo-600 px-2 py-1 rounded hover:bg-indigo-700">Add</button>
                  <button onClick={() => { setAddingTask(false); setNewTaskTitle(''); }} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
              <button onClick={() => setAddingTask(true)} className="text-xs text-indigo-600 font-semibold hover:underline">+ Add</button>
              <span className="text-[10px] text-gray-400">{checklistTasks.filter(t => t.completed).length}/{checklistTasks.length} done</span>
            </div>
          </div>

          {/* MONTHLY TREND + SALARY */}
          <Card title="Monthly Attendance" subtitle="Present vs Absent per month">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={monthlyBars} barSize={8} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f4f8" />
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 11, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="Present" fill="#6366f1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Absent" fill="#c7d2fe" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-1">
              <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />Present</span>
              <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2 h-2 rounded-full bg-indigo-200 inline-block" />Absent</span>
            </div>
          </Card>

          <Card title="Salary Expenditure" subtitle="6-month trend (₹ thousands)">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={salaryTrend} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f4f8" />
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 11, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} formatter={(v) => [`₹${v}k`, 'Salary']} />
                <Bar dataKey="value" fill="#a78bfa" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

        </div>
      </div>

      {/* ═══ CTC SETUP MODAL ══════════════════════════════════ */}
      {(() => {
        const c = smCalcAll(ctcValue, ctcManual);
        const empName = `${ctcModal?.employee?.firstName || ''} ${ctcModal?.employee?.lastName || ''}`.trim();
        return (
          <Modal isOpen={!!ctcModal} onClose={() => setCtcModal(null)}
            title={`Set Salary — ${empName}`} size="lg"
            footer={
              <>
                <button onClick={() => setCtcModal(null)} className="btn-secondary">Cancel</button>
                <button onClick={handleCtcSave} disabled={ctcSaving} className="btn-primary">
                  {ctcSaving ? 'Saving…' : 'Save Salary Structure'}
                </button>
              </>
            }>
            <div className="space-y-5">
              <div className="rounded-xl border-2 border-indigo-300 bg-indigo-50 p-4">
                <label className="block text-sm font-semibold text-indigo-700 mb-1">Monthly CTC (₹) *</label>
                <input type="text" inputMode="numeric" placeholder="e.g. 50,000" autoFocus
                  value={ctcValue ? Number(ctcValue).toLocaleString('en-IN') : ''}
                  onChange={e => { const raw = e.target.value.replace(/,/g, ''); if (/^\d*$/.test(raw)) setCtcValue(raw); }}
                  className="input-field text-lg font-semibold" />
                {Number(ctcValue) > 0 && (
                  <p className="text-xs text-indigo-500 mt-1.5">Basic = {smFmt(c.basic)} · Gross = {smFmt(c.grossTotal)} · PF = {smFmt(c.pf)}</p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wide mb-2">Manual Components</p>
                <div className="grid grid-cols-2 gap-3">
                  {[['conveyance', 'Conveyance'], ['childEducation', 'Child Education'], ['medical', 'Medical'], ['telephone', 'Telephone']].map(([key, label]) => (
                    <div key={key}>
                      <label className="label text-xs">{label}</label>
                      <input type="text" inputMode="numeric" value={ctcManual[key] ? Number(ctcManual[key]).toLocaleString('en-IN') : ''}
                        onChange={e => { const raw = e.target.value.replace(/,/g, ''); if (/^\d*$/.test(raw)) setCtcManual(p => ({ ...p, [key]: Number(raw) || 0 })); }}
                        className="input-field text-sm" />
                    </div>
                  ))}
                </div>
              </div>
              {Number(ctcValue) > 0 && (
                <div>
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <FiLock className="w-3 h-3" /> Auto-Calculated
                  </p>
                  <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                    {[
                      ['Basic Salary', smFmt(c.basic), '50% of CTC'],
                      ['HRA', smFmt(c.hra), '20% of Basic'],
                      ['Travelling', smFmt(c.travelling), '10% of Basic'],
                      ['Bonus', smFmt(c.bonus), '5% of Basic'],
                      ['Special Allowance', smFmt(c.specialAllowance), 'CTC − all others'],
                      ['Employee PF', smFmt(c.pf), c.basic >= 15000 ? 'Fixed ₹1,800' : '12% of Basic'],
                      ['Professional Tax', smFmt(c.professionalTax), 'Fixed ₹200/month'],
                    ].map(([label, value, formula]) => (
                      <div key={label} className="flex items-center justify-between px-4 py-2.5 bg-gray-50/60">
                        <div>
                          <p className="text-sm text-gray-700">{label}</p>
                          <p className="text-xs text-gray-400">{formula}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">{value}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-600">Auto</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-emerald-50 px-3 py-2">
                      <p className="text-xs text-gray-500">Gross</p>
                      <p className="text-sm font-bold text-emerald-600">{smFmt(c.grossTotal)}</p>
                    </div>
                    <div className="rounded-lg bg-red-50 px-3 py-2">
                      <p className="text-xs text-gray-500">Deductions</p>
                      <p className="text-sm font-bold text-red-500">−{smFmt(c.pf * 2 + c.professionalTax)}</p>
                    </div>
                    <div className="rounded-lg bg-indigo-600 px-3 py-2 text-white">
                      <p className="text-xs opacity-75">Net</p>
                      <p className="text-sm font-bold">{smFmt(c.grossTotal - c.pf * 2 - c.professionalTax)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Modal>
        );
      })()}

      {/* ═══ REJECT MODAL ══════════════════════════════════════ */}
      <Modal isOpen={!!rejectLeave} onClose={() => setRejectLeave(null)} title="Reject Leave Request" size="sm"
        footer={
          <>
            <button onClick={() => setRejectLeave(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleLeaveReject} className="btn-danger">Reject</button>
          </>
        }>
        <div>
          <label className="label">Rejection Reason *</label>
          <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
            className="input-field" rows={3} placeholder="Reason for rejection..." autoFocus />
        </div>
      </Modal>

      {/* ═══ EVENT MODAL ═══════════════════════════════════════ */}
      <Modal
        isOpen={eventModal}
        onClose={() => setEventModal(false)}
        title={editingEvent ? 'Edit Event' : `Add Event — ${eventDate?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
        size="sm"
        footer={
          <>
            {editingEvent && (
              <button onClick={() => handleEventDelete(editingEvent._id)} className="mr-auto text-xs text-red-500 hover:text-red-700 font-medium">
                Delete
              </button>
            )}
            <button onClick={() => setEventModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleEventSave} className="btn-primary">
              {editingEvent ? 'Save Changes' : 'Add Event'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Title *</label>
            <input
              type="text"
              value={eventForm.title}
              onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))}
              className="input-field"
              placeholder="e.g. Team standup"
              autoFocus
            />
          </div>
          <div>
            <label className="label">Time (optional)</label>
            <input
              type="time"
              value={eventForm.time}
              onChange={e => setEventForm(f => ({ ...f, time: e.target.value }))}
              className="input-field"
            />
          </div>
          <div>
            <label className="label">Type</label>
            <select
              value={eventForm.type}
              onChange={e => setEventForm(f => ({ ...f, type: e.target.value }))}
              className="input-field"
            >
              <option value="meeting">Meeting</option>
              <option value="deadline">Deadline</option>
              <option value="reminder">Reminder</option>
              <option value="holiday">Holiday</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default HRDashboard;
