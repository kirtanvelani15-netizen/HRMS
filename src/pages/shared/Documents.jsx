import React, { useState, useEffect, useRef } from 'react';
import { documentAPI, employeeAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { FiUpload, FiTrash2, FiDownload, FiFolder, FiCheck, FiFile, FiArrowLeft, FiChevronRight, FiUser, FiEye } from 'react-icons/fi';
import { formatDate, getInitials } from '../../utils/helpers';
import toast from 'react-hot-toast';

const DOC_TYPES = ['id-proof', 'address-proof', 'educational', 'experience', 'offer-letter', 'contract', 'payslip', 'other'];

const Documents = () => {
  const { user } = useAuth();
  const isEmployee = user.role === 'employee';

  const [documents, setDocuments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ employee: '', name: '', type: 'other', notes: '' });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState('');
  // null = folder view, employee object = inside that folder
  const [openFolder, setOpenFolder] = useState(null);
  const fileRef = useRef();

  const fetchDocs = async (empId) => {
    setLoading(true);
    try {
      const params = { type: filterType };
      if (empId) params.employee = empId;
      const res = await documentAPI.getAll(params);
      if (res.data.success) setDocuments(res.data.data);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (isEmployee) {
      fetchDocs();
    } else if (openFolder) {
      fetchDocs(openFolder._id);
    }
  }, [filterType, openFolder]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isEmployee) {
      employeeAPI.getAll({ limit: 200 }).then(r => { if (r.data.success) setEmployees(r.data.data); });
    }
  }, [user.role]);

  const handleUpload = async () => {
    if (!file) return toast.error('Select a file');
    if (!form.name) return toast.error('Document name is required');
    if (!isEmployee && !form.employee) return toast.error('Please select an employee');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('document', file);
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      const res = await documentAPI.upload(fd);
      if (res.data.success) {
        toast.success('Document uploaded!');
        if (openFolder) fetchDocs(openFolder._id);
        else fetchDocs();
        setShowModal(false);
        setFile(null);
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Upload failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await documentAPI.delete(id);
      toast.success('Deleted');
      if (openFolder) fetchDocs(openFolder._id);
      else fetchDocs();
    } catch { toast.error('Failed'); }
  };

  const handleVerify = async (id) => {
    try {
      await documentAPI.verify(id);
      toast.success('Document verified ✅');
      if (openFolder) fetchDocs(openFolder._id);
      else fetchDocs();
    } catch { toast.error('Failed'); }
  };

  const openUploadModal = () => {
    setForm({
      employee: openFolder ? openFolder._id : '',
      name: '', type: 'other', notes: ''
    });
    setFile(null);
    setShowModal(true);
  };

  const getFileIcon = (mime) => {
    if (mime?.includes('pdf')) return '📄';
    if (mime?.includes('image')) return '🖼️';
    if (mime?.includes('word') || mime?.includes('doc')) return '📝';
    if (mime?.includes('sheet') || mime?.includes('xls')) return '📊';
    return '📁';
  };

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  // Group all docs by employee for folder view doc counts
  const [allDocs, setAllDocs] = useState([]);
  useEffect(() => {
    if (!isEmployee && !openFolder) {
      setLoading(true);
      documentAPI.getAll({}).then(r => {
        if (r.data.success) setAllDocs(r.data.data);
      }).finally(() => setLoading(false));
    }
  }, [openFolder]);

  const docCountFor = (empId) =>
    allDocs.filter(d => d.employee?._id === empId || d.employee === empId).length;

  // ── Employee view ────────────────────────────────────────────────────────────
  if (isEmployee) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="page-title">My Documents</h1>
            <p className="text-gray-500 text-sm">{documents.length} documents</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
            <button onClick={openUploadModal} className="btn-primary flex items-center gap-2 flex-1 sm:flex-none justify-center">
              <FiUpload className="w-4 h-4" /> Upload Document
            </button>
          </div>
        </div>
        {loading ? <LoadingSpinner /> : documents.length === 0 ? (
          <div className="card p-12 text-center">
            <FiFolder className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No documents found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map(doc => <DocCard key={doc._id} doc={doc} isEmployee onDelete={handleDelete} onVerify={handleVerify} getFileIcon={getFileIcon} formatSize={formatSize} />)}
          </div>
        )}
        <UploadModal isOpen={showModal} onClose={() => setShowModal(false)} form={form} setForm={setForm}
          file={file} setFile={setFile} fileRef={fileRef} saving={saving} onUpload={handleUpload}
          employees={employees} isEmployee={isEmployee} />
      </div>
    );
  }

  // ── Admin / HR — inside a folder ─────────────────────────────────────────────
  if (openFolder) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => { setOpenFolder(null); setFilterType(''); }}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
              <FiArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span className="cursor-pointer hover:text-primary-500" onClick={() => setOpenFolder(null)}>Documents</span>
                <FiChevronRight className="w-3.5 h-3.5" />
                <span className="text-gray-700 dark:text-gray-200 font-medium">{openFolder.firstName} {openFolder.lastName}</span>
              </div>
              <h1 className="page-title mt-0.5">{openFolder.firstName} {openFolder.lastName}</h1>
              <p className="text-gray-500 text-sm">{documents.length} documents</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
            <button onClick={openUploadModal} className="btn-primary flex items-center gap-2 flex-1 sm:flex-none justify-center">
              <FiUpload className="w-4 h-4" /> Upload Document
            </button>
          </div>
        </div>

        <div className="card p-4">
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input-field w-48">
            <option value="">All Types</option>
            {DOC_TYPES.map(t => <option key={t} value={t} className="capitalize">{t.replace(/-/g, ' ')}</option>)}
          </select>
        </div>

        {loading ? <LoadingSpinner /> : documents.length === 0 ? (
          <div className="card p-12 text-center">
            <FiFolder className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No documents for this employee</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map(doc => <DocCard key={doc._id} doc={doc} onDelete={handleDelete} onVerify={handleVerify} getFileIcon={getFileIcon} formatSize={formatSize} />)}
          </div>
        )}

        <UploadModal isOpen={showModal} onClose={() => setShowModal(false)} form={form} setForm={setForm}
          file={file} setFile={setFile} fileRef={fileRef} saving={saving} onUpload={handleUpload}
          employees={employees} isEmployee={isEmployee} lockedEmployee={openFolder} />
      </div>
    );
  }

  // ── Admin / HR — folder list view ────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="page-title">Documents</h1>
          <p className="text-gray-500 text-sm">{employees.length} employees</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
          <button onClick={openUploadModal} className="btn-primary flex items-center gap-2 flex-1 sm:flex-none justify-center">
            <FiUpload className="w-4 h-4" /> Upload Document
          </button>
        </div>
      </div>

      {loading ? <LoadingSpinner /> : employees.length === 0 ? (
        <div className="card p-12 text-center">
          <FiFolder className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No employees found</p>
        </div>
      ) : (
        <div className="card divide-y divide-gray-100 dark:divide-gray-700 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 px-4 py-2 bg-gray-50 dark:bg-gray-700/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            <div className="col-span-5">Name</div>
            <div className="col-span-3">Employee ID</div>
            <div className="col-span-2">Files</div>
            <div className="col-span-2"></div>
          </div>
          {employees.map(emp => {
            const count = docCountFor(emp._id);
            return (
              <button key={emp._id} onClick={() => setOpenFolder(emp)}
                className="w-full grid grid-cols-12 px-4 py-3 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-colors text-left group items-center">
                <div className="col-span-5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 flex items-center justify-center flex-shrink-0 group-hover:bg-primary-200 dark:group-hover:bg-primary-800/50 transition-colors">
                    <FiUser className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                    {emp.firstName} {emp.lastName}
                  </span>
                </div>
                <div className="col-span-3 text-sm text-gray-500 dark:text-gray-400">{emp.employeeId || '—'}</div>
                <div className="col-span-2 text-sm text-gray-500 dark:text-gray-400">{count} {count === 1 ? 'file' : 'files'}</div>
                <div className="col-span-2 flex justify-end">
                  <FiChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary-500 transition-colors" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      <UploadModal isOpen={showModal} onClose={() => setShowModal(false)} form={form} setForm={setForm}
        file={file} setFile={setFile} fileRef={fileRef} saving={saving} onUpload={handleUpload}
        employees={employees} isEmployee={isEmployee} />
    </div>
  );
};

// ── Shared sub-components ────────────────────────────────────────────────────

const DocCard = ({ doc, isEmployee, onDelete, onVerify, getFileIcon, formatSize }) => {
  const [preview, setPreview] = useState(false);
  const isImage = doc.mimeType?.includes('image');
  const isPdf   = doc.mimeType?.includes('pdf');

  return (
    <>
      <div className="card p-4 hover:shadow-card-hover transition-all">
        <div className="flex items-start gap-3">
          <div className="text-3xl flex-shrink-0">{getFileIcon(doc.mimeType)}</div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 dark:text-white truncate">{doc.name}</p>
            <p className="text-xs text-gray-500 capitalize mt-0.5">{doc.type?.replace(/-/g, ' ')}</p>
            <p className="text-xs text-gray-400 mt-0.5">{formatDate(doc.createdAt)} • {formatSize(doc.fileSize)}</p>
            <div className="flex items-center gap-1 mt-1">
              {doc.isVerified ? (
                <span className="badge bg-emerald-100 text-emerald-700 text-xs flex items-center gap-1"><FiCheck className="w-3 h-3" /> Verified</span>
              ) : (
                <span className="badge bg-gray-100 text-gray-600 text-xs">Unverified</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <button onClick={() => setPreview(true)}
            className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 font-medium">
            <FiEye className="w-3.5 h-3.5" /> View
          </button>
          <a href={doc.filePath} download target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium">
            <FiDownload className="w-3.5 h-3.5" /> Download
          </a>
          {!doc.isVerified && !isEmployee && (
            <button onClick={() => onVerify(doc._id)} className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium ml-2">
              <FiCheck className="w-3.5 h-3.5" /> Verify
            </button>
          )}
          <button onClick={() => onDelete(doc._id)} className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium ml-auto">
            <FiTrash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      </div>

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setPreview(false)}>
          <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700">
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{doc.name}</p>
                <p className="text-xs text-gray-400 capitalize">{doc.type?.replace(/-/g, ' ')} • {formatSize(doc.fileSize)}</p>
              </div>
              <div className="flex items-center gap-3">
                <a href={doc.filePath} download target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium">
                  <FiDownload className="w-3.5 h-3.5" /> Download
                </a>
                <button onClick={() => setPreview(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none">&times;</button>
              </div>
            </div>
            {/* Body */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-b-xl">
              {isImage && (
                <img src={doc.filePath} alt={doc.name} className="max-w-full max-h-[75vh] rounded-lg object-contain" />
              )}
              {isPdf && (
                <iframe src={doc.filePath} title={doc.name} className="w-full h-[75vh] rounded-lg border-0" />
              )}
              {!isImage && !isPdf && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">{getFileIcon(doc.mimeType)}</div>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">Preview not available for this file type.</p>
                  <a href={doc.filePath} download target="_blank" rel="noopener noreferrer"
                    className="btn-primary inline-flex items-center gap-2">
                    <FiDownload className="w-4 h-4" /> Download to view
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const UploadModal = ({ isOpen, onClose, form, setForm, file, setFile, fileRef, saving, onUpload, employees, isEmployee, lockedEmployee }) => {
  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upload Document" size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={onUpload} disabled={saving} className="btn-primary">{saving ? 'Uploading...' : 'Upload'}</button>
        </>
      }
    >
      <div className="space-y-4">
        {!isEmployee && (
          <div>
            <label className="label">Employee</label>
            {lockedEmployee ? (
              <div className="input-field bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-not-allowed">
                {lockedEmployee.firstName} {lockedEmployee.lastName}
              </div>
            ) : (
              <select value={form.employee} onChange={e => setForm({ ...form, employee: e.target.value })} className="input-field">
                <option value="">Select Employee</option>
                {employees.map(e => <option key={e._id} value={e._id}>{e.firstName} {e.lastName}</option>)}
              </select>
            )}
          </div>
        )}
        <div>
          <label className="label">Document Name *</label>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="e.g., Aadhar Card" />
        </div>
        <div>
          <label className="label">Document Type</label>
          <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input-field">
            {DOC_TYPES.map(t => <option key={t} value={t} className="capitalize">{t.replace(/-/g, ' ')}</option>)}
          </select>
        </div>
        <div>
          <label className="label">File *</label>
          <div onClick={() => fileRef.current.click()} className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:border-primary-400 transition-colors">
            {file ? (
              <div>
                <FiFile className="w-8 h-8 mx-auto text-primary-600 mb-1" />
                <p className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
                <p className="text-xs text-gray-500">{formatSize(file.size)}</p>
              </div>
            ) : (
              <div>
                <FiUpload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">Click to select file</p>
                <p className="text-xs text-gray-400">PDF, DOC, Images up to 10MB</p>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" className="hidden" onChange={e => setFile(e.target.files[0])} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx" />
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="input-field" rows={2} />
        </div>
      </div>
    </Modal>
  );
};

export default Documents;
