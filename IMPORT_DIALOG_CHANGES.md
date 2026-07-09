# Import Punch Excel Dialog - UI Standardization

## Overview
Standardized the Import Punch Excel dialog and created a reusable `ImportDialog` component for consistent UI/UX across all import features.

## Changes Made

### 1. New Component: ImportDialog.jsx
**Location:** `frontend/src/components/common/ImportDialog.jsx`

A reusable dialog component that provides a standardized interface for all import operations.

**Features:**
- ✅ Customizable title and description
- ✅ File upload section with drag & drop support
- ✅ Download Template button (secondary style with icon)
- ✅ Date selection support (optional, configurable)
- ✅ Custom children for module-specific results
- ✅ Consistent spacing, typography, and colors
- ✅ Dark mode support
- ✅ Responsive on all supported screen sizes

**Props:**
- `isOpen` (boolean) - Dialog visibility
- `onClose` (function) - Close handler
- `title` (string) - Dialog title
- `description` (string) - Dialog description
- `onImport` (function) - Import handler
- `onFileChange` (function) - File input handler
- `onDownloadTemplate` (function) - Download template handler
- `downloading` (boolean) - Template download loading state
- `importing` (boolean) - Import loading state
- `importForm` (object) - Form state
- `dateConfig` (object) - Date selection configuration (optional)
- `children` (ReactNode) - Custom content/results display
- `acceptedFormats` (string) - File types accepted (default: `.xls,.xlsx`)
- `maxFileSize` (string) - Max file size display (default: `10MB`)

### 2. Updated Attendance.jsx
**Location:** `frontend/src/pages/shared/Attendance.jsx`

**Changes:**
- Removed inline import modal (previously ~50 lines of modal code)
- Added ImportDialog import
- Replaced custom modal with ImportDialog component
- Moved import results to component's children prop
- Maintained all existing functionality

**Before:**
```jsx
<Modal isOpen={showImportModal} onClose={() => setShowImportModal(false)} title="Import Punch Excel" size="md"
  footer={/* ... */}
>
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <label className="label mb-0">Excel File</label>
      <button onClick={handleDownloadTemplate} disabled={downloadingTemplate}
        className="flex items-center gap-1 text-xs text-primary-600 hover:underline font-medium disabled:opacity-50">
        <FiDownload className="w-3 h-3" />
        {downloadingTemplate ? 'Downloading...' : 'Download Template'}
      </button>
    </div>
    {/* ... rest of modal code */}
  </div>
</Modal>
```

**After:**
```jsx
<ImportDialog
  isOpen={showImportModal}
  onClose={() => setShowImportModal(false)}
  title="Import Punch Excel"
  description="Upload your Excel file to import punch data"
  onImport={handleImport}
  onFileChange={e => setImportForm(f => ({ ...f, file: e.target.files?.[0] || null }))}
  onDownloadTemplate={handleDownloadTemplate}
  onDateModeChange={mode => setImportForm(f => ({ ...f, dateMode: mode }))}
  onDateChange={date => setImportForm(f => ({ ...f, date }))}
  importing={importing}
  downloading={downloadingTemplate}
  importForm={importForm}
  dateConfig={{
    modes: [['sheet', 'Excel Date'], ['selected', 'Selected Date']],
    selectedMode: importForm.dateMode,
    selectedDate: importForm.date
  }}
>
  {importResult && (
    <div>
      {/* Custom results display */}
    </div>
  )}
</ImportDialog>
```

## UI/UX Improvements

### Download Template Button
- **Before:** Text link (underline, small font)
- **After:** Secondary button with download icon
- Consistent with other action buttons
- Better visibility and discoverability
- Maintains proper button spacing and sizing

### Dialog Structure
```
┌─────────────────────────────────────────┐
│ Title                              [×]  │
├─────────────────────────────────────────┤
│                                         │
│ Description text                        │
│                                         │
│ 1. Upload Excel File Section            │
│ ┌─────────────────────────────────────┐ │
│ │ Upload Excel File      [Download]   │ │
│ │ Choose or download template         │ │
│ │                                     │ │
│ │  ┌─────────────────────────────────┐│ │
│ │  │ 📤 Drag and drop file here      ││ │
│ │  │           or                    ││ │
│ │  │      [Choose File Button]       ││ │
│ │  │  Supported: .xls, .xlsx         ││ │
│ │  └─────────────────────────────────┘│ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 2. Select Date Section                  │
│ [Excel Date] [Selected Date]            │
│                                         │
│ (Optional date input)                   │
│                                         │
│ 3. Import Results (Custom)              │
│ [Results Component from children]       │
│                                         │
├─────────────────────────────────────────┤
│                        [Close]  [Import] │
└─────────────────────────────────────────┘
```

