import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { assetAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { FiMonitor, FiSmartphone, FiBox, FiCheckCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';

const MyAssets = () => {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyAssets();
  }, []);

  const fetchMyAssets = async () => {
    try {
      setLoading(true);
      const res = await assetAPI.getMyAssets();
      if (res.data.success) {
        setAssets(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to fetch your assets');
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type) => {
    if (type === 'Laptop' || type === 'Monitor') return <FiMonitor className="w-8 h-8 text-primary-600" />;
    if (type === 'Phone') return <FiSmartphone className="w-8 h-8 text-primary-600" />;
    return <FiBox className="w-8 h-8 text-primary-600" />;
  };

  if (loading) return <LoadingSpinner text="Loading your assets..." />;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <h1 className="page-title">My Assigned Equipment</h1>

      {assets.length === 0 ? (
        <div className="card flex flex-col items-center justify-center p-12 text-gray-500 text-center">
          <FiBox className="w-16 h-16 mb-4 text-gray-300" />
          <h2 className="text-xl font-semibold mb-2">No Assets Assigned</h2>
          <p>You currently do not have any company equipment assigned to you.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assets.map((asset, index) => (
            <motion.div 
              key={asset._id} 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="card p-6 flex flex-col items-center text-center hover:shadow-card-hover transition-all"
            >
              <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mb-4">
                {getIcon(asset.type)}
              </div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-1">{asset.name}</h3>
              <p className="text-sm font-medium text-gray-500 mb-4">{asset.type}</p>
              
              <div className="w-full bg-gray-50 dark:bg-dark-bg/50 rounded-lg p-3 text-sm flex justify-between items-center">
                <span className="text-gray-500">S/N:</span>
                <span className="font-mono text-gray-800 dark:text-gray-200">{asset.serialNumber}</span>
              </div>
              
              <div className="mt-4 flex items-center gap-2 text-emerald-600 text-sm font-medium">
                <FiCheckCircle /> Assigned to you
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default MyAssets;
