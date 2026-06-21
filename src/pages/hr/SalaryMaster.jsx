import React, { useState, useEffect, useCallback } from 'react';
import { FiSave, FiRefreshCw, FiInfo, FiDollarSign, FiClock, FiMinusCircle, FiLock, FiEdit2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { payrollAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// ─── Pure calculation helpers ────────────────────────────────────────────────

const calcPF = (basic) => basic >= 15000 ? 1800 : Math.round(basic * 0.12);
const pfFormula = (basic) => basic >= 15000 ? 'Fixed ₹1,800 (Basic ≥ ₹15,000)' : '12% of Basic (Basic < ₹15,000)';

const DEFAULT_PERCENTAGES = { basic: 50, hra: 20, travelling: 10, bonus: 5 };

const calcAll = (ctc, manual, pct = DEFAULT_PERCENTAGES) => {
  const monthly = Number(ctc) || 0;
  const basic      = Math.round(monthly * (pct.basic / 100));
  const hra        = Math.round(basic * (pct.hra / 100));
  const travelling = Math.round(basic * (pct.travelling / 100));
  const bonus      = Math.round(basic * (pct.bonus / 100));
  const conveyance = Number(manual.conveyance)     || 0;
  const childEdu   = Number(manual.childEducation) || 0;
  const medical    = Number(manual.medical)        || 0;
  const telephone  = Number(manual.telephone)      || 0;

  // Special Allowance = CTC − (Basic + HRA + Conveyance + Child Ed + Travelling + Medical + Telephone + Bonus)
  const sumComponents    = basic + hra + conveyance + childEdu + travelling + medical + telephone + bonus;
  const specialAllowance = Math.max(0, monthly - sumComponents);

  // Gross Earnings = sum of ALL earnings components
  const grossTotal = sumComponents + specialAllowance; // = CTC when no deductions

  // Gross Deduction = Employee PF + Employer PF + Professional Tax (₹200) + Loan + Other
  const pf = calcPF(basic);
  const employeePF = pf;
  const employerPF = pf;
  const professionalTax = 200;
  const loan  = Number(manual.loan)  || 0;
  const other = Number(manual.other) || 0;
  const deductionsTotal = employeePF + employerPF + professionalTax + loan + other;

  return { basic, hra, conveyance, childEdu, travelling, medical, telephone, bonus, specialAllowance, grossTotal, employeePF, employerPF, professionalTax, loan, other, deductionsTotal };
};

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

// ─── Row components ──────────────────────────────────────────────────────────

const AutoRow = ({ label, formula, value }) => (
  <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
    <div className="flex-1">
      <div className="flex items-center gap-1.5">
        <FiLock className="w-3 h-3 text-gray-300 dark:text-gray-600 flex-shrink-0" />
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
      </div>
      <p className="text-xs text-gray-400 mt-0.5 ml-4.5">{formula}</p>
    </div>
    <div className="flex items-center gap-2 ml-4">
      <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">{fmt(value)}</span>
    </div>
  </div>
);

const PercentRow = ({ label, pctValue, onChange, formulaOf, value }) => (
  <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
    <div className="flex-1">
      <div className="flex items-center gap-1.5">
        <FiEdit2 className="w-3 h-3 text-primary-400 flex-shrink-0" />
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
      </div>
      <p className="text-xs text-gray-400 mt-0.5 ml-4.5">% of {formulaOf} — Admin editable</p>
    </div>
    <div className="flex items-center gap-2 ml-4">
      <input
        type="number" min="0" max="100" value={pctValue}
        onChange={(e) => onChange(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
        className="w-16 text-right border border-primary-300 dark:border-primary-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
      />
      <span className="text-gray-400 text-sm">%</span>
      <span className="text-sm font-semibold text-primary-600 dark:text-primary-400 w-20 text-right">{fmt(value)}</span>
    </div>
  </div>
);

const ManualRow = ({ label, sublabel, value, onChange }) => (
  <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
    <div className="flex-1">
      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sublabel || 'Fixed amount — same for all employees'}</p>
    </div>
    <div className="flex items-center gap-2 ml-4">
      <span className="text-gray-400 text-sm">₹</span>
      <input
        type="number" min="0" value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-28 text-right border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
      />
    </div>
  </div>
);

const SpecialAllowanceRow = ({ value }) => (
  <div className="flex items-center justify-between py-3 mt-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 px-3 border border-emerald-200 dark:border-emerald-800">
    <div className="flex-1">
      <div className="flex items-center gap-1.5">
        <FiLock className="w-3 h-3 text-emerald-400 flex-shrink-0" />
        <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Special Allowance</p>
      </div>
      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 ml-4.5">CTC − (Basic + HRA + Conveyance + Child Ed + Travelling + Medical + Telephone + Bonus)</p>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{fmt(value)}</span>
    </div>
  </div>
);

// ─── Main component ──────────────────────────────────────────────────────────

const DEFAULT_MANUAL = { conveyance: 0, childEducation: 0, medical: 0, telephone: 0, loan: 0, other: 0 };

const SalaryMaster = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [templateId, setTemplateId]   = useState(null);
  const [manual, setManual]           = useState(DEFAULT_MANUAL);
  const [percentages, setPercentages] = useState(DEFAULT_PERCENTAGES);
  const [overtimeType, setOvertimeType] = useState('salary');
  const [previewCTC, setPreviewCTC]   = useState(50000);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);

  const c = calcAll(previewCTC, manual, percentages);
  const setPct = (field) => (value) => setPercentages((p) => ({ ...p, [field]: value }));

  const loadTemplate = useCallback(async () => {
    setLoading(true);
    try {
      const res = await payrollAPI.getTemplates({ active: true });
      const t = res.data?.data?.[0];
      if (t) {
        setTemplateId(t._id);
        setOvertimeType(t.overtimeType || 'salary');
        setManual({
          conveyance:    t.components?.conveyance?.value        ?? 0,
          childEducation:t.components?.childEducation?.value    ?? 0,
          medical:       t.components?.medical?.value           ?? 0,
          telephone:     t.components?.telephoneInternet?.value ?? 0,
          loan:          t.employerContributions?.loan?.value   ?? 0,
          other:         t.employerContributions?.other?.value  ?? 0,
        });
        setPercentages({
          basic:      t.components?.basicSalary?.value    ?? 50,
          hra:        t.components?.hra?.value            ?? 20,
          travelling: t.components?.lta?.value            ?? 10,
          bonus:      t.components?.bonus?.value          ?? 5,
        });
      }
    } catch {
      toast.error('Failed to load salary template');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTemplate(); }, [loadTemplate]);

  const setField = (field) => (value) => setManual((p) => ({ ...p, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      name: 'Default Salary Master',
      overtimeType,
      components: {
        basicSalary:       { calculationType: 'percentage', value: percentages.basic,      percentageOf: 'ctc' },
        hra:               { calculationType: 'percentage', value: percentages.hra,        percentageOf: 'basicSalary' },
        conveyance:        { calculationType: 'fixed',      value: Number(manual.conveyance) },
        childEducation:    { calculationType: 'fixed',      value: Number(manual.childEducation) },
        lta:               { calculationType: 'percentage', value: percentages.travelling, percentageOf: 'basicSalary' },
        medical:           { calculationType: 'fixed',      value: Number(manual.medical) },
        telephoneInternet: { calculationType: 'fixed',      value: Number(manual.telephone) },
        bonus:             { calculationType: 'percentage', value: percentages.bonus,      percentageOf: 'basicSalary' },
        specialAllowance:  { calculationType: 'remaining',  value: 0,   percentageOf: 'grossSalary' },
      },
      employerContributions: {
        pf:    { calculationType: 'percentage', value: 12, percentageOf: 'basicSalary' },
        pt:    { calculationType: 'fixed', value: 200 },
        loan:  { calculationType: 'fixed', value: Number(manual.loan) },
        other: { calculationType: 'fixed', value: Number(manual.other) },
      },
    };
    try {
      if (templateId) {
        await payrollAPI.updateTemplate(templateId, payload);
      } else {
        const res = await payrollAPI.createTemplate(payload);
        setTemplateId(res.data?.data?._id);
      }
      toast.success('Salary master saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <FiRefreshCw className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Salary Master</h1>
          <p className="text-sm text-gray-500 mt-1">
            Global salary structure — enter CTC per employee and all components calculate automatically.
          </p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60">
          {saving ? <FiRefreshCw className="w-4 h-4 animate-spin" /> : <FiSave className="w-4 h-4" />}
          {saving ? 'Saving…' : 'Save Master'}
        </button>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left column */}
        <div className="lg:col-span-3 space-y-6">

          {/* GROSS EARNINGS */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-5 h-5 text-emerald-500 font-bold text-base flex items-center justify-center">₹</span>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Gross Earnings</h2>
            </div>
            <p className="text-xs text-gray-400 mb-4">Components that form the employee's gross pay</p>

            {isAdmin
              ? <PercentRow label="Basic Salary"               pctValue={percentages.basic}      onChange={setPct('basic')}      formulaOf="CTC"   value={c.basic} />
              : <AutoRow    label="Basic Salary"               formula={`${percentages.basic}% of CTC`}              value={c.basic} />}
            {isAdmin
              ? <PercentRow label="HRA (House Rent Allowance)" pctValue={percentages.hra}        onChange={setPct('hra')}        formulaOf="Basic" value={c.hra} />
              : <AutoRow    label="HRA (House Rent Allowance)" formula={`${percentages.hra}% of Basic`}             value={c.hra} />}
            <ManualRow label="Conveyance Allowance"       sublabel="Fixed — same for all employees" value={manual.conveyance}     onChange={setField('conveyance')} />
            <ManualRow label="Child Education Allowance"  sublabel="Fixed — same for all employees" value={manual.childEducation} onChange={setField('childEducation')} />
            {isAdmin
              ? <PercentRow label="Travelling Allowance (LTA)" pctValue={percentages.travelling} onChange={setPct('travelling')} formulaOf="Basic" value={c.travelling} />
              : <AutoRow    label="Travelling Allowance (LTA)" formula={`${percentages.travelling}% of Basic`}             value={c.travelling} />}
            <ManualRow label="Medical Allowance"          sublabel="Fixed — same for all employees" value={manual.medical}        onChange={setField('medical')} />
            <ManualRow label="Telephone / Internet"       sublabel="Fixed — same for all employees" value={manual.telephone}      onChange={setField('telephone')} />
            {isAdmin
              ? <PercentRow label="Bonus"                      pctValue={percentages.bonus}      onChange={setPct('bonus')}      formulaOf="Basic" value={c.bonus} />
              : <AutoRow    label="Bonus"                      formula={`${percentages.bonus}% of Basic`}              value={c.bonus} />}
            <SpecialAllowanceRow value={c.specialAllowance} />

            <div className="mt-4 flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-lg px-4 py-3">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total Gross Earnings</span>
              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">{fmt(c.grossTotal)}</span>
            </div>
          </div>

          {/* GROSS DEDUCTION */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-1">
              <FiMinusCircle className="w-5 h-5 text-red-500" />
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Gross Deduction</h2>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Employee PF + Employer PF + Professional Tax + Loan + Other
            </p>

            <AutoRow label="Employee PF" formula={pfFormula(c.basic)} value={c.employeePF} />
            <AutoRow label="Employer PF" formula={pfFormula(c.basic)} value={c.employerPF} />

            <AutoRow label="Professional Tax" formula="Fixed ₹200 per month" value={200} />

            <ManualRow label="Loan Deduction"   sublabel="Default monthly loan recovery" value={manual.loan}  onChange={setField('loan')} />
            <ManualRow label="Other Deductions" sublabel="Any other fixed monthly deduction" value={manual.other} onChange={setField('other')} />

            <div className="mt-4 flex items-center justify-between bg-red-50 dark:bg-red-900/10 rounded-lg px-4 py-3">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Gross Deduction (master)</span>
              <span className="text-base font-bold text-red-600 dark:text-red-400">{fmt(c.deductionsTotal)}</span>
            </div>
          </div>

          {/* OVERTIME */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-1">
              <FiClock className="w-5 h-5 text-primary-500" />
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Overtime Handling</h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Choose how overtime hours are compensated</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'salary', icon: null, title: 'Add to Salary',  desc: 'Overtime pay added to monthly salary' },
                { key: 'leave',  icon: FiClock,      title: 'Earned Leave',   desc: 'Overtime hours converted to earned leave' },
              ].map(({ key, icon: Icon, title, desc }) => (
                <button key={key} onClick={() => setOvertimeType(key)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center ${
                    overtimeType === key
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                  }`}>
                  {Icon
                    ? <Icon className={`w-6 h-6 ${overtimeType === key ? 'text-primary-600' : 'text-gray-400'}`} />
                    : <span className={`text-xl font-bold leading-none ${overtimeType === key ? 'text-primary-600' : 'text-gray-400'}`}>₹</span>
                  }
                  <span className={`text-sm font-medium ${overtimeType === key ? 'text-primary-700 dark:text-primary-300' : 'text-gray-600 dark:text-gray-400'}`}>{title}</span>
                  <span className="text-xs text-gray-400">{desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Live Preview */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sticky top-6">
            <div className="flex items-center gap-2 mb-4">
              <FiInfo className="w-5 h-5 text-primary-500" />
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Live Preview</h2>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Sample Monthly CTC (₹)</label>
              <input type="number" min="0" value={previewCTC}
                onChange={(e) => setPreviewCTC(Number(e.target.value) || 0)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">Change this to preview calculations for any CTC</p>
            </div>

            {/* Earnings */}
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-2">Gross Earnings</p>
            <div className="space-y-1.5 mb-3">
              {[
                ['Basic',             c.basic],
                ['HRA',               c.hra],
                ['Conveyance',        c.conveyance],
                ['Child Education',   c.childEdu],
                ['Travelling',        c.travelling],
                ['Medical',           c.medical],
                ['Telephone',         c.telephone],
                ['Bonus',             c.bonus],
                ['Special Allowance', c.specialAllowance],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400">
                  <span>{label}</span>
                  <span className="font-medium">{fmt(val)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-sm font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded px-2 py-1.5 mb-4">
              <span>Total Gross</span><span>{fmt(c.grossTotal)}</span>
            </div>

            {/* Gross Deduction */}
            <p className="text-xs font-semibold uppercase tracking-wide text-red-500 dark:text-red-400 mb-2">Gross Deduction</p>
            <div className="space-y-1.5 mb-3">
              {[
                ['Employee PF',      fmt(c.employeePF)],
                ['Employer PF',      fmt(c.employerPF)],
                ['Professional Tax', fmt(c.professionalTax)],
                ['Loan Deduction',   fmt(c.loan)],
                ['Other Deductions', fmt(c.other)],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                  <span>{label}</span>
                  <span className="font-medium text-red-500">− {val}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-sm font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 rounded px-2 py-1.5 mb-4">
              <span>Gross Deduction</span><span>{fmt(c.deductionsTotal)}</span>
            </div>

            {/* Net summary */}
            <div className="rounded-xl bg-primary-600 dark:bg-primary-700 px-4 py-4 text-white">
              <p className="text-xs font-medium opacity-80 mb-1">Gross Earnings − Gross Deduction = Net Salary</p>
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold">Net Salary</span>
                <span className="text-xl font-bold">{fmt(c.grossTotal - c.deductionsTotal)}</span>
              </div>
              <p className="text-xs opacity-70 mt-2">{fmt(c.grossTotal)} − {fmt(c.deductionsTotal)} = {fmt(c.grossTotal - c.deductionsTotal)}</p>
            </div>

            <div className="mt-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 dark:text-gray-400">
              Overtime: <span className="font-medium text-gray-700 dark:text-gray-300">
                {overtimeType === 'salary' ? 'Added to Salary' : 'Converted to Earned Leave'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalaryMaster;
