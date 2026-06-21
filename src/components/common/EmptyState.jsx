const EmptyState = ({ icon = '📭', title = 'Nothing here yet', description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
    <div className="text-5xl mb-4 select-none">{icon}</div>
    <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">{title}</h3>
    {description && <p className="text-sm text-gray-500 max-w-xs">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export default EmptyState;
