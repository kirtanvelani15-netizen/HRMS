import React from 'react';
import { Outlet } from 'react-router-dom';
import { FiUsers } from 'react-icons/fi';

const AuthLayout = () => (
  <div className="auth-shell">
    {/* Fixed sidebar-style logo — always visible */}
    <div className="auth-sidebar-logo" aria-label="UnnI HRMS">
      <div className="auth-sidebar-logo-icon">
        <FiUsers size={18} color="#1d4ed8" />
      </div>
      <span className="auth-sidebar-logo-text">EMS</span>
    </div>
    {/* Left decorative panel */}
    <div className="auth-left-panel" aria-hidden="true">
      <div className="auth-geo auth-geo-circle-lg" />
      <div className="auth-geo auth-geo-circle-sm" />
      <div className="auth-geo auth-geo-half-circle" />
      <div className="auth-geo auth-geo-square" />
      <div className="auth-geo auth-geo-quarter" />

      <div className="auth-brand">
        <div className="auth-brand-icon">
          <img src="/logo.jpg" alt="UnnI HRMS Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <div>
          <div className="auth-brand-name">UnnI HRMS</div>
          <div className="auth-brand-tagline">Where HR Meets Innovation</div>
        </div>
      </div>
    </div>

    {/* Right form panel */}
    <div className="auth-right-panel">
      <div className="auth-form-card">
        <h2 className="auth-form-title">Hello!</h2>
        <p className="auth-form-subtitle">Sign in to your account</p>
        <Outlet />
        <p className="auth-footer-text">&copy; 2025 UnnI HRMS</p>
      </div>
    </div>
  </div>
);

export default AuthLayout;

