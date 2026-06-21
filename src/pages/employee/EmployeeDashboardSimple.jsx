import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { employeeAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const EmployeeDashboardSimple = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await employeeAPI.getMyProfile();
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome, {user?.firstName}!</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Employee Dashboard</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Employee ID</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{data?.employeeId || '--'}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Department</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{data?.department?.name || '--'}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Designation</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{data?.designation || '--'}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
          <p className="text-2xl font-bold text-green-600 mt-2 capitalize">{data?.status || '--'}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Your Profile</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">First Name</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">{data?.firstName || '--'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Last Name</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">{data?.lastName || '--'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">{user?.email || '--'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Phone</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">{user?.phone || '--'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboardSimple;
