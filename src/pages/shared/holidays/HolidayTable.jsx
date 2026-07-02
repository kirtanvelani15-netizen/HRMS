import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import EmptyState from '../../../components/common/EmptyState';

const TYPE_COLORS = {
  public: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  optional: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  restricted: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  national: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  festival: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  state: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

const TYPE_LABELS = {
  public: 'Public Holiday',
  optional: 'Optional Holiday',
  restricted: 'Restricted Holiday',
  national: 'National Holiday',
  festival: 'Festival',
  state: 'State Holiday',
};

const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const applicableToText = (h) =>
  !h.applicableTo || h.applicableTo.scope === 'all' || !h.applicableTo.locations?.length
    ? 'All Departments'
    : h.applicableTo.locations.join(', ');

const HolidayTable = ({ holidays, year, onYearChange, canManage, onAdd, onEdit, onDelete }) => {
  return (
    <div className="card p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-1">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center shrink-0">4</span>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Holiday List</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
          <select value={year} onChange={e => onYearChange(Number(e.target.value))} className="input-field w-28">
            {[year - 1, year, year + 1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {canManage && (
            <button onClick={onAdd} className="btn-primary flex items-center justify-center gap-2 flex-1 sm:flex-none">
              <FiPlus className="w-4 h-4" /> Add Holiday
            </button>
          )}
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-4">View and manage company holidays.</p>

      {holidays.length === 0 ? (
        <EmptyState
          icon="🗓️"
          title="No holidays added yet"
          description={canManage ? 'Click "Add Holiday" to populate the calendar.' : 'No holidays have been added for this year.'}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100 dark:border-gray-700">
                <th className="py-2 pr-4 font-medium">Date</th>
                <th className="py-2 pr-4 font-medium">Holiday Name</th>
                <th className="py-2 pr-4 font-medium">Type</th>
                <th className="py-2 pr-4 font-medium">Applicable To</th>
                {canManage && <th className="py-2 pr-4 font-medium text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {holidays.map(h => (
                <tr key={h._id}>
                  <td className="py-3 pr-4 whitespace-nowrap text-gray-600 dark:text-gray-300">{fmtDate(h.date)}</td>
                  <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white">{h.name}</td>
                  <td className="py-3 pr-4">
                    <span className={`badge text-xs ${TYPE_COLORS[h.type] || TYPE_COLORS.public}`}>
                      {TYPE_LABELS[h.type] || h.type}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">{applicableToText(h)}</td>
                  {canManage && (
                    <td className="py-3 pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => onEdit(h)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                          <FiEdit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => onDelete(h._id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600">
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export { TYPE_COLORS, TYPE_LABELS };
export default HolidayTable;
