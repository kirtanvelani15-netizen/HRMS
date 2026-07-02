import { useState, useEffect, useCallback, useRef } from 'react';
import { letterAPI, employeeAPI, systemConfigAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import DataTable from '../../components/common/DataTable';
import { FiPlus, FiEdit2, FiTrash2, FiFileText, FiCheck, FiX, FiDownload, FiEye } from 'react-icons/fi';
import { formatDate, getInitials } from '../../utils/helpers';
import toast from 'react-hot-toast';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';

// Register Times New Roman with Quill
const Font = Quill.import('formats/font');
Font.whitelist = ['sans-serif', 'serif', 'monospace', 'times-new-roman', 'arial', 'georgia'];
Quill.register(Font, true);

const STATUS_COLORS = { pending: 'bg-amber-100 text-amber-700', approved: 'bg-emerald-100 text-emerald-700', rejected: 'bg-red-100 text-red-700' };
const TYPE_COLORS = { experience: 'bg-blue-100 text-blue-700', bank: 'bg-purple-100 text-purple-700', noc: 'bg-amber-100 text-amber-700', offer: 'bg-emerald-100 text-emerald-700', salary: 'bg-indigo-100 text-indigo-700', custom: 'bg-gray-100 text-gray-700' };

const PLACEHOLDER_HELP = 'Use: {{name}}, {{employeeId}}, {{designation}}, {{department}}, {{joiningDate}}, {{lastDate}}, {{date}}';

const LetterGenerator = () => {
  const { user } = useAuth();
  const isEmployee = user?.role === 'employee';
  const [tab, setTab] = useState('requests');
  const [templates, setTemplates] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [editTemplate, setEditTemplate] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [templateForm, setTemplateForm] = useState({ name: '', type: 'experience', body: '' });
  const [requestForm, setRequestForm] = useState({ template: '', remarks: '' });
  const [rejectReason, setRejectReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [lhEnabled, setLhEnabled] = useState(false);
  const lhInputRef = useRef(null);

  const fetchTemplates = () => letterAPI.getTemplates().then(r => { if (r.data.success) setTemplates(r.data.data); });

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await letterAPI.getRequests();
      if (res.data.success) setRequests(res.data.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchTemplates();
    systemConfigAPI.get().then(r => {
      if (r.data.success) setLhEnabled(r.data.data.letterheadEnabled || false);
    }).catch(() => {});
  }, []);
  useEffect(() => { if (tab === 'requests') fetchRequests(); else setLoading(false); }, [tab, fetchRequests]);

  const handleSaveTemplate = async () => {
    if (!templateForm.name || !templateForm.body) return toast.error('Name and body required');
    setSaving(true);
    try {
      if (editTemplate) { await letterAPI.updateTemplate(editTemplate._id, templateForm); toast.success('Template updated'); }
      else { await letterAPI.createTemplate(templateForm); toast.success('Template created'); }
      fetchTemplates(); setShowTemplateModal(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleRequestLetter = async () => {
    if (!requestForm.template) return toast.error('Select a template');
    setSaving(true);
    try {
      await letterAPI.createRequest(requestForm);
      toast.success('Letter requested');
      fetchRequests(); setShowRequestModal(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleApprove = async (id) => {
    try { await letterAPI.updateRequest(id, { status: 'approved' }); toast.success('Approved'); fetchRequests(); }
    catch { toast.error('Failed'); }
  };

  const handleReject = async () => {
    if (!rejectReason) return toast.error('Provide a reason');
    try {
      await letterAPI.updateRequest(selectedRequest, { status: 'rejected', rejectionReason: rejectReason });
      toast.success('Rejected'); setShowRejectModal(false); setRejectReason(''); fetchRequests();
    } catch { toast.error('Failed'); }
  };

  const handleLhToggle = async () => {
    if (!lhEnabled) {
      // turning on — open file picker to select PDF
      lhInputRef.current?.click();
    } else {
      // turning off — disable and clear stored PDF
      try {
        await systemConfigAPI.update({ letterheadEnabled: false, letterheadLogo: '' });
        setLhEnabled(false);
        toast.success('Letterhead disabled');
      } catch { toast.error('Failed to update letterhead'); }
    }
  };

  const handleLhFileSelect = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf') return toast.error('Please select a PDF file');
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        await systemConfigAPI.update({ letterheadEnabled: true, letterheadLogo: ev.target.result });
        setLhEnabled(true);
        toast.success('Letterhead PDF uploaded and enabled');
      } catch { toast.error('Failed to save letterhead'); }
    };
    reader.readAsDataURL(file);
  };

  const templateColumns = [
    { header: 'Template Name', key: 'name', render: v => <span className="font-medium text-gray-900 dark:text-white">{v}</span> },
    { header: 'Type', key: 'type', render: v => <span className={`badge capitalize ${TYPE_COLORS[v]}`}>{v}</span> },
    { header: 'Body Preview', key: 'body', render: v => <span className="text-sm text-gray-500 truncate max-w-xs block">{v?.slice(0, 60)}...</span> },
    { header: 'Created', key: 'createdAt', render: v => formatDate(v) },
    {
      header: 'Actions', key: '_id',
      render: (id, row) => (
        <div className="flex gap-1">
          <button onClick={() => { setEditTemplate(row); setTemplateForm({ name: row.name, type: row.type, body: row.body }); setShowTemplateModal(true); }} className="p-1.5 rounded hover:bg-blue-50 text-blue-600"><FiEdit2 className="w-4 h-4" /></button>
          <button onClick={async () => { if (!window.confirm('Delete template?')) return; await letterAPI.deleteTemplate(id); toast.success('Deleted'); fetchTemplates(); }} className="p-1.5 rounded hover:bg-red-50 text-red-600"><FiTrash2 className="w-4 h-4" /></button>
        </div>
      )
    },
  ];

  const requestColumns = [
    ...(!isEmployee ? [{
      header: 'Employee', key: 'employee',
      render: v => v ? (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700 shrink-0">{getInitials(`${v.firstName} ${v.lastName}`)}</div>
          <div><p className="text-sm font-medium text-gray-900 dark:text-white">{v.firstName} {v.lastName}</p><p className="text-xs text-gray-500">{v.department?.name}</p></div>
        </div>
      ) : '-'
    }] : []),
    { header: 'Letter Type', key: 'template', render: v => v ? <span className={`badge capitalize ${TYPE_COLORS[v.type]}`}>{v.name}</span> : '-' },
    { header: 'Remarks', key: 'remarks', render: v => <span className="text-sm text-gray-600">{v || '-'}</span> },
    { header: 'Status', key: 'status', render: v => <span className={`badge capitalize ${STATUS_COLORS[v]}`}>{v}</span> },
    { header: 'Requested', key: 'createdAt', render: v => formatDate(v) },
    { header: 'Approved By', key: 'approvedBy', render: v => v?.name || '-' },
    {
      header: 'Actions', key: '_id',
      render: (id, row) => (
        <div className="flex gap-1">
          {!isEmployee && row.status === 'pending' && <>
            <button onClick={() => handleApprove(id)} className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600" title="Approve"><FiCheck className="w-4 h-4" /></button>
            <button onClick={() => { setSelectedRequest(id); setShowRejectModal(true); }} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Reject"><FiX className="w-4 h-4" /></button>
          </>}
          {row.status === 'approved' && row.generatedFileUrl && (
            <>
              <button
                onClick={() => letterAPI.viewLetter(row._id).then(url => setPdfBlobUrl(url)).catch(() => toast.error('Failed to load PDF'))}
                className="p-1.5 rounded hover:bg-blue-50 text-blue-600 flex items-center gap-1 text-xs font-medium"
                title="View Letter"
              >
                <FiEye className="w-4 h-4" /> View
              </button>
              <button
                onClick={() => letterAPI.downloadLetter(row._id, `${row.template?.name || 'letter'}_${row.employee?.employeeId || ''}.pdf`).catch(() => toast.error('Failed to download PDF'))}
                className="p-1.5 rounded hover:bg-indigo-50 text-indigo-600 flex items-center gap-1 text-xs font-medium"
                title="Download Letter"
              >
                <FiDownload className="w-4 h-4" /> Download
              </button>
            </>
          )}
        </div>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-gray-500 text-sm">{tab === 'templates' ? `${templates.length} templates` : `${requests.length} requests`}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
          {!isEmployee && tab === 'templates' && (
            <>
              <button onClick={() => { setEditTemplate(null); setTemplateForm({ name: '', type: 'experience', body: '' }); setShowTemplateModal(true); }} className="btn-secondary flex items-center justify-center gap-2 flex-1 sm:flex-none"><FiPlus className="w-4 h-4" /> New Template</button>
              {user?.role === 'admin' && (
                <>
                  <button onClick={handleLhToggle} title={lhEnabled ? 'Letterhead enabled — click to disable' : 'Click to upload letterhead PDF'}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${lhEnabled ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${lhEnabled ? 'right-0.5' : 'left-0.5'}`} />
                  </button>
                  <span className="text-xs text-gray-500">Letterhead</span>
                  <input ref={lhInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleLhFileSelect} />
                </>
              )}
            </>
          )}
          {isEmployee && <button onClick={() => { setRequestForm({ template: '', remarks: '' }); setShowRequestModal(true); }} className="btn-primary flex items-center justify-center gap-2 flex-1 sm:flex-none"><FiFileText className="w-4 h-4" /> Request Letter</button>}
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {(!isEmployee ? ['requests', 'templates'] : ['requests']).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{t}</button>
        ))}
      </div>

      {tab === 'templates' && <DataTable columns={templateColumns} data={templates} loading={loading} emptyMessage="No letter templates yet" emptyIcon="📄" />}
      {tab === 'requests' && <DataTable columns={requestColumns} data={requests} loading={loading} emptyMessage="No letter requests" emptyIcon="✉️" />}

      <Modal isOpen={showTemplateModal} onClose={() => setShowTemplateModal(false)} title={editTemplate ? 'Edit Template' : 'New Letter Template'} size="screen"
        footer={<><button onClick={() => setShowTemplateModal(false)} className="btn-secondary">Cancel</button><button onClick={handleSaveTemplate} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Template Name *</label><input value={templateForm.name} onChange={e => setTemplateForm({ ...templateForm, name: e.target.value })} className="input-field" placeholder="e.g. Experience Letter" /></div>
            <div><label className="label">Type</label>
              <select value={templateForm.type} onChange={e => setTemplateForm({ ...templateForm, type: e.target.value })} className="input-field">
                {['experience', 'bank', 'noc', 'offer', 'salary', 'custom'].map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
              </select>
            </div>
          </div>
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">Letter Body *</label>
              <p className="text-xs text-gray-400">{PLACEHOLDER_HELP}</p>
            </div>
            <style>{`
              .a4-editor .ql-toolbar { border: none !important; border-bottom: 1px solid #d1d5db !important; background: #f9fafb; position: sticky; top: 0; z-index: 10; }
              .a4-editor .ql-toolbar .ql-font { width: 140px !important; }
              .a4-editor .ql-toolbar .ql-font .ql-picker-label { width: 130px !important; }
              .a4-editor .ql-container { border: none !important; font-size: 12pt; font-family: 'Times New Roman', Times, serif; }
              .a4-editor .ql-editor { font-family: 'Times New Roman', Times, serif; padding: 20mm 25mm; min-height: 297mm; font-size: 12pt; line-height: 1.6; width: 210mm; margin: 0 auto; background: #fff; box-shadow: 0 2px 16px rgba(0,0,0,0.10); }
              .a4-editor .ql-editor p { margin-bottom: 6pt; }
              .ql-font-times-new-roman { font-family: 'Times New Roman', Times, serif !important; }
              .ql-font-arial { font-family: Arial, Helvetica, sans-serif !important; }
              .ql-font-georgia { font-family: Georgia, serif !important; }
              .ql-font-sans-serif { font-family: sans-serif !important; }
              .ql-font-serif { font-family: serif !important; }
              .ql-font-monospace { font-family: monospace !important; }
              .ql-picker.ql-font .ql-picker-label[data-value='times-new-roman']::before,
              .ql-picker.ql-font .ql-picker-item[data-value='times-new-roman']::before { content: 'Times New Roman'; font-family: 'Times New Roman', serif; }
              .ql-picker.ql-font .ql-picker-label[data-value='arial']::before,
              .ql-picker.ql-font .ql-picker-item[data-value='arial']::before { content: 'Arial'; font-family: Arial, sans-serif; }
              .ql-picker.ql-font .ql-picker-label[data-value='georgia']::before,
              .ql-picker.ql-font .ql-picker-item[data-value='georgia']::before { content: 'Georgia'; font-family: Georgia, serif; }
              .ql-picker.ql-font .ql-picker-label[data-value='sans-serif']::before,
              .ql-picker.ql-font .ql-picker-item[data-value='sans-serif']::before { content: 'Sans Serif'; }
              .ql-picker.ql-font .ql-picker-label[data-value='serif']::before,
              .ql-picker.ql-font .ql-picker-item[data-value='serif']::before { content: 'Serif'; }
              .ql-picker.ql-font .ql-picker-label[data-value='monospace']::before,
              .ql-picker.ql-font .ql-picker-item[data-value='monospace']::before { content: 'Monospace'; }
            `}</style>
            {/* Scroll area: toolbar sticks to top via CSS sticky, A4 page below it */}
            <div className="flex-1 overflow-y-auto bg-gray-200 dark:bg-gray-900 rounded-xl" style={{ minHeight: 0 }}>
              <div className="a4-editor">
                <ReactQuill
                  theme="snow"
                  value={templateForm.body}
                  onChange={val => setTemplateForm({ ...templateForm, body: val })}
                  modules={{
                    toolbar: [
                      [{ font: ['times-new-roman', 'arial', 'georgia', 'sans-serif', 'serif', 'monospace'] }, { size: ['small', false, 'large', 'huge'] }],
                      ['bold', 'italic', 'underline'],
                      [{ align: [] }],
                      [{ list: 'ordered' }, { list: 'bullet' }],
                      ['clean'],
                    ],
                  }}
                  formats={['font', 'size', 'bold', 'italic', 'underline', 'align', 'list', 'bullet']}
                  placeholder="Dear {{name}},&#10;&#10;This is to certify that..."
                />
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showRequestModal} onClose={() => setShowRequestModal(false)} title="Request a Letter" size="sm"
        footer={<><button onClick={() => setShowRequestModal(false)} className="btn-secondary">Cancel</button><button onClick={handleRequestLetter} disabled={saving} className="btn-primary">{saving ? 'Requesting...' : 'Submit'}</button></>}>
        <div className="space-y-4">
          <div><label className="label">Letter Type *</label>
            <select value={requestForm.template} onChange={e => setRequestForm({ ...requestForm, template: e.target.value })} className="input-field">
              <option value="">Select</option>{templates.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
            </select>
          </div>
          <div><label className="label">Remarks (optional)</label><textarea value={requestForm.remarks} onChange={e => setRequestForm({ ...requestForm, remarks: e.target.value })} className="input-field" rows={3} placeholder="Any specific requirements..." /></div>
        </div>
      </Modal>

      <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} title="Reject Request" size="sm"
        footer={<><button onClick={() => setShowRejectModal(false)} className="btn-secondary">Cancel</button><button onClick={handleReject} className="btn-danger">Reject</button></>}>
        <div><label className="label">Reason *</label><textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="input-field" rows={3} /></div>
      </Modal>

      {/* PDF Viewer Modal */}
      {pdfBlobUrl && (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-900">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-800">
            <span className="text-white text-sm font-medium">Letter Preview</span>
            <button onClick={() => { URL.revokeObjectURL(pdfBlobUrl); setPdfBlobUrl(null); }}
              className="text-gray-300 hover:text-white text-sm flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-gray-700">
              <FiX className="w-4 h-4" /> Close
            </button>
          </div>
          <iframe src={pdfBlobUrl} className="flex-1 w-full border-0" title="Letter Preview" />
        </div>
      )}
    </div>
  );
};

export default LetterGenerator;
