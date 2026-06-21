import React, { useState, useEffect } from 'react';
import { FiPlay, FiPause, FiClock, FiAlertCircle } from 'react-icons/fi';
import { worklogAPI, systemConfigAPI } from '../../services/api';
import toast from 'react-hot-toast';
import WorklogModal from './WorklogModal';

const WorklogTimer = ({ todayAttendance }) => {
  const [activeWorklog, setActiveWorklog] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [remainingTime, setRemainingTime] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [showHourlyReminder, setShowHourlyReminder] = useState(false);
  const [loading, setLoading] = useState(false);
  const [workHoursPerDay, setWorkHoursPerDay] = useState(8); // default 8 hours

  // Fetch work hours configuration and active worklog on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch configured work hours from system settings
        const configRes = await systemConfigAPI.getWorkHours();
        if (configRes.data.success && configRes.data.data?.workHoursPerDay) {
          setWorkHoursPerDay(configRes.data.data.workHoursPerDay);
        }
      } catch (err) {
        // Use default 8 hours if fetch fails
      }

      try {
        // Fetch active worklog
        const res = await worklogAPI.getActive();
        if (res.data.success && res.data.data) {
          setActiveWorklog(res.data.data);
          // Initialize elapsed time from start time
          const start = new Date(res.data.data.startTime);
          const now = new Date();
          const elapsed = Math.floor((now - start) / 1000);
          setElapsedTime(elapsed);
        }
      } catch (err) {
        // No active worklog
      }
    };
    fetchData();
  }, []);

  // Fetch today's all worklogs (pending + approved)
  const [todayWorkedHours, setTodayWorkedHours] = useState(0);

  useEffect(() => {
    const fetchTodayHours = async () => {
      try {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        // Fetch entries for today without status filter - get all entries for today
        const res = await worklogAPI.getEntries({
          startDate: todayStr,
          endDate: todayStr,
          limit: 100
        });

        // Sum all worklogs for today except the current active one
        const entries = res.data.data || [];
        const relevantEntries = entries.filter(entry => activeWorklog ? entry._id !== activeWorklog._id : true);

        const hours = relevantEntries.reduce((sum, entry) => {
          const entryHours = entry.hours || 0;
          return sum + entryHours;
        }, 0);

        setTodayWorkedHours(hours);
      } catch (err) {
        // Silent fail - use 0 as default
        setTodayWorkedHours(0);
      }
    };

    fetchTodayHours();
    // Refresh every 30 seconds
    const interval = setInterval(fetchTodayHours, 30000);
    return () => clearInterval(interval);
  }, [activeWorklog]);

  // Timer tick
  useEffect(() => {
    if (!activeWorklog?.startTime) return;

    const interval = setInterval(() => {
      const start = new Date(activeWorklog.startTime);
      const now = new Date();
      const elapsed = Math.floor((now - start) / 1000);
      setElapsedTime(elapsed);

      // Calculate remaining time to reach daily work requirement
      const hoursStillNeeded = Math.max(0, workHoursPerDay - todayWorkedHours);
      const secondsStillNeeded = hoursStillNeeded * 3600;
      const secondsOnCurrentTimer = elapsed;
      const remaining = Math.max(0, secondsStillNeeded - secondsOnCurrentTimer);

      setRemainingTime(remaining);

      // Check hourly reminder (every 3600 seconds on current timer)
      if (activeWorklog.lastReminderTime && elapsed > 0 && elapsed % 3600 < 1) {
        const lastReminder = new Date(activeWorklog.lastReminderTime);
        const timeSinceReminder = Math.floor((now - lastReminder) / 1000);
        if (timeSinceReminder >= 3600) {
          setShowHourlyReminder(true);
          updateLastReminderTime?.();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeWorklog, workHoursPerDay, todayWorkedHours]);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = async () => {
    setLoading(true);
    try {
      const res = await worklogAPI.startTimer();
      if (res.data.success) {
        setActiveWorklog(res.data.data);
        // Initialize elapsed time
        const start = new Date(res.data.data.startTime);
        const now = new Date();
        const elapsed = Math.floor((now - start) / 1000);
        setElapsedTime(elapsed);
        toast.success('Work timer started!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start timer');
    } finally {
      setLoading(false);
    }
  };

  const handleEnd = async () => {
    if (!activeWorklog) return;
    // Don't actually end yet, just open the modal to fill details
    setShowModal(true);
  };

  const handleModalClose = async (completed) => {
    if (completed) {
      // Worklog was saved, clear the active worklog
      setActiveWorklog(null);
      setElapsedTime(0);
      setRemainingTime(0);
    }
    setShowModal(false);
    setShowHourlyReminder(false);
  };

  const updateLastReminderTime = async () => {
    if (activeWorklog) {
      try {
        await worklogAPI.updateReminder(activeWorklog._id);
      } catch (err) {
        // Silent error
      }
    }
  };

  // Calculate remaining time even when not started
  const remainingHours = Math.max(0, workHoursPerDay - todayWorkedHours);
  const remainingSeconds = remainingHours * 3600;

  if (!activeWorklog) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center flex-shrink-0 shadow-lg">
              <FiClock className="w-8 h-8 text-white opacity-80" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                  <span className="w-2 h-2 rounded-full bg-gray-600 dark:bg-gray-400" />
                  Not Started
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{formatTime(remainingSeconds)} remaining</p>
            </div>
          </div>
          <button
            onClick={handleStart}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 font-medium transition-colors whitespace-nowrap"
          >
            <FiPlay className="w-4 h-4" /> Start Working
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Hourly Reminder - Overlay all content */}
      {showHourlyReminder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 transform animate-bounce">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0">
                <FiAlertCircle className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Hourly Worklog Update</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  You've been working for 1 hour. Please fill in your worklog details to continue.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowHourlyReminder(false);
                setShowModal(true);
              }}
              className="w-full mt-4 bg-amber-600 hover:bg-amber-700 text-white py-2.5 rounded-lg font-medium transition-colors"
            >
              Fill Worklog Details
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-lg">
              <span className="text-lg font-mono font-bold text-white text-center">{formatTime(elapsedTime)}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
                  Currently Working
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Time Elapsed</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Remaining to complete present: {formatTime(remainingTime)}
              </p>
            </div>
          </div>
          <button
            onClick={handleEnd}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 font-medium transition-colors whitespace-nowrap"
          >
            <FiPause className="w-4 h-4" /> End & Fill Details
          </button>
        </div>
      </div>

      {showModal && (
        <WorklogModal
          activeWorklog={activeWorklog}
          onClose={handleModalClose}
          elapsedTime={elapsedTime}
        />
      )}
    </>
  );
};

export default WorklogTimer;
