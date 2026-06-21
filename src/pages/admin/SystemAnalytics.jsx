import React, { useState, useEffect } from 'react';
import { reportAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatCurrency } from '../../utils/helpers';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';
import { FiTrendingUp, FiUsers, FiDollarSign, FiCalendar } from 'react-icons/fi';

const COLORS = ['#1e40af', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const SystemAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await reportAPI.getOverview();
        if (res.data.success) setData(res.data.data);
      } finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return <LoadingSpinner text="Loading analytics..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">System Analytics</h1>
        <p className="text-gray-500 text-sm">Comprehensive view of all system data and trends</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Employees', value: data?.totalEmployees, icon: FiUsers, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Present Today', value: data?.presentToday, icon: FiCalendar, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Monthly Payroll', value: formatCurrency(data?.monthlySalary), icon: FiDollarSign, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Pending Leaves', value: data?.pendingLeaves, icon: FiTrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-5">
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className={`text-2xl font-bold ${color}`}>{value ?? '-'}</p>
            <p className="text-sm text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="section-title mb-4">6-Month Attendance Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data?.monthlyAttendance || []}>
              <defs>
                <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1e40af" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#1e40af" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="present" stroke="#1e40af" fill="url(#grad1)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h3 className="section-title mb-4">Salary Expenditure Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data?.salaryTrend || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString()}`, 'Net Salary']} />
              <Line type="monotone" dataKey="netSalary" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h3 className="section-title mb-4">Department Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data?.deptDistribution || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" name="Employees" radius={[4,4,0,0]}>
                {(data?.deptDistribution || []).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h3 className="section-title mb-4">Leave Status Breakdown</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={data?.leaveStats?.map(s => ({ name: s._id, value: s.count })) || []}
                dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                {(data?.leaveStats || []).map((_, i) => (
                  <Cell key={i} fill={['#10b981','#ef4444','#f59e0b','#6b7280'][i % 4]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default SystemAnalytics;
