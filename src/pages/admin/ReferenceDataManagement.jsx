import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, Plus, ChevronDown, Check, X } from 'lucide-react';
import { showToast } from '../../utils/toast';

export default function ReferenceDataManagement() {
  const [activeTab, setActiveTab] = useState('document-types');
  const [referenceData, setReferenceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expandedParent, setExpandedParent] = useState(null);
  const [formData, setFormData] = useState({
    category: 'document-type',
    name: '',
    value: '',
    sequence: 0,
    parentValue: '',
    description: '',
    isActive: true
  });

  useEffect(() => {
    loadReferenceData();
  }, [activeTab]);

  const loadReferenceData = async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'document-types'
        ? '/api/reference-data/document-types'
        : '/api/reference-data/category/document-name';

      const response = await fetch(endpoint);
      const result = await response.json();

      if (result.success) {
        setReferenceData(result.data);
      }
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingId(null);
    setFormData({
      category: activeTab === 'document-types' ? 'document-type' : 'document-name',
      name: '',
      value: '',
      sequence: referenceData.length + 1,
      parentValue: '',
      description: '',
      isActive: true
    });
    setShowForm(true);
  };

  const handleEdit = (item) => {
    setEditingId(item._id);
    setFormData({
      category: item.category,
      name: item.name,
      value: item.value,
      sequence: item.sequence,
      parentValue: item.parentValue || '',
      description: item.description || '',
      isActive: item.isActive
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.value) {
      showToast('Name and value are required', 'error');
      return;
    }

    setLoading(true);
    try {
      const url = editingId
        ? `/api/reference-data/${editingId}`
        : '/api/reference-data';

      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.success) {
        showToast(editingId ? 'Updated successfully' : 'Created successfully', 'success');
        setShowForm(false);
        loadReferenceData();
      } else {
        showToast(result.message || 'Operation failed', 'error');
      }
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/reference-data/${id}`, { method: 'DELETE' });
      const result = await response.json();

      if (result.success) {
        showToast('Deleted successfully', 'success');
        loadReferenceData();
      } else {
        showToast(result.message || 'Delete failed', 'error');
      }
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (item) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/reference-data/${item._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !item.isActive })
      });

      const result = await response.json();

      if (result.success) {
        showToast(item.isActive ? 'Deactivated' : 'Activated', 'success');
        loadReferenceData();
      }
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const groupedByParent = activeTab === 'document-names'
    ? referenceData.reduce((acc, item) => {
        if (!acc[item.parentValue]) acc[item.parentValue] = [];
        acc[item.parentValue].push(item);
        return acc;
      }, {})
    : {};

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Reference Data Management</h1>
          <p className="text-gray-600 mt-2">Manage document types and names for your organization</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('document-types')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'document-types'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Document Types
          </button>
          <button
            onClick={() => setActiveTab('document-names')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'document-names'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Document Names
          </button>
        </div>

        {/* Actions */}
        <div className="mb-6">
          <button
            onClick={handleAddNew}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={18} />
            Add New
          </button>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-xl font-bold mb-4">
                {editingId ? 'Edit' : 'Add New'} {activeTab === 'document-types' ? 'Document Type' : 'Document Name'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., ID Proof"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Value (System)</label>
                  <input
                    type="text"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., id-proof"
                    disabled={editingId !== null}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sequence</label>
                  <input
                    type="number"
                    value={formData.sequence}
                    onChange={(e) => setFormData({ ...formData, sequence: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {activeTab === 'document-names' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
                    <input
                      type="text"
                      value={formData.parentValue}
                      onChange={(e) => setFormData({ ...formData, parentValue: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., id-proof"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    placeholder="Optional description"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                    Active
                  </label>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Data Display */}
        {loading && !showForm ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : activeTab === 'document-types' ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Sequence</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Value</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {referenceData.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-700">{item.sequence}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{item.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.value}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        item.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm flex gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleToggleActive(item)}
                        className={`p-1 rounded ${
                          item.isActive
                            ? 'text-yellow-600 hover:bg-yellow-50'
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                        title={item.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {item.isActive ? <X size={16} /> : <Check size={16} />}
                      </button>
                      <button
                        onClick={() => handleDelete(item._id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedByParent).map(([parentType, items]) => (
              <div key={parentType} className="bg-white rounded-lg shadow overflow-hidden">
                <button
                  onClick={() => setExpandedParent(expandedParent === parentType ? null : parentType)}
                  className="w-full px-6 py-4 flex items-center gap-3 hover:bg-gray-50 border-b border-gray-200"
                >
                  <ChevronDown
                    size={20}
                    className={`transform transition ${expandedParent === parentType ? 'rotate-180' : ''}`}
                  />
                  <h3 className="font-semibold text-gray-900">{parentType}</h3>
                  <span className="ml-auto text-sm text-gray-500">{items.length} items</span>
                </button>

                {expandedParent === parentType && (
                  <table className="w-full">
                    <tbody className="divide-y divide-gray-200">
                      {items.map((item) => (
                        <tr key={item._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-700">{item.sequence}</td>
                          <td className="px-6 py-4 text-sm text-gray-900 font-medium">{item.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{item.value}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              item.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {item.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm flex gap-2">
                            <button
                              onClick={() => handleEdit(item)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleToggleActive(item)}
                              className={`p-1 rounded ${
                                item.isActive
                                  ? 'text-yellow-600 hover:bg-yellow-50'
                                  : 'text-green-600 hover:bg-green-50'
                              }`}
                            >
                              {item.isActive ? <X size={16} /> : <Check size={16} />}
                            </button>
                            <button
                              onClick={() => handleDelete(item._id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
