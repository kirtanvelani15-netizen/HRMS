import React from 'react';
import { FiDownload, FiUpload } from 'react-icons/fi';
import Modal from './Modal';

const ImportDialog = ({
  isOpen,
  onClose,
  title,
  description,
  onImport,
  onFileChange,
  onDownloadTemplate,
  onDateModeChange,
  onDateChange,
  importForm,
  downloading,
  importing,
  acceptedFormats = '.xls,.xlsx',
  maxFileSize = '10MB',
  dateConfig = null,
  children
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Close</button>
          <button onClick={onImport} disabled={importing} className="btn-primary">
            {importing ? 'Importing...' : 'Import Data'}
          </button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Description */}
        {description && (
          <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
        )}

        {/* 1. Upload Excel File Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Upload Excel File</h4>
              <p className="text-xs text-gray-500 mt-1">Choose an Excel file or download the template to get started</p>
            </div>
            <button
              onClick={onDownloadTemplate}
              disabled={downloading}
              className="btn-secondary flex items-center gap-2 text-sm px-3 py-2"
            >
              <FiDownload className="w-4 h-4 shrink-0" />
              <span>{downloading ? 'Downloading...' : 'Download Template'}</span>
            </button>
          </div>

          {/* Drag & Drop Area */}
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-primary-400 dark:hover:border-primary-500 transition-colors">
            <div className="flex flex-col items-center gap-3">
              <FiUpload className="w-8 h-8 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Drag and drop your Excel file here</p>
                <p className="text-xs text-gray-500 mt-1">or</p>
              </div>
              <label className="btn-secondary flex items-center gap-2 text-sm px-4 py-2 cursor-pointer">
                <span>Choose File</span>
                <input
                  type="file"
                  accept={acceptedFormats}
                  onChange={onFileChange}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-gray-500 mt-2">
                Supported format: {acceptedFormats.replace(/\./g, '').toUpperCase()} | Max file size: {maxFileSize}
              </p>
            </div>
          </div>
        </div>

        {/* 2. Date Selection Section (if applicable) */}
        {dateConfig && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Select Date</h4>
            <p className="text-xs text-gray-500 mb-3">Choose the date for which you want to import data</p>
            <div className="grid grid-cols-2 gap-3">
              {dateConfig.modes.map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onDateModeChange(mode)}
                  className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                    dateConfig.selectedMode === mode
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-primary-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {dateConfig.selectedMode === 'selected' && (
              <div className="mt-3">
                <label className="label">Attendance Date</label>
                <input
                  type="date"
                  value={dateConfig.selectedDate}
                  onChange={(e) => onDateChange(e.target.value)}
                  className="input-field"
                />
              </div>
            )}
          </div>
        )}

        {/* Custom Children */}
        {children}
      </div>
    </Modal>
  );
};

export default ImportDialog;
