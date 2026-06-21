import { useState, useEffect } from 'react';
import { employeeAPI, departmentAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { FiSearch, FiMail, FiPhone, FiBriefcase } from 'react-icons/fi';
import { getInitials } from '../../utils/helpers';

const Directory = () => {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  useEffect(() => {
    Promise.all([
      employeeAPI.getAll({ limit: 500, status: 'active' }),
      departmentAPI.getAll()
    ]).then(([empRes, deptRes]) => {
      if (empRes.data.success) setEmployees(empRes.data.data);
      if (deptRes.data.success) setDepartments(deptRes.data.data);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = employees.filter(e => {
    const name = `${e.firstName} ${e.lastName}`.toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase()) || e.designation?.toLowerCase().includes(search.toLowerCase()) || e.email?.toLowerCase().includes(search.toLowerCase());
    const matchDept = !deptFilter || e.department?._id === deptFilter || e.department === deptFilter;
    return matchSearch && matchDept;
  });

  if (loading) return <LoadingSpinner text="Loading directory..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title">Employee Directory</h1>
        <p className="text-gray-500 text-sm">{employees.length} active employees</p>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, designation, email…"
            className="input-field pl-9"
          />
        </div>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="input-field w-44">
          <option value="">All Departments</option>
          {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
        </select>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState icon="👥" title="No employees found" description="Try adjusting your search or filter." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(emp => (
            <div key={emp._id} className="card p-5 flex flex-col items-center text-center hover:shadow-card-hover transition-shadow">
              {/* Avatar */}
              <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden ring-2 ring-primary-100 mb-3">
                {emp.avatar
                  ? <img src={emp.avatar} alt="" className="w-full h-full object-cover" />
                  : <span className="text-primary-700 font-bold text-lg">{getInitials(`${emp.firstName} ${emp.lastName}`)}</span>
                }
              </div>

              <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{emp.firstName} {emp.lastName}</p>
              <p className="text-xs text-gray-500 mt-0.5">{emp.designation || '—'}</p>

              {emp.department?.name && (
                <span className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-xs text-gray-600 dark:text-gray-300">
                  <FiBriefcase className="w-3 h-3" /> {emp.department.name}
                </span>
              )}

              <div className="mt-3 w-full space-y-1.5 text-xs text-gray-500">
                {emp.email && (
                  <div className="flex items-center gap-2 justify-center truncate">
                    <FiMail className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                    <span className="truncate">{emp.email}</span>
                  </div>
                )}
                {emp.phone && (
                  <div className="flex items-center gap-2 justify-center">
                    <FiPhone className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                    <span>{emp.phone}</span>
                  </div>
                )}
              </div>

              {emp.isTeamLeader && (
                <span className="mt-3 badge bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs">Team Leader</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Directory;
