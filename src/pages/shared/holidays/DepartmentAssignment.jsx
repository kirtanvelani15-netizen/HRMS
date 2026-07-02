import { useState, useEffect } from 'react';

const DepartmentAssignment = ({ departments, templates, onSave, saving }) => {
  const [assignments, setAssignments] = useState({});

  useEffect(() => {
    const initial = {};
    departments.forEach(d => { initial[d._id] = d.weekoffTemplate?._id || d.weekoffTemplate || ''; });
    setAssignments(initial);
  }, [departments]);

  const handleChange = (deptId, templateId) => {
    setAssignments(a => ({ ...a, [deptId]: templateId }));
  };

  const handleSave = () => {
    onSave(Object.entries(assignments).map(([departmentId, weekoffTemplateId]) => ({ departmentId, weekoffTemplateId })));
  };

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-6 h-6 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center shrink-0">3</span>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Department Assignment</h2>
      </div>
      <p className="text-sm text-gray-500 mb-4">Assign weekly off templates to departments.</p>

      {departments.length === 0 ? (
        <p className="text-sm text-gray-400 italic py-4">No departments found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100 dark:border-gray-700">
                <th className="py-2 pr-4 font-medium">Department</th>
                <th className="py-2 pr-4 font-medium">Weekly Off Template</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {departments.map(dept => (
                <tr key={dept._id}>
                  <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white">{dept.name}</td>
                  <td className="py-3 pr-4">
                    <select
                      value={assignments[dept._id] || ''}
                      onChange={e => handleChange(dept._id, e.target.value)}
                      className="input-field w-full sm:w-64"
                    >
                      <option value="">Use company default</option>
                      {templates.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-end mt-4">
        <button onClick={handleSave} disabled={saving || departments.length === 0} className="btn-primary">
          {saving ? 'Saving...' : 'Save Assignment'}
        </button>
      </div>
    </div>
  );
};

export default DepartmentAssignment;