## Design System Compliance

### Typography
- Title: `text-lg font-semibold`
- Section headers: `text-sm font-semibold`
- Description: `text-sm text-gray-600`
- Labels: `text-xs font-medium text-gray-500`

### Spacing
- Section gaps: `space-y-6`
- Internal spacing: Consistent with `.card` and `.input-field` classes
- Padding: Standard `p-4` or `p-6`

### Colors
- Primary buttons: Purple (`#7c3aed`)
- Secondary buttons: White/gray with border
- Text: Gray-900 (light) / White (dark)
- Borders: Gray-300 / Gray-600 (dark)

### Icons
- Download: `FiDownload`
- Upload: `FiUpload`
- Consistent sizing: `w-4 h-4` or `w-8 h-8`

## Responsive Behavior

- **Mobile (<640px):** Single column, full-width buttons
- **Tablet (640px-1024px):** Two-column grid for date options
- **Desktop (>1024px):** Full layout with optimal spacing

## How to Use in Other Modules

### Example: Salary Bulk Import

```jsx
import ImportDialog from '../../components/common/ImportDialog';

const SalaryImport = () => {
  const [showImportModal, setShowImportModal] = useState(false);
  const [importForm, setImportForm] = useState({ file: null, dateMode: 'sheet', date: '' });
  const [importing, setImporting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const handleImport = async () => {
    // Your import logic
  };

  const handleDownloadTemplate = async () => {
    // Your download logic
  };

  return (
    <>
      <button onClick={() => setShowImportModal(true)}>
        Import Salary Data
      </button>

      <ImportDialog
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Salary Data"
        description="Upload salary records in Excel format"
        onImport={handleImport}
        onFileChange={e => setImportForm(f => ({ ...f, file: e.target.files?.[0] || null }))}
        onDownloadTemplate={handleDownloadTemplate}
        onDateModeChange={mode => setImportForm(f => ({ ...f, dateMode: mode }))}
        onDateChange={date => setImportForm(f => ({ ...f, date }))}
        importing={importing}
        downloading={downloading}
        importForm={importForm}
        dateConfig={{
          modes: [['sheet', 'Date from File'], ['selected', 'Specific Date']],
          selectedMode: importForm.dateMode,
          selectedDate: importForm.date
        }}
      >
        {importResult && (
          <div>
            <h4 className="text-sm font-semibold mb-3">Results</h4>
            <p>Imported: {importResult.imported} records</p>
          </div>
        )}
      </ImportDialog>
    </>
  );
};
```

## Testing Checklist

- [x] Component renders without errors
- [x] Download Template button displays correctly
- [x] File upload input accepts Excel files
- [x] Date selection works (both modes)
- [x] Import button triggers handler
- [x] Close button closes modal
- [x] Dark mode styles applied correctly
- [x] Responsive layout on mobile/tablet/desktop
- [x] Custom children (import results) display properly
- [x] All icons display correctly

## Files Modified

1. **Created:** `frontend/src/components/common/ImportDialog.jsx` (4.5 KB)
2. **Modified:** `frontend/src/pages/shared/Attendance.jsx` (~100 lines refactored, net -30 lines)

## Benefits

✅ **Code Reusability:** Single component for all import dialogs
✅ **Consistency:** Unified UI/UX across all import features
✅ **Maintainability:** Changes to import UI only need to be made once
✅ **Scalability:** Easy to add import dialogs to new modules
✅ **Accessibility:** Proper semantic HTML and ARIA labels
✅ **Performance:** Reduced component complexity and duplication

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Android)

## Future Enhancements

- Add drag & drop file listener to modal background
- Add file preview before import
- Add progress bar during import
- Add error retry mechanism
- Add bulk-action queue for multiple imports
- Add import history/audit log
