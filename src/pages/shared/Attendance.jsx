import React, { useState, useEffect, useCallback, useRef } from 'react';
import { attendanceAPI, employeeAPI, departmentAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { io } from 'socket.io-client';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import ImportDialog from '../../components/common/ImportDialog';
import { FiPlus, FiEdit2, FiSearch, FiUpload, FiCalendar, FiChevronLeft, FiChevronRight, FiLayers, FiDownload } from 'react-icons/fi';
import { formatDate, getStatusColor, getInitials, downloadBlob } from '../../utils/helpers';
import toast from 'react-hot-toast';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ||
  (window.location.hostname === 'localhost'
    ? 'http://localhost:5000'
    : 'https://hr-backend-psi-five.vercel.app');

const STATUS_OPTS = ['present', 'absent', 'late', 'half-day', 'holiday', 'weekend'];

const toDateKey = (value) => {
  const date = new Date(value);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const Attendance = () => {
  const { user } = useAuth();
  const isEmployee = user.role === 'employee';

  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, total: 0 });

  // HR filter mode: 'date' (single day) or 'month' (full month range)
  const [filterMode, setFilterMode] = useState('month');
  const [filters, setFilters] = useState({
    date: new Date().toISOString().slice(0, 10),
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    status: '', employee: '', department: '', search: '', page: 1, limit: 20
  });

  // Employee calendar
  const [calendarMonth, setCalendarMonth] = useState(new Date().toISOString().slice(0, 7));

  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [dateMode, setDateMode] = useState('single'); // 'single' or 'range'
  const [form, setForm] = useState({ employee: '', date: new Date().toISOString().slice(0, 10), fromDate: new Date().toISOString().slice(0, 10), toDate: new Date().toISOString().slice(0, 10), status: 'present', checkIn: '', checkOut: '', notes: '' });
  const [importForm, setImportForm] = useState({ file: null, dateMode: 'sheet', date: new Date().toISOString().slice(0, 10) });
  const [importResult, setImportResult] = useState(null);
  const [bulkForm, setBulkForm] = useState({ date: new Date().toISOString().slice(0, 10), status: 'present', checkIn: '', checkOut: '' });
  const [bulkSelectedIds, setBulkSelectedIds] = useState([]);
  const [bulkResult, setBulkResult] = useState(null);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const toggleExpand = (id) => setExpandedRows(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [liveFlash, setLiveFlash] = useState(null);
  const fetchRecordsRef = useRef(null);
  const fetchSummaryRef = useRef(null);

  const buildHRParams = useCallback(() => {
    if (filterMode === 'month') {
      return { month: filters.month, year: filters.year, status: filters.status, employee: filters.employee, department: filters.department, search: filters.search, page: filters.page, limit: filters.limit };
    }
    return { date: filters.date, status: filters.status, employee: filters.employee, department: filters.department, search: filters.search, page: filters.page, limit: filters.limit };
  }, [filterMode, filters]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const [year, month] = calendarMonth.split('-').map(Number);
      const params = isEmployee ? { month, year, limit: 100 } : buildHRParams();
      const res = await attendanceAPI.getAll(params);
      if (res.data.success) {
        setRecords(res.data.data);
        setPagination({ currentPage: res.data.currentPage || 1, totalPages: res.data.totalPages || 1, total: res.data.total || 0 });
      }
    } finally { setLoading(false); }
  }, [calendarMonth, isEmployee, buildHRParams]);

  const fetchSummary = useCallback(async () => {
    try {
      const [year, month] = calendarMonth.split('-').map(Number);
      let params;
      if (isEmployee) {
        params = { month, year };
      } else if (filterMode === 'month') {
        params = { month: filters.month, year: filters.year };
      } else {
        params = { date: filters.date };
      }
      const res = await attendanceAPI.getSummary(params);
      if (res.data.success) setSummary(res.data.data.summary);
    } catch (_) {}
  }, [calendarMonth, isEmployee, filterMode, filters]);

  useEffect(() => { fetchRecords(); fetchSummary(); }, [fetchRecords, fetchSummary]);

  // Keep refs up to date so socket handler always calls latest version
  useEffect(() => { fetchRecordsRef.current = fetchRecords; }, [fetchRecords]);
  useEffect(() => { fetchSummaryRef.current = fetchSummary; }, [fetchSummary]);

  // Live update: re-fetch when a punch-result comes in via socket
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socket.on('connect', () => socket.emit('join-reception'));
    socket.on('punch-result', (payload) => {
      if (payload.success) {
        fetchRecordsRef.current?.();
        fetchSummaryRef.current?.();
        setLiveFlash({ employeeName: payload.employeeName, punchLabel: payload.punchLabel || payload.type });
        setTimeout(() => setLiveFlash(null), 4000);
      }
    });
    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    if (!isEmployee) {
      employeeAPI.getAll({ limit: 200 }).then(r => { if (r.data.success) setEmployees(r.data.data); });
      departmentAPI.getAll().then(r => { if (r.data.success) setDepartments(r.data.data); });
    }
  }, [isEmployee]);

  const handleSave = async () => {
    if (!form.employee && !isEmployee) return toast.error('Select an employee');
    if (dateMode === 'range' && (!form.fromDate || !form.toDate)) return toast.error('Select both from and to dates');
    if (dateMode === 'range' && form.fromDate > form.toDate) return toast.error('From date must be before to date');

    setSaving(true);
    try {
      if (dateMode === 'range' && !editRecord) {
        // Mark attendance for date range
        const startDate = new Date(form.fromDate);
        const endDate = new Date(form.toDate);
        const dates = [];
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          dates.push(d.toISOString().slice(0, 10));
        }

        const records = dates.map(date => ({
          employee: form.employee,
          date,
          status: form.status,
          checkIn: form.checkIn ? `${date}T${form.checkIn}` : '',
          checkOut: form.checkOut ? `${date}T${form.checkOut}` : '',
          notes: form.notes
        }));

        const res = await attendanceAPI.bulkMark({ records });
        if (res.data.success) {
          const ok = res.data.data.filter(r => r.success).length;
          const fail = res.data.data.filter(r => !r.success).length;
          toast.success(`${ok} records marked${fail ? `, ${fail} failed` : ''}`);
        }
      } else {
        const payload = {
          ...form,
          checkIn: form.checkIn ? `${form.date}T${form.checkIn}` : '',
          checkOut: form.checkOut ? `${form.date}T${form.checkOut}` : ''
        };
        if (editRecord) {
          await attendanceAPI.update(editRecord._id, payload);
          toast.success('Attendance updated');
        } else {
          await attendanceAPI.mark(payload);
          toast.success('Attendance marked');
        }
      }
      fetchRecords(); setShowModal(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleBulkMark = async () => {
    if (!bulkSelectedIds.length) return toast.error('Select at least one employee');
    setBulkSaving(true);
    setBulkResult(null);
    try {
      const records = bulkSelectedIds.map(id => ({
        employee: id,
        date: bulkForm.date,
        status: bulkForm.status,
        checkIn: bulkForm.checkIn ? `${bulkForm.date}T${bulkForm.checkIn}` : undefined,
        checkOut: bulkForm.checkOut ? `${bulkForm.date}T${bulkForm.checkOut}` : undefined,
      }));
      const res = await attendanceAPI.bulkMark({ records });
      if (res.data.success) {
        const ok = res.data.data.filter(r => r.success).length;
        const fail = res.data.data.filter(r => !r.success).length;
        setBulkResult({ ok, fail });
        toast.success(`${ok} marked successfully${fail ? `, ${fail} failed` : ''}`);
        fetchRecords(); fetchSummary();
        setBulkSelectedIds([]);
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Bulk mark failed'); }
    finally { setBulkSaving(false); }
  };

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      const res = await attendanceAPI.downloadPunchTemplate();
      downloadBlob(res.data, 'attendance-punch-template.xlsx');
    } catch (_) { toast.error('Template download failed'); }
    finally { setDownloadingTemplate(false); }
  };

  const handleImport = async () => {
    if (!importForm.file) return toast.error('Select an Excel file');
    if (importForm.dateMode === 'selected' && !importForm.date) return toast.error('Select attendance date');
    setImporting(true); setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', importForm.file);
      formData.append('dateMode', importForm.dateMode);
      if (importForm.dateMode === 'selected') formData.append('date', importForm.date);
      const res = await attendanceAPI.importPunchExcel(formData);
      if (res.data.success) { setImportResult(res.data.data); toast.success(res.data.message || 'Attendance imported'); fetchRecords(); fetchSummary(); }
    } catch (err) { toast.error(err.response?.data?.message || 'Import failed'); }
    finally { setImporting(false); }
  };

  // Employee calendar
  const calendarDate = new Date(`${calendarMonth}-01T00:00:00`);
  const calendarYear = calendarDate.getFullYear();
  const calendarMonthIndex = calendarDate.getMonth();
  const calendarTitle = calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(calendarYear, calendarMonthIndex + 1, 0).getDate();
  const firstWeekday = new Date(calendarYear, calendarMonthIndex, 1).getDay();
  const recordByDate = new Map(records.map(r => [toDateKey(r.date), r]));
  const calendarCells = [
    ...Array.from({ length: firstWeekday }, (_, i) => ({ type: 'blank', key: `blank-${i}` })),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const date = new Date(calendarYear, calendarMonthIndex, day);
      const key = toDateKey(date);
      return { type: 'day', key, day, record: recordByDate.get(key) };
    })
  ];
  const changeCalendarMonth = (offset) => {
    const next = new Date(calendarYear, calendarMonthIndex + offset, 1);
    setCalendarMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
  };
  const employeeStatusStyle = (status) => {
    if (status === 'present' || status === 'late') return 'bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-200';
    if (status === 'absent') return 'bg-red-100 border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-200';
    if (status === 'half-day') return 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-200';
    if (status === 'holiday') return 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-200';
    if (status === 'weekend') return 'bg-gray-100 border-gray-300 text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200';
    return 'bg-white border-gray-200 text-gray-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400';
  };

  const fmtTime = (v) => v ? new Date(v).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '--';

  const columns = [
    {
      header: 'Employee', key: 'employee',
      render: (val, row) => val ? (
        <div className="flex items-center gap-2">
          {!isEmployee && (
            <button
              onClick={() => toggleExpand(row._id)}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border transition-colors flex-shrink-0 ${expandedRows.has(row._id) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-800 text-gray-500 border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:text-blue-500'}`}
              title="View punch log"
            >
              {expandedRows.has(row._id) ? '−' : '+'}
            </button>
          )}
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-xs font-semibold text-primary-700 flex-shrink-0">{getInitials(`${val.firstName} ${val.lastName}`)}</div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white text-sm">{val.firstName} {val.lastName}</p>
            <p className="text-xs text-gray-500">{val.department?.name}</p>
          </div>
        </div>
      ) : '-'
    },
    { header: 'Date', key: 'date', render: (v) => formatDate(v) },
    { header: 'Status', key: 'status', render: (v) => <span className={`badge ${getStatusColor(v)}`}>{v}</span> },
    { header: 'First In', key: 'checkIn', render: (v) => fmtTime(v) },
    { header: 'Last Out', key: 'checkOut', render: (v) => fmtTime(v) },
    { header: 'Work Hrs', key: 'workHours', render: (v) => v ? `${v}h` : '-' },
    ...(!isEmployee ? [{
      header: 'Actions', key: '_id',
      render: (_, row) => (
        <button onClick={() => { setEditRecord(row); setForm({ employee: row.employee?._id, date: row.date?.slice(0, 10), status: row.status, checkIn: row.checkIn ? new Date(row.checkIn).toTimeString().slice(0, 5) : '', checkOut: row.checkOut ? new Date(row.checkOut).toTimeString().slice(0, 5) : '', notes: row.notes || '' }); setShowModal(true); }}
          className="p-1.5 rounded hover:bg-blue-50 text-blue-600"><FiEdit2 className="w-4 h-4" /></button>
      )
    }] : [])
  ];

  const hasActiveFilter = filters.search || filters.status || filters.employee || filters.department;

  return (
    <div className="space-y-6">
      {/* Live punch flash banner */}
      {liveFlash && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-sm font-medium animate-pulse">
          <span className="text-lg">🟢</span>
          <span><strong>{liveFlash.employeeName}</strong> — {liveFlash.punchLabel} recorded. Table updated.</span>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
        {!isEmployee && (
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
            <button onClick={() => { setImportForm({ file: null, dateMode: 'sheet', date: new Date().toISOString().slice(0, 10) }); setImportResult(null); setShowImportModal(true); }}
              className="btn-secondary flex items-center gap-1.5 justify-center text-sm px-2.5 flex-1 sm:flex-none basis-[calc(50%-4px)] sm:basis-auto">
              <FiUpload className="w-4 h-4 shrink-0" /> <span className="truncate">Import Excel</span>
            </button>
            <button onClick={() => { setBulkForm({ date: filters.date, status: 'present', checkIn: '', checkOut: '' }); setBulkSelectedIds([]); setBulkResult(null); setShowBulkModal(true); }}
              className="btn-secondary flex items-center gap-1.5 text-purple-700 border-purple-200 hover:bg-purple-50 justify-center text-sm px-2.5 flex-1 sm:flex-none basis-[calc(50%-4px)] sm:basis-auto">
              <FiLayers className="w-4 h-4 shrink-0" /> <span className="truncate">Bulk Mark</span>
            </button>
            <button onClick={() => { setEditRecord(null); setDateMode('single'); setForm({ employee: '', date: new Date().toISOString().slice(0, 10), fromDate: new Date().toISOString().slice(0, 10), toDate: new Date().toISOString().slice(0, 10), status: 'present', checkIn: '', checkOut: '', notes: '' }); setShowModal(true); }}
              className="btn-primary flex items-center gap-1.5 justify-center text-sm px-2.5 w-full sm:w-auto sm:flex-none">
              <FiPlus className="w-4 h-4 shrink-0" /> <span className="truncate">Mark Attendance</span>
            </button>
          </div>
        )}
      </div>

      {isEmployee ? (
        /* Employee: calendar view */
        <div className="card p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Monthly attendance</p>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{calendarTitle}</h2>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => changeCalendarMonth(-1)} className="btn-secondary px-3"><FiChevronLeft className="w-4 h-4" /></button>
              <input type="month" value={calendarMonth} onChange={e => setCalendarMonth(e.target.value)} className="input-field w-40" />
              <button onClick={() => changeCalendarMonth(1)} className="btn-secondary px-3"><FiChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {calendarCells.map(cell => cell.type === 'blank' ? (
              <div key={cell.key} className="min-h-24 rounded-lg border border-transparent" />
            ) : (
              <div key={cell.key} className={`min-h-24 rounded-lg border p-2 flex flex-col justify-between ${employeeStatusStyle(cell.record?.status)}`}>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-semibold">{cell.day}</span>
                  {cell.record?.status && <span className="text-[10px] uppercase font-semibold truncate">{cell.record.status}</span>}
                </div>
                {cell.record ? (
                  <div className="text-left text-xs leading-5">
                    {cell.record.punches && cell.record.punches.length > 0 ? (
                      <>
                        {cell.record.punches.map((p, pi) => {
                          const isIn = p.punchNumber % 2 === 1;
                          return (
                            <p key={pi} className={isIn ? 'text-emerald-700 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'}>
                              {isIn ? '▶ In' : '◀ Out'} {new Date(p.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          );
                        })}
                        <p className="font-semibold mt-0.5">{cell.record.workHours || 0}h</p>
                      </>
                    ) : (
                      <>
                        <p>{cell.record.checkIn ? new Date(cell.record.checkIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '--'} in</p>
                        <p>{cell.record.checkOut ? new Date(cell.record.checkOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '--'} out</p>
                        <p className="font-semibold">{cell.record.workHours || 0}h</p>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-left text-xs text-gray-400">No record</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* HR Filters */}
          <div className="card p-4 space-y-3">
            {/* Filter mode toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500">View by:</span>
              <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                {[['date', 'Single Day'], ['month', 'Full Month']].map(([mode, label]) => (
                  <button key={mode} onClick={() => setFilterMode(mode)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${filterMode === mode ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-48">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value, employee: '', page: 1 }))}
                  className="input-field pl-9" placeholder="Search employee name, ID..." />
              </div>

              {filterMode === 'date' ? (
                <div className="relative w-44">
                  <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="date" value={filters.date} onChange={e => setFilters(f => ({ ...f, date: e.target.value, page: 1 }))} className="input-field pl-9" />
                </div>
              ) : (
                <>
                  <select value={filters.month} onChange={e => setFilters(f => ({ ...f, month: Number(e.target.value), page: 1 }))} className="input-field w-36">
                    {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>)}
                  </select>
                  <select value={filters.year} onChange={e => setFilters(f => ({ ...f, year: Number(e.target.value), page: 1 }))} className="input-field w-28">
                    {Array.from({ length: 4 }, (_, i) => { const y = new Date().getFullYear() - i; return <option key={y} value={y}>{y}</option>; })}
                  </select>
                </>
              )}

              {hasActiveFilter && (
                <button onClick={() => setFilters(f => ({ ...f, search: '', status: '', employee: '', department: '', page: 1 }))} className="btn-secondary text-sm">Clear</button>
              )}
            </div>
          </div>

          {/* Attendance table with expandable punch log */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    {columns.map((col, i) => <th key={i} className="table-header">{col.header}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {loading ? (
                    <tr><td colSpan={columns.length} className="py-12 text-center text-gray-500">Loading…</td></tr>
                  ) : records.length === 0 ? (
                    <tr><td colSpan={columns.length} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <span className="text-4xl">📅</span>
                        <p className="text-gray-500 text-sm">No attendance records</p>
                      </div>
                    </td></tr>
                  ) : records.map((row, ri) => (
                    <React.Fragment key={row._id || ri}>
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        {columns.map((col, ci) => (
                          <td key={ci} className="table-cell">
                            {col.render ? col.render(row[col.key], row, ri) : (row[col.key] ?? '-')}
                          </td>
                        ))}
                      </tr>
                      {/* Expandable punch log */}
                      {expandedRows.has(row._id) && (
                        <tr className="bg-blue-50/60 dark:bg-blue-900/10">
                          <td colSpan={columns.length} className="px-6 py-3">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">Punch Log — {row.employee?.firstName} {row.employee?.lastName}</span>
                              <span className="text-xs text-gray-400">({(row.punches || []).length} punch{(row.punches || []).length !== 1 ? 'es' : ''})</span>
                            </div>
                            {(!row.punches || row.punches.length === 0) ? (
                              <p className="text-xs text-gray-400 italic">No QR punches recorded — manually marked.</p>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {[...row.punches].sort((a, b) => a.punchNumber - b.punchNumber).map((p, pi, sorted) => {
                                  const isIn = p.punchNumber % 2 === 1;
                                  const isLastPunch = pi === sorted.length - 1;
                                  const label = isIn
                                    ? (p.punchNumber === 1 ? 'Punch In' : 'Resume Work')
                                    : (isLastPunch ? 'Final Out' : 'Break Start');
                                  const prevPunch = sorted[pi - 1];
                                  const showBreak = isIn && pi > 0 && prevPunch && prevPunch.punchNumber % 2 === 0;
                                  return (
                                  <div key={pi} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${isIn ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-300' : 'bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-700 dark:text-orange-300'}`}>
                                    <span className="text-base">{isIn ? '↙' : '↗'}</span>
                                    <div>
                                      <div className="font-bold uppercase text-[10px] tracking-wide">{label}</div>
                                      <div>{new Date(p.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                                    </div>
                                    {showBreak && (
                                      <div className="ml-1 pl-2 border-l border-current opacity-60 text-[10px]">
                                        break: {Math.round((new Date(p.time) - new Date(prevPunch.time)) / 60000)}m
                                      </div>
                                    )}
                                  </div>
                                  );
                                })}
                                <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-800 dark:bg-purple-900/20 dark:border-purple-700 dark:text-purple-300 text-xs font-semibold ml-auto">
                                  <span>⏱</span> {row.workHours || 0}h worked
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500">Page {pagination.currentPage} of {pagination.totalPages} ({pagination.total} records)</p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))} disabled={pagination.currentPage === 1} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40">‹</button>
                  {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                    let page = i + 1;
                    if (pagination.totalPages > 5 && pagination.currentPage > 3) page = pagination.currentPage - 2 + i;
                    if (page > pagination.totalPages) return null;
                    return <button key={page} onClick={() => setFilters(f => ({ ...f, page }))} className={`w-8 h-8 rounded-lg text-sm font-medium ${page === pagination.currentPage ? 'bg-primary-700 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600'}`}>{page}</button>;
                  })}
                  <button onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))} disabled={pagination.currentPage === pagination.totalPages} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40">›</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Single Mark Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editRecord ? 'Edit Attendance Record' : 'Mark Attendance'} size="lg"
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
          </>
        }
      >
        <div className="space-y-5">
          {!isEmployee && !editRecord && (
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">Employee Selection *</label>
              <select value={form.employee} onChange={e => setForm(f => ({ ...f, employee: e.target.value }))} className="input-field">
                <option value="">Select an employee</option>
                {employees.map(e => <option key={e._id} value={e._id}>{e.firstName} {e.lastName}</option>)}
              </select>
            </div>
          )}

          {!editRecord && (
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">Date Selection</label>
              <div className="flex gap-2 mb-4">
                {[['single', 'Single Day'], ['range', 'Date Range']].map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setDateMode(mode)}
                    className={`flex-1 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      dateMode === mode
                        ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-primary-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {dateMode === 'single' ? (
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Date *</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="input-field"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">From Date *</label>
                    <input
                      type="date"
                      value={form.fromDate}
                      onChange={e => setForm(f => ({ ...f, fromDate: e.target.value }))}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">To Date *</label>
                    <input
                      type="date"
                      value={form.toDate}
                      onChange={e => setForm(f => ({ ...f, toDate: e.target.value }))}
                      className="input-field"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {editRecord && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Date</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="input-field" />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">Attendance Status *</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="input-field">
              <option value="">Select status</option>
              {STATUS_OPTS.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
            </select>
          </div>

          {!['absent', 'holiday', 'weekend'].includes(form.status) && (
            <div className="grid grid-cols-2 gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Check In Time</label>
                <input type="time" value={form.checkIn} onChange={e => setForm(f => ({ ...f, checkIn: e.target.value }))} className="input-field" placeholder="HH:MM" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Check Out Time</label>
                <input type="time" value={form.checkOut} onChange={e => setForm(f => ({ ...f, checkOut: e.target.value }))} className="input-field" placeholder="HH:MM" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">Notes (Optional)</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="input-field"
              rows={3}
              placeholder="Add any relevant notes..."
            />
          </div>
        </div>
      </Modal>

      {/* Bulk Mark Modal */}
      <Modal isOpen={showBulkModal} onClose={() => setShowBulkModal(false)} title="Bulk Mark Attendance" size="lg"
        footer={
          <>
            <button onClick={() => setShowBulkModal(false)} className="btn-secondary">Close</button>
            <button onClick={handleBulkMark} disabled={bulkSaving || !bulkSelectedIds.length} className="btn-primary">
              {bulkSaving ? 'Marking...' : `Mark ${bulkSelectedIds.length} Employee${bulkSelectedIds.length !== 1 ? 's' : ''}`}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="label">Date *</label>
              <input type="date" value={bulkForm.date} onChange={e => setBulkForm(f => ({ ...f, date: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="label">Status *</label>
              <select value={bulkForm.status} onChange={e => setBulkForm(f => ({ ...f, status: e.target.value }))} className="input-field">
                {STATUS_OPTS.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
              </select>
            </div>
            {!['absent', 'holiday', 'weekend'].includes(bulkForm.status) && (
              <>
                <div>
                  <label className="label">Check In</label>
                  <input type="time" value={bulkForm.checkIn} onChange={e => setBulkForm(f => ({ ...f, checkIn: e.target.value }))} className="input-field" />
                </div>
                <div>
                  <label className="label">Check Out</label>
                  <input type="time" value={bulkForm.checkOut} onChange={e => setBulkForm(f => ({ ...f, checkOut: e.target.value }))} className="input-field" />
                </div>
              </>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Select Employees ({bulkSelectedIds.length} selected)</label>
              <button onClick={() => setBulkSelectedIds(bulkSelectedIds.length === employees.length ? [] : employees.map(e => e._id))}
                className="text-xs text-primary-600 hover:underline font-medium">
                {bulkSelectedIds.length === employees.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="max-h-56 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
              {employees.map(emp => (
                <label key={emp._id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
                  <input type="checkbox" checked={bulkSelectedIds.includes(emp._id)}
                    onChange={e => setBulkSelectedIds(prev => e.target.checked ? [...prev, emp._id] : prev.filter(id => id !== emp._id))}
                    className="w-4 h-4 text-primary-600 rounded" />
                  <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-xs font-semibold text-primary-700 flex-shrink-0">
                    {getInitials(`${emp.firstName} ${emp.lastName}`)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{emp.firstName} {emp.lastName}</p>
                    <p className="text-xs text-gray-500 truncate">{emp.department?.name} · {emp.designation}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {bulkResult && (
            <div className="flex gap-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-sm">
              <span className="text-emerald-600 font-medium">{bulkResult.ok} marked</span>
              {bulkResult.fail > 0 && <span className="text-red-600 font-medium">{bulkResult.fail} failed</span>}
            </div>
          )}
        </div>
      </Modal>

      {/* Import Punch Dialog */}
      <ImportDialog
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Punch Excel"
        description="Upload your Excel file to import punch data"
        onImport={handleImport}
        onFileChange={e => setImportForm(f => ({ ...f, file: e.target.files?.[0] || null }))}
        onDownloadTemplate={handleDownloadTemplate}
        onDateModeChange={mode => setImportForm(f => ({ ...f, dateMode: mode }))}
        onDateChange={date => setImportForm(f => ({ ...f, date }))}
        importing={importing}
        downloading={downloadingTemplate}
        importForm={importForm}
        dateConfig={{
          modes: [['sheet', 'Excel Date'], ['selected', 'Selected Date']],
          selectedMode: importForm.dateMode,
          selectedDate: importForm.date
        }}
      >
        {importResult && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Import Results</h4>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="grid grid-cols-3 gap-3 text-center mb-3">
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{importResult.totalRows}</p>
                  <p className="text-xs text-gray-500 mt-1">Total Rows</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-600">{importResult.imported}</p>
                  <p className="text-xs text-gray-500 mt-1">Imported</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-600">{importResult.unmatched}</p>
                  <p className="text-xs text-gray-500 mt-1">Unmatched</p>
                </div>
              </div>
              {importResult.results?.some(r => !r.success) && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Errors:</p>
                  <div className="max-h-32 overflow-auto space-y-1">
                    {importResult.results.filter(r => !r.success).slice(0, 10).map((row, idx) => (
                      <p key={`${row.name}-${idx}`} className="text-xs text-red-600 dark:text-red-400">{row.name}: {row.error}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </ImportDialog>
    </div>
  );
};

export default Attendance;
