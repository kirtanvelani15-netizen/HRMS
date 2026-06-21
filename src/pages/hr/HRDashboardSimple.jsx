import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { reportAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const HRDashboardSimple = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await reportAPI.getOverview();
        if (res.data.success) {
          setData(res.data.data);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <LoadingSpinner text="Loading dashboard..." />;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">HR Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Employees</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{data?.totalEmployees || 0}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Present Today</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{data?.presentToday || 0}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Pending Leaves</p>
          <p className="text-3xl font-bold text-orange-600 mt-2">{data?.pendingLeaves || 0}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Attendance Rate</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">{data?.attendanceRate || 0}%</p>
        </div>
      </div>

    </div>
  );
};

export default HRDashboardSimple;
