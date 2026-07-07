import React, { useState, useEffect, useRef, useMemo } from 'react';
import { documentAPI, employeeAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { FiUpload, FiTrash2, FiDownload, FiFolder, FiCheck, FiFile, FiArrowLeft, FiChevronRight, FiUser, FiEye, FiSearch, FiGrid, FiList, FiMoreVertical, FiX } from 'react-icons/fi';
import { formatDate, getInitials } from '../../utils/helpers';
import toast from 'react-hot-toast';

const DOC_TYPES = ['id-proof', 'address-proof', 'educational', 'experience', 'offer-letter', 'contract', 'payslip', 'other'];
const ITEMS_PER_PAGE = 10;

const getDocTypeLabel = (type) => type?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

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
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [currentPage, setCurrentPage] = useState(1);
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
    setCurrentPage(1);
    if (isEmployee) {
      fetchDocs();
    } else if (openFolder) {
      fetchDocs(openFolder._id);
    }
  }, [filterType, openFolder]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredAndSorted = useMemo(() => {
    let result = documents;

    if (searchTerm) {
      result = result.filter(doc =>
        doc.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    switch (sortBy) {
      case 'oldest':
        result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case 'name-asc':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'recent':
      default:
        result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return result;
  }, [documents, searchTerm, sortBy]);

  const paginatedDocs = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSorted.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAndSorted, currentPage]);

  const totalPages = Math.ceil(filteredAndSorted.length / ITEMS_PER_PAGE);

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
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Documents</h1>
            <p className="text-sm text-gray-500 mt-1">Showing {paginatedDocs.length} of {filteredAndSorted.length} document{filteredAndSorted.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={openUploadModal} className="btn-primary flex items-center gap-2 justify-center w-full sm:w-auto">
            <FiUpload className="w-4 h-4" /> Upload Document
          </button>
        </div>

        {/* Search & Filter */}
        <DocumentFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          sortBy={sortBy}
          setSortBy={setSortBy}
          filterType={filterType}
          setFilterType={setFilterType}
        />

        {/* Documents Table */}
        {loading ? (
          <LoadingSpinner />
        ) : filteredAndSorted.length === 0 ? (
          <EmptyState message={searchTerm ? 'No documents match your search' : 'No documents found'} />
        ) : (
          <>
            <DocumentsTable
              documents={paginatedDocs}
              isEmployee={isEmployee}
              onDelete={handleDelete}
              onVerify={handleVerify}
              formatSize={formatSize}
            />
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                total={filteredAndSorted.length}
                itemsPerPage={ITEMS_PER_PAGE}
              />
            )}
          </>
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
        {/* Breadcrumb & Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <button
                onClick={() => { setOpenFolder(null); setFilterType(''); setSearchTerm(''); }}
                className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                Documents
              </button>
              <FiChevronRight className="w-3.5 h-3.5" />
              <span className="text-gray-900 dark:text-white font-medium">{openFolder.firstName} {openFolder.lastName}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Employee Documents</h1>
            <p className="text-sm text-gray-500 mt-1">Showing {paginatedDocs.length} of {filteredAndSorted.length} document{filteredAndSorted.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={openUploadModal} className="btn-primary flex items-center gap-2 justify-center w-full sm:w-auto">
            <FiUpload className="w-4 h-4" /> Upload Document
          </button>
        </div>

        {/* Search & Filter */}
        <DocumentFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          sortBy={sortBy}
          setSortBy={setSortBy}
          filterType={filterType}
          setFilterType={setFilterType}
        />

        {/* Documents Table */}
        {loading ? (
          <LoadingSpinner />
        ) : filteredAndSorted.length === 0 ? (
          <EmptyState message={searchTerm ? 'No documents match your search' : 'No documents for this employee'} />
        ) : (
          <>
            <DocumentsTable
              documents={paginatedDocs}
              onDelete={handleDelete}
              onVerify={handleVerify}
              formatSize={formatSize}
            />
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                total={filteredAndSorted.length}
                itemsPerPage={ITEMS_PER_PAGE}
              />
            )}
          </>
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
        <p className="text-gray-500 text-sm">{employees.length} employees</p>
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

const DocumentFilters = ({ searchTerm, setSearchTerm, sortBy, setSortBy, filterType, setFilterType }) => {
  return (
    <div className="card p-4 space-y-4 md:space-y-0 md:flex md:items-center md:gap-4">
      {/* Search */}
      <div className="flex-1 relative">
        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search documents by name..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="input-field pl-10 w-full"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <FiX className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Type */}
      <select
        value={filterType}
        onChange={e => setFilterType(e.target.value)}
        className="input-field w-full md:w-48"
      >
        <option value="">All Types</option>
        {DOC_TYPES.map(t => (
          <option key={t} value={t}>{getDocTypeLabel(t)}</option>
        ))}
      </select>

      {/* Sort */}
      <select
        value={sortBy}
        onChange={e => setSortBy(e.target.value)}
        className="input-field w-full md:w-48"
      >
        <option value="recent">Recently Added</option>
        <option value="oldest">Oldest First</option>
        <option value="name-asc">Name A–Z</option>
        <option value="name-desc">Name Z–A</option>
      </select>
    </div>
  );
};

const DocumentsTable = ({ documents, isEmployee, onDelete, onVerify, formatSize }) => {
  const [preview, setPreview] = useState(null);

  return (
    <>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Document Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Uploaded</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Size</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {documents.map(doc => (
                <DocumentRow
                  key={doc._id}
                  doc={doc}
                  isEmployee={isEmployee}
                  onDelete={onDelete}
                  onVerify={onVerify}
                  formatSize={formatSize}
                  onPreview={setPreview}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview Modal */}
      {preview && (
        <DocumentPreview doc={preview} onClose={() => setPreview(null)} formatSize={formatSize} />
      )}
    </>
  );
};

const DocumentRow = ({ doc, isEmployee, onDelete, onVerify, formatSize, onPreview }) => {
  const [showActions, setShowActions] = useState(false);

  const handleDelete = () => {
    setShowActions(false);
    onDelete(doc._id);
  };

  const handleVerify = () => {
    setShowActions(false);
    onVerify(doc._id);
  };

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg flex-shrink-0">{getFileTypeIcon(doc.mimeType)}</span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{doc.name}</p>
            <p className="text-xs text-gray-500 truncate">{doc.fileName}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-gray-700 dark:text-gray-300">{getDocTypeLabel(doc.type)}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-gray-700 dark:text-gray-300">{formatDate(doc.createdAt)}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-gray-700 dark:text-gray-300">{formatSize(doc.fileSize)}</span>
      </td>
      <td className="px-4 py-3">
        <StatusBadge isVerified={doc.isVerified} />
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => onPreview(doc)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
            title="View document"
          >
            <FiEye className="w-4 h-4" />
          </button>
          <a
            href={doc.filePath}
            download
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
            title="Download document"
          >
            <FiDownload className="w-4 h-4" />
          </a>
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
            >
              <FiMoreVertical className="w-4 h-4" />
            </button>
            {showActions && (
              <ActionMenu
                doc={doc}
                isEmployee={isEmployee}
                onVerify={handleVerify}
                onDelete={handleDelete}
              />
            )}
          </div>
        </div>
      </td>
    </tr>
  );
};

const ActionMenu = ({ doc, isEmployee, onVerify, onDelete }) => {
  return (
    <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10 overflow-hidden">
      {!doc.isVerified && !isEmployee && (
        <button
          onClick={onVerify}
          className="w-full px-3 py-2 text-left text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 flex items-center gap-2 transition-colors"
        >
          <FiCheck className="w-4 h-4" /> Verify Document
        </button>
      )}
      <button
        onClick={onDelete}
        className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors"
      >
        <FiTrash2 className="w-4 h-4" /> Delete
      </button>
    </div>
  );
};

const StatusBadge = ({ isVerified }) => {
  if (isVerified) {
    return (
      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
        <FiCheck className="w-3 h-3" /> Verified
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs font-medium">
      Pending
    </div>
  );
};

const DocumentPreview = ({ doc, onClose, formatSize }) => {
  const isImage = doc.mimeType?.includes('image');
  const isPdf = doc.mimeType?.includes('pdf');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700">
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{doc.name}</p>
            <p className="text-xs text-gray-500 mt-1">{getDocTypeLabel(doc.type)} • {formatSize(doc.fileSize)}</p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={doc.filePath}
              download
              className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
            >
              <FiDownload className="w-3.5 h-3.5" /> Download
            </a>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none font-light"
            >
              ×
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
          {isImage && (
            <img src={doc.filePath} alt={doc.name} className="max-w-full max-h-[75vh] rounded-lg object-contain" />
          )}
          {isPdf && (
            <iframe src={doc.filePath} title={doc.name} className="w-full h-[75vh] rounded-lg border-0" />
          )}
          {!isImage && !isPdf && (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">{getFileTypeIcon(doc.mimeType)}</div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Preview not available</p>
              <a
                href={doc.filePath}
                download
                className="btn-primary inline-flex items-center gap-2 text-sm"
              >
                <FiDownload className="w-4 h-4" /> Download
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Pagination = ({ currentPage, totalPages, onPageChange, total, itemsPerPage }) => {
  const start = (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, total);

  return (
    <div className="card p-4 flex items-center justify-between">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Showing <span className="font-medium text-gray-900 dark:text-white">{start}</span> to{' '}
        <span className="font-medium text-gray-900 dark:text-white">{end}</span> of{' '}
        <span className="font-medium text-gray-900 dark:text-white">{total}</span> documents
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          Previous
        </button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pageNum;
          if (totalPages <= 5) {
            pageNum = i + 1;
          } else if (currentPage <= 3) {
            pageNum = i + 1;
          } else if (currentPage >= totalPages - 2) {
            pageNum = totalPages - 4 + i;
          } else {
            pageNum = currentPage - 2 + i;
          }
          return pageNum;
        }).map(pageNum => (
          <button
            key={pageNum}
            onClick={() => onPageChange(pageNum)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              currentPage === pageNum
                ? 'bg-primary-600 text-white'
                : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {pageNum}
          </button>
        ))}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          Next
        </button>
      </div>
    </div>
  );
};

const EmptyState = ({ message }) => (
  <div className="card p-12 text-center">
    <FiFolder className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
    <p className="text-gray-600 dark:text-gray-400 text-lg">{message}</p>
  </div>
);

const getFileTypeIcon = (mimeType) => {
  if (mimeType?.includes('pdf')) return '📄';
  if (mimeType?.includes('image')) return '🖼️';
  if (mimeType?.includes('word') || mimeType?.includes('document')) return '📝';
  if (mimeType?.includes('sheet')) return '📊';
  return '📁';
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
