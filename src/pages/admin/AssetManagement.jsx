import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { assetAPI, employeeAPI } from '../../services/api';
import DataTable from '../../components/common/DataTable';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import { FiPlus, FiMonitor, FiSmartphone, FiBox, FiCheckCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { formatDate, getStatusColor } from '../../utils/helpers';

const AssetManagement = () => {
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [formData, setFormData] = useState({
    name: '', type: 'Laptop', serialNumber: '', purchaseDate: '', purchasePrice: '', assignedTo: ''
  });
  const [assignData, setAssignData] = useState({ userId: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [assetRes, empRes] = await Promise.all([
        assetAPI.getAll(),
        employeeAPI.getAll({ limit: 1000 })
      ]);
      if (assetRes.data.success) setAssets(assetRes.data.data);
      if (empRes.data.success) setEmployees(empRes.data.data);
    } catch (err) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (!payload.assignedTo) delete payload.assignedTo;
      await assetAPI.create(payload);
      toast.success('Asset added successfully');
      setIsAddModalOpen(false);
      setFormData({ name: '', type: 'Laptop', serialNumber: '', purchaseDate: '', purchasePrice: '', assignedTo: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add asset');
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    try {
      await assetAPI.assign(selectedAsset._id, assignData.userId);
      toast.success('Asset assigned successfully');
      setIsAssignModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to assign asset');
    }
  };

  const handleReturn = async (id) => {
    if (!window.confirm('Are you sure you want to mark this asset as returned?')) return;
    try {
      await assetAPI.returnAsset(id, 'Good'); // defaulting to Good for quick action
      toast.success('Asset returned successfully');
      fetchData();
    } catch (err) {
      toast.error('Failed to return asset');
    }
  };

  const columns = [
    { header: 'Asset Name', key: 'name' },
    { header: 'Type', key: 'type' },
    { header: 'Serial Number', key: 'serialNumber' },
    { 
      header: 'Status', 
      key: 'status',
      render: (status) => (
        <span className={`badge ${getStatusColor(status?.toLowerCase())}`}>
          {status}
        </span>
      ) 
    },
    { 
      header: 'Assigned To', 
      key: 'assignedTo',
      render: (assignedTo) => assignedTo ? (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{assignedTo.name}</p>
          <p className="text-xs text-gray-500">{assignedTo.employee?.employeeId || assignedTo.email}</p>
        </div>
      ) : <span className="text-gray-400">-</span> 
    },
    { 
      header: 'Actions', 
      key: '_id',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          {row.status === 'Available' ? (
            <button 
              onClick={() => { setSelectedAsset(row); setIsAssignModalOpen(true); }}
              className="text-xs btn-primary py-1 px-2"
            >
              Assign
            </button>
          ) : row.status === 'Assigned' ? (
            <button 
              onClick={() => handleReturn(row._id)}
              className="text-xs bg-amber-500 hover:bg-amber-600 text-white py-1 px-2 rounded-lg"
            >
              Return
            </button>
          ) : null}
        </div>
      ) 
    }
  ];

  if (loading) return <LoadingSpinner text="Loading assets..." />;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title flex items-center gap-2"><FiMonitor /> Asset Management</h1>
        <button onClick={() => setIsAddModalOpen(true)} className="btn-primary flex items-center gap-2">
          <FiPlus /> Add Asset
        </button>
      </div>

      <div className="card">
        <DataTable columns={columns} data={assets} searchPlaceholder="Search assets..." />
      </div>

      {/* Add Asset Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Asset">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="label">Asset Name</label>
            <input type="text" required className="input-field" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Type</label>
              <select className="input-field" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                <option>Laptop</option>
                <option>Monitor</option>
                <option>Phone</option>
                <option>Software</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="label">Serial Number</label>
              <input type="text" required className="input-field" value={formData.serialNumber} onChange={e => setFormData({...formData, serialNumber: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="label">Employee</label>
            <select className="input-field" value={formData.assignedTo} onChange={e => setFormData({...formData, assignedTo: e.target.value})}>
              <option value="">Keep asset available</option>
              {employees.map(emp => (
                <option key={emp._id} value={emp.user?._id || ''}>
                  {emp.firstName} {emp.lastName} ({emp.employeeId})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Purchase Date</label>
              <input type="date" required className="input-field" value={formData.purchaseDate} onChange={e => setFormData({...formData, purchaseDate: e.target.value})} />
            </div>
            <div>
              <label className="label">Price (₹)</label>
              <input type="number" required className="input-field" value={formData.purchasePrice} onChange={e => setFormData({...formData, purchasePrice: e.target.value})} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Add Asset</button>
          </div>
        </form>
      </Modal>

      {/* Assign Modal */}
      <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title={`Assign ${selectedAsset?.name}`}>
        <form onSubmit={handleAssignSubmit} className="space-y-4">
          <div>
            <label className="label">Select Employee</label>
            <select required className="input-field" value={assignData.userId} onChange={e => setAssignData({ userId: e.target.value })}>
              <option value="">-- Choose Employee --</option>
              {employees.map(emp => (
                <option key={emp._id} value={emp.user?._id || ''}>
                  {emp.firstName} {emp.lastName} ({emp.employeeId})
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setIsAssignModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Assign Asset</button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};

export default AssetManagement;
