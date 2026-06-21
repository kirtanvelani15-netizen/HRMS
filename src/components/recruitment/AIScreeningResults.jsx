import { useState } from 'react';
import { FiCheckCircle, FiAlertTriangle, FiUserPlus, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { recruitmentAPI } from '../../services/api';

const PAGE_SIZE = 20;

const RECOMMENDATION_LABELS = {
  strong_yes: { label: 'Strong Yes', cls: 'bg-emerald-100 text-emerald-800' },
  yes: { label: 'Yes', cls: 'bg-green-100 text-green-700' },
  maybe: { label: 'Maybe', cls: 'bg-amber-100 text-amber-700' },
  no: { label: 'No', cls: 'bg-red-100 text-red-700' },
};

const scoreBorder = (score) => {
  if (score >= 75) return 'border-l-4 border-emerald-500';
  if (score >= 50) return 'border-l-4 border-amber-400';
  return 'border-l-4 border-red-400';
};

const scoreColor = (score) => {
  if (score >= 75) return 'text-emerald-600';
  if (score >= 50) return 'text-amber-600';
  return 'text-red-500';
};

const AIScreeningResults = ({ results, jobPostingId, onApplicantAdded }) => {
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(null);

  const totalPages = Math.ceil(results.length / PAGE_SIZE);
  const paged = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleAddApplicant = async (candidate) => {
    if (!jobPostingId) {
      toast.error('Select a job posting first to add applicants');
      return;
    }
    setAdding(candidate.rank);
    try {
      await recruitmentAPI.createApplicant({
        name: candidate.candidateName,
        email: `candidate-${candidate.rank}@pending.com`,
        jobPosting: jobPostingId,
        stage: 'applied',
        notes: `AI Score: ${candidate.overallScore}/100 | ${candidate.recommendation?.replace('_', ' ')}\n\n${candidate.summary}`,
      });
      toast.success(`${candidate.candidateName} added to applicants`);
      if (onApplicantAdded) onApplicantAdded();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add applicant');
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{results.length} candidates ranked</p>
        {totalPages > 1 && (
          <div className="flex items-center gap-2 text-sm">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"><FiChevronLeft className="w-4 h-4" /></button>
            <span className="text-gray-600">Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"><FiChevronRight className="w-4 h-4" /></button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {paged.map((candidate) => {
          const rec = RECOMMENDATION_LABELS[candidate.recommendation] || RECOMMENDATION_LABELS.maybe;
          return (
            <div key={candidate.rank} className={`card p-5 ${scoreBorder(candidate.overallScore)}`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-700 shrink-0">
                    #{candidate.rank}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{candidate.candidateName}</h3>
                    {candidate.filename && <p className="text-xs text-gray-400">{candidate.filename}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`text-2xl font-bold ${scoreColor(candidate.overallScore)}`}>{candidate.overallScore}<span className="text-sm font-normal text-gray-400">/100</span></span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${rec.cls}`}>{rec.label}</span>
                  <button
                    onClick={() => handleAddApplicant(candidate)}
                    disabled={adding === candidate.rank}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                  >
                    <FiUserPlus className="w-3.5 h-3.5" />
                    {adding === candidate.rank ? 'Adding...' : 'Add to Applicants'}
                  </button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-1.5 text-gray-600">
                  <span className="text-gray-400">Skill Match</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{candidate.skillMatchPercent}%</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-600">
                  <span className="text-gray-400">Experience</span>
                  <span className={`font-medium capitalize ${candidate.experienceFit === 'strong' ? 'text-emerald-600' : candidate.experienceFit === 'good' ? 'text-amber-600' : 'text-red-500'}`}>
                    {candidate.experienceFit}
                  </span>
                </div>
              </div>

              <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{candidate.summary}</p>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {candidate.strengths?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Strengths</p>
                    <ul className="space-y-1">
                      {candidate.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                          <FiCheckCircle className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />{s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {candidate.redFlags?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Red Flags</p>
                    <ul className="space-y-1">
                      {candidate.redFlags.map((f, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                          <FiAlertTriangle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />{f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm pt-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"><FiChevronLeft className="w-4 h-4" /></button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded text-sm ${page === p ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100 text-gray-600'}`}>{p}</button>
          ))}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"><FiChevronRight className="w-4 h-4" /></button>
        </div>
      )}
    </div>
  );
};

export default AIScreeningResults;
