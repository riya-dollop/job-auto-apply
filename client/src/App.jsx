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
  EyeOff,
  MessageSquare,
  Send,
  Bot,
  User,
  Mail,
  Phone,
  Sparkles,
  Check,
  Inbox,
  MessageCircle,
  Copy,
  Plus,
  Trash2,
  Search,
  Calendar,
  Share2
} from 'lucide-react';

export default function App() {
  // Navigation Tab State: 'apply' | 'autoreply' | 'whatsapp'
  const [activeTab, setActiveTab] = useState('apply');

  // ==========================================
  // Form State (Auto Apply)
  // ==========================================
  const [keyword, setKeyword] = useState('MERN Stack Developer');
  const [location, setLocation] = useState('India');
  const [platform, setPlatform] = useState('both');
  const [resumePath, setResumePath] = useState('');
  const [headless, setHeadless] = useState(true);
  const [minDelay, setMinDelay] = useState(5);
  const [maxDelay, setMaxDelay] = useState(15);
  const [maxApps, setMaxApps] = useState(20);

  // Runtime State (Auto Apply)
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

  // ==========================================
  // Auto-Reply State
  // ==========================================
  const [autoReplyStatus, setAutoReplyStatus] = useState({
    isChecking: false,
    lastCheckedAt: null,
    currentAction: 'Auto-responder ready',
    totalReplied: 0
  });

  const [autoReplySettings, setAutoReplySettings] = useState({
    enabled: true,
    candidateName: 'Riya Tiwari',
    candidateEmail: 'riyatiwari2626@gmail.com',
    candidatePhone: '',
    platform: 'both',
    checkIntervalMinutes: 15,
    headless: false,
    replyTemplate: 'Hello, thank you for reaching out! I am actively looking for new opportunities and would love to connect. I am available for an interview or discussion at your convenience. You can also reach me directly at {phone} or {email}. Looking forward to hearing from you! Best regards, {candidateName}'
  });

  const [autoReplyHistory, setAutoReplyHistory] = useState([]);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [isTriggeringScan, setIsTriggeringScan] = useState(false);

  // ==========================================
  // WhatsApp HR Outreach State (Indore 47+)
  // ==========================================
  const [whatsappContacts, setWhatsappContacts] = useState([]);
  const [whatsappSearch, setWhatsappSearch] = useState('');
  const [whatsappFilter, setWhatsappFilter] = useState('all'); // 'all' | 'due' | 'sent'
  const [autoSendStatus, setAutoSendStatus] = useState({
    isRunning: false,
    currentIndex: 0,
    totalToProcess: 0,
    currentCompany: '',
    currentPhone: '',
    currentAction: 'Idle',
    successCount: 0,
    failedCount: 0
  });
  const [whatsappSettings, setWhatsappSettings] = useState({
    candidateName: 'Riya Tiwari',
    candidatePhone: '+91 97553 49572',
    candidateEmail: 'riyatiwari2626@gmail.com',
    portfolioUrl: '',
    githubUrl: '',
    cadenceDays: 15,
    autoSendEnabled: false,
    delaySeconds: 20,
    messageTemplate: 'Hello {contactPerson} / {company} Team,\n\nHope you are doing well!\n\nI am {candidateName}, a MERN Stack, Frontend & Full-Stack Developer based in Indore, actively looking for developer opportunities.\n\n💻 Core Technical Skills:\n• Frontend: React.js, Next.js, Redux Toolkit, Tailwind CSS, TypeScript\n• Backend: Node.js, Express.js, REST APIs\n• Database: MongoDB, PostgreSQL\n• Tools: Git, Postman, Docker\n\nIf your team at {company} has any openings for Frontend or MERN/Full-Stack Developers, I would love to share my resume and connect for a quick discussion.\n\n📞 Phone: {candidatePhone}\n✉️ Email: {candidateEmail}\n\nLooking forward to hearing from you. Thank you!\n\nBest regards,\n{candidateName}'
  });
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [newCompanyForm, setNewCompanyForm] = useState({
    company: '',
    contactPerson: '',
    phone: '',
    location: 'Indore',
    notes: ''
  });

  const logEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Polling runtime status, jobs, auto-reply & whatsapp data
  useEffect(() => {
    fetchStatus();
    fetchJobs();
    fetchAutoReplyStatus();
    fetchAutoReplySettings();
    fetchAutoReplyHistory();
    fetchWhatsAppContacts();
    fetchWhatsAppSettings();
    fetchAutoSendStatus();

    const interval = setInterval(() => {
      fetchStatus();
      fetchJobs();
      fetchAutoReplyStatus();
      fetchAutoReplyHistory();
      fetchAutoSendStatus();
    }, 2500);

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
    } catch (e) {}
  };

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/jobs');
      const json = await res.json();
      if (json.success && json.data) {
        setAppliedJobs(json.data);
      }
    } catch (e) {}
  };

  const fetchAutoReplyStatus = async () => {
    try {
      const res = await fetch('/api/auto-reply/status');
      const json = await res.json();
      if (json.success && json.data) {
        setAutoReplyStatus(json.data);
      }
    } catch (e) {}
  };

  const fetchAutoReplySettings = async () => {
    try {
      const res = await fetch('/api/auto-reply/settings');
      const json = await res.json();
      if (json.success && json.data) {
        setAutoReplySettings(prev => ({ ...prev, ...json.data }));
      }
    } catch (e) {}
  };

  const fetchAutoReplyHistory = async () => {
    try {
      const res = await fetch('/api/auto-reply/history');
      const json = await res.json();
      if (json.success && json.data) {
        setAutoReplyHistory(json.data);
      }
    } catch (e) {}
  };

  const fetchWhatsAppContacts = async () => {
    try {
      const res = await fetch('/api/whatsapp/contacts');
      const json = await res.json();
      if (json.success && json.data) {
        setWhatsappContacts(json.data);
      }
    } catch (e) {}
  };

  const fetchWhatsAppSettings = async () => {
    try {
      const res = await fetch('/api/whatsapp/settings');
      const json = await res.json();
      if (json.success && json.data) {
        setWhatsappSettings(prev => ({ ...prev, ...json.data }));
      }
    } catch (e) {}
  };

  const fetchAutoSendStatus = async () => {
    try {
      const res = await fetch('/api/whatsapp/auto-send/status');
      const json = await res.json();
      if (json.success && json.data) {
        setAutoSendStatus(json.data);
      }
    } catch (e) {}
  };

  const handleStartAutoSend = async () => {
    if (!window.confirm(`Start automatic WhatsApp dispatch to all ${dueContactsCount} Due Indore companies?`)) return;
    try {
      const res = await fetch('/api/whatsapp/auto-send/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delaySeconds: 15 })
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.message || 'Could not start dispatch');
      } else {
        fetchAutoSendStatus();
      }
    } catch (err) {
      alert('Error triggering auto-send');
    }
  };

  const handleStopAutoSend = async () => {
    try {
      await fetch('/api/whatsapp/auto-send/stop', { method: 'POST' });
      fetchAutoSendStatus();
    } catch (err) {}
  };

  const handleOpenWhatsAppQR = async () => {
    try {
      const res = await fetch('/api/whatsapp/login-qr', { method: 'POST' });
      const data = await res.json();
      alert(data.message || 'WhatsApp Web opened. Scan QR code on your phone once.');
    } catch (err) {
      alert('Error opening WhatsApp Web QR scan');
    }
  };

  // Start Job Application Automation
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

  // Save Auto-Reply Settings
  const handleSaveAutoReplySettings = async (e) => {
    if (e) e.preventDefault();
    setIsSavingSettings(true);
    try {
      const res = await fetch('/api/auto-reply/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(autoReplySettings)
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccessMsg('Settings saved successfully!');
        setTimeout(() => setSaveSuccessMsg(''), 3500);
      } else {
        alert(data.message || 'Failed to save settings');
      }
    } catch (err) {
      alert('Error saving auto-reply settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Trigger Immediate Auto-Reply Scan
  const handleTriggerAutoReplyScan = async () => {
    setIsTriggeringScan(true);
    try {
      const res = await fetch('/api/auto-reply/check-now', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchAutoReplyStatus();
      } else {
        alert(data.message || 'Scan could not be started');
      }
    } catch (err) {
      alert('Error triggering auto-reply scan');
    } finally {
      setIsTriggeringScan(false);
    }
  };

  // WhatsApp Mark Contact as Sent
  const handleMarkWhatsAppSent = async (contactId) => {
    try {
      const res = await fetch(`/api/whatsapp/mark-sent/${contactId}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchWhatsAppContacts();
      }
    } catch (err) {
      alert('Error marking as sent');
    }
  };

  // WhatsApp Reset All to Due
  const handleResetAllToDue = async () => {
    if (!window.confirm('Reset all 47+ companies to Due status for a fresh 15-day outreach round?')) return;
    try {
      const res = await fetch('/api/whatsapp/reset-due', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchWhatsAppContacts();
      }
    } catch (err) {
      alert('Error resetting status');
    }
  };

  // Save WhatsApp Outreach Settings
  const handleSaveWhatsAppSettings = async (e) => {
    if (e) e.preventDefault();
    try {
      const res = await fetch('/api/whatsapp/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(whatsappSettings)
      });
      const data = await res.json();
      if (data.success) {
        setShowSettingsDrawer(false);
        fetchWhatsAppContacts();
        alert('WhatsApp template & settings saved successfully!');
      }
    } catch (err) {
      alert('Error saving WhatsApp settings');
    }
  };

  // Add Company Contact
  const handleAddCompany = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/whatsapp/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCompanyForm)
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setNewCompanyForm({ company: '', contactPerson: '', phone: '', location: 'Indore', notes: '' });
        fetchWhatsAppContacts();
      }
    } catch (err) {
      alert('Error adding company contact');
    }
  };

  // Delete Company Contact
  const handleDeleteCompany = async (id, name) => {
    if (!window.confirm(`Delete ${name} from WhatsApp outreach list?`)) return;
    try {
      const res = await fetch(`/api/whatsapp/contacts/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchWhatsAppContacts();
      }
    } catch (err) {
      alert('Error deleting contact');
    }
  };

  // Copy Message to Clipboard
  const handleCopyMessage = (contact) => {
    navigator.clipboard.writeText(contact.generatedMessage);
    setCopiedId(contact.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Filtered jobs list
  const filteredJobs = appliedJobs.filter(job => {
    if (filterStatus === 'all') return true;
    return job.status === filterStatus;
  });

  const isRunning = status.status === 'running';

  // Filtered WhatsApp contacts
  const filteredWhatsAppContacts = whatsappContacts.filter(c => {
    const matchesFilter =
      whatsappFilter === 'all'
        ? true
        : whatsappFilter === 'due'
        ? c.status === 'due'
        : c.status === 'sent';

    const matchesSearch =
      c.company.toLowerCase().includes(whatsappSearch.toLowerCase()) ||
      c.phone.toLowerCase().includes(whatsappSearch.toLowerCase()) ||
      (c.contactPerson && c.contactPerson.toLowerCase().includes(whatsappSearch.toLowerCase()));

    return matchesFilter && matchesSearch;
  });

  const dueContactsCount = whatsappContacts.filter(c => c.status === 'due').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      {/* Top Header */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Job Auto-Apply & Outreach Engine
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  v3.0 Pro
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Indeed & Naukri Auto-Apply • Recruiter Auto-Reply • Indore 47+ IT WhatsApp Outreach
              </p>
            </div>
          </div>
        </div>

        {/* Sessions & Auto-Reply Badges */}
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

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <span className="text-slate-400 font-medium">WhatsApp Cadence:</span>
            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Every 15 Days
            </span>
          </div>
        </div>
      </header>

      {/* Primary Navigation Tabs */}
      <div className="max-w-7xl mx-auto mt-6 flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-slate-900/90 p-1 rounded-xl border border-slate-800 flex-wrap">
          {/* Tab 1 */}
          <button
            onClick={() => setActiveTab('apply')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'apply'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Auto-Apply Engine
          </button>

          {/* Tab 2 */}
          <button
            onClick={() => setActiveTab('autoreply')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition relative ${
              activeTab === 'autoreply'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            HR Auto-Reply & Inbox
            {autoReplyHistory.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-bold">
                {autoReplyHistory.length}
              </span>
            )}
          </button>

          {/* Tab 3: WhatsApp Outreach */}
          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition relative ${
              activeTab === 'whatsapp'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            WhatsApp HR Outreach (Indore 47+)
            {dueContactsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-400/20 text-emerald-300 font-extrabold border border-emerald-400/30 animate-pulse">
                {dueContactsCount} Due
              </span>
            )}
          </button>
        </div>

        {/* Global Live Status indicator */}
        <div className="text-xs text-slate-400 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              isRunning || autoReplyStatus.isChecking ? 'bg-emerald-400' : 'bg-slate-500'
            }`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              isRunning || autoReplyStatus.isChecking ? 'bg-emerald-500' : 'bg-slate-500'
            }`}></span>
          </span>
          <span>
            {isRunning
              ? 'Auto-Apply Running'
              : autoReplyStatus.isChecking
              ? 'Scanning Inbox...'
              : 'System Standby'}
          </span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: AUTO-APPLY ENGINE VIEW */}
      {/* ============================================================== */}
      {activeTab === 'apply' && (
        <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
          <section className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                Target Parameters
              </h2>

              <form onSubmit={handleStart} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Target Job Title / Keywords *
                  </label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      disabled={isRunning}
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      placeholder="e.g. MERN Stack Developer, React Developer"
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Job Location *
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      disabled={isRunning}
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. India, Remote, Bengaluru, Indore"
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Platform Mode
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['both', 'indeed', 'naukri'].map((p) => (
                      <button
                        type="button"
                        key={p}
                        disabled={isRunning}
                        onClick={() => setPlatform(p)}
                        className={`py-2 px-3 rounded-xl border text-xs font-medium capitalize transition ${
                          platform === p
                            ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Resume Document (PDF)
                  </label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          disabled={isRunning}
                          value={resumePath}
                          onChange={(e) => setResumePath(e.target.value)}
                          placeholder="assets/resume.pdf"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 truncate"
                        />
                      </div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="application/pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        disabled={isRunning || uploadingResume}
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs flex items-center gap-1.5 transition whitespace-nowrap"
                      >
                        <UploadCloud className="w-4 h-4" />
                        {uploadingResume ? 'Uploading...' : 'Upload'}
                      </button>
                    </div>
                    {uploadSuccess && (
                      <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {uploadSuccess}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-indigo-400" /> Min Delay
                    </label>
                    <input
                      type="number"
                      min="2"
                      max="30"
                      disabled={isRunning}
                      value={minDelay}
                      onChange={(e) => setMinDelay(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-center text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-indigo-400" /> Max Delay
                    </label>
                    <input
                      type="number"
                      min="3"
                      max="60"
                      disabled={isRunning}
                      value={maxDelay}
                      onChange={(e) => setMaxDelay(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-center text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Max Target
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

          <section className="lg:col-span-7 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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

              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
                <span className="text-[11px] text-rose-400 font-medium flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> Failed
                </span>
                <p className="mt-2 text-2xl font-bold text-rose-400">
                  {status.totalFailed}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">Requires manual</p>
              </div>

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

            <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex items-center gap-3">
              <RefreshCw className={`w-4 h-4 text-indigo-400 ${isRunning ? 'animate-spin' : ''}`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-400">Live Engine Action</p>
                <p className="text-sm font-medium text-slate-200 truncate">
                  {status.currentAction || 'Engine is idle'}
                </p>
              </div>
            </div>

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
      )}

      {/* ============================================================== */}
      {/* TAB 2: HR AUTO-REPLY & INBOX VIEW */}
      {/* ============================================================== */}
      {activeTab === 'autoreply' && (
        <main className="max-w-7xl mx-auto space-y-6 mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-indigo-400" />
                Auto-Responder
              </span>
              <div className="mt-3 flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full ${
                    autoReplyStatus.isChecking
                      ? 'bg-emerald-400 animate-ping'
                      : autoReplySettings.enabled
                      ? 'bg-indigo-400'
                      : 'bg-slate-500'
                  }`}
                />
                <span className="font-bold text-base text-white">
                  {autoReplyStatus.isChecking
                    ? 'Scanning Inbox...'
                    : autoReplySettings.enabled
                    ? 'Active (Scheduled)'
                    : 'Disabled'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Interval: every {autoReplySettings.checkIntervalMinutes || 15} mins
              </p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                <Send className="w-4 h-4" />
                Replies Sent
              </span>
              <p className="mt-2 text-3xl font-extrabold text-emerald-400">
                {autoReplyHistory.length}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                To recruiters & hiring managers
              </p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <span className="text-xs text-indigo-300 font-medium flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                Last Inbox Scan
              </span>
              <p className="mt-2 text-lg font-bold text-white">
                {autoReplyStatus.lastCheckedAt
                  ? new Date(autoReplyStatus.lastCheckedAt).toLocaleTimeString()
                  : 'Never'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {autoReplyStatus.lastCheckedAt
                  ? new Date(autoReplyStatus.lastCheckedAt).toLocaleDateString()
                  : 'Awaiting first run'}
              </p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
              <div>
                <span className="text-xs text-slate-400 font-medium">Manual Trigger</span>
                <p className="text-xs text-slate-300 mt-1">Check messages right now</p>
              </div>
              <button
                type="button"
                disabled={autoReplyStatus.isChecking || isTriggeringScan}
                onClick={handleTriggerAutoReplyScan}
                className="mt-3 w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium py-2.5 px-3 rounded-xl shadow-lg shadow-emerald-600/20 text-xs flex items-center justify-center gap-2 transition disabled:opacity-50 active:scale-[0.98]"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${autoReplyStatus.isChecking ? 'animate-spin' : ''}`} />
                {autoReplyStatus.isChecking ? 'Scanning Now...' : 'Check & Auto-Reply Now'}
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex items-center gap-3">
            <RefreshCw className={`w-4 h-4 text-emerald-400 ${autoReplyStatus.isChecking ? 'animate-spin' : ''}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-400">Auto-Responder Live Status</p>
              <p className="text-sm font-medium text-slate-200 truncate">
                {autoReplyStatus.currentAction || 'Engine is standing by'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Bot className="w-5 h-5 text-indigo-400" />
                  Auto-Reply Configuration
                </h2>

                <form onSubmit={handleSaveAutoReplySettings} className="space-y-4">
                  <div className="flex items-center justify-between p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl">
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <div>
                        <p className="text-xs font-semibold text-white">Enable Automated HR Replies</p>
                        <p className="text-[10px] text-slate-400">Automatically respond when companies or HR message</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAutoReplySettings(prev => ({ ...prev, enabled: !prev.enabled }))}
                      className={`w-11 h-6 rounded-full transition relative ${
                        autoReplySettings.enabled ? 'bg-emerald-600' : 'bg-slate-700'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition absolute top-1 ${
                          autoReplySettings.enabled ? 'right-1' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Your Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={autoReplySettings.candidateName || ''}
                        onChange={(e) => setAutoReplySettings(prev => ({ ...prev, candidateName: e.target.value }))}
                        placeholder="e.g. Riya Tiwari"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Contact Email
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="email"
                          value={autoReplySettings.candidateEmail || ''}
                          onChange={(e) => setAutoReplySettings(prev => ({ ...prev, candidateEmail: e.target.value }))}
                          placeholder="your.email@gmail.com"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Contact Phone
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          value={autoReplySettings.candidatePhone || ''}
                          onChange={(e) => setAutoReplySettings(prev => ({ ...prev, candidatePhone: e.target.value }))}
                          placeholder="+91 97553 49572"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Platform Target
                      </label>
                      <select
                        value={autoReplySettings.platform || 'both'}
                        onChange={(e) => setAutoReplySettings(prev => ({ ...prev, platform: e.target.value }))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 capitalize"
                      >
                        <option value="both">Both (Indeed + Naukri)</option>
                        <option value="indeed">Indeed Only</option>
                        <option value="naukri">Naukri Only</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Scan Interval
                      </label>
                      <select
                        value={autoReplySettings.checkIntervalMinutes || 15}
                        onChange={(e) => setAutoReplySettings(prev => ({ ...prev, checkIntervalMinutes: Number(e.target.value) }))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="10">Every 10 minutes</option>
                        <option value="15">Every 15 minutes</option>
                        <option value="30">Every 30 minutes</option>
                        <option value="60">Every 1 hour</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Auto-Reply Message Template
                    </label>
                    <textarea
                      rows={4}
                      value={autoReplySettings.replyTemplate || ''}
                      onChange={(e) => setAutoReplySettings(prev => ({ ...prev, replyTemplate: e.target.value }))}
                      placeholder="Write your professional auto-reply message..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed"
                    />
                  </div>

                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={isSavingSettings}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/20 text-xs flex items-center justify-center gap-2 transition active:scale-[0.98]"
                    >
                      <Check className="w-4 h-4" />
                      {isSavingSettings ? 'Saving...' : 'Save Configuration'}
                    </button>
                  </div>

                  {saveSuccessMsg && (
                    <p className="text-xs text-emerald-400 text-center font-medium">
                      ✓ {saveSuccessMsg}
                    </p>
                  )}
                </form>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-6">
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Inbox className="w-4 h-4 text-emerald-400" />
                      HR Conversations & Auto-Replies Log ({autoReplyHistory.length})
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Persistent history of recruiter messages replied by the system
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => { fetchAutoReplyHistory(); fetchAutoReplyStatus(); }}
                    className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white text-xs transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="mt-4 space-y-3 max-h-[520px] overflow-y-auto pr-1">
                  {autoReplyHistory.length === 0 ? (
                    <div className="text-center py-16 text-slate-500">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30 text-indigo-400" />
                      <p className="text-xs">No HR messages replied yet.</p>
                      <p className="text-[11px] text-slate-600 mt-1">
                        When a company or recruiter messages you on Indeed or Naukri, the bot will automatically reply and record the conversation here!
                      </p>
                    </div>
                  ) : (
                    autoReplyHistory.map((item) => (
                      <div
                        key={item.id}
                        className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2 hover:border-slate-700 transition"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white text-xs">{item.sender}</span>
                            <span className="text-[11px] text-slate-400">• {item.company}</span>
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-indigo-300 text-[10px] font-medium uppercase">
                              {item.platform}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Replied
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {new Date(item.timestamp).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {item.incomingMessage && (
                          <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 text-xs">
                            <span className="text-[10px] text-slate-400 block font-medium mb-0.5">
                              📩 Message from Recruiter:
                            </span>
                            <p className="text-slate-300 italic">"{item.incomingMessage}"</p>
                          </div>
                        )}

                        <div className="bg-indigo-950/20 p-2.5 rounded-lg border border-indigo-900/30 text-xs">
                          <span className="text-[10px] text-indigo-400 block font-medium mb-0.5 flex items-center gap-1">
                            <Bot className="w-3 h-3" /> Automated Reply Sent:
                          </span>
                          <p className="text-indigo-200">{item.replySent}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* ============================================================== */}
      {/* TAB 3: WHATSAPP HR OUTREACH (INDORE 47+) */}
      {/* ============================================================== */}
      {activeTab === 'whatsapp' && (
        <main className="max-w-7xl mx-auto space-y-6 mt-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {/* Total Companies */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-indigo-400" />
                Indore IT Companies
              </span>
              <p className="mt-2 text-3xl font-extrabold text-white">
                {whatsappContacts.length}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Indore & regional IT firms & HRs
              </p>
            </div>

            {/* Due for Outreach */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                Due for Outreach (Ready)
              </span>
              <p className="mt-2 text-3xl font-extrabold text-emerald-400">
                {dueContactsCount}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Ready for 15-day hiring inquiry message
              </p>
            </div>

            {/* Cadence Cycle */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <span className="text-xs text-blue-400 font-medium flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                Recurrence Cadence
              </span>
              <p className="mt-2 text-3xl font-extrabold text-blue-400">
                15 Days
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Automated follow-up scheduling
              </p>
            </div>

            {/* Quick Action Button */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
              <div>
                <span className="text-xs text-slate-400 font-medium">Batch Management</span>
                <p className="text-xs text-slate-300 mt-0.5">Start fresh 15-day round</p>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={handleResetAllToDue}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium py-2 px-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reset to Due
                </button>
                <button
                  type="button"
                  onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 px-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Template
                </button>
              </div>
            </div>
          </div>

          {/* Automated Auto-Sender Banner */}
          <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/40 border border-emerald-500/30 rounded-2xl p-5 shadow-xl">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                    Automated Auto-Sender
                  </span>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Bot className="w-4 h-4 text-emerald-400" />
                    Automatic WhatsApp Dispatcher (Zero manual typing)
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Automatically sends your customized MERN/Frontend pitch to all {dueContactsCount} Due companies with a safe 15s human delay.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleOpenWhatsAppQR}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl flex items-center gap-1.5 transition border border-slate-700"
                  title="Open browser to scan QR code once"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Scan WhatsApp QR
                </button>

                {!autoSendStatus.isRunning ? (
                  <button
                    type="button"
                    disabled={dueContactsCount === 0}
                    onClick={handleStartAutoSend}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition active:scale-[0.98] shadow-lg shadow-emerald-600/30 disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Start Auto-Send to All ({dueContactsCount})
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStopAutoSend}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition active:scale-[0.98] shadow-lg shadow-rose-600/30"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    Stop Auto-Send
                  </button>
                )}
              </div>
            </div>

            {/* Live Progress Bar when running */}
            {autoSendStatus.isRunning && (
              <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-300 font-medium flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    {autoSendStatus.currentAction}
                  </span>
                  <span className="font-mono text-slate-300 font-bold">
                    {autoSendStatus.currentIndex} / {autoSendStatus.totalToProcess}
                  </span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className="bg-emerald-500 h-2 transition-all duration-300"
                    style={{ width: `${Math.round((autoSendStatus.currentIndex / (autoSendStatus.totalToProcess || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Collapsible Template Settings Drawer */}
          {showSettingsDrawer && (
            <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur transition-all">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  Customize MERN & Frontend WhatsApp Template
                </h3>
                <button
                  type="button"
                  onClick={() => setShowSettingsDrawer(false)}
                  className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-lg bg-slate-800"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleSaveWhatsAppSettings} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Candidate Name
                    </label>
                    <input
                      type="text"
                      value={whatsappSettings.candidateName || ''}
                      onChange={(e) => setWhatsappSettings(prev => ({ ...prev, candidateName: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Phone (WhatsApp)
                    </label>
                    <input
                      type="text"
                      value={whatsappSettings.candidatePhone || ''}
                      onChange={(e) => setWhatsappSettings(prev => ({ ...prev, candidatePhone: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={whatsappSettings.candidateEmail || ''}
                      onChange={(e) => setWhatsappSettings(prev => ({ ...prev, candidateEmail: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    WhatsApp Message Template (Sent every 15 days for MERN / Frontend / Full-Stack hiring)
                  </label>
                  <textarea
                    rows={6}
                    value={whatsappSettings.messageTemplate || ''}
                    onChange={(e) => setWhatsappSettings(prev => ({ ...prev, messageTemplate: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white leading-relaxed font-sans"
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {['{company}', '{contactPerson}', '{candidateName}', '{candidatePhone}', '{candidateEmail}'].map(tag => (
                      <span key={tag} className="text-[10px] font-mono bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-indigo-400">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSettingsDrawer(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow-lg shadow-emerald-600/25 flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    Save Template
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Search, Filter & Actions Bar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={whatsappSearch}
                onChange={(e) => setWhatsappSearch(e.target.value)}
                placeholder="Search company, HR name, phone..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Filter Tabs & Add Button */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end flex-wrap">
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setWhatsappFilter('all')}
                  className={`px-3 py-1 rounded-lg transition ${
                    whatsappFilter === 'all'
                      ? 'bg-slate-800 text-white font-medium'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All ({whatsappContacts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setWhatsappFilter('due')}
                  className={`px-3 py-1 rounded-lg transition flex items-center gap-1 ${
                    whatsappFilter === 'due'
                      ? 'bg-emerald-600 text-white font-medium'
                      : 'text-emerald-400 hover:text-emerald-300'
                  }`}
                >
                  Due for Outreach ({dueContactsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setWhatsappFilter('sent')}
                  className={`px-3 py-1 rounded-lg transition ${
                    whatsappFilter === 'sent'
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Contacted Recently
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-xl flex items-center gap-1.5 transition active:scale-[0.98] shadow-lg shadow-emerald-600/20"
              >
                <Plus className="w-4 h-4" />
                Add Company
              </button>
            </div>
          </div>

          {/* Companies Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 sticky top-0 uppercase text-[10px] tracking-wider border-b border-slate-800 z-10">
                  <tr>
                    <th className="py-3 px-4">Company Name & Info</th>
                    <th className="py-3 px-4">Contact / HR</th>
                    <th className="py-3 px-4">Phone Number</th>
                    <th className="py-3 px-4">15-Day Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredWhatsAppContacts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-slate-500">
                        No companies found matching search or filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredWhatsAppContacts.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-950/40 transition">
                        {/* Company Name & Location */}
                        <td className="py-3 px-4">
                          <p className="font-semibold text-white text-xs flex items-center gap-1.5">
                            {c.company}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-500" />
                              {c.location || 'Indore'}
                            </span>
                            {c.notes && (
                              <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-slate-400 truncate max-w-xs">
                                {c.notes}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Contact Person */}
                        <td className="py-3 px-4">
                          <span className="text-slate-200 font-medium">
                            {c.contactPerson || 'HR / Hiring Team'}
                          </span>
                        </td>

                        {/* Phone Number */}
                        <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">
                          {c.phone}
                        </td>

                        {/* Status / 15-Day Cadence */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {c.status === 'due' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-max">
                              <CheckCircle2 className="w-3 h-3" /> Due for Outreach
                            </span>
                          ) : (
                            <div>
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1 w-max">
                                <Clock className="w-3 h-3" /> Contacted ({c.daysSinceLastSent || 0}d ago)
                              </span>
                              <span className="text-[10px] text-slate-500 block mt-0.5">
                                Next follow-up in {c.daysUntilNext} days
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            {/* Send WhatsApp (Web / App) */}
                            <a
                              href={c.webWaLink}
                              target="_blank"
                              rel="noreferrer"
                              onClick={() => handleMarkWhatsAppSent(c.id)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white font-medium text-[11px] flex items-center gap-1.5 transition active:scale-[0.98] shadow-sm shadow-emerald-600/30"
                              title="Open in WhatsApp Web & auto-set 15 days reminder"
                            >
                              <MessageCircle className="w-3.5 h-3.5 fill-current" />
                              Send WhatsApp
                            </a>

                            {/* Copy Message */}
                            <button
                              type="button"
                              onClick={() => handleCopyMessage(c)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                              title="Copy customized hiring message"
                            >
                              {copiedId === c.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* Mark as Sent (without opening) */}
                            {c.status === 'due' && (
                              <button
                                type="button"
                                onClick={() => handleMarkWhatsAppSent(c.id)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 text-[10px] font-medium transition"
                                title="Mark contacted manually"
                              >
                                Mark Sent
                              </button>
                            )}

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => handleDeleteCompany(c.id, c.company)}
                              className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition"
                              title="Delete from list"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Company Modal */}
          {showAddModal && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <Plus className="w-4 h-4 text-emerald-400" />
                    Add New Indore Company Contact
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleAddCompany} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newCompanyForm.company}
                      onChange={(e) => setNewCompanyForm({ ...newCompanyForm, company: e.target.value })}
                      placeholder="e.g. InfoBeans, Yash Technologies"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Contact Person / HR Name
                    </label>
                    <input
                      type="text"
                      value={newCompanyForm.contactPerson}
                      onChange={(e) => setNewCompanyForm({ ...newCompanyForm, contactPerson: e.target.value })}
                      placeholder="e.g. Priya Sharma (HR)"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      WhatsApp Phone Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={newCompanyForm.phone}
                      onChange={(e) => setNewCompanyForm({ ...newCompanyForm, phone: e.target.value })}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Location / Notes
                    </label>
                    <input
                      type="text"
                      value={newCompanyForm.notes}
                      onChange={(e) => setNewCompanyForm({ ...newCompanyForm, notes: e.target.value })}
                      placeholder="e.g. Vijay Nagar, Crystal IT Park"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium"
                    >
                      Add Company
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      )}
    </div>
  );
}
