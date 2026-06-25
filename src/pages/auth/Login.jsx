import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import {
  FiBriefcase, FiEye, FiEyeOff, FiLock,
  FiLogIn, FiMail, FiPhone, FiUser, FiUserPlus, FiShield
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const iconStyle = {
  position: 'absolute', left: 14, top: '50%',
  transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none'
};

const Login = () => {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState(() => searchParams.get('invite') ? 'signup' : 'signin');
  const [form, setForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    password: '', confirmPassword: '', gender: '',
    designation: '', employmentType: 'full-time',
    preferredDepartment: '', inviteCode: searchParams.get('invite') || ''
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [dbError, setDbError] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [otpMode, setOtpMode] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const emailRef = useRef(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const dashboardMap = { superadmin: '/superadmin', admin: '/admin', hr: '/hr', employee: '/employee' };
  const disabled = !ready || loading;

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await authAPI.getDepartments();
        if (res.data.success) setDepartments(res.data.data || []);
      } catch (err) { }
    };
    fetchDepartments();
    const t = setTimeout(() => {
      setReady(true);
    }, 900);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (disabled) return;
    if (!form.email || !form.password) return toast.error('Please fill in all fields');
    setLoading(true);
    try {
      setDbError(false);
      const data = await login(form.email, form.password);
      if (data.success) {
        sessionStorage.setItem('showWelcome', data.user.name);
        navigate(dashboardMap[data.user.role] || '/login');
      }
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || '';
      if (status === 503 || msg.toLowerCase().includes('database')) {
        setDbError(true);
      } else {
        toast.error(msg || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (disabled) return;
    const required = ['firstName', 'lastName', 'email', 'phone', 'password', 'gender', 'designation'];
    if (required.some(f => !signupForm[f])) return toast.error('Please fill in all required fields');
    if (signupForm.password.length < 6) return toast.error('Password must be at least 6 characters');
    if (signupForm.password !== signupForm.confirmPassword) return toast.error('Passwords do not match');
    setLoading(true);
    try {
      const { confirmPassword, ...payload } = signupForm;
      const res = await authAPI.employeeSignup(payload);
      if (res.data.success) {
        setOtpEmail(signupForm.email);
        setOtpMode(true);
        setOtpValue('');
        toast.success('OTP sent to your email. Please verify to complete signup.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (disabled || !otpValue) return toast.error('Please enter OTP');
    setLoading(true);
    try {
      const res = await authAPI.verifyOTP(otpEmail, otpValue);
      if (res.data.success) {
        toast.success('Email verified! You can now login.');
        setOtpMode(false);
        setMode('signin');
        setForm({ email: otpEmail, password: signupForm.password });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const up = (field, value) => setSignupForm(p => ({ ...p, [field]: value }));

  return (
    <div style={{ opacity: ready ? 1 : 0, transition: 'opacity 0.4s ease' }}>
      {otpMode ? (
        <form onSubmit={handleVerifyOTP} style={{ marginTop: 20 }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <h3 style={{ color: '#1f2937', marginBottom: 8 }}>Verify Your Email</h3>
            <p style={{ color: '#6b7280', fontSize: 14 }}>OTP sent to {otpEmail}</p>
          </div>
          <div className="auth-form-group">
            <label>Enter OTP</label>
            <input
              type="text"
              value={otpValue}
              onChange={e => setOtpValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
              disabled={disabled}
              className="input-box"
              placeholder="000000"
              maxLength="6"
              style={{ textAlign: 'center', letterSpacing: 8, fontSize: 18, fontWeight: 600 }}
            />
            <small style={{ color: '#9ca3af', marginTop: 4, display: 'block' }}>6-digit OTP (valid for 15 minutes)</small>
          </div>
          <button type="submit" disabled={disabled} className="login-btn">
            {loading ? <span className="auth-spinner" /> : <>Verify OTP</>}
          </button>
          <button type="button" onClick={() => setOtpMode(false)} className="login-btn" style={{ background: '#e5e7eb', color: '#1f2937', marginTop: 8 }}>
            Back to Sign Up
          </button>
        </form>
      ) : (
        <>
          {/* Tabs */}
          <div className="auth-tabs">
            <button className={`auth-tab-btn ${mode === 'signin' ? 'active' : ''}`} onClick={() => setMode('signin')} disabled={!ready}>
              Sign In
            </button>
            <button className={`auth-tab-btn ${mode === 'signup' ? 'active' : ''}`} onClick={() => setMode('signup')} disabled={!ready}>
              Employee Sign Up
            </button>
          </div>


      {dbError && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 18 }}>🔴</span>
          <div>
            <div style={{ fontWeight: 600, color: '#dc2626', fontSize: 14 }}>Service Temporarily Unavailable</div>
            <div style={{ color: '#b91c1c', fontSize: 13, marginTop: 2 }}>
              We are unable to process your request at this time. Please try again in a few minutes or contact your system administrator.
            </div>
          </div>
        </div>
      )}

      {mode === 'signin' ? (
        <form onSubmit={handleSubmit}>
          <div className="auth-form-group">
            <label>Email Address</label>
            <div style={{ position: 'relative' }}>
              <FiMail size={15} style={iconStyle} />
              <input
                type="email" name="email" ref={emailRef} value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                disabled={disabled} className="input-box"
                style={{ paddingLeft: 40 }} placeholder="you@company.com"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="auth-form-group">
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <FiLock size={15} style={iconStyle} />
              <input
                type={showPass ? 'text' : 'password'} name="password" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                disabled={disabled} className="input-box"
                style={{ paddingLeft: 40, paddingRight: 44 }}
                placeholder="Enter your password" autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowPass(!showPass)} disabled={disabled}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}>
                {showPass ? <FiEyeOff size={15} /> : <FiEye size={15} />}
              </button>
            </div>
          </div>

          <div className="auth-forgot">
            <Link to="/forgot-password">Forgot password?</Link>
          </div>

          <button type="submit" disabled={disabled} className="login-btn">
            {loading ? <span className="auth-spinner" /> : <><FiLogIn size={17} /><span>Sign In</span></>}
          </button>
        </form>
      ) : (
        <form onSubmit={handleSignup}>
          <div className="signup-scroll">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="auth-form-group">
                <label>First Name</label>
                <div style={{ position: 'relative' }}>
                  <FiUser size={14} style={iconStyle} />
                  <input value={signupForm.firstName} onChange={e => up('firstName', e.target.value)} disabled={disabled} className="input-box" style={{ paddingLeft: 38 }} placeholder="First name" />
                </div>
              </div>
              <div className="auth-form-group">
                <label>Last Name</label>
                <input value={signupForm.lastName} onChange={e => up('lastName', e.target.value)} disabled={disabled} className="input-box" placeholder="Last name" />
              </div>
            </div>

            <div className="auth-form-group">
              <label>Email Address</label>
              <div style={{ position: 'relative' }}>
                <FiMail size={14} style={iconStyle} />
                <input type="email" value={signupForm.email} onChange={e => up('email', e.target.value)} disabled={disabled} className="input-box" style={{ paddingLeft: 38 }} placeholder="you@company.com" autoComplete="email" />
              </div>
            </div>

            <div className="auth-form-group">
              <label>Phone</label>
              <div style={{ position: 'relative' }}>
                <FiPhone size={14} style={iconStyle} />
                <input value={signupForm.phone} onChange={e => up('phone', e.target.value)} disabled={disabled} className="input-box" style={{ paddingLeft: 38 }} placeholder="+91-9876543210" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="auth-form-group">
                <label>Password</label>
                <div style={{ position: 'relative' }}>
                  <FiLock size={14} style={iconStyle} />
                  <input type={showPass ? 'text' : 'password'} value={signupForm.password} onChange={e => up('password', e.target.value)} disabled={disabled} className="input-box" style={{ paddingLeft: 38, paddingRight: 40 }} placeholder="Password" autoComplete="new-password" />
                  <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}>
                    {showPass ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                  </button>
                </div>
              </div>
              <div className="auth-form-group">
                <label>Confirm</label>
                <input type={showPass ? 'text' : 'password'} value={signupForm.confirmPassword} onChange={e => up('confirmPassword', e.target.value)} disabled={disabled} className="input-box" placeholder="Confirm" autoComplete="new-password" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="auth-form-group">
                <label>Gender</label>
                <select value={signupForm.gender} onChange={e => up('gender', e.target.value)} disabled={disabled} className="input-box" style={{ cursor: 'pointer' }}>
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="auth-form-group">
                <label>Employment Type</label>
                <select value={signupForm.employmentType} onChange={e => up('employmentType', e.target.value)} disabled={disabled} className="input-box" style={{ cursor: 'pointer' }}>
                  <option value="full-time">Full Time</option>
                  <option value="part-time">Part Time</option>
                  <option value="contract">Contract</option>
                  <option value="intern">Intern</option>
                </select>
              </div>
            </div>

            <div className="auth-form-group">
              <label>Preferred Department</label>
              <select value={signupForm.preferredDepartment} onChange={e => up('preferredDepartment', e.target.value)} disabled={disabled} className="input-box" style={{ cursor: 'pointer' }}>
                <option value="">Select a department</option>
                {departments.map(dept => (
                  <option key={dept._id} value={dept._id}>{dept.name}</option>
                ))}
              </select>
            </div>

            <div className="auth-form-group">
              <label>Designation</label>
              <div style={{ position: 'relative' }}>
                <FiBriefcase size={14} style={iconStyle} />
                <input value={signupForm.designation} onChange={e => up('designation', e.target.value)} disabled={disabled} className="input-box" style={{ paddingLeft: 38 }} placeholder="Frontend Developer" />
              </div>
            </div>

            {!searchParams.get('invite') && (
              <div className="auth-form-group">
                <label>Company Invite Code <span style={{ color: '#9ca3af', fontWeight: 400 }}>(Optional)</span></label>
                <div style={{ position: 'relative' }}>
                  <FiShield size={14} style={iconStyle} />
                  <input value={signupForm.inviteCode} onChange={e => up('inviteCode', e.target.value.toUpperCase())} disabled={disabled} className="input-box" style={{ paddingLeft: 38, letterSpacing: 2 }} placeholder="e.g. BVE-4X2K" />
                </div>
              </div>
            )}

          </div>

          <button type="submit" disabled={disabled} className="login-btn" style={{ marginTop: 4 }}>
            {loading ? <span className="auth-spinner" /> : <><FiUserPlus size={17} /><span>Create Account</span></>}
          </button>
        </form>
      )}
        </>
      )}
    </div>
  );
};

export default Login;
