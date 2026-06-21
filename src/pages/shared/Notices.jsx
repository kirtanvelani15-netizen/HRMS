import React, { useState, useEffect, useCallback } from 'react';
import { noticeAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { FiPlus, FiEdit2, FiTrash2, FiBell, FiEye } from 'react-icons/fi';
import { formatDate, getStatusColor } from '../../utils/helpers';
import toast from 'react-hot-toast';

const CATEGORIES = ['general', 'holiday', 'event', 'policy', 'urgent', 'hr', 'announcement'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

const priorityColors = { low: 'bg-blue-50 border-blue-100 text-blue-800', medium: 'bg-amber-50 border-amber-100 text-amber-800', high: 'bg-red-50 border-red-100 text-red-800', urgent: 'bg-red-100 border-red-200 text-red-900' };
const categoryIcons = { general: '📋', holiday: '🎉', event: '📅', policy: '📜', urgent: '⚠️', hr: '👥', announcement: '📢' };

const Notices = () => {
  const { user } = useAuth();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({ category: '', priority: '', page: 1, limit: 9 });
  const [showModal, setShowModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [viewNotice, setViewNotice] = useState(null);
  const [editNotice, setEditNotice] = useState(null);
  const [form, setForm] = useState({ title: '', content: '', category: 'general', priority: 'medium', targetAudience: 'all', isPublished: true, scheduledAt: '' });
  const [saving, setSaving] = useState(false);

  const fetchNotices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await noticeAPI.getAll(filters);
      if (res.data.success) {
        setNotices(res.data.data);
        setPagination({ currentPage: res.data.currentPage || 1, totalPages: res.data.totalPages || 1, total: res.data.total || 0 });
      }
    } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchNotices(); }, [fetchNotices]);

  const handleSave = async () => {
    if (!form.title || !form.content) return toast.error('Title and content are required');
    if (!form.isPublished && !form.scheduledAt) return toast.error('Please select a schedule date and time');
    const payload = { ...form, scheduledAt: form.isPublished ? null : form.scheduledAt };
    setSaving(true);
    try {
      if (editNotice) {
        await noticeAPI.update(editNotice._id, payload); toast.success('Notice updated');
      } else {
        await noticeAPI.create(payload);
        toast.success(form.isPublished ? 'Notice posted immediately' : `Notice scheduled for ${new Date(form.scheduledAt).toLocaleString()}`);
      }
      fetchNotices(); setShowModal(false);
    } catch (err) { toast.error('Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this notice?')) return;
    try { await noticeAPI.delete(id); toast.success('Deleted'); fetchNotices(); }
    catch { toast.error('Failed'); }
  };

  const openView = async (notice) => {
    setViewNotice(notice);
    setViewModal(true);
    try { await noticeAPI.getById(notice._id); } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Notices & Announcements</h1>
          <p className="text-gray-500 text-sm">{pagination.total} notices</p>
        </div>
        {user.role !== 'employee' && (
          <button onClick={() => { setEditNotice(null); setForm({ title: '', content: '', category: 'general', priority: 'medium', targetAudience: 'all', isPublished: true, scheduledAt: '' }); setShowModal(true); }}
            className="btn-primary flex items-center gap-2">
            <FiPlus className="w-4 h-4" /> Post Notice
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4 flex gap-3 flex-wrap">
        <select value={filters.category} onChange={e => setFilters({ ...filters, category: e.target.value, page: 1 })} className="input-field w-40">
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
        </select>
        <select value={filters.priority} onChange={e => setFilters({ ...filters, priority: e.target.value, page: 1 })} className="input-field w-36">
          <option value="">All Priority</option>
          {PRIORITIES.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
        </select>
      </div>

      {/* Grid */}
      {loading ? <LoadingSpinner /> : notices.length === 0 ? (
        <div className="card p-12 text-center">
          <FiBell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No notices available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notices.map(notice => (
            <div key={notice._id} className={`card p-5 border-l-4 hover:shadow-card-hover transition-all cursor-pointer ${priorityColors[notice.priority] || ''}`}
              onClick={() => openView(notice)}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{categoryIcons[notice.category] || '📋'}</span>
                  <span className={`badge text-xs ${notice.priority === 'urgent' ? 'bg-red-200 text-red-800' : notice.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>{notice.priority}</span>
                </div>
                {user.role !== 'employee' && (
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => { setEditNotice(notice); setForm({ title: notice.title, content: notice.content, category: notice.category, priority: notice.priority, targetAudience: notice.targetAudience, isPublished: notice.isPublished, scheduledAt: notice.scheduledAt ? notice.scheduledAt.slice(0, 16) : '' }); setShowModal(true); }} className="p-1 rounded hover:bg-white/50 text-current opacity-60 hover:opacity-100"><FiEdit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(notice._id)} className="p-1 rounded hover:bg-white/50 text-current opacity-60 hover:opacity-100"><FiTrash2 className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">{notice.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-3">{notice.content}</p>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{formatDate(notice.createdAt)}</span>
                <span className="capitalize">{notice.targetAudience}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Post/Edit modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editNotice ? 'Edit Notice' : 'Post Notice'} size="lg"
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Posting...' : 'Post Notice'}</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Title *</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input-field" placeholder="Notice title..." />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="input-field">
                {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Priority</label>
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="input-field">
                {PRIORITIES.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Audience</label>
              <select value={form.targetAudience} onChange={e => setForm({ ...form, targetAudience: e.target.value })} className="input-field">
                {['all', 'admin', 'hr', 'employee'].map(a => <option key={a} value={a} className="capitalize">{a}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Content *</label>
            <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} className="input-field" rows={5} placeholder="Notice content..." />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="published" checked={form.isPublished} onChange={e => setForm({ ...form, isPublished: e.target.checked, scheduledAt: e.target.checked ? '' : form.scheduledAt })} className="w-4 h-4" />
            <label htmlFor="published" className="text-sm text-gray-700 dark:text-gray-300">Publish immediately</label>
          </div>
          {!form.isPublished && (
            <div className="space-y-3">
              <label className="label">Schedule Post</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Date</label>
                  <input
                    type="date"
                    value={form.scheduledAt ? form.scheduledAt.slice(0, 10) : ''}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={e => {
                      const time = form.scheduledAt ? form.scheduledAt.slice(11, 16) : '00:00';
                      setForm({ ...form, scheduledAt: e.target.value ? `${e.target.value}T${time}` : '' });
                    }}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Time</label>
                  <input
                    type="time"
                    value={form.scheduledAt ? form.scheduledAt.slice(11, 16) : ''}
                    onChange={e => {
                      const date = form.scheduledAt ? form.scheduledAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
                      setForm({ ...form, scheduledAt: e.target.value ? `${date}T${e.target.value}` : '' });
                    }}
                    className="input-field"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400">Notice will be published at the selected date and time.</p>
            </div>
          )}
        </div>
      </Modal>

      {/* View modal */}
      <Modal isOpen={viewModal} onClose={() => setViewModal(false)} title={viewNotice?.title || 'Notice'} size="md">
        {viewNotice && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{categoryIcons[viewNotice.category]}</span>
              <div>
                <span className={`badge ${viewNotice.priority === 'urgent' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'} capitalize`}>{viewNotice.priority}</span>
                <span className="ml-2 badge bg-blue-100 text-blue-700 capitalize">{viewNotice.category}</span>
              </div>
            </div>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{viewNotice.content}</p>
            <div className="text-xs text-gray-500 pt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between">
              <span>Posted: {formatDate(viewNotice.createdAt)}</span>
              <span>By: {viewNotice.createdBy?.name}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Notices;
