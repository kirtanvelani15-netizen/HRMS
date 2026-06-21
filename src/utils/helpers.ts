// Format currency with Indian comma formatting (1,00,000)
export const formatCurrency = (amount: number | string | null | undefined, currency: string = '₹'): string => {
  if (amount == null || amount === '') return `${currency}0`;
  const num = Number(amount);
  if (isNaN(num)) return `${currency}0`;
  const fixed = num.toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const lastThree = intPart.slice(-3);
  const rest = intPart.slice(0, -3);
  const formatted = rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree : lastThree;
  return `${currency}${formatted}${decPart && decPart !== '00' ? '.' + decPart : ''}`;
};

// Format date
export const formatDate = (date: string | Date | null | undefined, options: Intl.DateTimeFormatOptions = {}): string => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', ...options
  });
};

// Format date & time
export const formatDateTime = (date: string | Date | null | undefined): string => {
  if (!date) return '-';
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

// Get initials from name
export const getInitials = (name: string | null | undefined): string => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

// Status badge color map
export const getStatusColor = (status: string): string => {
  const map: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    inactive: 'bg-gray-100 text-gray-700',
    terminated: 'bg-red-100 text-red-700',
    present: 'bg-emerald-100 text-emerald-700',
    absent: 'bg-red-100 text-red-700',
    late: 'bg-amber-100 text-amber-700',
    'half-day': 'bg-blue-100 text-blue-700',
    holiday: 'bg-purple-100 text-purple-700',
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-700',
    paid: 'bg-emerald-100 text-emerald-700',
    unpaid: 'bg-red-100 text-red-700',
    'on-hold': 'bg-amber-100 text-amber-700',
    low: 'bg-blue-100 text-blue-700',
    medium: 'bg-amber-100 text-amber-700',
    high: 'bg-red-100 text-red-700',
    urgent: 'bg-red-200 text-red-800',
  };
  return map[status] || 'bg-gray-100 text-gray-700';
};

// Leave type color
export const getLeaveTypeColor = (type: string): string => {
  const map: Record<string, string> = {
    sick: 'bg-red-100 text-red-700',
    casual: 'bg-blue-100 text-blue-700',
    earned: 'bg-emerald-100 text-emerald-700',
    maternity: 'bg-pink-100 text-pink-700',
    paternity: 'bg-indigo-100 text-indigo-700',
    unpaid: 'bg-gray-100 text-gray-700',
    emergency: 'bg-orange-100 text-orange-700'
  };
  return map[type] || 'bg-gray-100 text-gray-700';
};

// Month name
export const getMonthName = (month: number): string => {
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return months[month - 1] || '';
};

// Get current month/year
export const getCurrentMonthYear = (): { month: number, year: number } => ({
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear()
});

// Download blob as file
export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// Truncate text
export const truncate = (text: string | null | undefined, length: number = 50): string => {
  if (!text) return '-';
  return text.length > length ? text.substring(0, length) + '...' : text;
};

// Calculate percentage
export const calcPercentage = (value: number, total: number): number => {
  if (!total) return 0;
  return Math.round((value / total) * 100);
};

// Days in month
export const getDaysInMonth = (month: number, year: number): number => new Date(year, month, 0).getDate();

// Role badge
export const getRoleBadge = (role: string): string => {
  const map: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-700',
    hr: 'bg-blue-100 text-blue-700',
    employee: 'bg-gray-100 text-gray-700'
  };
  return map[role] || 'bg-gray-100 text-gray-700';
};
