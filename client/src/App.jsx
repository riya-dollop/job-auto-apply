import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Square,
  RefreshCw,
  Briefcase,
  MapPin,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Layers,
  ShieldCheck,
  ShieldAlert,
  Terminal,
  UploadCloud,
  Eye,
  EyeOff
} from 'lucide-react';

export default function App() {
  // Form State
  const [keyword, setKeyword] = useState('MERN Stack Developer');
  const [location, setLocation] = useState('India');
  const [platform, setPlatform] = useState('both');
  const [resumePath, setResumePath] = useState('');
  const [headless, setHeadless] = useState(false);
  const [minDelay, setMinDelay] = useState(5);
  const [maxDelay, setMaxDelay] = useState(15);
  const [maxApps, setMaxApps] = useState(20);

  // Runtime State
  const [status, setStatus] = useState({
    status: 'idle',
    currentPlatform: null,
    currentAction: 'System is ready',
    totalApplied: 0,
    totalFailed: 0,
    totalSkipped: 0,
    totalRecords: 0,
    recentLogs: [],
    cookiesStatus: { indeed: false, naukri: false }
  });

  const [appliedJobs, setAppliedJobs] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');

  const logEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Polling runtime status and jobs
  useEffect(() => {
    fetchStatus();
    fetchJobs();

    const interval = setInterval(() => {
      fetchStatus();
      fetchJobs();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [status.recentLogs]);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status');
      const json = await res.json();
      if (json.success && json.data) {
        setStatus(json.data);
      }
    } catch (e) {
      // Backend may be starting up
    }
  };

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/jobs');
      const json = await res.json();
      if (json.success && json.data) {
        setAppliedJobs(json.data);
      }
    } catch (e) {
      // Backend may be starting up
    }
  };

  // Start Automation
  const handleStart = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword,
          location,
          platform,
          resumePath,
          headless,
          minDelay: minDelay * 1000,
          maxDelay: maxDelay * 1000,
          maxApplications: maxApps
        })
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.message || 'Failed to start automation');
      } else {
        fetchStatus();
      }
    } catch (err) {
      alert('Network error connecting to automation server');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stop Automation
  const handleStop = async () => {
    try {
      await fetch('/api/stop', { method: 'POST' });
      fetchStatus();
    } catch (err) {
      console.error(err);
    }
  };

  // Upload Resume
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingResume(true);
    const formData = new FormData();
    formData.append('resume', file);

    try {
      const res = await fetch('/api/upload-resume', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success && data.filePath) {
        setResumePath(data.filePath);
        setUploadSuccess(`Uploaded: ${data.filename}`);
        setTimeout(() => setUploadSuccess(''), 4000);
      }
    } catch (err) {
      alert('Failed to upload resume');
    } finally {
      setUploadingResume(false);
    }
  };

  // Filtered jobs list
  const filteredJobs = appliedJobs.filter(job => {
    if (filterStatus === 'all') return true;
    return job.status === filterStatus;
  });

  const isRunning = status.status === 'running';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      {/* Top Navigation */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Job Auto-Apply Engine
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  v2.0 Stealth
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Automated multi-platform application engine for Indeed & Naukri.com
              </p>
            </div>
          </div>
        </div>

        {/* Badges & Cookie indicators */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <span className="text-slate-400 font-medium">Indeed Session:</span>
            {status.cookiesStatus?.indeed ? (
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" /> Saved
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-400">
                <ShieldAlert className="w-3.5 h-3.5" /> No Cookies
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <span className="text-slate-400 font-medium">Naukri Session:</span>
            {status.cookiesStatus?.naukri ? (
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" /> Saved
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-400">
                <ShieldAlert className="w-3.5 h-3.5" /> No Cookies
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        
        {/* Left Form: Search Configuration (5 cols) */}
        <section className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              Target Parameters
            </h2>

            <form onSubmit={handleStart} className="space-y-4">
              {/* Job Title / Keywords */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Target Job Title / Keywords *
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    disabled={isRunning}
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="e.g. MERN Stack Developer, React Node"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Location / City *
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    disabled={isRunning}
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. India, Bengaluru, Remote"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Platform Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Target Platform
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'both', label: 'All (Both)' },
                    { id: 'indeed', label: 'Indeed' },
                    { id: 'naukri', label: 'Naukri' }
                  ].map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      disabled={isRunning}
                      onClick={() => setPlatform(p.id)}
                      className={`py-2 text-xs font-medium rounded-xl border transition ${
                        platform === p.id
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resume Path & Direct Upload */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-slate-300">
                    Resume Path (.pdf)
                  </label>
                  <button
                    type="button"
                    disabled={isRunning || uploadingResume}
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    {uploadingResume ? 'Uploading...' : 'Upload File'}
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>
                <div className="relative">
                  <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    disabled={isRunning}
                    value={resumePath}
                    onChange={(e) => setResumePath(e.target.value)}
                    placeholder="assets/resume.pdf (or absolute path)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition disabled:opacity-50"
                  />
                </div>
                {uploadSuccess && (
                  <p className="text-xs text-emerald-400 mt-1">{uploadSuccess}</p>
                )}
              </div>

              {/* Delay Controls & Limit */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Human Delay Range
                  </label>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <input
                      type="number"
                      min="3"
                      max="30"
                      disabled={isRunning}
                      value={minDelay}
                      onChange={(e) => setMinDelay(Number(e.target.value))}
                      className="w-16 bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-center"
                    />
                    <span>to</span>
                    <input
                      type="number"
                      min="5"
                      max="60"
                      disabled={isRunning}
                      value={maxDelay}
                      onChange={(e) => setMaxDelay(Number(e.target.value))}
                      className="w-16 bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-center"
                    />
                    <span>sec</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Max Applications
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    disabled={isRunning}
                    value={maxApps}
                    onChange={(e) => setMaxApps(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-center text-xs"
                  />
                </div>
              </div>

              {/* Headless Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                <div className="flex items-center gap-2">
                  {headless ? <EyeOff className="w-4 h-4 text-slate-400" /> : <Eye className="w-4 h-4 text-indigo-400" />}
                  <div>
                    <p className="text-xs font-medium text-slate-200">Visible Browser Window</p>
                    <p className="text-[10px] text-slate-400">Inspect live automation clicks in real-time</p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isRunning}
                  onClick={() => setHeadless(!headless)}
                  className={`w-11 h-6 rounded-full transition relative ${
                    !headless ? 'bg-indigo-600' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition absolute top-1 ${
                      !headless ? 'right-1' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex gap-3">
                {!isRunning ? (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition active:scale-[0.98]"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    Start Auto-Apply
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStop}
                    className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-medium py-3 px-4 rounded-xl shadow-lg shadow-rose-600/25 flex items-center justify-center gap-2 transition active:scale-[0.98]"
                  >
                    <Square className="w-4 h-4 fill-white" />
                    Stop Automation
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Quick Cookie Capturing Instructions Helper */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 text-xs text-slate-400 space-y-2">
            <h3 className="font-semibold text-slate-200 flex items-center gap-1.5">
              💡 One-Time Session Capture
            </h3>
            <p>
              Run this in your PowerShell terminal to log in once and save cookies:
            </p>
            <div className="bg-slate-950 p-2.5 rounded-lg font-mono text-[11px] text-indigo-300 select-all border border-slate-800">
              npm run save-cookies:indeed
            </div>
            <div className="bg-slate-950 p-2.5 rounded-lg font-mono text-[11px] text-indigo-300 select-all border border-slate-800">
              npm run save-cookies:naukri
            </div>
          </div>
        </section>

        {/* Right Section: Live Stats, Logs & History (7 cols) */}
        <section className="lg:col-span-7 space-y-6">
          
          {/* Status Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Status card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
              <span className="text-[11px] text-slate-400 font-medium">Status</span>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isRunning ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
                  }`}
                />
                <span className="font-bold text-sm text-white capitalize">
                  {status.status}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 truncate">
                {status.currentPlatform ? `Platform: ${status.currentPlatform}` : 'Standing by'}
              </p>
            </div>

            {/* Applied Count */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
              <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Applied
              </span>
              <p className="mt-2 text-2xl font-bold text-emerald-400">
                {status.totalApplied}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                Total in DB: {status.totalRecords}
              </p>
            </div>

            {/* Failed Count */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
              <span className="text-[11px] text-rose-400 font-medium flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> Failed
              </span>
              <p className="mt-2 text-2xl font-bold text-rose-400">
                {status.totalFailed}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Requires manual</p>
            </div>

            {/* Skipped / Duplicates */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
              <span className="text-[11px] text-amber-400 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Skipped
              </span>
              <p className="mt-2 text-2xl font-bold text-amber-400">
                {status.totalSkipped}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Duplicates / Tests</p>
            </div>
          </div>

          {/* Current Live Engine Action Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex items-center gap-3">
            <RefreshCw className={`w-4 h-4 text-indigo-400 ${isRunning ? 'animate-spin' : ''}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-400">Live Engine Action</p>
              <p className="text-sm font-medium text-slate-200 truncate">
                {status.currentAction || 'Engine is idle'}
              </p>
            </div>
          </div>

          {/* Live Activity Terminal Feed */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Live Engine Logs
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                {status.recentLogs?.length || 0} events
              </span>
            </div>

            <div className="mt-3 h-48 overflow-y-auto space-y-1.5 font-mono text-xs pr-2">
              {(!status.recentLogs || status.recentLogs.length === 0) ? (
                <div className="text-center py-12 text-slate-500">
                  No activity logs yet. Click "Start Auto-Apply" to launch engine.
                </div>
              ) : (
                status.recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-2 py-1 px-2 rounded hover:bg-slate-950/40 text-[11px] leading-relaxed"
                  >
                    <span className="text-slate-500 select-none">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span
                      className={`font-semibold px-1.5 py-0.2 rounded text-[10px] uppercase ${
                        log.level === 'success'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : log.level === 'error'
                          ? 'bg-rose-500/20 text-rose-400'
                          : log.level === 'warning'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}
                    >
                      {log.level}
                    </span>
                    <span className="text-indigo-400 text-[10px]">[{log.platform}]</span>
                    <span className="text-slate-200 flex-1 break-all">{log.message}</span>
                  </div>
                ))
              )}
              <div ref={logEndRef} />
            </div>
          </div>

          {/* Applied Jobs History Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Application Log ({filteredJobs.length})
                </h3>
                <p className="text-[11px] text-slate-400">
                  Tracked and saved to applied_jobs.json
                </p>
              </div>

              {/* Filter tabs */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                {['all', 'applied', 'skipped', 'failed'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    className={`px-2.5 py-1 rounded capitalize transition ${
                      filterStatus === st
                        ? 'bg-indigo-600 text-white font-medium'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 overflow-x-auto max-h-72">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 sticky top-0 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Role / Company</th>
                    <th className="py-2.5 px-3">Platform</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-right">Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredJobs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-500">
                        No job applications recorded yet.
                      </td>
                    </tr>
                  ) : (
                    filteredJobs.map((job) => (
                      <tr key={job.id} className="hover:bg-slate-950/40 transition">
                        <td className="py-2.5 px-3">
                          <p className="font-semibold text-white">{job.title}</p>
                          <p className="text-[11px] text-slate-400">{job.company} • {job.location}</p>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-medium">
                            {job.platform}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                              job.status === 'applied'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : job.status === 'skipped'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {job.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-400 whitespace-nowrap">
                          {new Date(job.appliedAt).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {job.url ? (
                            <a
                              href={job.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-xs"
                            >
                              View <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </section>
      </main>
    </div>
  );
}

