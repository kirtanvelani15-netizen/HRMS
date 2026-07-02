import axios from 'axios';

const baseURL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000
});

// Request interceptor - attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.startsWith('/login')) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  employeeSignup: (data) => api.post('/auth/employee-signup', data),
  verifyOTP: (email, otp) => api.post('/auth/verify-otp', { email, otp }),
  getMe: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post(`/auth/reset-password/${token}`, { password }),
  changePassword: (data) => api.put('/auth/change-password', data),
  updateProfile: (data) => api.put('/auth/update-profile', data),
  uploadAvatar: (formData) => api.post('/auth/upload-avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getDepartments: () => api.get('/departments')
};

// ─── Employees ───────────────────────────────────────────────────────────────
export const employeeAPI = {
  getAll: (params) => api.get('/employees', { params }),
  getById: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),
  uploadPhoto: (id, formData) => api.post(`/employees/${id}/photo`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getStats: () => api.get('/employees/stats'),
  getTeamLeaders: () => api.get('/employees/team-leaders'),
  getManagers: () => api.get('/employees/managers'),
  getCelebrations: () => api.get('/employees/celebrations'),
  getOnboardingStatus: () => api.get('/employees/onboarding-status'),
  getMyProfile: () => api.get('/employees/me'),
};

// ─── Departments ─────────────────────────────────────────────────────────────
export const departmentAPI = {
  getAll: () => api.get('/departments'),
  getById: (id) => api.get(`/departments/${id}`),
  create: (data) => api.post('/departments', data),
  update: (id, data) => api.put(`/departments/${id}`, data),
  delete: (id) => api.delete(`/departments/${id}`),
  assignWeekoff: (assignments) => api.put('/departments/weekoff-assignment', { assignments })
};

