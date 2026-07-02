import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const WeekoffTemplateList = ({ templates, onCreate, onEdit, onDelete }) => {
  return (
    <div className="card p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-1">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center shrink-0">1</span>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Weekly Off Templates</h2>
        </div>
        <button onClick={onCreate} className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto">
          <FiPlus className="w-4 h-4" /> Create New Template
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-4">Create and manage weekly off templates that can be assigned to departments.</p>

      {templates.length === 0 ? (
        <p className="text-sm text-gray-400 italic py-4">No templates yet. Create one to get started.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100 dark:border-gray-700">
                <th className="py-2 pr-4 font-medium">Template Name</th>
                <th className="py-2 pr-4 font-medium">Weekly Off Days</th>
                <th className="py-2 pr-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {templates.map(t => (
                <tr key={t._id}>
                  <td className="py-3 pr-4">
                    <span className="font-medium text-gray-900 dark:text-white">{t.name}</span>
                    {t.isDefault && <span className="ml-2 text-xs text-gray-400">(Default)</span>}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-wrap gap-1.5">
                      {t.offDays.length === 0
                        ? <span className="text-xs text-gray-400">None</span>
                        : t.offDays.slice().sort().map(d => (
                          <span key={d} className="badge bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 text-xs">
                            {DAY_LABELS[d]}
                          </span>
                        ))}
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => onEdit(t)} className="p-1.5 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-600">
                        <FiEdit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => onDelete(t)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500">
                        <FiTrash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default WeekoffTemplateList;
