import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { attendanceAPI, leaveAPI, salaryAPI, noticeAPI, employeeAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import WorklogTimer from '../../components/worklog/WorklogTimer';
import {
  FiCalendar, FiFileText, FiDollarSign, FiClock, FiCheckCircle, FiAlertCircle,
  FiStar, FiUsers, FiLogIn, FiLogOut as FiLogOutIcon, FiAlertTriangle,
  FiArrowRight, FiTrendingUp, FiTrendingDown
} from 'react-icons/fi';
import { formatDate, formatCurrency, getStatusColor, getInitials } from '../../utils/helpers';

const StatCard = ({ title, value, icon: Icon, color = '#6366f1', trend, trendUp }) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all duration-200 flex flex-col gap-3">
    <div className="flex items-center justify-between">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + '18' }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      {trend !== undefined && (
        <span className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-full ${trendUp ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 'bg-red-50 text-red-500 dark:bg-red-900/20'}`}>
          {trendUp ? <FiTrendingUp className="w-3 h-3" /> : <FiTrendingDown className="w-3 h-3" />}
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    <div>
      <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{title}</p>
    </div>
  </div>
);

const SectionCard = ({ title, children, action }) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
    <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700">
      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{title}</p>
      {action}
    </div>
    <div className="divide-y divide-gray-50 dark:divide-gray-700">{children}</div>
  </div>
);

const EmployeeDashboard = () => {
  const { user, hasModule } = useAuth();
  const [summary, setSummary] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [notices, setNotices] = useState([]);
  const [myProfile, setMyProfile] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [todayAttendance, setTodayAttendance] = useState(null);
  useEffect(() => {
    const load = async () => {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      try {
        const [attRes, lvRes, salRes, notRes, meRes, todayRes] = await Promise.all([
          attendanceAPI.getSummary({ month: today.getMonth() + 1, year: today.getFullYear() }),
          leaveAPI.getAll({ limit: 4 }),
          salaryAPI.getAll({ limit: 3 }),
          noticeAPI.getAll({ limit: 4 }),
          authAPI_me(),
          attendanceAPI.getAll({ date: todayStr, limit: 1 })
        ]);
        if (attRes.data.success) setSummary(attRes.data.data.summary);
        if (lvRes.data.success) setLeaves(lvRes.data.data);
        if (salRes.data.success) setSalaries(salRes.data.data);
        if (notRes.data.success) setNotices(notRes.data.data);
        if (meRes) setMyProfile(meRes);
        if (todayRes.data.success) {
          const records = todayRes.data.data;
          setTodayAttendance(Array.isArray(records) ? records[0] || null : records || null);
        }
      } finally { setLoading(false); }
    };
    load();
  }, []);

  useEffect(() => {
    if (!myProfile?.isTeamLeader) return;
    employeeAPI.getAll({ limit: 100 }).then(r => {
      if (r.data.success) {
        const myId = myProfile._id;
        setTeamMembers(r.data.data.filter(e =>
          e.reportingManager && (e.reportingManager._id === myId || e.reportingManager === myId)
        ));
      }
    }).catch(() => {});
  }, [myProfile]);

  if (loading) return <LoadingSpinner text="Loading your dashboard..." />;

  const isTeamLeader = myProfile?.isTeamLeader;
  const reportingManager = myProfile?.reportingManager;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div className="space-y-6 min-h-screen">
      {/* Hero welcome banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 p-6 text-white shadow-lg">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute -top-4 -right-4 w-40 h-40 rounded-full bg-white" />
          <div className="absolute -bottom-8 -left-8 w-56 h-56 rounded-full bg-white" />
        </div>
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold mt-0.5">Dashboard</h1>
            <div className="flex gap-2 mt-4 flex-wrap">
              <Link to="/employee/leaves" className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                Apply Leave
              </Link>
              <Link to="/employee/salary" className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                Download Payslip
              </Link>
              <Link to="/employee/attendance" className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                Attendance
              </Link>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {isTeamLeader && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-400/20 border border-amber-300/40 text-amber-100">
                <FiStar className="w-3 h-3" /> Team Leader
              </span>
            )}
            <div className="text-right">
              <p className="text-indigo-200 text-xs">This month</p>
              <p className="text-2xl font-bold">{summary?.totalWorkHours || 0}h</p>
              <p className="text-indigo-200 text-xs">Worked</p>
            </div>
          </div>
        </div>
      </div>

      {/* Today's punch status */}
      <TodayPunchWidget record={todayAttendance} />

      {/* Work Timer */}
      {hasModule('worklog') && <WorklogTimer todayAttendance={todayAttendance} />}

      {/* Reporting Manager */}
      {reportingManager && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-sm font-bold text-indigo-600 dark:text-indigo-400 flex-shrink-0">
            {getInitials(`${reportingManager.firstName} ${reportingManager.lastName}`)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400">Your Reporting Manager</p>
            <p className="font-semibold text-gray-900 dark:text-white">{reportingManager.firstName} {reportingManager.lastName}</p>
            <p className="text-xs text-gray-500">{reportingManager.designation}</p>
          </div>
          <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-full">
            <FiStar className="w-3 h-3" /> Manager
          </span>
        </div>
      )}

      {/* Attendance KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Present Days" value={summary?.present || 0} icon={FiCheckCircle} color="#10b981" trend={5} trendUp={true} />
        <StatCard title="Absent Days" value={summary?.absent || 0} icon={FiAlertCircle} color="#ef4444" />
        <StatCard title="Late Arrivals" value={summary?.late || 0} icon={FiClock} color="#f59e0b" />
        <StatCard title="Work Hours" value={`${summary?.totalWorkHours || 0}h`} icon={FiCalendar} color="#6366f1" trend={3} trendUp={true} />
      </div>

      {/* My Team (Team Leaders only) */}
      {isTeamLeader && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <FiUsers className="w-4 h-4 text-amber-500" />
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">My Team</p>
            </div>
            <span className="text-xs text-gray-400">{teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''}</span>
          </div>
          {teamMembers.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-sm">No team members assigned yet.</div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-700">
              {teamMembers.map(member => (
                <div key={member._id} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-semibold text-indigo-700 dark:text-indigo-400 overflow-hidden flex-shrink-0">
                    {member.avatar
                      ? <img src={member.avatar} alt="" className="w-full h-full object-cover" />
                      : getInitials(`${member.firstName} ${member.lastName}`)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{member.firstName} {member.lastName}</p>
                    <p className="text-xs text-gray-400 truncate">{member.designation}{member.department?.name ? ` · ${member.department.name}` : ''}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${getStatusColor(member.status)}`}>{member.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Leave + Payslip + Notices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <SectionCard title="Leave Requests"
          action={<Link to="/employee/leaves" className="text-xs text-indigo-600 hover:underline font-medium flex items-center gap-1">View all <FiArrowRight className="w-3 h-3" /></Link>}>
          {leaves.length === 0
            ? <div className="py-8 text-center text-gray-400 text-sm">No leave requests</div>
            : leaves.map(leave => (
              <div key={leave._id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{leave.leaveType} Leave</p>
                  <p className="text-xs text-gray-400">{formatDate(leave.startDate)} · {leave.totalDays} day(s)</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${getStatusColor(leave.status)}`}>{leave.status}</span>
              </div>
            ))}
        </SectionCard>

        <SectionCard title="Recent Payslips"
          action={<Link to="/employee/salary" className="text-xs text-indigo-600 hover:underline font-medium flex items-center gap-1">View all <FiArrowRight className="w-3 h-3" /></Link>}>
          {salaries.length === 0
            ? <div className="py-8 text-center text-gray-400 text-sm">No payslips available</div>
            : salaries.map(sal => (
              <div key={sal._id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][sal.month - 1]} {sal.year}
                  </p>
                  <p className="text-xs text-gray-400 font-medium">{formatCurrency(sal.netSalary)}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${getStatusColor(sal.paymentStatus)}`}>{sal.paymentStatus}</span>
              </div>
            ))}
        </SectionCard>

        <SectionCard title="Latest Notices"
          action={<Link to="/employee/notices" className="text-xs text-indigo-600 hover:underline font-medium flex items-center gap-1">View all <FiArrowRight className="w-3 h-3" /></Link>}>
          {notices.length === 0
            ? <div className="py-8 text-center text-gray-400 text-sm">No notices</div>
            : notices.map(notice => (
              <div key={notice._id} className="px-5 py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1 flex-1">{notice.title}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${notice.priority === 'urgent' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'}`}>
                    {notice.priority}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{formatDate(notice.createdAt)}</p>
              </div>
            ))}
        </SectionCard>
      </div>
    </div>
  );
};

const TodayPunchWidget = ({ record }) => {
  const fmt = (t) => t ? new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '--:--';

  if (!record) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-amber-200 dark:border-amber-700/50 p-4 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
          <FiAlertTriangle className="w-5 h-5 text-amber-500" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Not Punched In Yet</p>
          <p className="text-xs text-gray-400 mt-0.5">You haven't marked attendance today</p>
        </div>
        <Link to="/employee/attendance" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex-shrink-0">
          Mark Attendance
        </Link>
      </div>
    );
  }

  const punches = record.punches || [];
  const firstIn = punches.find(p => p.punchNumber % 2 === 1);
  const lastOut = [...punches].reverse().find(p => p.punchNumber % 2 === 0);
  const isCurrentlyIn = punches.length > 0 && punches[punches.length - 1].punchNumber % 2 === 1;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border p-4 flex items-center gap-4 ${isCurrentlyIn ? 'border-emerald-200 dark:border-emerald-700/50' : 'border-blue-200 dark:border-blue-700/50'}`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${isCurrentlyIn ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
        {isCurrentlyIn
          ? <FiLogIn className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          : <FiLogOutIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {isCurrentlyIn ? 'Currently Checked In' : 'Checked Out'}
          </p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isCurrentlyIn ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'}`}>
            {record.status || 'present'}
          </span>
        </div>
        <div className="flex gap-4 mt-1 text-xs text-gray-400">
          {firstIn && <span>In: <span className="font-semibold text-gray-700 dark:text-gray-300">{fmt(firstIn.time)}</span></span>}
          {lastOut && <span>Out: <span className="font-semibold text-gray-700 dark:text-gray-300">{fmt(lastOut.time)}</span></span>}
          {record.workHours != null && <span>Hours: <span className="font-semibold text-gray-700 dark:text-gray-300">{record.workHours}h</span></span>}
        </div>
      </div>
      <Link to="/employee/attendance" className="text-xs text-indigo-600 hover:underline font-medium flex-shrink-0 flex items-center gap-1">
        Details <FiArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
};

async function authAPI_me() {
  try {
    const { default: api } = await import('../../services/api');
    const res = await api.get('/auth/me');
    if (res.data.success && res.data.data.employee) {
      const empId = res.data.data.employee._id || res.data.data.employee;
      const empRes = await api.get(`/employees/${empId}`);
      if (empRes.data.success) return empRes.data.data;
    }
  } catch (_) {}
  return null;
}

export default EmployeeDashboard;