// ─── Attendance ──────────────────────────────────────────────────────────────
export const attendanceAPI = {
  getAll: (params) => api.get('/attendance', { params }),
  getSummary: (params) => api.get('/attendance/summary', { params }),
  mark: (data) => api.post('/attendance', data),
  bulkMark: (data) => api.post('/attendance/bulk', data),
  importPunchExcel: (formData) => api.post('/attendance/import-punch-excel', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  downloadPunchTemplate: () => api.get('/attendance/punch-template', { responseType: 'blob' }),
  update: (id, data) => api.put(`/attendance/${id}`, data)
};

// ─── Leaves ──────────────────────────────────────────────────────────────────
export const leaveAPI = {
  getAll: (params) => api.get('/leaves', { params }),
  getSummary: (params) => api.get('/leaves/summary', { params }),
  apply: (data) => api.post('/leaves', data),
  updateStatus: (id, data) => api.put(`/leaves/${id}/status`, data),
  delete: (id) => api.delete(`/leaves/${id}`)
};

// ─── Salary ──────────────────────────────────────────────────────────────────
export const salaryAPI = {
  getAll: (params) => api.get('/salary', { params }),
  getOverview: (params) => api.get('/salary/overview', { params }),
  create: (data) => api.post('/salary', data),
  importExcel: (formData) => api.post('/salary/import-excel', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  downloadImportTemplate: () => api.get('/salary/import-template', { responseType: 'blob' }),
  update: (id, data) => api.put(`/salary/${id}`, data),
  delete: (id) => api.delete(`/salary/${id}`),
  downloadPayslip: (id) => api.get(`/salary/${id}/payslip`, { responseType: 'blob' }),
  bulkUpdateStatus: (data) => api.put('/salary/bulk-status', data),
  getYTD: () => api.get('/salary/ytd')
};

// ─── Notices ─────────────────────────────────────────────────────────────────
export const noticeAPI = {
  getAll: (params) => api.get('/notices', { params }),
  getById: (id) => api.get(`/notices/${id}`),
  create: (data) => api.post('/notices', data),
  update: (id, data) => api.put(`/notices/${id}`, data),
  delete: (id) => api.delete(`/notices/${id}`)
};

// ─── Documents ───────────────────────────────────────────────────────────────
export const documentAPI = {
  getAll: (params) => api.get('/documents', { params }),
  upload: (formData) => api.post('/documents', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id) => api.delete(`/documents/${id}`),
  verify: (id) => api.put(`/documents/${id}/verify`)
};

// ─── Reports ─────────────────────────────────────────────────────────────────
export const reportAPI = {
  getOverview: () => api.get('/reports/overview'),
  getAttendance: (params) => api.get('/reports/attendance', { params }),
  getSalary: (params) => api.get('/reports/salary', { params }),
  getLeaveBalance: () => api.get('/reports/leave-balance'),
  exportExcel: (params) => api.get('/reports/export/excel', { params, responseType: 'blob' })
};

// ─── Assets ──────────────────────────────────────────────────────────────────
export const assetAPI = {
  getAll: (params) => api.get('/assets', { params }),
  getById: (id) => api.get(`/assets/${id}`),
  create: (data) => api.post('/assets', data),
  update: (id, data) => api.put(`/assets/${id}`, data),
  delete: (id) => api.delete(`/assets/${id}`),
  assign: (id, userId) => api.put(`/assets/${id}/assign`, { userId }),
  returnAsset: (id, condition) => api.put(`/assets/${id}/return`, { condition }),
  getMyAssets: () => api.get('/assets/my-assets')
};

export const payrollAPI = {
  getAll: (params) => api.get('/payroll', { params }),
  getById: (id) => api.get(`/payroll/${id}`),
  getStructure: (employeeId) => api.get(`/payroll/structure/${employeeId}`),
  saveStructure: (data) => api.put('/payroll/structure', data),
  getCompliance: () => api.get('/payroll/compliance'),
  saveCompliance: (data) => api.put('/payroll/compliance', data),
  generate: (data) => api.post('/payroll/generate', data),
  generateMonth: (data) => api.post('/payroll/generate-month', data),
  getLeaveBalance: (employeeId) => api.get(employeeId ? `/payroll/leave-balance/${employeeId}` : '/payroll/leave-balance/me'),
  getTemplates: (params) => api.get('/payroll/templates', { params }),
  createTemplate: (data) => api.post('/payroll/templates', data),
  updateTemplate: (id, data) => api.put(`/payroll/templates/${id}`, data),
  downloadCtcStructure: (employeeId, filename) =>
    api.get(`/payroll/structure/${employeeId}/download`, { responseType: 'blob' }).then(res => {
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url; a.download = filename || 'CTC_Structure.pdf'; a.click(); URL.revokeObjectURL(url);
    }),
  calculateCompliance: (params) => api.get('/payroll/compliance/calculate', { params }),
  getSalaryMasterPinStatus: () => api.get('/payroll/salary-master-pin/status'),
  verifySalaryMasterPin: (pin) => api.post('/payroll/salary-master-pin/verify', { pin }),
  setSalaryMasterPin: (pin) => api.put('/payroll/salary-master-pin', { pin }),
  assignTemplateToEmployee: (data) => api.post('/payroll/assign-template', data)
};

export const notificationAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/mark-all-read'),
  toggle: () => api.put('/notifications/toggle')
};

export const chatAPI = {
  getMessages: (params) => api.get('/chat/messages', { params }),
  sendMessage: (data) => api.post('/chat/messages', data),
  getUnreadCount: () => api.get('/chat/unread-count'),
  markRead: (data) => api.put('/chat/mark-read', data)
};

// ─── Audit Log ───────────────────────────────────────────────────────────────
export const auditAPI = {
  getAll: (params) => api.get('/audit', { params }),
};

// ─── HR Management ───────────────────────────────────────────────────────────
export const hrAPI = {
  getAll: () => api.get('/employees/hr-users'),
  add: (data) => api.post('/auth/register-hr', data),
  toggleStatus: (id) => api.put(`/employees/hr-users/${id}/toggle-status`),
  delete: (id) => api.delete(`/employees/hr-users/${id}`),
  resetPassword: (id, newPassword) => api.put(`/employees/hr-users/${id}/reset-password`, { newPassword }),
};

// ─── System Config ────────────────────────────────────────────────────────────
export const systemConfigAPI = {
  get: () => api.get('/system-config'),
  update: (data) => api.put('/system-config', data),
  getWorkHours: () => api.get('/system-config/public/work-hours'),
};


// ─── Expenses ─────────────────────────────────────────────────────────────────
export const expenseAPI = {
  getAll: (params) => api.get('/expenses', { params }),
  create: (formData) => api.post('/expenses', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateStatus: (id, data) => api.put(`/expenses/${id}/status`, data),
  delete: (id) => api.delete(`/expenses/${id}`)
};

// ─── Holidays ─────────────────────────────────────────────────────────────────
export const holidayAPI = {
  getAll: (params) => api.get('/holidays', { params }),
  create: (data) => api.post('/holidays', data),
  update: (id, data) => api.put(`/holidays/${id}`, data),
  delete: (id) => api.delete(`/holidays/${id}`)
};

// ─── Weekly Off Templates ─────────────────────────────────────────────────────
export const weekoffTemplateAPI = {
  getAll: () => api.get('/weekoff-templates'),
  create: (data) => api.post('/weekoff-templates', data),
  update: (id, data) => api.put(`/weekoff-templates/${id}`, data),
  delete: (id) => api.delete(`/weekoff-templates/${id}`)
};

// ─── Performance Management ───────────────────────────────────────────────────
export const performanceAPI = {
  // Cycles
  getCycles: (params) => api.get('/performance/cycles', { params }),
  createCycle: (data) => api.post('/performance/cycles', data),
  updateCycle: (id, data) => api.put(`/performance/cycles/${id}`, data),
  deleteCycle: (id) => api.delete(`/performance/cycles/${id}`),
  // Goals
  getGoals: (params) => api.get('/performance/goals', { params }),
  createGoal: (data) => api.post('/performance/goals', data),
  updateGoal: (id, data) => api.put(`/performance/goals/${id}`, data),
  deleteGoal: (id) => api.delete(`/performance/goals/${id}`),
  // Reviews
  getReviews: (params) => api.get('/performance/reviews', { params }),
  createReview: (data) => api.post('/performance/reviews', data),
  updateReview: (id, data) => api.put(`/performance/reviews/${id}`, data),
};

// ─── Worklog ──────────────────────────────────────────────────────────────────
export const worklogAPI = {
  // Projects
  getProjects: (params) => api.get('/worklog/projects', { params }),
  createProject: (data) => api.post('/worklog/projects', data),
  updateProject: (id, data) => api.put(`/worklog/projects/${id}`, data),
  deleteProject: (id) => api.delete(`/worklog/projects/${id}`),
  // Entries
  getEntries: (params) => api.get('/worklog/entries', { params }),
  createEntry: (data) => api.post('/worklog/entries', data),
  updateStatus: (id, data) => api.put(`/worklog/entries/${id}/status`, data),
  deleteEntry: (id) => api.delete(`/worklog/entries/${id}`),
  updateEntry: (id, data) => api.put(`/worklog/timer/${id}/complete`, data),
  // Reports
  getReport: (params) => api.get('/worklog/reports', { params }),
  // Timer-based worklog
  startTimer: () => api.post('/worklog/timer/start'),
  getActive: () => api.get('/worklog/timer/active'),
  updateReminder: (id) => api.put(`/worklog/timer/${id}/reminder`),
};

// ─── Recruitment & Onboarding ─────────────────────────────────────────────────
export const recruitmentAPI = {
  getPostings: (params) => api.get('/recruitment/postings', { params }),
  createPosting: (data) => api.post('/recruitment/postings', data),
  updatePosting: (id, data) => api.put(`/recruitment/postings/${id}`, data),
  deletePosting: (id) => api.delete(`/recruitment/postings/${id}`),
  getApplicants: (params) => api.get('/recruitment/applicants', { params }),
  createApplicant: (data) => api.post('/recruitment/applicants', data),
  updateApplicant: (id, data) => api.put(`/recruitment/applicants/${id}`, data),
  deleteApplicant: (id) => api.delete(`/recruitment/applicants/${id}`),
  getOnboardingTasks: (params) => api.get('/recruitment/onboarding', { params }),
  createOnboardingTask: (data) => api.post('/recruitment/onboarding', data),
  updateOnboardingTask: (id, data) => api.put(`/recruitment/onboarding/${id}`, data),
  deleteOnboardingTask: (id) => api.delete(`/recruitment/onboarding/${id}`),
  screenCandidates: (formData) => api.post('/recruitment/ai-screening', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

// ─── Training & LMS ───────────────────────────────────────────────────────────
export const trainingAPI = {
  getCourses: (params) => api.get('/training/courses', { params }),
  createCourse: (data) => api.post('/training/courses', data),
  updateCourse: (id, data) => api.put(`/training/courses/${id}`, data),
  deleteCourse: (id) => api.delete(`/training/courses/${id}`),
  getEnrollments: (params) => api.get('/training/enrollments', { params }),
  createEnrollment: (data) => api.post('/training/enrollments', data),
  updateEnrollment: (id, data) => api.put(`/training/enrollments/${id}`, data),
};

// ─── Shift & Roster ───────────────────────────────────────────────────────────
export const shiftAPI = {
  getShifts: (params) => api.get('/shifts/shifts', { params }),
  createShift: (data) => api.post('/shifts/shifts', data),
  updateShift: (id, data) => api.put(`/shifts/shifts/${id}`, data),
  deleteShift: (id) => api.delete(`/shifts/shifts/${id}`),
  getAssignments: (params) => api.get('/shifts/assignments', { params }),
  createAssignment: (data) => api.post('/shifts/assignments', data),
  updateAssignment: (id, data) => api.put(`/shifts/assignments/${id}`, data),
  deleteAssignment: (id) => api.delete(`/shifts/assignments/${id}`),
};

// ─── Exit Management ──────────────────────────────────────────────────────────
export const exitAPI = {
  getAll: (params) => api.get('/exit', { params }),
  create: (data) => api.post('/exit', data),
  update: (id, data) => api.put(`/exit/${id}`, data),
};

// ─── Grievances ───────────────────────────────────────────────────────────────
export const grievanceAPI = {
  getAll: (params) => api.get('/grievances', { params }),
  create: (data) => api.post('/grievances', data),
  update: (id, data) => api.put(`/grievances/${id}`, data),
  delete: (id) => api.delete(`/grievances/${id}`),
};

// ─── Letter Generator ─────────────────────────────────────────────────────────
export const letterAPI = {
  getTemplates: (params) => api.get('/letters/templates', { params }),
  createTemplate: (data) => api.post('/letters/templates', data),
  updateTemplate: (id, data) => api.put(`/letters/templates/${id}`, data),
  deleteTemplate: (id) => api.delete(`/letters/templates/${id}`),
  getRequests: (params) => api.get('/letters/requests', { params }),
  createRequest: (data) => api.post('/letters/requests', data),
  updateRequest: (id, data) => api.put(`/letters/requests/${id}`, data),
  downloadLetter: (id, filename) => api.get(`/letters/requests/${id}/download`, { responseType: 'blob' })
    .then(res => {
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = filename || 'letter.pdf'; a.click();
      URL.revokeObjectURL(url);
    }),
  viewLetter: (id) => api.get(`/letters/requests/${id}/view`, { responseType: 'blob' })
    .then(res => URL.createObjectURL(res.data)),
};

// ─── Calendar Events ──────────────────────────────────────────────────────────
export const eventAPI = {
  getAll:  (params)     => api.get('/events', { params }),
  create:  (data)       => api.post('/events', data),
  update:  (id, data)   => api.put(`/events/${id}`, data),
  delete:  (id)         => api.delete(`/events/${id}`),
};

export const fingerprintAPI = {
  getDeviceTokens: ()          => api.get('/fingerprint/device-tokens'),
  generateDeviceToken: (label) => api.post('/fingerprint/device-token', { label }),
  deleteDeviceToken: (id)      => api.delete(`/fingerprint/device-token/${id}`),
  setSettingsPin: (pin)        => api.put('/fingerprint/settings-pin', { pin }),
  getPinStatus: ()             => api.get('/fingerprint/pin-status-admin'),
};

export default api;
