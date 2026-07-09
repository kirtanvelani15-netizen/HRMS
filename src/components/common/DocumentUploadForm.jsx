import React, { useState, useEffect } from 'react';
import { Upload, X } from 'lucide-react';
import { showToast } from '../../utils/toast';

export default function DocumentUploadForm({ employeeId, onUploadSuccess, onClose }) {
  const [documentTypes, setDocumentTypes] = useState([]);
  const [documentNames, setDocumentNames] = useState([]);
  const [selectedType, setSelectedType] = useState('');
  const [selectedName, setSelectedName] = useState('');
  const [file, setFile] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(true);

  useEffect(() => {
    loadDocumentTypes();
  }, []);

  useEffect(() => {
    if (selectedType) {
      loadDocumentNames(selectedType);
    } else {
      setDocumentNames([]);
      setSelectedName('');
    }
  }, [selectedType]);

  const loadDocumentTypes = async () => {
    setLoadingTypes(true);
    try {
      const response = await fetch('/api/reference-data/document-types');
      const result = await response.json();

      if (result.success) {
        setDocumentTypes(result.data);
      } else {
        showToast('Failed to load document types', 'error');
      }
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoadingTypes(false);
    }
  };

  const loadDocumentNames = async (typeValue) => {
    try {
      const response = await fetch(`/api/reference-data/document-names/${typeValue}`);
      const result = await response.json();

      if (result.success) {
        setDocumentNames(result.data);
      }
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (selectedFile.size > maxSize) {
        showToast('File size must be less than 10MB', 'error');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedType || !selectedName || !file) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('documentType', selectedType);
      formData.append('documentName', selectedName);
      formData.append('employee', employeeId);
      formData.append('notes', notes);

      const response = await fetch('/api/documents', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        showToast('Document uploaded successfully', 'success');
        onUploadSuccess && onUploadSuccess();
        onClose && onClose();
      } else {
        showToast(result.message || 'Upload failed', 'error');
      }
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900">Upload Document</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Document Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Document Type <span className="text-red-500">*</span>
          </label>
          {loadingTypes ? (
            <div className="animate-pulse bg-gray-200 h-10 rounded"></div>
          ) : (
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Select Document Type</option>
              {documentTypes.map((type) => (
                <option key={type._id} value={type.value}>
                  {type.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Document Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Document Name <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedName}
            onChange={(e) => setSelectedName(e.target.value)}
            disabled={!selectedType}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100"
          >
            <option value="">
              {!selectedType ? 'Select Document Type First' : 'Select Document Name'}
            </option>
            {documentNames.map((name) => (
              <option key={name._id} value={name.value}>
                {name.name}
              </option>
            ))}
          </select>
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Document File <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="file"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={!selectedType || !selectedName}
            />
            <div className={`border-2 border-dashed rounded-lg p-6 text-center ${
              file
                ? 'border-green-400 bg-green-50'
                : selectedType && selectedName
                  ? 'border-gray-300 hover:border-gray-400 bg-gray-50'
                  : 'border-gray-300 bg-gray-100'
            } ${!selectedType || !selectedName ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
              {file ? (
                <>
                  <div className="text-green-600 mb-2">
                    <Upload size={24} className="mx-auto" />
                  </div>
                  <p className="text-sm font-medium text-green-600">{file.name}</p>
                  <p className="text-xs text-green-500">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </>
              ) : (
                <>
                  <Upload size={24} className={`mx-auto mb-2 ${
                    selectedType && selectedName ? 'text-gray-400' : 'text-gray-300'
                  }`} />
                  <p className={`text-sm ${selectedType && selectedName ? 'text-gray-600' : 'text-gray-500'}`}>
                    Drop file here or click to browse
                  </p>
                  <p className={`text-xs ${selectedType && selectedName ? 'text-gray-500' : 'text-gray-400'}`}>
                    Maximum file size: 10 MB
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="3"
            placeholder="Add any notes about this document..."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading || !selectedType || !selectedName || !file}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Uploading...' : 'Upload Document'}
          </button>
        </div>
      </form>
    </div>
  );
}
