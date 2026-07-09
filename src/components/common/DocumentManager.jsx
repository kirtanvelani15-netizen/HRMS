import React, { useState, useEffect } from 'react';
import { Download, Trash2, Check, X, AlertCircle, FileText } from 'lucide-react';
import DocumentUploadForm from './DocumentUploadForm';
import { showToast } from '../../utils/toast';

export default function DocumentManager({ employeeId, isReadOnly = false }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [documentTypes, setDocumentTypes] = useState([]);

  useEffect(() => {
    loadDocuments();
    loadDocumentTypes();
  }, [employeeId]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/documents?employee=${employeeId}`);
      const result = await response.json();

      if (result.success) {
        setDocuments(result.data || []);
      }
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadDocumentTypes = async () => {
    try {
      const response = await fetch('/api/reference-data/document-types');
      const result = await response.json();

      if (result.success) {
        setDocumentTypes(result.data);
      }
    } catch (error) {
      console.error('Failed to load document types:', error);
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      const response = await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
      const result = await response.json();

      if (result.success) {
        showToast('Document deleted successfully', 'success');
        loadDocuments();
      } else {
        showToast(result.message || 'Delete failed', 'error');
      }
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const handleVerify = async (docId) => {
    try {
      const response = await fetch(`/api/documents/${docId}/verify`, { method: 'PUT' });
      const result = await response.json();

      if (result.success) {
        showToast('Document verified', 'success');
        loadDocuments();
      } else {
        showToast(result.message || 'Verification failed', 'error');
      }
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const filteredDocuments = filterType
    ? documents.filter((doc) => doc.documentType === filterType)
    : documents;

  const getTypeLabel = (typeValue) => {
    const type = documentTypes.find((t) => t.value === typeValue);
    return type ? type.name : typeValue;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Documents</h2>
          {!isReadOnly && (
            <button
              onClick={() => setShowUploadForm(!showUploadForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              {showUploadForm ? 'Cancel' : 'Upload Document'}
            </button>
          )}
        </div>

        {showUploadForm && !isReadOnly && (
          <DocumentUploadForm
            employeeId={employeeId}
            onUploadSuccess={() => {
              loadDocuments();
              setShowUploadForm(false);
            }}
            onClose={() => setShowUploadForm(false)}
          />
        )}
      </div>

      {/* Filter */}
      {documents.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Document Types</option>
            {documentTypes.map((type) => (
              <option key={type._id} value={type.value}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Documents List */}
      {filteredDocuments.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <FileText size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600">
            {documents.length === 0 ? 'No documents uploaded yet' : 'No documents match the selected filter'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredDocuments.map((doc) => (
            <div
              key={doc._id}
              className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText size={20} className="text-gray-400" />
                    <div>
                      <h3 className="font-semibold text-gray-900">{doc.documentName}</h3>
                      <p className="text-sm text-gray-600">{getTypeLabel(doc.documentType)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                    <div>
                      <span className="text-gray-500">File:</span>
                      <p className="text-gray-900 break-all">{doc.fileName}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Size:</span>
                      <p className="text-gray-900">{(doc.fileSize / 1024).toFixed(2)} KB</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Uploaded:</span>
                      <p className="text-gray-900">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {doc.notes && (
                      <div>
                        <span className="text-gray-500">Notes:</span>
                        <p className="text-gray-900">{doc.notes}</p>
                      </div>
                    )}
                  </div>

                  {doc.isVerified && (
                    <div className="mt-3 flex items-center gap-2 text-green-600">
                      <Check size={16} />
                      <span className="text-sm">Verified</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {doc.filePath && (
                    <a
                      href={doc.filePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Download"
                    >
                      <Download size={18} />
                    </a>
                  )}
                  {!isReadOnly && (
                    <>
                      {!doc.isVerified && (
                        <button
                          onClick={() => handleVerify(doc._id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                          title="Verify"
                        >
                          <Check size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(doc._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Message */}
      {documents.length > 0 && documents.some((doc) => !doc.isVerified) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
          <AlertCircle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800">
              Some documents are pending verification
            </p>
            <p className="text-sm text-yellow-700">
              HR personnel will review and verify uploaded documents
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
