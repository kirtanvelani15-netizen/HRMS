const SkeletonCard = ({ lines = 3, className = '' }) => (
  <div className={`card p-6 animate-pulse ${className}`}>
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
    {Array.from({ length: lines }).map((_, i) => (
      <div key={i} className={`h-3 bg-gray-100 dark:bg-gray-700/60 rounded mb-2 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
    ))}
  </div>
);

export const SkeletonRow = ({ cols = 5 }) => (
  <tr className="animate-pulse">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-6 py-4">
        <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-3/4" />
      </td>
    ))}
  </tr>
);

export default SkeletonCard;
