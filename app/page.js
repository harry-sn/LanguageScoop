'use client';
// Build Cache Buster: 2026-07-23T18:12:30+05:30

import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { toast, Toaster } from 'sonner';
import {
  LayoutDashboard, Users, CalendarDays, ClipboardList, BookOpen, IndianRupee,
  Video, MapPin, Copy, LogOut, Plus, GraduationCap, Clock,
  CheckCircle2, XCircle, AlertCircle, Sparkles, Check, Home, Send,
  Brain, Wallet, ChevronLeft, ChevronRight, Download, Upload, Printer, Trash2, X, MoreHorizontal,
  Bell, BellOff, Paperclip, FileText, Image as ImageIcon, Music, Lock, Globe, Eye, EyeOff, Pencil,
  Smartphone, Volume2
} from 'lucide-react';

const API = '/api';

async function api(path, opts = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('cf_token') : null;
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...opts, headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'India (IST - UTC+5:30)' },
  { value: 'Europe/Paris', label: 'France / EU (CEST/CET - UTC+2/+1)' },
  { value: 'Europe/London', label: 'UK (BST/GMT - UTC+1/+0)' },
  { value: 'America/New_York', label: 'US East (EDT/EST - UTC-4/-5)' },
  { value: 'America/Chicago', label: 'US Central (CDT/CST - UTC-5/-6)' },
  { value: 'America/Denver', label: 'US Mountain (MDT/MST - UTC-6/-7)' },
  { value: 'America/Los_Angeles', label: 'US West (PDT/PST - UTC-7/-8)' },
  { value: 'Asia/Dubai', label: 'UAE (GST - UTC+4)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT - UTC+8)' },
  { value: 'Australia/Sydney', label: 'Australia East (AEST - UTC+10)' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
];

const getBrowserTimezone = () => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'; } catch (e) { return 'Asia/Kolkata'; }
};

const fmtTime = (iso, timeZone = null) => {
  if (!iso) return '';
  const tz = timeZone || getBrowserTimezone();
  try {
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz });
  } catch (e) {
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
};

const fmtDate = (iso, timeZone = null) => {
  if (!iso) return '';
  const tz = timeZone || getBrowserTimezone();
  try {
    return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', timeZone: tz });
  } catch (e) {
    return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
  }
};

const fmtDateLong = (iso, timeZone = null) => {
  if (!iso) return '';
  const tz = timeZone || getBrowserTimezone();
  try {
    return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: tz });
  } catch (e) {
    return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
};

function localTimeToUtcIso(dateStr, timeStr, timeZone) {
  if (!dateStr || !timeStr) return new Date().toISOString();
  const tz = timeZone || getBrowserTimezone();
  const dummy = new Date(dateStr + 'T' + timeStr + ':00Z');
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    });
    const parts = formatter.formatToParts(dummy);
    const p = {};
    parts.forEach(({ type, value }) => { p[type] = value; });
    let hour = parseInt(p.hour, 10);
    if (hour === 24) hour = 0;
    const tzDate = new Date(Date.UTC(p.year, p.month - 1, p.day, hour, p.minute, p.second));
    const offsetMs = dummy.getTime() - tzDate.getTime();
    return new Date(dummy.getTime() + offsetMs).toISOString();
  } catch (e) {
    return new Date(dateStr + 'T' + timeStr).toISOString();
  }
}

const fmtMoney = (n) => `₹${(n || 0).toLocaleString('en-IN')}`;
const initials = (name = '') => name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase();

function PasswordInput({ value, onChange, placeholder = '••••••••', disabled, className, ...props }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`pr-10 ${className || ''}`}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
        tabIndex={-1}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function useCountdown(targetIso) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!targetIso) return null;
  const diff = new Date(targetIso).getTime() - now;
  if (diff <= 0) return 'Now';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (h > 24) return `in ${Math.floor(h/24)}d ${h%24}h`;
  if (h > 0) return `in ${h}h ${m}m`;
  if (m > 0) return `in ${m}m ${s}s`;
  return `in ${s}s`;
}

// -------- Landing Page --------
// -------- Bell Ringtone & Push Notification Helpers --------
function playBellRingtone() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Play 3 bell chime tones in sequence (Ding-Dong-Ding)
    const tones = [
      { freq: 880, start: 0, duration: 0.8 },       // A5 chime
      { freq: 1108.73, start: 0.35, duration: 0.8 }, // C#6 chime
      { freq: 1318.51, start: 0.7, duration: 1.2 }   // E6 chime
    ];

    tones.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);

      // Metallic Bell envelope: quick attack, exponential decay
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.7, ctx.currentTime + start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    });

    if ('vibrate' in navigator) {
      navigator.vibrate([500, 250, 500, 250, 800]);
    }
  } catch (e) {
    console.warn('Audio play error:', e);
  }
}

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
};

function NotificationButton() {
  const [status, setStatus] = useState('idle'); // idle | enabled | denied | unsupported
  const [loading, setLoading] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported'); return;
    }
    if (Notification.permission === 'denied') {
      setStatus('denied');
    }
    api('/push/status').then(d => {
      if (d.enabled) {
        setStatus('enabled');
      } else {
        // Show automatic setup prompt popup if not dismissed in session
        if (!sessionStorage.getItem('notif_prompt_dismissed') && Notification.permission !== 'granted') {
          setTimeout(() => setShowPromptModal(true), 1500);
        }
      }
    }).catch(() => {});
  }, []);

  const enable = async () => {
    setLoading(true);
    try {
      // 1. Request notification permission directly first
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        toast.error('Notification permission blocked by browser/phone settings.');
        setStatus('denied');
        setShowPromptModal(false);
        setShowGuide(true);
        return;
      }

      // 2. Register or fetch Service Worker
      let reg = await navigator.serviceWorker.getRegistration('/sw.js');
      if (!reg) {
        reg = await navigator.serviceWorker.register('/sw.js');
      }

      const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BGzKxr10ebrzCPYpglx2VL5fDjZa3D-K7YVOos3QODL88qI0kbG6sAftUie1DbOOe5Cewh0xuyHl0avHDDyF5rE';
      
      let subscription = await reg.pushManager.getSubscription();
      if (!subscription) {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapid),
        });
      }

      await api('/push/subscribe', { method: 'POST', body: { subscription } });
      setStatus('enabled');
      setShowPromptModal(false);
      setShowGuide(false);
      playBellRingtone();
      toast.success('🔔 15-Minute Class Alerts & Ringtone Enabled!');
    } catch (e) {
      console.error('Push enable error:', e);
      toast.error(e.message || 'Failed to enable notifications');
      setShowPromptModal(false);
      setShowGuide(true);
    } finally { setLoading(false); }
  };

  const disable = async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await api('/push/unsubscribe', { method: 'POST', body: { endpoint: sub.endpoint } });
        await sub.unsubscribe();
      }
      setStatus('idle');
      toast.success('Notifications disabled');
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  };

  const testPush = async () => {
    try {
      playBellRingtone();
      await api('/push/test', { method: 'POST' });
      toast.success('🔔 Test push & bell sent! Check your phone.');
    } catch (e) { toast.error(e.message); }
  };

  if (status === 'unsupported') return null;

  return (
    <>
      <div className="flex items-center gap-1">
        {status === 'enabled' ? (
          <>
            <Button size="sm" variant="outline" onClick={testPush} className="gap-1.5 text-xs bg-emerald-50 text-emerald-800 border-emerald-300">
              <Bell className="w-3.5 h-3.5 text-emerald-600 animate-pulse" /> 15m Bell On
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setShowGuide(true)} title="Android Notification Settings Guide">
              <Smartphone className="w-4 h-4 text-blue-600" />
            </Button>
            <Button size="icon" variant="ghost" onClick={disable} disabled={loading} title="Disable notifications">
              <BellOff className="w-4 h-4 text-slate-400" />
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setShowPromptModal(true)} disabled={loading} className="gap-1.5 text-xs bg-amber-50 text-amber-900 border-amber-300 font-medium">
            <Bell className="w-3.5 h-3.5 text-amber-600 animate-bounce" />
            {status === 'denied' ? 'Alerts Blocked 📲' : 'Enable 15m Bell 🔔'}
          </Button>
        )}
      </div>

      {/* Automatic Setup Prompt Popup Modal */}
      <Dialog open={showPromptModal} onOpenChange={(open) => {
        setShowPromptModal(open);
        if (!open) sessionStorage.setItem('notif_prompt_dismissed', '1');
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Bell className="w-5 h-5 text-amber-500 animate-bounce" /> Enable Class Alarm Bell 🔔
            </DialogTitle>
            <DialogDescription className="text-sm">
              Never miss a class! Get automatic 15-minute pre-class push notifications and loud school bell ringtones on your Android phone and browser.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-1.5 text-xs text-amber-900">
              <div className="font-semibold flex items-center gap-1.5 text-sm">
                <Volume2 className="w-4 h-4 text-amber-600" /> What this does:
              </div>
              <ul className="list-disc pl-4 space-y-1">
                <li>Rings a loud 3-stage school bell 15 minutes before every scheduled class.</li>
                <li>Sends instant Zoom join links directly to your phone lockscreen.</li>
                <li>Notifies both Tutors and Students automatically.</li>
              </ul>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button onClick={enable} disabled={loading} className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5">
                <Bell className="w-4 h-4" /> Enable 15-Minute Class Alarms Now 🚀
              </Button>
              
              <Button variant="outline" onClick={() => { setShowPromptModal(false); setShowGuide(true); }} className="w-full gap-2 text-xs">
                <Smartphone className="w-4 h-4 text-blue-600" /> Open Android Settings & Permission Guide ⚙️
              </Button>

              <Button variant="ghost" size="sm" onClick={() => { setShowPromptModal(false); sessionStorage.setItem('notif_prompt_dismissed', '1'); }} className="text-xs text-muted-foreground">
                Remind Me Later
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showGuide} onOpenChange={setShowGuide}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-blue-600" /> Android Phone Notification Guide
            </DialogTitle>
            <DialogDescription>
              Ensure your Android phone rings 15 minutes before every class.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-sm">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-1">
              <div className="font-semibold text-amber-900 flex items-center gap-1.5">
                <Volume2 className="w-4 h-4" /> 1. In-App Bell Sound Test
              </div>
              <p className="text-xs text-amber-800">
                Click below to verify that your phone's speaker plays the class bell ringtone:
              </p>
              <Button size="sm" onClick={playBellRingtone} className="mt-1 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold gap-1.5">
                <Bell className="w-3.5 h-3.5" /> Ring Bell Sound Now 🔔
              </Button>
            </div>

            <div className="space-y-2 border rounded-lg p-3 bg-slate-50">
              <div className="font-semibold text-slate-900">2. Chrome Android Permissions</div>
              <p className="text-xs text-muted-foreground">
                In Android Chrome, tap the <strong>Lock icon</strong> or 3 dots next to <code>language-scoop.vercel.app</code> $\rightarrow$ <strong>Permissions</strong> $\rightarrow$ Set <strong>Notifications</strong> to <strong>Allow</strong>.
              </p>
            </div>

            <div className="space-y-2 border rounded-lg p-3 bg-slate-50">
              <div className="font-semibold text-slate-900">3. Android Phone Notification Settings</div>
              <p className="text-xs text-muted-foreground">
                Open phone <strong>Settings</strong> $\rightarrow$ <strong>Apps</strong> $\rightarrow$ <strong>Chrome</strong> (or Language Scoop) $\rightarrow$ <strong>Notifications</strong> $\rightarrow$ Turn on <strong>Allow Sound and Vibration</strong>.
              </p>
            </div>

            <div className="space-y-2 border rounded-lg p-3 bg-slate-50">
              <div className="font-semibold text-slate-900">4. Battery Optimization (Crucial for Android)</div>
              <p className="text-xs text-muted-foreground">
                Go to Android <strong>Settings</strong> $\rightarrow$ <strong>Battery</strong> $\rightarrow$ <strong>Unrestricted</strong> for Chrome so Android won't silence background alerts when your screen is turned off.
              </p>
            </div>

            <div className="pt-2 flex justify-between gap-2">
              <Button variant="outline" size="sm" onClick={testPush} className="gap-1.5 text-xs">
                <Bell className="w-3.5 h-3.5 text-emerald-600" /> Send Test Push 📲
              </Button>
              <Button size="sm" onClick={() => setShowGuide(false)}>Got It 👍</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// -------- File Upload --------
function FileUploader({ attachments = [], onChange, disabled = false }) {
  const [uploading, setUploading] = useState(false);

  const upload = async (file) => {
    if (file.size > 5 * 1024 * 1024) { toast.error('File too large (max 5MB)'); return; }
    setUploading(true);
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await api('/files/upload', { method: 'POST', body: { name: file.name, type: file.type, size: file.size, dataUrl } });
      onChange([...attachments, res]);
      toast.success('File uploaded');
    } catch (e) { toast.error(e.message); } finally { setUploading(false); }
  };

  const remove = (id) => onChange(attachments.filter(a => a.id !== id));

  const fileIcon = (type) => {
    if (type?.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
    if (type?.startsWith('audio/')) return <Music className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const handleDownload = async (e, a) => {
    e.preventDefault();
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('cf_token') : null;
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`/api/files/${a.id}`, { headers });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to download file');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = a.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-2">
      {attachments.length > 0 && (
        <div className="space-y-1">
          {attachments.map(a => (
            <div key={a.id} className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
              <a href="#" onClick={(e) => handleDownload(e, a)} className="flex items-center gap-2 text-primary hover:underline truncate">
                {fileIcon(a.type)}<span className="truncate">{a.name}</span>
                <span className="text-xs text-muted-foreground">({(a.size/1024).toFixed(0)} KB)</span>
              </a>
              {!disabled && <Button size="icon" variant="ghost" onClick={() => remove(a.id)}><X className="w-3.5 h-3.5" /></Button>}
            </div>
          ))}
        </div>
      )}
      {!disabled && (
        <label className={`flex items-center gap-2 p-2 border-2 border-dashed rounded cursor-pointer hover:bg-slate-50 text-sm text-slate-600 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
          <Paperclip className="w-4 h-4" />
          <span>{uploading ? 'Uploading...' : 'Attach file (PDF, image, document, max 5MB)'}</span>
          <input type="file" className="hidden" accept="application/pdf,image/jpeg,image/png,image/webp,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
        </label>
      )}
    </div>
  );
}

function LandingPage({ onSignIn }) {
  const [installEvent, setInstallEvent] = useState(null);
  const [showInstallHelp, setShowInstallHelp] = useState(false);

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallEvent(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (installEvent) {
      installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === 'accepted') toast.success('App installed!');
      setInstallEvent(null);
    } else {
      setShowInstallHelp(true);
    }
  };

  const features = [
    { icon: Video, title: 'One-tap Zoom join', desc: 'Students join classes with a single tap. No more lost meeting links in WhatsApp.' },
    { icon: CalendarDays, title: 'Recurring schedules', desc: 'Set up weekly recurring classes once. Every future class appears automatically.' },
    { icon: CheckCircle2, title: 'Attendance & billing', desc: 'One-tap attendance. Fees calculated automatically from billable classes.' },
    { icon: BookOpen, title: 'Homework & practice', desc: 'Assign homework, create auto-scored MCQ practice, review submissions in one place.' },
    { icon: Wallet, title: 'Payment tracking', desc: 'Record UPI, cash & bank payments with auto receipt numbers. Print PDF summaries.' },
    { icon: Brain, title: 'Two portals', desc: 'Teachers manage everything. Students only see their own classes, homework, and fees.' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur-lg bg-white/70 border-b">
        <div className="max-w-6xl mx-auto flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-white ring-1 ring-slate-200 flex items-center justify-center overflow-hidden">
              <img src="/logo.png" alt="Language Scoop" className="w-8 h-8 object-contain" />
            </div>
            <div className="font-bold text-lg bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">Language Scoop</div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={install} className="gap-1.5"><Download className="w-4 h-4" />Install App</Button>
            <Button size="sm" onClick={onSignIn}>Sign in</Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-12 md:py-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-medium mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Built for language tutors and small coaching classes</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-3xl mx-auto">
          <span className="bg-gradient-to-r from-blue-600 via-teal-600 to-emerald-600 bg-clip-text text-transparent">Never miss a class.</span><br />
          Never lose the Zoom link.
        </h1>
        <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto">
          Language Scoop is the modern class-management app for independent tutors. Manage students, schedule classes, share Zoom links, track attendance, assign homework, and calculate monthly fees — all in one place.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
          <Button size="lg" onClick={onSignIn} className="gap-2 text-base h-12 px-6">Try the demo <ChevronRight className="w-4 h-4" /></Button>
          <Button size="lg" variant="outline" onClick={install} className="gap-2 text-base h-12 px-6"><Download className="w-4 h-4" />Install App</Button>
        </div>
        <div className="mt-4 text-sm text-slate-500">Demo: <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">teacher@demo.com</span> / <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">demo1234</span></div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <Card key={i} className="border-0 shadow-md hover:shadow-lg transition">
              <CardContent className="p-6">
                <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 text-white flex items-center justify-center mb-3">
                  <f.icon className="w-5 h-5" />
                </div>
                <div className="font-semibold text-lg">{f.title}</div>
                <div className="text-sm text-slate-600 mt-1">{f.desc}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Install PWA CTA */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-600 to-emerald-600 text-white overflow-hidden">
          <CardContent className="p-8 md:p-10">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-24 h-24 rounded-2xl bg-white/95 flex items-center justify-center flex-shrink-0 shadow-lg">
                <img src="/logo.png" alt="Language Scoop" className="w-20 h-20 object-contain" />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-2xl md:text-3xl font-bold">Install as an app</h2>
                <p className="mt-2 text-blue-50">Works on Android, iPhone, tablet, Windows, and Mac. Runs offline. No app store needed.</p>
                <div className="mt-4 flex gap-2 flex-wrap justify-center md:justify-start">
                  <Button variant="secondary" size="lg" onClick={install} className="gap-2"><Download className="w-4 h-4" />Install now</Button>
                  <Button variant="secondary" size="lg" onClick={() => setShowInstallHelp(true)}>How to install</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <footer className="text-center py-8 text-sm text-slate-500">
        © {new Date().getFullYear()} Language Scoop · Never miss a class · Never lose the Zoom link
      </footer>

      <Dialog open={showInstallHelp} onOpenChange={setShowInstallHelp}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Install Language Scoop</DialogTitle>
            <DialogDescription>Add to your device's home screen for a native app-like experience.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div>
              <div className="font-semibold flex items-center gap-2 text-primary">📱 iPhone / iPad (Safari)</div>
              <ol className="list-decimal ml-5 mt-1 space-y-1 text-slate-700">
                <li>Open this website in <strong>Safari</strong></li>
                <li>Tap the <strong>Share</strong> icon (square with up arrow)</li>
                <li>Scroll down and tap <strong>Add to Home Screen</strong></li>
                <li>Tap <strong>Add</strong> — done!</li>
              </ol>
            </div>
            <Separator />
            <div>
              <div className="font-semibold flex items-center gap-2 text-primary">🤖 Android (Chrome)</div>
              <ol className="list-decimal ml-5 mt-1 space-y-1 text-slate-700">
                <li>Open this website in <strong>Chrome</strong></li>
                <li>Tap the <strong>⋮ menu</strong> (top-right)</li>
                <li>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong></li>
                <li>Confirm — the app icon appears on your home screen</li>
              </ol>
            </div>
            <Separator />
            <div>
              <div className="font-semibold flex items-center gap-2 text-primary">💻 Windows / Mac (Chrome / Edge)</div>
              <ol className="list-decimal ml-5 mt-1 space-y-1 text-slate-700">
                <li>Look for the <strong>install icon</strong> (⊕) in the address bar</li>
                <li>Or click the <strong>⋮ menu</strong> → <strong>Install Language Scoop</strong></li>
                <li>The app opens in its own window and gets a desktop icon</li>
              </ol>
            </div>
            <div className="p-3 bg-blue-50 rounded text-xs text-blue-900">
              💡 Once installed, it works like any native app — with icon, splash screen, offline support, and no browser bar.
            </div>
          </div>
          <DialogFooter>
            {installEvent && <Button onClick={install} className="gap-1.5"><Download className="w-4 h-4" />Install now</Button>}
            <Button variant="outline" onClick={() => setShowInstallHelp(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LoginScreen({ onLogin, onBack }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('teacher@demo.com');
  const [password, setPassword] = useState('demo1234');
  const [name, setName] = useState('');
  const [academyName, setAcademyName] = useState('');
  const [loading, setLoading] = useState(false);

  const useDemo = (r) => {
    if (r === 'teacher') { setEmail('teacher@demo.com'); setPassword('demo1234'); }
    else { setEmail('riya@demo.com'); setPassword('demo1234'); }
  };

  const submit = async () => {
    setLoading(true);
    try {
      const path = mode === 'login' ? '/auth/login' : '/auth/register';
      const body = mode === 'login' ? { email, password } : { email, password, name, academyName };
      const data = await api(path, { method: 'POST', body });
      localStorage.setItem('cf_token', data.token);
      localStorage.setItem('cf_user', JSON.stringify(data.user));
      onLogin(data.user);
      toast.success(`Welcome ${data.user.name}!`);
    } catch (e) {
      toast.error(e.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white mb-3 shadow-lg overflow-hidden ring-1 ring-slate-200">
            <img src="/logo.png" alt="Language Scoop" className="w-16 h-16 object-contain" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Language Scoop</h1>
          <p className="text-muted-foreground mt-1">Never miss a class, never lose the Zoom link.</p>
        </div>
        <Card className="border-0 shadow-xl">
          <CardHeader>
            {onBack && <button onClick={onBack} className="text-sm text-primary hover:underline flex items-center gap-1 mb-2"><ChevronLeft className="w-3 h-3" />Back to home</button>}
            <CardTitle>{mode === 'login' ? 'Sign in' : 'Create teacher account'}</CardTitle>
            <CardDescription>{mode === 'login' ? 'Teacher or student portal' : 'For independent tutors'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mode === 'register' && (
              <>
                <div className="space-y-2"><Label>Your name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ms. Sharma" /></div>
                <div className="space-y-2"><Label>Academy name (optional)</Label><Input value={academyName} onChange={(e) => setAcademyName(e.target.value)} /></div>
              </>
            )}
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div className="space-y-2"><Label>Password</Label><PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            <Button className="w-full" size="lg" onClick={submit} disabled={loading}>
              {loading ? 'Please wait...' : (mode === 'login' ? 'Sign in' : 'Create account')}
            </Button>
            <div className="text-center text-sm">
              {mode === 'login' ? (
                <button className="text-primary hover:underline" onClick={() => setMode('register')}>New teacher? Create an account</button>
              ) : (
                <button className="text-primary hover:underline" onClick={() => setMode('login')}>Already have an account? Sign in</button>
              )}
            </div>
            <Separator />
            <div className="text-center space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Try the demo</p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={() => useDemo('teacher')}>Teacher demo</Button>
                <Button variant="outline" size="sm" onClick={() => useDemo('student')}>Student demo</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EditClassDialog({ cls, open, onClose, onDone }) {
  const [topic, setTopic] = useState('');
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [mode, setMode] = useState('online');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (cls) {
      setTopic(cls.topic || '');
      if (cls.startTime) {
        const d = new Date(cls.startTime);
        const tzOffset = d.getTimezoneOffset() * 60000;
        const localIso = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
        setStartTime(localIso);
      }
      setDuration(cls.duration || 60);
      setMode(cls.mode || 'online');
    }
  }, [cls]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = { topic, duration, mode };
      if (startTime) {
        payload.startTime = new Date(startTime).toISOString();
      }
      await api(`/classes/${cls.id}`, { method: 'PUT', body: payload });
      toast.success('Class timing & details updated');
      onDone(); onClose();
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  if (!cls) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Class Details</DialogTitle>
          <DialogDescription>Update timing or topic for {cls.studentName}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1"><Label>Topic</Label><Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Grammar & Vocab..." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Date & Time</Label><Input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></div>
            <div className="space-y-1"><Label>Duration (mins)</Label><Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} /></div>
          </div>
          <div className="space-y-1">
            <Label>Mode</Label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Updating...' : 'Save Changes'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ClassCard({ cls, onMarkAttendance, onEditClass, onDeleteClass, isStudent }) {
  const countdown = useCountdown(cls.startTime);
  const isUpcoming = new Date(cls.startTime) > new Date();
  const isPast = new Date(cls.endTime || cls.startTime) < new Date();

  const teacherTz = getBrowserTimezone();
  const studentTz = cls.studentTimezone || cls.timezone || 'Asia/Kolkata';

  const statusColor = {
    completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    absent: 'bg-orange-100 text-orange-800 border-orange-200',
    cancelled: 'bg-slate-100 text-slate-700 border-slate-200',
    rescheduled: 'bg-amber-100 text-amber-800 border-amber-200',
    upcoming: 'bg-blue-100 text-blue-800 border-blue-200',
  }[cls.status] || 'bg-slate-100 text-slate-700';

  const copyLink = () => { navigator.clipboard.writeText(cls.meetingLink); toast.success('Link copied'); };
  const openMeeting = () => window.open(cls.meetingLink, '_blank');
  const notifyStudent = () => {
    const studentTimeText = studentTz !== teacherTz ? `${fmtTime(cls.startTime, studentTz)} (${studentTz.split('/')[1]?.replace('_', ' ') || studentTz})` : fmtTime(cls.startTime, studentTz);
    const message = `Hi ${cls.studentName}, your French class is scheduled for ${fmtDate(cls.startTime, studentTz)} at ${studentTimeText}.${cls.meetingLink ? `\n\nJoin: ${cls.meetingLink}` : ''}${cls.meetingId ? `\nMeeting ID: ${cls.meetingId}` : ''}${cls.passcode ? `\nPasscode: ${cls.passcode}` : ''}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-lg font-semibold">
            {isStudent ? fmtTime(cls.startTime, studentTz) : fmtTime(cls.startTime, teacherTz)}
          </span>
          {!isStudent && studentTz && studentTz !== teacherTz && (
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 gap-1 text-xs font-normal">
              <Globe className="w-3 h-3" />
              {fmtTime(cls.startTime, studentTz)} ({studentTz.split('/')[1]?.replace('_', ' ') || studentTz})
            </Badge>
          )}
          <Badge variant="outline" className={statusColor}>
            {cls.status === 'upcoming' && isPast ? 'Attendance Pending' : cls.status.charAt(0).toUpperCase() + cls.status.slice(1)}
          </Badge>
          {cls.billable && <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Billable</Badge>}
        </div>
        <div className="mt-1 font-medium truncate">{isStudent ? (cls.topic || 'French Class') : cls.studentName}</div>
        {!isStudent && cls.topic && <div className="text-sm text-muted-foreground truncate">{cls.topic}</div>}
        <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{cls.duration} min</span>
          {cls.mode === 'online' ? (
            <span className="flex items-center gap-1"><Video className="w-3.5 h-3.5" />{cls.platform === 'zoom' ? 'Zoom' : cls.platform === 'google_meet' ? 'Google Meet' : cls.platform === 'ms_teams' ? 'MS Teams' : 'Online'}</span>
          ) : (
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />Offline</span>
          )}
          {isUpcoming && countdown && <span className="text-primary font-medium">{countdown}</span>}
        </div>
        {cls.mode === 'offline' && cls.classroomLocation && (
          <div className="mt-2 text-sm text-muted-foreground flex items-start gap-1">
            <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /><span>{cls.classroomLocation}</span>
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {cls.mode === 'online' && cls.meetingLink && (
              <>
                <Button size="sm" onClick={openMeeting} className="gap-1.5">
                  <Video className="w-4 h-4" />{isStudent ? 'Join Class' : 'Open Meeting'}
                </Button>
                <Button size="sm" variant="outline" onClick={copyLink} className="gap-1.5"><Copy className="w-4 h-4" />Copy Link</Button>
              </>
            )}
            {cls.mode === 'online' && !cls.meetingLink && (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1"><AlertCircle className="w-3 h-3" />Meeting link missing</Badge>
            )}
            {!isStudent && (
              <>
                <Button size="sm" variant="outline" onClick={notifyStudent} className="gap-1.5"><Send className="w-4 h-4" />WhatsApp</Button>
                {(cls.status === 'upcoming') && (
                  <Button size="sm" variant="outline" onClick={() => onMarkAttendance?.(cls)} className="gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />Mark Attendance
                  </Button>
                )}
              </>
            )}
          </div>
          {!isStudent && (
            <div className="flex items-center gap-1 ml-auto">
              <Button size="sm" variant="ghost" onClick={() => onEditClass?.(cls)} className="text-xs px-2" title="Edit Class Details & Time">
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onDeleteClass?.(cls)} className="text-xs px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50" title="Delete Class">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AttendanceDialog({ cls, open, onClose, onDone }) {
  const [status, setStatus] = useState('present');
  const [isBillable, setIsBillable] = useState(true);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (cls) {
      setStatus(cls.status === 'upcoming' ? 'present' : cls.status);
      setIsBillable(cls.isBillable !== undefined ? cls.isBillable : true);
      setNotes(cls.notes || '');
    }
  }, [cls]);

  const save = async () => {
    setSaving(true);
    try {
      await api(`/classes/${cls.id}/attendance`, { method: 'POST', body: { status, isBillable, notes } });
      toast.success('Attendance saved');
      onDone(); onClose();
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  if (!cls) return null;
  const opts = [
    { key: 'present', label: 'Present', desc: 'Deducts 1 pack credit', cls: 'bg-emerald-50 border-emerald-200 text-emerald-900' },
    { key: 'student_no_show', label: 'Student No Show', desc: 'Deducts 1 pack credit', cls: 'bg-rose-50 border-rose-200 text-rose-900' },
    { key: 'student_cancelled_late', label: 'Cancelled Late (Student)', desc: 'Deducts 1 pack credit', cls: 'bg-orange-50 border-orange-200 text-orange-900' },
    { key: 'student_cancelled_on_time', label: 'Cancelled On-Time', desc: 'No deduction', cls: 'bg-slate-50 border-slate-200 text-slate-800' },
    { key: 'teacher_cancelled', label: 'Teacher Cancelled', desc: 'No deduction', cls: 'bg-slate-50 border-slate-200 text-slate-800' },
    { key: 'rescheduled', label: 'Rescheduled', desc: 'No deduction', cls: 'bg-amber-50 border-amber-200 text-amber-900' },
    { key: 'trial', label: 'Trial Class', desc: 'Complimentary trial', cls: 'bg-purple-50 border-purple-200 text-purple-900' },
    { key: 'complimentary', label: 'Complimentary', desc: 'No deduction', cls: 'bg-blue-50 border-blue-200 text-blue-900' },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Class Attendance & Pack Deduction</DialogTitle>
          <DialogDescription>{cls.studentName} · {fmtDate(cls.startTime)} at {fmtTime(cls.startTime)}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 py-2">
          {opts.map(opt => (
            <button key={opt.key} onClick={() => {
              setStatus(opt.key);
              const rules = { present: true, student_no_show: true, student_cancelled_late: true, completed: true };
              setIsBillable(!!rules[opt.key]);
            }}
              className={`p-2.5 rounded-lg border-2 text-left transition ${status === opt.key ? 'border-primary ring-2 ring-primary/20 font-medium' : 'border-transparent'} ${opt.cls}`}>
              <div className="font-semibold text-sm">{opt.label}</div>
              <div className="text-xs opacity-75 mt-0.5">{opt.desc}</div>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between p-3 bg-slate-50 border rounded-lg">
          <div>
            <Label htmlFor="billable-override" className="cursor-pointer font-semibold text-sm">Deduct 1 Class Credit from Active Pack</Label>
            <p className="text-xs text-muted-foreground">Override billable status for this class</p>
          </div>
          <input type="checkbox" id="billable-override" checked={isBillable} onChange={(e) => setIsBillable(e.target.checked)} className="w-5 h-5 accent-primary cursor-pointer" />
        </div>

        <div className="space-y-1">
          <Label>Teacher Notes (optional)</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Lesson topic, notes..." />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Attendance'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TeacherDashboard({ onNavigate }) {
  const [data, setData] = useState(null);
  const [attCls, setAttCls] = useState(null);
  const [editCls, setEditCls] = useState(null);
  const [alarmClass, setAlarmClass] = useState(null);
  const chimedRef = useRef({});

  const nextClass = data?.nextClass;
  const countdown = useCountdown(nextClass?.startTime);

  const load = async () => {
    try { setData(await api('/dashboard')); } catch (e) { toast.error(e.message); }
  };
  useEffect(() => { load(); }, []);

  // Monitor upcoming classes for 15-minute bell alarm
  useEffect(() => {
    const check15MinAlarm = () => {
      if (!data?.todayClasses) return;
      const nowMs = Date.now();
      const upcoming15 = data.todayClasses.find(c => {
        if (c.status !== 'upcoming') return false;
        const diff = new Date(c.startTime).getTime() - nowMs;
        return diff > 0 && diff <= 15 * 60 * 1000;
      });

      if (upcoming15) {
        const isDismissed = typeof sessionStorage !== 'undefined' && sessionStorage.getItem(`dismissed_alarm_${upcoming15.id}`);
        if (!isDismissed) {
          setAlarmClass(upcoming15);
          if (!chimedRef.current[upcoming15.id]) {
            chimedRef.current[upcoming15.id] = true;
            playBellRingtone();
          }
        }
      } else {
        setAlarmClass(null);
      }
    };

    check15MinAlarm();
    const interval = setInterval(check15MinAlarm, 10000);
    return () => clearInterval(interval);
  }, [data]);

  const deleteClass = async (c) => {
    if (!confirm(`Are you sure you want to delete this class with ${c.studentName}?`)) return;
    try {
      await api(`/classes/${c.id}`, { method: 'DELETE' });
      toast.success('Class deleted');
      load();
    } catch (e) { toast.error(e.message); }
  };

  if (!data) return <div className="p-6 text-muted-foreground">Loading...</div>;

  const StatCard = ({ label, value, icon: Icon, tone = 'primary', hint }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
          </div>
          <div className={`p-2 rounded-lg ${tone === 'primary' ? 'bg-blue-100 text-blue-700' : tone === 'success' ? 'bg-emerald-100 text-emerald-700' : tone === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'} 👋</h1>
        <p className="text-muted-foreground">{fmtDateLong(new Date().toISOString())}</p>
      </div>

      {alarmClass && (
        <Card className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 text-white border-0 shadow-xl animate-pulse">
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-white/20 rounded-full animate-bounce">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 text-amber-100 text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-amber-200" /> 15-Minute Class Alarm Bell 🔔
                </div>
                <h2 className="text-xl font-extrabold mt-0.5">
                  Class with {alarmClass.studentName} starts in {Math.max(1, Math.ceil((new Date(alarmClass.startTime).getTime() - Date.now()) / 60000))} mins!
                </h2>
                <p className="text-xs text-amber-100 mt-0.5">
                  {alarmClass.topic || 'French Class'} · Scheduled at {fmtTime(alarmClass.startTime)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <Button size="sm" variant="secondary" onClick={playBellRingtone} className="gap-1.5 font-semibold text-slate-900 bg-white hover:bg-slate-100">
                <Bell className="w-4 h-4 text-amber-600" /> Ring Bell Sound 🔔
              </Button>
              {alarmClass.mode === 'online' && alarmClass.meetingLink && (
                <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold gap-1.5" onClick={() => window.open(alarmClass.meetingLink, '_blank')}>
                  <Video className="w-4 h-4" /> Open Zoom
                </Button>
              )}
              <Button size="sm" variant="ghost" className="text-white hover:bg-white/20" onClick={() => {
                if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(`dismissed_alarm_${alarmClass.id}`, 'true');
                setAlarmClass(null);
              }}>
                Dismiss ✕
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {nextClass && (
        <Card className="bg-gradient-to-br from-primary to-blue-700 text-primary-foreground border-0 shadow-lg">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center gap-2 text-blue-100 text-sm">
              <Sparkles className="w-4 h-4" /><span>Your next class</span>
            </div>
            <div className="mt-2 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <div className="text-3xl font-bold">{nextClass.studentName}</div>
                <div className="text-blue-100 mt-1">{nextClass.topic || 'French Class'} · {fmtDate(nextClass.startTime)} at {fmtTime(nextClass.startTime)}</div>
                {countdown && <div className="mt-2 text-2xl font-semibold">{countdown}</div>}
              </div>
              <div className="flex gap-2 flex-wrap">
                {nextClass.mode === 'online' && nextClass.meetingLink && (
                  <Button variant="secondary" onClick={() => window.open(nextClass.meetingLink, '_blank')} className="gap-1.5">
                    <Video className="w-4 h-4" />Open Meeting
                  </Button>
                )}
                <Button variant="secondary" onClick={() => setAttCls(nextClass)} className="gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />Mark Attendance
                </Button>
                <Button variant="outline" onClick={() => setEditCls(nextClass)} className="gap-1 text-white border-white/40 hover:bg-white/10" title="Edit Class">
                  <Pencil className="w-4 h-4" />Edit
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Classes Today" value={data.stats.classesToday} icon={CalendarDays} />
        <StatCard label="Online Today" value={data.stats.onlineToday} icon={Video} />
        <StatCard label="Offline Today" value={data.stats.offlineToday} icon={MapPin} tone="warning" />
        <StatCard label="Missing Links" value={data.stats.missingLinks} icon={AlertCircle} tone={data.stats.missingLinks > 0 ? 'warning' : 'success'} />
        <StatCard label="Pending Attendance" value={data.stats.pendingAttendance} icon={ClipboardList} tone="warning" />
        <StatCard label="Homework to Review" value={data.stats.homeworkToReview} icon={BookOpen} tone="warning" />
        <StatCard label="Monthly Revenue" value={fmtMoney(data.stats.monthlyRevenue)} icon={IndianRupee} tone="success" hint={`${data.stats.billableThisMonth} billable`} />
        <StatCard label="Active Students" value={data.stats.activeStudents} icon={Users} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Today's Schedule</h2>
          <Button variant="outline" size="sm" onClick={() => onNavigate('classes')}>View All</Button>
        </div>
        {data.todayClasses.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No classes scheduled today. 🌤️</CardContent></Card>
        ) : (
          <div className="grid gap-3">
            {data.todayClasses.map(c => <ClassCard key={c.id} cls={c} onMarkAttendance={setAttCls} onEditClass={setEditCls} onDeleteClass={deleteClass} />)}
          </div>
        )}
      </div>

      <AttendanceDialog cls={attCls} open={!!attCls} onClose={() => setAttCls(null)} onDone={load} />
      <EditClassDialog cls={editCls} open={!!editCls} onClose={() => setEditCls(null)} onDone={load} />
    </div>
  );
}

function RenewPackDialog({ student, open, onClose, onDone }) {
  const [feePerClass, setFeePerClass] = useState(800);
  const [totalClasses, setTotalClasses] = useState(8);
  const [paymentAmount, setPaymentAmount] = useState(6400);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (student) {
      const fee = student.feePerClass || 800;
      const size = student.defaultPackSize || 8;
      setFeePerClass(fee);
      setTotalClasses(size);
      setPaymentAmount(fee * size);
    }
  }, [student]);

  useEffect(() => {
    setPaymentAmount(feePerClass * totalClasses);
  }, [feePerClass, totalClasses]);

  const handleRenew = async () => {
    setSaving(true);
    try {
      await api(`/students/${student.id}/renew-pack`, {
        method: 'POST',
        body: { feePerClass, totalClasses, paymentAmount, paymentMethod, reference, notes }
      });
      toast.success(`Pack renewed! ${totalClasses} classes added.`);
      onDone(); onClose();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!student) return null;
  const packTotal = feePerClass * totalClasses;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Renew Class Pack</DialogTitle>
          <DialogDescription>Create a new prepaid pack for {student.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Fee per Class (₹)</Label>
              <Input type="number" value={feePerClass} onChange={(e) => setFeePerClass(Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label>Pack Size (classes)</Label>
              <Input type="number" value={totalClasses} onChange={(e) => setTotalClasses(Number(e.target.value))} />
            </div>
          </div>

          <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 flex justify-between items-center">
            <div>
              <div className="text-xs text-muted-foreground">Calculated Pack Amount</div>
              <div className="text-xl font-bold text-primary">{fmtMoney(packTotal)}</div>
            </div>
            <div className="text-xs text-muted-foreground font-mono">{totalClasses} × {fmtMoney(feePerClass)}</div>
          </div>

          <Separator />

          <div className="space-y-1">
            <Label>Advance Payment Received (₹)</Label>
            <Input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(Number(e.target.value))} />
          </div>

          {paymentAmount > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upi">UPI / GPay / PhonePe</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer (IMPS/NEFT)</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Transaction Ref</Label>
                <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UPI ID / Ref No" />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label>Notes (optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. 8-class pack renewal" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleRenew} disabled={saving}>{saving ? 'Renewing...' : 'Confirm Renewal'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({ student, open, onClose }) {
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleReset = async () => {
    if (!newPassword || newPassword.length < 6) {
      return toast.error('Password must be at least 6 characters long');
    }
    setSaving(true);
    try {
      await api(`/students/${student.id}/reset-password`, {
        method: 'POST',
        body: { newPassword }
      });
      toast.success(`Password reset for ${student.name}`);
      setNewPassword('');
      onClose();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!student) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reset Student Password</DialogTitle>
          <DialogDescription>Set a new login password for {student.name} ({student.email || 'No email'})</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label>New Password</Label>
            <PasswordInput value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimum 6 characters" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleReset} disabled={saving}>{saving ? 'Resetting...' : 'Save New Password'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChangePasswordDialog({ open, onClose }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChange = async () => {
    if (!oldPassword || !newPassword) return toast.error('Fill in all password fields');
    if (newPassword.length < 6) return toast.error('New password must be at least 6 characters long');
    if (newPassword !== confirmPassword) return toast.error('New passwords do not match');

    setSaving(true);
    try {
      await api('/student/change-password', {
        method: 'POST',
        body: { oldPassword, newPassword }
      });
      toast.success('Password updated successfully!');
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
      onClose();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Change Account Password</DialogTitle>
          <DialogDescription>Update your login password</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label>Current Password</Label>
            <PasswordInput value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>New Password</Label>
            <PasswordInput value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" />
          </div>
          <div className="space-y-1">
            <Label>Confirm New Password</Label>
            <PasswordInput value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleChange} disabled={saving}>{saving ? 'Updating...' : 'Update Password'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StudentClassesDialog({ student, open, onClose }) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editCls, setEditCls] = useState(null);

  const load = async () => {
    if (!student) return;
    setLoading(true);
    try {
      const res = await api('/classes');
      const filtered = (res.classes || []).filter(c => c.studentId === student.id);
      setClasses(filtered);
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { if (open) load(); }, [open, student]);

  if (!student) return null;
  const now = new Date();
  const upcoming = classes.filter(c => new Date(c.startTime) >= now).sort((a,b) => new Date(a.startTime) - new Date(b.startTime));
  const past = classes.filter(c => new Date(c.startTime) < now).sort((a,b) => new Date(b.startTime) - new Date(a.startTime));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" /> {student.name}'s Schedule & Classes
          </DialogTitle>
          <DialogDescription>
            {student.level} level · {student.email} · {upcoming.length} upcoming classes
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="p-6 text-center text-muted-foreground text-sm">Loading schedule...</div>
        ) : (
          <div className="space-y-4 py-2">
            <div>
              <h3 className="font-semibold text-sm mb-2">Upcoming Classes ({upcoming.length})</h3>
              {upcoming.length === 0 ? (
                <p className="text-xs text-muted-foreground italic p-3 bg-slate-50 border rounded-lg">No upcoming classes scheduled for {student.name}.</p>
              ) : (
                <div className="grid gap-2">
                  {upcoming.map(c => <ClassCard key={c.id} cls={c} onEditClass={setEditCls} onDeleteClass={async (item) => {
                    if (!confirm('Delete this class?')) return;
                    await api(`/classes/${item.id}`, { method: 'DELETE' });
                    toast.success('Class deleted');
                    load();
                  }} />)}
                </div>
              )}
            </div>

            <div>
              <h3 className="font-semibold text-sm mb-2">Past Classes ({past.length})</h3>
              {past.length === 0 ? (
                <p className="text-xs text-muted-foreground italic p-3 bg-slate-50 border rounded-lg">No past class history.</p>
              ) : (
                <div className="grid gap-2 max-h-60 overflow-y-auto pr-1">
                  {past.map(c => <ClassCard key={c.id} cls={c} onEditClass={setEditCls} onDeleteClass={async (item) => {
                    if (!confirm('Delete this class?')) return;
                    await api(`/classes/${item.id}`, { method: 'DELETE' });
                    toast.success('Class deleted');
                    load();
                  }} />)}
                </div>
              )}
            </div>
          </div>
        )}
        <EditClassDialog cls={editCls} open={!!editCls} onClose={() => setEditCls(null)} onDone={load} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [renewStudent, setRenewStudent] = useState(null);
  const [resetStudent, setResetStudent] = useState(null);
  const [viewScheduleStudent, setViewScheduleStudent] = useState(null);
  const empty = { name: '', email: '', phone: '', parentName: '', parentPhone: '', level: 'A1', mode: 'online', feePerClass: 800, defaultPackSize: 8, paymentAmount: 6400, defaultDuration: 60, timezone: 'Asia/Kolkata', permanentMeetingLink: '', permanentMeetingId: '', permanentMeetingPasscode: '', classroomLocation: '', notes: '' };
  const [form, setForm] = useState(empty);

  const load = async () => { try { const d = await api('/students'); setStudents(d.students); } catch (e) { toast.error(e.message); } };
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      if (selected) {
        await api(`/students/${selected.id}`, { method: 'PUT', body: form });
        toast.success('Student updated');
      } else {
        const res = await api('/students', { method: 'POST', body: form });
        toast.success(`Student added${res.tempPassword ? `. Login: ${form.email} / ${res.tempPassword}` : ''}`);
      }
      setShowAdd(false); setSelected(null); setForm(empty); load();
    } catch (e) { toast.error(e.message); }
  };

  const removeStudent = async (id, name) => {
    if (!confirm(`Are you sure you want to delete ${name}? This will remove their profile, classes, and packs.`)) return;
    try {
      await api(`/students/${id}`, { method: 'DELETE' });
      toast.success(`Student ${name} deleted`);
      load();
    } catch (e) { toast.error(e.message); }
  };

  const openEdit = (s) => { setSelected(s); setForm({ ...empty, ...s }); setShowAdd(true); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Students</h1><p className="text-muted-foreground text-sm">{students.length} total</p></div>
        <div className="flex gap-2">
          <input type="file" id="csv-import" accept=".csv" className="hidden" onChange={async (e) => {
            const file = e.target.files?.[0]; if (!file) return;
            const text = await file.text();
            try {
              const rows = parseCSV(text);
              const res = await api('/students/import', { method: 'POST', body: { rows } });
              toast.success(`Imported ${res.created} students`);
              load();
            } catch (err) { toast.error(err.message); }
            e.target.value = '';
          }} />
          <Button variant="outline" size="sm" onClick={() => document.getElementById('csv-import').click()} className="gap-1.5"><Upload className="w-4 h-4" />Import CSV</Button>
          <Button variant="outline" size="sm" onClick={() => downloadCSV('students.csv', students.map(s => ({ name: s.name, email: s.email, phone: s.phone, level: s.level, mode: s.mode, feePerClass: s.feePerClass, permanentMeetingLink: s.permanentMeetingLink, meetingId: s.permanentMeetingId, passcode: s.permanentMeetingPasscode, classroomLocation: s.classroomLocation })))} className="gap-1.5"><Download className="w-4 h-4" />Export</Button>
          <Button onClick={() => { setSelected(null); setForm(empty); setShowAdd(true); }} className="gap-1.5"><Plus className="w-4 h-4" />Add Student</Button>
        </div>
      </div>
      {students.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No students yet.</CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {students.map(s => (
            <Card key={s.id} className="hover:shadow-md transition">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="w-12 h-12" onClick={() => openEdit(s)}><AvatarFallback className="bg-primary/10 text-primary font-semibold cursor-pointer">{initials(s.name)}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate cursor-pointer" onClick={() => openEdit(s)}>{s.name}</div>
                    <div className="text-sm text-muted-foreground truncate">{s.email}</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant="outline">Level {s.level}</Badge>
                      <Badge variant="outline" className="capitalize">{s.mode}</Badge>
                      <Badge variant="outline">{fmtMoney(s.feePerClass)}/class</Badge>
                    </div>

                    <div className="mt-3 p-2.5 bg-slate-50 rounded-lg text-xs space-y-1.5 border">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground font-medium">Class Pack Progress:</span>
                        {s.activePack ? (
                          <Badge variant="outline" className={s.activePack.remainingClasses <= 2 ? 'bg-amber-100 text-amber-800 border-amber-200 font-semibold' : 'bg-emerald-100 text-emerald-800 border-emerald-200 font-semibold'}>
                            {s.activePack.usedClasses} / {s.activePack.totalClasses} used ({s.activePack.remainingClasses} left)
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-rose-100 text-rose-800 border-rose-200">No active pack</Badge>
                        )}
                      </div>
                      {s.activePack && (
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${Math.min(100, (s.activePack.usedClasses / s.activePack.totalClasses) * 100)}%` }}></div>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-1 flex-wrap">
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => setViewScheduleStudent(s)} className="gap-1 text-xs px-2">
                          <CalendarDays className="w-3.5 h-3.5 text-primary" /> Classes
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setRenewStudent(s)} className="gap-1 text-xs text-primary border-primary/30 hover:bg-primary/5 px-2">
                          Renew Pack
                        </Button>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setResetStudent(s)} className="text-xs px-1.5 text-muted-foreground">
                          Reset
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(s)} className="text-xs px-1.5">
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => removeStudent(s.id, s.name)} className="text-xs px-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50" title="Delete Student">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <StudentClassesDialog student={viewScheduleStudent} open={!!viewScheduleStudent} onClose={() => setViewScheduleStudent(null)} />
      <RenewPackDialog student={renewStudent} open={!!renewStudent} onClose={() => setRenewStudent(null)} onDone={load} />
      <ResetPasswordDialog student={resetStudent} open={!!resetStudent} onClose={() => setResetStudent(null)} />

      <Dialog open={showAdd} onOpenChange={(o) => { if (!o) { setShowAdd(false); setSelected(null); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected ? 'Edit Student' : 'Add New Student'}</DialogTitle>
            <DialogDescription>Store details, fee per class, and class pack settings.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Full Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-1"><Label>Email (student login)</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="space-y-1"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="space-y-1"><Label>Parent Phone</Label><Input value={form.parentPhone} onChange={(e) => setForm({ ...form, parentPhone: e.target.value })} /></div>
              <div className="space-y-1">
                <Label>French Level</Label>
                <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['A1','A2','B1','B2','C1','C2'].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Mode</Label>
                <Select value={form.mode} onValueChange={(v) => setForm({ ...form, mode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Fee per class (₹)</Label><Input type="number" value={form.feePerClass} onChange={(e) => setForm({ ...form, feePerClass: Number(e.target.value) })} /></div>
              <div className="space-y-1"><Label>Default Pack Size</Label><Input type="number" value={form.defaultPackSize} onChange={(e) => setForm({ ...form, defaultPackSize: Number(e.target.value) })} /></div>
              <div className="space-y-1 col-span-2">
                <Label>Student Timezone</Label>
                <Select value={form.timezone || 'Asia/Kolkata'} onValueChange={(v) => setForm({ ...form, timezone: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map(tz => <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {!selected && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                <div className="text-xs font-semibold text-blue-900">Initial Pack Payment (Advance)</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label className="text-xs">Initial Advance (₹)</Label><Input type="number" value={form.paymentAmount} onChange={(e) => setForm({ ...form, paymentAmount: Number(e.target.value) })} /></div>
                  <div className="space-y-1"><Label className="text-xs">Payment Method</Label>
                    <Select value={form.paymentMethod || 'upi'} onValueChange={(v) => setForm({ ...form, paymentMethod: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="upi">UPI</SelectItem><SelectItem value="bank_transfer">Bank</SelectItem><SelectItem value="cash">Cash</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
            {form.mode !== 'offline' && (
              <>
                <div className="space-y-1"><Label>Permanent Meeting Link (Zoom/Meet/Teams)</Label><Input value={form.permanentMeetingLink} onChange={(e) => setForm({ ...form, permanentMeetingLink: e.target.value })} placeholder="https://zoom.us/j/..." /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Meeting ID</Label><Input value={form.permanentMeetingId} onChange={(e) => setForm({ ...form, permanentMeetingId: e.target.value })} /></div>
                  <div className="space-y-1"><Label>Passcode</Label><Input value={form.permanentMeetingPasscode} onChange={(e) => setForm({ ...form, permanentMeetingPasscode: e.target.value })} /></div>
                </div>
              </>
            )}
            {form.mode !== 'online' && (
              <div className="space-y-1"><Label>Classroom Location</Label><Input value={form.classroomLocation} onChange={(e) => setForm({ ...form, classroomLocation: e.target.value })} /></div>
            )}
            <div className="space-y-1"><Label>Teacher Notes (private)</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAdd(false); setSelected(null); }}>Cancel</Button>
            <Button onClick={save}>{selected ? 'Save' : 'Add Student'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ClassesPage() {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [attCls, setAttCls] = useState(null);
  const [editCls, setEditCls] = useState(null);
  const [filter, setFilter] = useState('upcoming');
  const [selectedStudentId, setSelectedStudentId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [scheduleTz, setScheduleTz] = useState('Asia/Kolkata');
  const empty = { studentId: '', startTime: '', duration: 60, mode: 'online', topic: '', useStudentLink: true, recurring: false, recurringDays: [], startDate: '', endDate: '', time: '17:00', useCustomDayTimes: false, dayTimes: {} };
  const [form, setForm] = useState(empty);

  const load = async () => {
    try {
      const [c, s] = await Promise.all([api('/classes'), api('/students')]);
      setClasses(c.classes); setStudents(s.students);
    } catch (e) { toast.error(e.message); }
  };
  useEffect(() => { load(); }, []);

  const deleteClass = async (c) => {
    if (!confirm(`Are you sure you want to delete this class with ${c.studentName}?`)) return;
    try {
      await api(`/classes/${c.id}`, { method: 'DELETE' });
      toast.success('Class deleted');
      load();
    } catch (e) { toast.error(e.message); }
  };

  const filtered = useMemo(() => {
    const now = new Date();
    let list = classes;
    if (selectedStudentId !== 'all') {
      list = list.filter(c => c.studentId === selectedStudentId);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => (c.studentName || '').toLowerCase().includes(q) || (c.topic || '').toLowerCase().includes(q));
    }
    if (filter === 'upcoming') return list.filter(c => new Date(c.startTime) >= now).sort((a,b) => new Date(a.startTime) - new Date(b.startTime));
    if (filter === 'past') return list.filter(c => new Date(c.startTime) < now).sort((a,b) => new Date(b.startTime) - new Date(a.startTime));
    return list;
  }, [classes, filter, selectedStudentId, searchQuery]);

  const create = async () => {
    try {
      const payload = { ...form };
      if (!payload.recurring && payload.startTime) {
        const parts = payload.startTime.split('T');
        if (parts.length === 2) {
          payload.startTime = localTimeToUtcIso(parts[0], parts[1], scheduleTz);
        } else {
          payload.startTime = new Date(payload.startTime).toISOString();
        }
      }
      const d = await api('/classes', { method: 'POST', body: payload });
      toast.success(`Created ${d.classes.length} class${d.classes.length > 1 ? 'es' : ''}`);
      setShowAdd(false); setForm(empty); load();
    } catch (e) { toast.error(e.message); }
  };

  const dayLabels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Classes</h1>
        <Button onClick={() => setShowAdd(true)} className="gap-1.5"><Plus className="w-4 h-4" />Schedule</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
            <SelectTrigger className="w-full sm:w-[190px]">
              <SelectValue placeholder="Filter by Student" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students ({students.length})</SelectItem>
              {students.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input
            placeholder="Search student or topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-[200px]"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No classes match your filter.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map(c => (
            <div key={c.id}>
              <div className="text-xs text-muted-foreground mb-1 ml-1">{fmtDate(c.startTime)}</div>
              <ClassCard cls={c} onMarkAttendance={setAttCls} onEditClass={setEditCls} onDeleteClass={deleteClass} />
            </div>
          ))}
        </div>
      )}

      <EditClassDialog cls={editCls} open={!!editCls} onClose={() => setEditCls(null)} onDone={load} />

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Schedule Class</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Student</Label>
              <Select value={form.studentId} onValueChange={(v) => {
                const s = students.find(x => x.id === v);
                setForm({ ...form, studentId: v, mode: s?.mode === 'hybrid' ? 'online' : (s?.mode || 'online'), duration: s?.defaultDuration || 60 });
                if (s?.timezone) setScheduleTz(s.timezone);
              }}>
                <SelectTrigger><SelectValue placeholder="Choose student" /></SelectTrigger>
                <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.level} · {s.timezone ? s.timezone.split('/')[1]?.replace('_',' ') : 'IST'})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Topic (optional)</Label><Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="Verb Conjugation..." /></div>

            <div className="space-y-1">
              <Label>Schedule in Timezone</Label>
              <Select value={scheduleTz} onValueChange={setScheduleTz}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={getBrowserTimezone()}>My Local Timezone ({getBrowserTimezone()})</SelectItem>
                  {TIMEZONES.map(tz => <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="recurring" checked={form.recurring} onChange={(e) => setForm({ ...form, recurring: e.target.checked })} className="w-4 h-4" />
              <Label htmlFor="recurring" className="cursor-pointer">Recurring class</Label>
            </div>

            {form.recurring ? (
              <>
                <div className="space-y-1">
                  <Label>Repeat on</Label>
                  <div className="flex gap-1 flex-wrap">
                    {dayLabels.map((d, i) => (
                      <button key={i} type="button" onClick={() => {
                        const days = form.recurringDays.includes(i) ? form.recurringDays.filter(x => x !== i) : [...form.recurringDays, i];
                        setForm({ ...form, recurringDays: days });
                      }} className={`px-3 py-1.5 rounded-md border text-sm ${form.recurringDays.includes(i) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background'}`}>{d}</button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input type="checkbox" id="customDayTimes" checked={form.useCustomDayTimes || false} onChange={(e) => setForm({ ...form, useCustomDayTimes: e.target.checked })} className="w-4 h-4" />
                  <Label htmlFor="customDayTimes" className="cursor-pointer text-xs font-semibold text-primary">Different time for each day (e.g. Fri 6:30 PM & Sun 10:00 AM)</Label>
                </div>

                {form.useCustomDayTimes && form.recurringDays.length > 0 ? (
                  <div className="p-3 bg-slate-50 border rounded-lg space-y-2">
                    <Label className="text-xs font-bold text-slate-700">Set Time for Each Day:</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {form.recurringDays.map(dayNum => (
                        <div key={dayNum} className="space-y-1">
                          <Label className="text-xs">{dayLabels[dayNum]} Time</Label>
                          <Input type="time" value={form.dayTimes?.[dayNum] || (dayNum === 5 ? '18:30' : dayNum === 0 ? '10:00' : form.time || '17:00')} onChange={(e) => {
                            const dt = { ...(form.dayTimes || {}), [dayNum]: e.target.value };
                            setForm({ ...form, dayTimes: dt });
                          }} />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1"><Label>Start</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
                  <div className="space-y-1"><Label>End</Label><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
                  {!form.useCustomDayTimes && <div className="space-y-1"><Label>Time</Label><Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></div>}
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Date & Time</Label><Input type="datetime-local" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></div>
                <div className="space-y-1"><Label>Duration (min)</Label><Input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} /></div>
              </div>
            )}

            <div className="space-y-1">
              <Label>Mode</Label>
              <Select value={form.mode} onValueChange={(v) => setForm({ ...form, mode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.mode === 'online' && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg text-sm">
                <input type="checkbox" id="uselink" checked={form.useStudentLink} onChange={(e) => setForm({ ...form, useStudentLink: e.target.checked })} className="w-4 h-4" />
                <Label htmlFor="uselink" className="cursor-pointer">Use student's saved permanent meeting link</Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={create} disabled={!form.studentId}>Create Class</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AttendanceDialog cls={attCls} open={!!attCls} onClose={() => setAttCls(null)} onDone={load} />
    </div>
  );
}

function BillingPage() {
  const [data, setData] = useState(null);
  const [renewStudent, setRenewStudent] = useState(null);
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`);

  const load = async () => {
    try {
      const d = await api(`/billing/summary?month=${month}`);
      setData(d);
    } catch (e) { toast.error(e.message); }
  };

  useEffect(() => { load(); }, [month]);

  const cards = data?.summaryCards || {};

  const shareWhatsapp = (s) => {
    const packInfo = s.activePack ? `${s.activePack.usedClasses} of ${s.activePack.totalClasses} classes used (${s.activePack.remainingClasses} remaining)` : 'No active pack';
    const msg = `Class Pack & Fee Summary - ${s.studentName} - ${month}\n\nCompleted this month: ${s.completedThisMonth}\nFee per class: ${fmtMoney(s.feePerClass)}\nPack Status: ${packInfo}\nAdvance Payment: ${s.advancePaymentStatus.toUpperCase()}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const printFeeSummary = async (s, m) => {
    try {
      const d = await api(`/billing/student/${s.studentId}?month=${m}`);
      const w = window.open('', '_blank');
      const rows = d.classes.map(c => `<tr><td style="padding:6px;border-bottom:1px solid #eee">${new Date(c.startTime).toLocaleDateString('en-IN')}</td><td style="padding:6px;border-bottom:1px solid #eee">${c.topic || 'Class'}</td><td style="padding:6px;border-bottom:1px solid #eee;text-transform:capitalize">${c.status}</td><td style="padding:6px;border-bottom:1px solid #eee;text-align:right">${c.isBillable ? 'Deducted (1 credit)' : 'No deduction'}</td></tr>`).join('');
      const packRow = d.activePack ? `Used ${d.activePack.usedClasses} of ${d.activePack.totalClasses} classes (${d.activePack.remainingClasses} remaining). Pack Total: ₹${d.activePack.totalAmount.toLocaleString('en-IN')}, Paid: ₹${d.activePack.paidAmount.toLocaleString('en-IN')}` : 'No active pack';
      
      w.document.write(`<html><head><title>Class Pack Statement - ${d.student.name}</title></head><body style="font-family:system-ui;padding:32px;max-width:700px;margin:auto"><div style="text-align:center;margin-bottom:24px"><h2 style="margin:0;color:#2563EB">${d.teacher?.academyName || 'Language Scoop'}</h2><div style="color:#64748b">Prepaid Class Pack Statement · ${m}</div></div><table style="width:100%;margin-bottom:16px"><tr><td><strong>Student:</strong> ${d.student.name}</td><td style="text-align:right"><strong>Level:</strong> ${d.student.level}</td></tr><tr><td><strong>Fee per class:</strong> ₹${d.student.feePerClass}</td><td style="text-align:right"><strong>Month:</strong> ${m}</td></tr></table><div style="padding:12px;background:#f8fafc;border-radius:6px;margin-bottom:16px;font-size:14px"><strong>Active Pack Summary:</strong> ${packRow}</div><h3>Classes Attended in ${m}</h3><table style="width:100%;border-collapse:collapse"><thead><tr style="background:#f1f5f9"><th style="padding:8px;text-align:left">Date</th><th style="padding:8px;text-align:left">Topic</th><th style="padding:8px;text-align:left">Attendance</th><th style="padding:8px;text-align:right">Pack Credit</th></tr></thead><tbody>${rows || '<tr><td colspan="4" style="padding:16px;text-align:center;color:#94a3b8">No classes this month</td></tr>'}</tbody></table><div style="margin-top:32px;text-align:center;color:#94a3b8;font-size:12px">Generated via Language Scoop · ${new Date().toLocaleDateString('en-IN')}</div><div style="margin-top:16px;text-align:center"><button onclick="window.print()" style="padding:8px 24px;background:#2563EB;color:white;border:none;border-radius:6px;cursor:pointer">Print / Save as PDF</button></div></body></html>`);
      w.document.close();
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold">Class Packs & Billing</h1><p className="text-muted-foreground text-sm">Prepaid pack progress and monthly attendance overview</p></div>
        <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-auto" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground uppercase">Completed ({month.slice(5)})</p><p className="text-xl font-bold mt-1 text-primary">{cards.completedThisMonth || 0}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground uppercase">Billable ({month.slice(5)})</p><p className="text-xl font-bold mt-1 text-emerald-600">{cards.billableThisMonth || 0}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground uppercase">Active Packs</p><p className="text-xl font-bold mt-1 text-blue-600">{cards.activePacks || 0}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground uppercase">Low / Exhausted</p><p className="text-xl font-bold mt-1 text-rose-600">{cards.renewalsRequired || 0}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground uppercase">Advance Recd</p><p className="text-xl font-bold mt-1 text-emerald-600">{fmtMoney(cards.advancePaymentsThisMonth || 0)}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground uppercase">Pack Due</p><p className="text-xl font-bold mt-1 text-amber-600">{fmtMoney(cards.packPaymentsOutstanding || 0)}</p></CardContent></Card>
      </div>

      <div className="grid gap-3">
        {(data?.summaries || []).map(s => (
          <Card key={s.studentId}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <Avatar><AvatarFallback className="bg-primary/10 text-primary font-semibold">{initials(s.studentName)}</AvatarFallback></Avatar>
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      {s.studentName}
                      {s.renewalRequired && <Badge variant="outline" className="bg-rose-100 text-rose-800 border-rose-200">Renewal Required</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground">Level {s.level} · Fee: {fmtMoney(s.feePerClass)}/class</div>
                  </div>
                </div>

                <div className="text-right">
                  {s.activePack ? (
                    <div>
                      <div className="text-lg font-bold text-primary">{s.activePack.usedClasses} / {s.activePack.totalClasses} used</div>
                      <div className="text-xs text-muted-foreground">{s.activePack.remainingClasses} classes remaining</div>
                    </div>
                  ) : (
                    <div className="text-sm text-rose-600 font-medium">No Active Pack</div>
                  )}
                </div>
              </div>

              {s.activePack && (
                <div className="mt-3 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${s.activePack.remainingClasses <= 2 ? 'bg-amber-500' : 'bg-primary'}`} style={{ width: `${Math.min(100, (s.activePack.usedClasses / s.activePack.totalClasses) * 100)}%` }}></div>
                </div>
              )}

              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 bg-slate-50 rounded border"><div className="text-muted-foreground">Completed ({month.slice(5)})</div><div className="font-bold text-sm mt-0.5">{s.completedThisMonth}</div></div>
                <div className="p-2 bg-slate-50 rounded border"><div className="text-muted-foreground">Billable ({month.slice(5)})</div><div className="font-bold text-sm mt-0.5">{s.billableThisMonth}</div></div>
                <div className="p-2 bg-slate-50 rounded border"><div className="text-muted-foreground">Advance Status</div>
                  <Badge variant="outline" className={`mt-0.5 capitalize ${s.advancePaymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : s.advancePaymentStatus === 'partially_paid' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-slate-100'}`}>
                    {s.advancePaymentStatus.replace('_', ' ')}
                  </Badge>
                </div>
              </div>

              <div className="mt-3 flex gap-2 flex-wrap justify-between items-center">
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => shareWhatsapp(s)} className="gap-1.5"><Send className="w-4 h-4" />Share</Button>
                  <Button size="sm" variant="outline" onClick={() => printFeeSummary(s, month)} className="gap-1.5"><Printer className="w-4 h-4" />Statement</Button>
                </div>
                <Button size="sm" onClick={() => setRenewStudent({ id: s.studentId, name: s.studentName, feePerClass: s.feePerClass })} className="gap-1 text-xs">
                  Renew Class Pack
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {renewStudent && (
        <RenewPackDialog student={renewStudent} open={!!renewStudent} onClose={() => setRenewStudent(null)} onDone={load} />
      )}
    </div>
  );
}

function HomeworkPage() {
  const [items, setItems] = useState([]);
  const [students, setStudents] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [review, setReview] = useState(null);
  const [form, setForm] = useState({ studentId: '', title: '', instructions: '', dueDate: '', attachments: [] });

  const load = async () => {
    try {
      const [h, s] = await Promise.all([api('/homework'), api('/students')]);
      setItems(h.homework); setStudents(s.students);
    } catch (e) { toast.error(e.message); }
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    try { await api('/homework', { method: 'POST', body: form }); toast.success('Homework assigned'); setShowAdd(false); setForm({ studentId: '', title: '', instructions: '', dueDate: '', attachments: [] }); load(); }
    catch (e) { toast.error(e.message); }
  };

  const submitReview = async () => {
    try {
      await api(`/homework/${review.id}/review`, { method: 'POST', body: { feedback: review.feedback, score: review.score } });
      toast.success('Feedback saved'); setReview(null); load();
    } catch (e) { toast.error(e.message); }
  };

  const statusColor = (s) => ({
    assigned: 'bg-blue-100 text-blue-800 border-blue-200',
    submitted: 'bg-amber-100 text-amber-800 border-amber-200',
    reviewed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  }[s] || 'bg-slate-100');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Homework</h1>
        <Button onClick={() => setShowAdd(true)} className="gap-1.5"><Plus className="w-4 h-4" />Assign</Button>
      </div>
      <div className="grid gap-3">
        {items.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No homework yet.</CardContent></Card>
        ) : items.map(h => {
          const stud = students.find(s => s.id === h.studentId);
          return (
            <Card key={h.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{h.title}</span>
                      <Badge variant="outline" className={statusColor(h.status)}>{h.status}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">{stud?.name || 'Student'} · Due {h.dueDate ? fmtDate(h.dueDate) : '—'}</div>
                    {h.instructions && <p className="text-sm mt-2">{h.instructions}</p>}
                    {h.attachments?.length > 0 && (
                      <div className="mt-2"><div className="text-xs text-muted-foreground mb-1">Attachments:</div><FileUploader attachments={h.attachments} onChange={() => {}} disabled /></div>
                    )}
                    {h.submissionText && (
                      <div className="mt-2 p-3 bg-slate-50 rounded text-sm">
                        <div className="text-xs text-muted-foreground mb-1">Submission:</div>{h.submissionText}
                      </div>
                    )}
                    {h.submissionAttachments?.length > 0 && (
                      <div className="mt-2"><div className="text-xs text-muted-foreground mb-1">Student uploaded:</div><FileUploader attachments={h.submissionAttachments} onChange={() => {}} disabled /></div>
                    )}
                    {h.feedback && (
                      <div className="mt-2 p-3 bg-emerald-50 rounded text-sm">
                        <div className="text-xs text-emerald-700 mb-1">Feedback {h.score != null && `· Score: ${h.score}`}</div>{h.feedback}
                      </div>
                    )}
                  </div>
                  {h.status === 'submitted' && (
                    <Button size="sm" onClick={() => setReview({ ...h, feedback: '', score: '' })}>Review</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Homework</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Student</Label>
              <Select value={form.studentId} onValueChange={(v) => setForm({ ...form, studentId: v })}>
                <SelectTrigger><SelectValue placeholder="Choose student" /></SelectTrigger>
                <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Practice greetings" /></div>
            <div className="space-y-1"><Label>Instructions</Label><Textarea value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} rows={4} /></div>
            <div className="space-y-1"><Label>Due Date</Label><Input type="datetime-local" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
            <div className="space-y-1"><Label>Attachments</Label><FileUploader attachments={form.attachments} onChange={(a) => setForm({ ...form, attachments: a })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={create} disabled={!form.studentId || !form.title}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!review} onOpenChange={(o) => { if (!o) setReview(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Review Submission</DialogTitle><DialogDescription>{review?.title}</DialogDescription></DialogHeader>
          {review && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded text-sm">{review.submissionText || <em>No text submission</em>}</div>
              <div className="space-y-1"><Label>Feedback</Label><Textarea value={review.feedback} onChange={(e) => setReview({ ...review, feedback: e.target.value })} rows={4} /></div>
              <div className="space-y-1"><Label>Score (optional)</Label><Input type="number" value={review.score ?? ''} onChange={(e) => setReview({ ...review, score: e.target.value ? Number(e.target.value) : null })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReview(null)}>Cancel</Button>
            <Button onClick={submitReview}>Save Review</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StudentHome({ onNavigate }) {
  const [data, setData] = useState(null);
  const [showChangePw, setShowChangePw] = useState(false);
  const next = useMemo(() => data?.upcoming?.[0], [data]);
  const countdown = useCountdown(next?.startTime);

  useEffect(() => { api('/student/dashboard').then(setData).catch(e => toast.error(e.message)); }, []);
  if (!data) return <div className="p-6 text-muted-foreground">Loading...</div>;

  const pendingHw = data.homework.filter(h => h.status === 'assigned');
  const feeDue = data.monthlyBillable * (data.feePerClass || 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bonjour, {data.student.name.split(' ')[0]}! 👋</h1>
          <p className="text-muted-foreground">{fmtDateLong(new Date().toISOString())}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowChangePw(true)} className="gap-1.5 text-xs">
          <Lock className="w-3.5 h-3.5" />Change Password
        </Button>
      </div>

      {next ? (
        <Card className="bg-gradient-to-br from-primary to-blue-700 text-primary-foreground border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-blue-100 text-sm mb-2">
              <Sparkles className="w-4 h-4" /><span>Your next class</span>
            </div>
            <div className="text-3xl font-bold">{next.topic || 'French Class'}</div>
            <div className="mt-1 text-blue-100">{fmtDateLong(next.startTime)} at {fmtTime(next.startTime)}</div>
            {countdown && <div className="mt-3 text-2xl font-semibold">{countdown}</div>}
            <div className="mt-4 flex flex-wrap gap-2">
              {next.mode === 'online' && next.meetingLink ? (
                <>
                  <Button size="lg" variant="secondary" onClick={() => window.open(next.meetingLink, '_blank')} className="gap-2 text-base">
                    <Video className="w-5 h-5" />Join Zoom Class
                  </Button>
                  <Button variant="secondary" onClick={() => { navigator.clipboard.writeText(next.meetingLink); toast.success('Link copied'); }} className="gap-1.5">
                    <Copy className="w-4 h-4" />Copy Link
                  </Button>
                </>
              ) : next.mode === 'offline' && next.classroomLocation ? (
                <div className="text-blue-100 flex items-start gap-1 text-sm mt-2"><MapPin className="w-4 h-4 mt-0.5" />{next.classroomLocation}</div>
              ) : null}
            </div>
            {next.meetingId && (
              <div className="mt-3 text-sm text-blue-100">
                Meeting ID: <span className="font-mono">{next.meetingId}</span>{next.passcode && ` · Passcode: ${next.passcode}`}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No upcoming classes.</CardContent></Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Classes Attended This Month</div>
          <div className="text-2xl font-bold mt-1 text-primary">{data.monthlyCompleted}</div>
          <div className="text-xs text-muted-foreground">resets monthly</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase font-medium">Active Class Pack</div>
          {data.activePack ? (
            <div>
              <div className="text-xl font-bold mt-1 text-emerald-600">{data.activePack.remainingClasses} classes left</div>
              <div className="text-xs text-muted-foreground">{data.activePack.usedClasses} of {data.activePack.totalClasses} used</div>
            </div>
          ) : (
            <div className="text-sm font-semibold text-rose-600 mt-1">No active pack</div>
          )}
        </CardContent></Card>
      </div>

      {pendingHw.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Pending Homework</h2>
            <Button size="sm" variant="ghost" onClick={() => onNavigate('homework')}>See all</Button>
          </div>
          <div className="grid gap-2">
            {pendingHw.slice(0, 3).map(h => (
              <Card key={h.id} className="cursor-pointer hover:shadow-md" onClick={() => onNavigate('homework')}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{h.title}</div>
                      <div className="text-sm text-muted-foreground">Due {h.dueDate ? fmtDate(h.dueDate) : '—'}</div>
                    </div>
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">Pending</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-2">Upcoming Classes</h2>
        <div className="grid gap-3">
          {data.upcoming.slice(1, 5).map(c => <ClassCard key={c.id} cls={c} isStudent />)}
          {data.upcoming.length <= 1 && <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">No other upcoming classes</CardContent></Card>}
        </div>
      </div>
      <ChangePasswordDialog open={showChangePw} onClose={() => setShowChangePw(false)} />
    </div>
  );
}

function StudentClasses() {
  const [data, setData] = useState(null);
  useEffect(() => { api('/student/dashboard').then(setData).catch(e => toast.error(e.message)); }, []);
  if (!data) return <div className="p-6 text-muted-foreground">Loading...</div>;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My Classes</h1>
      <Tabs defaultValue="upcoming">
        <TabsList><TabsTrigger value="upcoming">Upcoming</TabsTrigger><TabsTrigger value="past">Past</TabsTrigger></TabsList>
        <TabsContent value="upcoming" className="space-y-3 mt-4">
          {data.upcoming.length === 0 ? <Card><CardContent className="p-8 text-center text-muted-foreground">No upcoming classes.</CardContent></Card> : data.upcoming.map(c => <ClassCard key={c.id} cls={c} isStudent />)}
        </TabsContent>
        <TabsContent value="past" className="space-y-3 mt-4">
          {data.past.length === 0 ? <Card><CardContent className="p-8 text-center text-muted-foreground">No past classes yet.</CardContent></Card> : data.past.map(c => <ClassCard key={c.id} cls={c} isStudent />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StudentHomework() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [submissionText, setSubmissionText] = useState('');
  const [submissionAttachments, setSubmissionAttachments] = useState([]);

  const load = async () => { try { const d = await api('/homework'); setItems(d.homework); } catch (e) { toast.error(e.message); } };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    try {
      await api(`/homework/${selected.id}/submit`, { method: 'POST', body: { submissionText, submissionAttachments } });
      toast.success('Homework submitted!'); setSelected(null); setSubmissionText(''); setSubmissionAttachments([]); load();
    } catch (e) { toast.error(e.message); }
  };

  const statusColor = (s) => ({
    assigned: 'bg-amber-100 text-amber-800 border-amber-200',
    submitted: 'bg-blue-100 text-blue-800 border-blue-200',
    reviewed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  }[s] || 'bg-slate-100');

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Homework</h1>
      <div className="grid gap-3">
        {items.length === 0 ? <Card><CardContent className="p-8 text-center text-muted-foreground">No homework yet. 🎉</CardContent></Card> : items.map(h => (
          <Card key={h.id} className="cursor-pointer hover:shadow-md" onClick={() => { setSelected(h); setSubmissionText(h.submissionText || ''); setSubmissionAttachments(h.submissionAttachments || []); }}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{h.title}</div>
                  <div className="text-sm text-muted-foreground">Due {h.dueDate ? fmtDate(h.dueDate) : '—'}</div>
                </div>
                <Badge variant="outline" className={statusColor(h.status)}>{h.status}</Badge>
              </div>
              {h.feedback && (
                <div className="mt-2 p-2 bg-emerald-50 rounded text-sm">
                  <div className="text-xs text-emerald-700 font-medium">Feedback {h.score != null && `· ${h.score}`}</div>{h.feedback}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{selected?.title}</DialogTitle><DialogDescription>Due {selected?.dueDate ? fmtDate(selected.dueDate) : '—'}</DialogDescription></DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="text-sm p-3 bg-slate-50 rounded">{selected.instructions}</div>
              {selected.attachments?.length > 0 && (
                <div><Label className="text-xs">Teacher's attachments</Label><FileUploader attachments={selected.attachments} onChange={() => {}} disabled /></div>
              )}
              <div className="space-y-1">
                <Label>Your submission</Label>
                <Textarea value={submissionText} onChange={(e) => setSubmissionText(e.target.value)} rows={5} disabled={selected.status === 'reviewed'} placeholder="Type your answer here..." />
              </div>
              <div className="space-y-1">
                <Label>Attach files (optional)</Label>
                <FileUploader attachments={submissionAttachments.length ? submissionAttachments : (selected.submissionAttachments || [])} onChange={setSubmissionAttachments} disabled={selected.status === 'reviewed'} />
              </div>
              {selected.feedback && (
                <div className="p-3 bg-emerald-50 rounded text-sm">
                  <div className="text-xs text-emerald-700 font-medium mb-1">Teacher feedback {selected.score != null && `· Score: ${selected.score}`}</div>{selected.feedback}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
            {selected?.status !== 'reviewed' && <Button onClick={submit} disabled={!submissionText.trim() && submissionAttachments.length === 0}>{selected?.status === 'submitted' ? 'Resubmit' : 'Submit'}</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StudentAttendance() {
  const [data, setData] = useState(null);
  useEffect(() => { api('/student/dashboard').then(setData).catch(e => toast.error(e.message)); }, []);
  if (!data) return <div className="p-6 text-muted-foreground">Loading...</div>;
  const all = [...data.past].sort((a,b) => new Date(b.startTime) - new Date(a.startTime));
  const completed = all.filter(c => c.status === 'completed').length;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Attendance</h1>
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase">Total</div><div className="text-2xl font-bold mt-1">{all.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase">Completed</div><div className="text-2xl font-bold mt-1 text-emerald-600">{completed}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase">This Month</div><div className="text-2xl font-bold mt-1">{data.monthlyCompleted}</div></CardContent></Card>
      </div>
      <div className="grid gap-2">
        {all.map(c => (
          <Card key={c.id}><CardContent className="p-3 flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">{c.topic || 'French Class'}</div>
              <div className="text-xs text-muted-foreground">{fmtDate(c.startTime)} · {fmtTime(c.startTime)}</div>
            </div>
            <Badge variant="outline" className={c.status === 'completed' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-100'}>{c.status}</Badge>
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}

function StudentFees() {
  const [data, setData] = useState(null);
  useEffect(() => { api('/student/dashboard').then(setData).catch(e => toast.error(e.message)); }, []);
  if (!data) return <div className="p-6 text-muted-foreground">Loading...</div>;
  const activePack = data.activePack;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Class Pack & Payments</h1>
      
      {activePack ? (
        <Card className="bg-gradient-to-br from-primary to-blue-700 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-blue-100 text-sm">Active Class Pack</div>
                <div className="text-4xl font-bold mt-1">{activePack.remainingClasses} <span className="text-xl font-normal text-blue-100">classes left</span></div>
              </div>
              <Badge variant="outline" className="bg-white/20 text-white border-white/30 capitalize">
                {activePack.status}
              </Badge>
            </div>

            <div className="mt-4 w-full bg-blue-950/40 rounded-full h-2.5 overflow-hidden">
              <div className="bg-emerald-400 h-full rounded-full transition-all" style={{ width: `${Math.min(100, (activePack.usedClasses / activePack.totalClasses) * 100)}%` }}></div>
            </div>

            <div className="mt-4 flex justify-between text-xs text-blue-100 pt-2 border-t border-blue-400/30">
              <span>Used: <strong>{activePack.usedClasses}</strong> / {activePack.totalClasses}</span>
              <span>Fee per class: <strong>{fmtMoney(activePack.feePerClassSnapshot)}</strong></span>
              <span>Pack Total: <strong>{fmtMoney(activePack.totalAmount)}</strong></span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-rose-50 border-rose-200">
          <CardContent className="p-6 text-center text-rose-800">
            <div className="font-semibold text-lg">No Active Class Pack</div>
            <div className="text-sm mt-1">Please contact your teacher to renew your class pack.</div>
          </CardContent>
        </Card>
      )}

      <Card><CardContent className="p-4 space-y-2">
        <div className="flex justify-between"><span className="text-muted-foreground font-medium">Fee per class</span><span className="font-medium">{fmtMoney(data.feePerClass)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground font-medium">Classes attended this month ({new Date().toLocaleDateString('en-IN', { month: 'short' })})</span><span className="font-medium">{data.monthlyCompleted}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground font-medium">Billable classes this month</span><span className="font-medium">{data.monthlyBillable}</span></div>
      </CardContent></Card>

      {data.payments?.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Payment History</h2>
          <div className="grid gap-2">
            {data.payments.map(p => (
              <Card key={p.id}><CardContent className="p-3 flex items-center justify-between text-sm">
                <div>
                  <div className="font-semibold">{p.receiptNumber} · {fmtMoney(p.amount)}</div>
                  <div className="text-xs text-muted-foreground">{new Date(p.paymentDate).toLocaleDateString('en-IN')} via {p.paymentMethod?.toUpperCase()}</div>
                </div>
                <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-200">Paid</Badge>
              </CardContent></Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// -------- Practice Exercises (Teacher) --------
function PracticePage() {
  const [items, setItems] = useState([]);
  const [students, setStudents] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [testLink, setTestLink] = useState('');
  const [testTitle, setTestTitle] = useState('');
  const [testDesc, setTestDesc] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [showPortalConfig, setShowPortalConfig] = useState(false);

  const emptyQ = () => ({ type: 'mcq', text: '', options: ['', '', '', ''], correctAnswer: '', marks: 1, explanation: '' });
  const empty = { title: '', description: '', level: 'A1', topic: '', studentIds: 'all', dueDate: '', questions: [emptyQ()] };
  const [form, setForm] = useState(empty);

  const load = async () => {
    try {
      const [p, s, st] = await Promise.all([api('/practice'), api('/students'), api('/teacher/settings')]);
      setItems(p.practice); setStudents(s.students);
      if (st) {
        setTestLink(st.customTestLink || '');
        setTestTitle(st.customTestTitle || '');
        setTestDesc(st.customTestDescription || '');
      }
    } catch (e) { toast.error(e.message); }
  };
  useEffect(() => { load(); }, []);

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      await api('/teacher/settings', {
        method: 'PUT',
        body: { customTestLink: testLink, customTestTitle: testTitle, customTestDescription: testDesc }
      });
      toast.success('Online Test Portal link saved! All your students can now access it.');
    } catch (e) { toast.error(e.message); } finally { setSavingSettings(false); }
  };

  const create = async () => {
    try {
      const cleanQs = form.questions.filter(q => q.text.trim());
      if (!cleanQs.length) return toast.error('Add at least one question');
      await api('/practice', { method: 'POST', body: { ...form, questions: cleanQs } });
      toast.success('Practice created');
      setShowAdd(false); setForm(empty); load();
    } catch (e) { toast.error(e.message); }
  };

  const openView = async (p) => {
    try { const d = await api(`/practice/${p.id}`); setViewing({ ...d.practice, attempts: d.attempts }); } catch (e) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Practice & Test Hub</h1>
        <Button onClick={() => { setForm(empty); setShowAdd(true); }} className="gap-1.5"><Plus className="w-4 h-4" />Create Quiz</Button>
      </div>

      <Card className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white border-0 shadow-md">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2 text-indigo-200 text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-amber-400" /> External Online Test Portal (Optional)
              </div>
              <h3 className="text-lg font-bold mt-1">{testTitle || 'Custom Online Test Link'}</h3>
              <p className="text-xs text-indigo-200 mt-0.5 max-w-xl">
                {testLink ? `Active Link: ${testLink}` : 'Add a link to your custom test website (e.g., https://nitu-french.netlify.app/) so all your students can attempt it.'}
              </p>
            </div>
            <div className="flex gap-2">
              {testLink && (
                <Button size="sm" variant="secondary" onClick={() => window.open(testLink, '_blank')} className="gap-1.5">
                  Test Link 🔗
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setShowPortalConfig(!showPortalConfig)} className="gap-1.5 text-white border-white/30 hover:bg-white/10">
                {showPortalConfig ? 'Close Settings' : (testLink ? 'Edit Portal Link' : '+ Add Test Link')}
              </Button>
            </div>
          </div>

          {showPortalConfig && (
            <div className="mt-4 pt-4 border-t border-indigo-800/60 space-y-3">
              <div className="grid sm:grid-cols-2 gap-3 text-slate-900">
                <div className="space-y-1">
                  <Label className="text-indigo-100 text-xs font-medium">Test Portal URL</Label>
                  <Input value={testLink} onChange={(e) => setTestLink(e.target.value)} placeholder="https://nitu-french.netlify.app/" className="bg-white" />
                </div>
                <div className="space-y-1">
                  <Label className="text-indigo-100 text-xs font-medium">Portal Display Title</Label>
                  <Input value={testTitle} onChange={(e) => setTestTitle(e.target.value)} placeholder="Nitu French Online Tests" className="bg-white" />
                </div>
              </div>
              <div className="space-y-1 text-slate-900">
                <Label className="text-indigo-100 text-xs font-medium">Short Description for Students</Label>
                <Input value={testDesc} onChange={(e) => setTestDesc(e.target.value)} placeholder="Official online test portal with practice exams and quizzes" className="bg-white" />
              </div>
              <div className="flex justify-end pt-1">
                <Button size="sm" onClick={saveSettings} disabled={savingSettings} className="bg-amber-400 hover:bg-amber-300 text-slate-900 font-semibold gap-1.5">
                  {savingSettings ? 'Saving...' : 'Save Portal Settings'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <div className="grid gap-3">
        {items.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No practice exercises yet. Create one to test your students.</CardContent></Card>
        ) : items.map(p => (
          <Card key={p.id} className="cursor-pointer hover:shadow-md" onClick={() => openView(p)}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-semibold">{p.title}</div>
                  <div className="text-sm text-muted-foreground">{p.topic} · {p.questions.length} question{p.questions.length !== 1 ? 's' : ''}</div>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline">Level {p.level}</Badge>
                  <Badge variant="outline">{p.studentIds === 'all' ? 'All students' : `${p.studentIds.length} students`}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Practice Exercise</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Verb être - Present Tense" /></div>
              <div className="space-y-1"><Label>Topic</Label><Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="Grammar" /></div>
              <div className="space-y-1">
                <Label>Level</Label>
                <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['A1','A2','B1','B2','C1','C2'].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Due Date</Label><Input type="datetime-local" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
            </div>
            <div className="space-y-1"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base">Questions</Label>
                <Button size="sm" variant="outline" onClick={() => setForm({ ...form, questions: [...form.questions, emptyQ()] })} className="gap-1"><Plus className="w-3 h-3" />Add Question</Button>
              </div>
              <div className="space-y-3">
                {form.questions.map((q, i) => (
                  <Card key={i} className="border-slate-200">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Select value={q.type} onValueChange={(v) => {
                          const qs = [...form.questions]; qs[i] = { ...q, type: v, correctAnswer: '' };
                          if (v === 'truefalse') qs[i].options = ['true', 'false'];
                          else if (v === 'mcq') qs[i].options = ['', '', '', ''];
                          else qs[i].options = [];
                          setForm({ ...form, questions: qs });
                        }}>
                          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mcq">Multiple Choice</SelectItem>
                            <SelectItem value="truefalse">True/False</SelectItem>
                            <SelectItem value="fill">Fill in Blank</SelectItem>
                            <SelectItem value="short">Short Answer</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2">
                          <Input type="number" className="w-16" value={q.marks} onChange={(e) => { const qs = [...form.questions]; qs[i] = { ...q, marks: Number(e.target.value) }; setForm({ ...form, questions: qs }); }} />
                          <span className="text-xs text-muted-foreground">marks</span>
                          <Button size="icon" variant="ghost" onClick={() => setForm({ ...form, questions: form.questions.filter((_, j) => j !== i) })}><X className="w-4 h-4" /></Button>
                        </div>
                      </div>
                      <Input value={q.text} onChange={(e) => { const qs = [...form.questions]; qs[i] = { ...q, text: e.target.value }; setForm({ ...form, questions: qs }); }} placeholder={`Question ${i+1}...`} />
                      {q.type === 'mcq' && (
                        <div className="space-y-1">
                          {q.options.map((opt, oi) => (
                            <div key={oi} className="flex items-center gap-2">
                              <input type="radio" checked={q.correctAnswer === opt && opt !== ''} onChange={() => { const qs = [...form.questions]; qs[i] = { ...q, correctAnswer: opt }; setForm({ ...form, questions: qs }); }} />
                              <Input value={opt} onChange={(e) => { const qs = [...form.questions]; const opts = [...q.options]; opts[oi] = e.target.value; qs[i] = { ...q, options: opts, correctAnswer: q.correctAnswer === opt ? e.target.value : q.correctAnswer }; setForm({ ...form, questions: qs }); }} placeholder={`Option ${oi + 1}`} className="flex-1" />
                            </div>
                          ))}
                        </div>
                      )}
                      {q.type === 'truefalse' && (
                        <Select value={q.correctAnswer} onValueChange={(v) => { const qs = [...form.questions]; qs[i] = { ...q, correctAnswer: v }; setForm({ ...form, questions: qs }); }}>
                          <SelectTrigger><SelectValue placeholder="Correct answer" /></SelectTrigger>
                          <SelectContent><SelectItem value="true">True</SelectItem><SelectItem value="false">False</SelectItem></SelectContent>
                        </Select>
                      )}
                      {q.type === 'fill' && (
                        <Input value={q.correctAnswer} onChange={(e) => { const qs = [...form.questions]; qs[i] = { ...q, correctAnswer: e.target.value }; setForm({ ...form, questions: qs }); }} placeholder="Correct answer (exact match)" />
                      )}
                      {q.type === 'short' && (
                        <div className="text-xs text-muted-foreground italic">Short-answer: no auto-scoring, teacher reviews manually.</div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={create}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={(o) => { if (!o) setViewing(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{viewing?.title}</DialogTitle><DialogDescription>{viewing?.questions.length} questions · Level {viewing?.level}</DialogDescription></DialogHeader>
          {viewing && (
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold mb-2">Student Attempts ({viewing.attempts.length})</h3>
                <div className="space-y-2">
                  {viewing.attempts.length === 0 ? <div className="text-sm text-muted-foreground">No submissions yet</div> :
                    viewing.attempts.map(a => {
                      const stud = students.find(s => s.id === a.studentId);
                      return (
                        <Card key={a.id}><CardContent className="p-3 flex items-center justify-between">
                          <div><div className="font-medium text-sm">{stud?.name || 'Student'}</div><div className="text-xs text-muted-foreground">{fmtDate(a.submittedAt)}</div></div>
                          <div className="text-right"><div className="font-bold text-lg">{a.score}/{a.maxScore}</div><Badge variant="outline" className="text-xs">{a.status}</Badge></div>
                        </CardContent></Card>
                      );
                    })
                  }
                </div>
              </div>
              <Separator />
              <div>
                <h3 className="font-semibold mb-2">Questions</h3>
                <div className="space-y-2">
                  {viewing.questions.map((q, i) => (
                    <div key={q.id} className="p-3 bg-slate-50 rounded text-sm">
                      <div className="font-medium">Q{i+1}. {q.text}</div>
                      {q.options.length > 0 && <div className="mt-1 text-xs">Options: {q.options.join(', ')}</div>}
                      <div className="mt-1 text-xs text-emerald-700">Answer: {q.correctAnswer || 'Manual review'}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// -------- Practice (Student) --------
function StudentPractice() {
  const [items, setItems] = useState([]);
  const [customPortal, setCustomPortal] = useState(null);
  const [attempting, setAttempting] = useState(null);
  const [answers, setAnswers] = useState({});

  const load = async () => {
    try {
      const d = await api('/practice');
      setItems(d.practice || []);
      setCustomPortal(d.customTestPortal || null);
    } catch (e) { toast.error(e.message); }
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    try {
      const res = await api(`/practice/${attempting.id}/submit`, { method: 'POST', body: { answers } });
      const scoreMsg = res.attempt.autoScored ? `Score: ${res.attempt.score}/${res.attempt.maxScore}` : 'Submitted for review';
      toast.success(`Submitted! ${scoreMsg}`);
      setAttempting(null); setAnswers({}); load();
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Practice & Tests</h1>

      {customPortal && customPortal.link && (
        <Card className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white border-0 shadow-lg">
          <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-purple-200 text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-amber-300" /> Online Test Portal
              </div>
              <div className="text-xl font-bold mt-1">{customPortal.title || 'Official Online Tests'}</div>
              <p className="text-sm text-purple-100 mt-0.5 max-w-xl">{customPortal.description || 'Access practice exams & quizzes hosted by your teacher.'}</p>
            </div>
            <Button size="lg" className="bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold gap-2 flex-shrink-0" onClick={() => window.open(customPortal.link, '_blank')}>
              Launch Online Tests 🚀
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {items.length === 0 ? <Card><CardContent className="p-8 text-center text-muted-foreground">No practice exercises yet. 🎉</CardContent></Card> :
          items.map(p => (
            <Card key={p.id} className="cursor-pointer hover:shadow-md" onClick={() => { setAttempting(p); setAnswers({}); }}>
              <CardContent className="p-4 flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{p.title}</div>
                  <div className="text-sm text-muted-foreground">{p.topic} · {p.questions.length} questions</div>
                  {p.dueDate && <div className="text-xs text-muted-foreground mt-1">Due {fmtDate(p.dueDate)}</div>}
                </div>
                {p.attempt ? (
                  <div className="text-right">
                    <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-200">Done</Badge>
                    <div className="text-sm font-bold mt-1">{p.attempt.score}/{p.attempt.maxScore}</div>
                  </div>
                ) : <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">Start</Badge>}
              </CardContent>
            </Card>
          ))
        }
      </div>

      <Dialog open={!!attempting} onOpenChange={(o) => { if (!o) setAttempting(null); }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{attempting?.title}</DialogTitle><DialogDescription>{attempting?.description}</DialogDescription></DialogHeader>
          {attempting && (
            <div className="space-y-4">
              {attempting.attempt ? (
                <div className="space-y-3">
                  <div className="p-4 bg-emerald-50 rounded text-center">
                    <div className="text-3xl font-bold text-emerald-700">{attempting.attempt.score}/{attempting.attempt.maxScore}</div>
                    <div className="text-sm text-emerald-700 mt-1">Your score</div>
                  </div>
                  {attempting.questions.map((q, i) => {
                    const r = attempting.attempt.results.find(x => x.questionId === q.id);
                    const isCorrect = r?.correct;
                    return (
                      <div key={q.id} className={`p-3 rounded border ${isCorrect === true ? 'bg-emerald-50 border-emerald-200' : isCorrect === false ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="font-medium">Q{i+1}. {q.text}</div>
                        <div className="text-sm mt-1">Your answer: <span className="font-mono">{r?.answer || '—'}</span></div>
                        {isCorrect === false && <div className="text-sm mt-1">Correct: <span className="font-mono text-emerald-700">{q.correctAnswer}</span></div>}
                        {q.explanation && <div className="text-xs text-muted-foreground mt-1">{q.explanation}</div>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <>
                  {attempting.questions.map((q, i) => (
                    <div key={q.id} className="space-y-2">
                      <div className="font-medium">Q{i+1}. {q.text} <span className="text-xs text-muted-foreground">({q.marks} mark{q.marks !== 1 ? 's' : ''})</span></div>
                      {q.type === 'mcq' && q.options.map((opt, oi) => (
                        <label key={oi} className={`flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-slate-50 ${answers[q.id] === opt ? 'border-primary bg-blue-50' : ''}`}>
                          <input type="radio" name={q.id} checked={answers[q.id] === opt} onChange={() => setAnswers({ ...answers, [q.id]: opt })} />
                          <span>{opt}</span>
                        </label>
                      ))}
                      {q.type === 'truefalse' && (
                        <div className="flex gap-2">
                          {['true', 'false'].map(v => (
                            <button key={v} onClick={() => setAnswers({ ...answers, [q.id]: v })} className={`flex-1 p-2 rounded border capitalize ${answers[q.id] === v ? 'border-primary bg-blue-50' : ''}`}>{v}</button>
                          ))}
                        </div>
                      )}
                      {q.type === 'fill' && <Input value={answers[q.id] || ''} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} placeholder="Type your answer..." />}
                      {q.type === 'short' && <Textarea value={answers[q.id] || ''} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} rows={3} />}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttempting(null)}>Close</Button>
            {attempting && !attempting.attempt && <Button onClick={submit} disabled={Object.keys(answers).length === 0}>Submit</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// -------- Payments (Teacher) --------
function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const now = new Date();
  const empty = { studentId: '', amount: '', month: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`, method: 'upi', transactionRef: '', notes: '', paymentDate: new Date().toISOString().slice(0,16) };
  const [form, setForm] = useState(empty);

  const load = async () => {
    try {
      const [p, s] = await Promise.all([api('/payments'), api('/students')]);
      setPayments(p.payments); setStudents(s.students);
    } catch (e) { toast.error(e.message); }
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    try { await api('/payments', { method: 'POST', body: form }); toast.success('Payment recorded'); setShowAdd(false); setForm(empty); load(); }
    catch (e) { toast.error(e.message); }
  };

  const del = async (id) => {
    if (!confirm('Delete this payment?')) return;
    try { await api(`/payments/${id}`, { method: 'DELETE' }); toast.success('Deleted'); load(); } catch (e) { toast.error(e.message); }
  };

  const monthTotal = payments.filter(p => p.month === form.month).reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Payments</h1><p className="text-muted-foreground text-sm">Record and track payments received</p></div>
        <Button onClick={() => { setForm(empty); setShowAdd(true); }} className="gap-1.5"><Plus className="w-4 h-4" />Record Payment</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Total Received</p><p className="text-2xl font-bold text-emerald-600 mt-1">{fmtMoney(payments.reduce((s, p) => s + p.amount, 0))}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">This Month</p><p className="text-2xl font-bold mt-1">{fmtMoney(monthTotal)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Total Payments</p><p className="text-2xl font-bold mt-1">{payments.length}</p></CardContent></Card>
      </div>

      <div className="grid gap-2">
        {payments.length === 0 ? <Card><CardContent className="p-8 text-center text-muted-foreground">No payments recorded yet.</CardContent></Card> : payments.map(p => (
          <Card key={p.id}><CardContent className="p-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <Avatar><AvatarFallback className="bg-primary/10 text-primary">{initials(p.studentName)}</AvatarFallback></Avatar>
              <div>
                <div className="font-semibold">{p.studentName}</div>
                <div className="text-xs text-muted-foreground">{p.month} · {p.method.toUpperCase()}{p.transactionRef && ` · ${p.transactionRef}`}</div>
                <div className="text-xs text-muted-foreground">Receipt {p.receiptNumber} · {new Date(p.paymentDate).toLocaleDateString('en-IN')}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right"><div className="text-lg font-bold text-emerald-600">{fmtMoney(p.amount)}</div></div>
              <Button size="icon" variant="ghost" onClick={() => del(p.id)}><Trash2 className="w-4 h-4" /></Button>
            </div>
          </CardContent></Card>
        ))}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Student</Label>
              <Select value={form.studentId} onValueChange={(v) => setForm({ ...form, studentId: v })}>
                <SelectTrigger><SelectValue placeholder="Choose student" /></SelectTrigger>
                <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Amount (₹)</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></div>
              <div className="space-y-1"><Label>For Month</Label><Input type="month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} /></div>
              <div className="space-y-1">
                <Label>Method</Label>
                <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Payment Date</Label><Input type="datetime-local" value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} /></div>
            </div>
            <div className="space-y-1"><Label>Transaction Ref (optional)</Label><Input value={form.transactionRef} onChange={(e) => setForm({ ...form, transactionRef: e.target.value })} placeholder="UPI ID, cheque number..." /></div>
            <div className="space-y-1"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={create} disabled={!form.studentId || !form.amount}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// -------- Calendar (Teacher) --------
function CalendarPage() {
  const [classes, setClasses] = useState([]);
  const [cursor, setCursor] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => { api('/classes').then(d => setClasses(d.classes)).catch(e => toast.error(e.message)); }, []);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const classesOn = (d) => classes.filter(c => {
    const s = new Date(c.startTime);
    return d && s.getFullYear() === d.getFullYear() && s.getMonth() === d.getMonth() && s.getDate() === d.getDate();
  });

  const monthLabel = cursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" onClick={() => setCursor(new Date(year, month - 1, 1))}><ChevronLeft className="w-4 h-4" /></Button>
          <div className="font-semibold min-w-[140px] text-center">{monthLabel}</div>
          <Button size="icon" variant="outline" onClick={() => setCursor(new Date(year, month + 1, 1))}><ChevronRight className="w-4 h-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>Today</Button>
        </div>
      </div>
      <Card><CardContent className="p-2 md:p-4">
        <div className="grid grid-cols-7 gap-1 text-xs text-center text-muted-foreground mb-2 font-medium">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            const onCells = d ? classesOn(d) : [];
            const isToday = d && d.toDateString() === new Date().toDateString();
            return (
              <button key={i} disabled={!d} onClick={() => d && setSelectedDay(d)} className={`aspect-square md:aspect-[4/3] p-1 md:p-2 rounded-md border text-left overflow-hidden transition ${!d ? 'invisible' : 'hover:border-primary'} ${isToday ? 'border-primary bg-blue-50' : 'border-slate-200'}`}>
                <div className={`text-sm ${isToday ? 'font-bold text-primary' : ''}`}>{d?.getDate()}</div>
                <div className="mt-1 space-y-0.5">
                  {onCells.slice(0, 2).map(c => (
                    <div key={c.id} className={`text-[10px] md:text-xs px-1 py-0.5 rounded truncate ${c.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : c.status === 'absent' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
                      {fmtTime(c.startTime)} {c.studentName.split(' ')[0]}
                    </div>
                  ))}
                  {onCells.length > 2 && <div className="text-[10px] text-muted-foreground">+{onCells.length - 2} more</div>}
                </div>
              </button>
            );
          })}
        </div>
      </CardContent></Card>

      <Dialog open={!!selectedDay} onOpenChange={(o) => { if (!o) setSelectedDay(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{selectedDay && fmtDateLong(selectedDay.toISOString())}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {selectedDay && classesOn(selectedDay).length === 0 ? <div className="text-center py-6 text-muted-foreground">No classes this day</div> :
              selectedDay && classesOn(selectedDay).map(c => <ClassCard key={c.id} cls={c} />)
            }
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// -------- CSV utils --------
function downloadCSV(filename, rows) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [cols.join(','), ...rows.map(r => cols.map(c => escape(r[c])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
  return lines.slice(1).map(l => {
    const cells = []; let cur = ''; let inQ = false;
    for (const ch of l) {
      if (ch === '"') inQ = !inQ;
      else if (ch === ',' && !inQ) { cells.push(cur); cur = ''; }
      else cur += ch;
    }
    cells.push(cur);
    const obj = {}; header.forEach((h, i) => { obj[h] = (cells[i] || '').replace(/^"|"$/g, ''); });
    return obj;
  });
}

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [showMobileMore, setShowMobileMore] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('cf_token');
    if (!token) { setLoading(false); return; }
    api('/auth/me').then(d => { setUser(d.user); setLoading(false); }).catch(() => { localStorage.clear(); setLoading(false); });
  }, []);

  useEffect(() => {
    if (user) setView(user.role === 'teacher' ? 'dashboard' : 'home');
  }, [user]);

  const logout = () => { localStorage.clear(); setUser(null); setShowLogin(false); };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-muted-foreground">Loading Language Scoop...</div></div>;
  if (!user) {
    if (!showLogin) return (<><LandingPage onSignIn={() => setShowLogin(true)} /><Toaster position="top-center" /></>);
    return (<><LoginScreen onLogin={setUser} onBack={() => setShowLogin(false)} /><Toaster position="top-center" /></>);
  }

  const teacherNav = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'calendar', label: 'Calendar', icon: CalendarDays },
    { key: 'classes', label: 'Classes', icon: ClipboardList },
    { key: 'students', label: 'Students', icon: Users },
    { key: 'homework', label: 'Homework', icon: BookOpen },
    { key: 'practice', label: 'Practice', icon: Brain },
    { key: 'billing', label: 'Billing', icon: IndianRupee },
    { key: 'payments', label: 'Payments', icon: Wallet },
  ];
  const studentNav = [
    { key: 'home', label: 'Home', icon: Home },
    { key: 'classes', label: 'Classes', icon: CalendarDays },
    { key: 'homework', label: 'Homework', icon: BookOpen },
    { key: 'practice', label: 'Practice', icon: Brain },
    { key: 'attendance', label: 'Attendance', icon: ClipboardList },
    { key: 'fees', label: 'Fees', icon: IndianRupee },
  ];
  const nav = user.role === 'teacher' ? teacherNav : studentNav;
  const displayNav = nav.length > 5 ? [...nav.slice(0, 4), { key: 'more', label: 'More', icon: MoreHorizontal }] : nav;

  const renderView = () => {
    if (user.role === 'teacher') {
      if (view === 'dashboard') return <TeacherDashboard onNavigate={setView} />;
      if (view === 'calendar') return <CalendarPage />;
      if (view === 'students') return <StudentsPage />;
      if (view === 'classes') return <ClassesPage />;
      if (view === 'homework') return <HomeworkPage />;
      if (view === 'practice') return <PracticePage />;
      if (view === 'billing') return <BillingPage />;
      if (view === 'payments') return <PaymentsPage />;
    } else {
      if (view === 'home') return <StudentHome onNavigate={setView} />;
      if (view === 'classes') return <StudentClasses />;
      if (view === 'homework') return <StudentHomework />;
      if (view === 'practice') return <StudentPractice />;
      if (view === 'attendance') return <StudentAttendance />;
      if (view === 'fees') return <StudentFees />;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="hidden md:flex w-64 flex-col bg-white border-r p-4">
        <div className="flex items-center gap-2 mb-6 px-2">
          <div className="w-9 h-9 rounded-lg bg-white ring-1 ring-slate-200 flex items-center justify-center overflow-hidden"><img src="/logo.png" alt="LS" className="w-7 h-7 object-contain" /></div>
          <div>
            <div className="font-bold">Language Scoop</div>
            <div className="text-xs text-muted-foreground capitalize">{user.role}</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          {nav.map(n => (
            <button key={n.key} onClick={() => setView(n.key)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${view === n.key ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-slate-100 text-slate-700'}`}>
              <n.icon className="w-4 h-4" />{n.label}
            </button>
          ))}
        </nav>
        <div className="border-t pt-3 mt-3 space-y-2">
          <div className="flex items-center gap-2 px-2">
            <Avatar className="w-8 h-8"><AvatarFallback className="bg-primary/10 text-primary text-xs">{initials(user.name)}</AvatarFallback></Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user.name}</div>
              <div className="text-xs text-muted-foreground truncate">{user.email}</div>
            </div>
          </div>
          <NotificationButton />
          <Button variant="outline" size="sm" onClick={logout} className="w-full gap-1.5"><LogOut className="w-3.5 h-3.5" />Sign out</Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden bg-white border-b p-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white ring-1 ring-slate-200 flex items-center justify-center overflow-hidden"><img src="/logo.png" alt="LS" className="w-6 h-6 object-contain" /></div>
            <div className="font-bold">Language Scoop</div>
          </div>
          <div className="flex items-center gap-1">
            <NotificationButton />
            <Button variant="ghost" size="sm" onClick={logout}><LogOut className="w-4 h-4" /></Button>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-6 pb-24 md:pb-6 overflow-y-auto">
          <div className="max-w-5xl mx-auto">{renderView()}</div>
        </div>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-20">
          <div className="grid" style={{ gridTemplateColumns: `repeat(${displayNav.length}, 1fr)` }}>
            {displayNav.map(n => {
              const isActive = view === n.key || (n.key === 'more' && nav.slice(4).some(sub => view === sub.key));
              return (
                <button
                  key={n.key}
                  onClick={() => {
                    if (n.key === 'more') {
                      setShowMobileMore(!showMobileMore);
                    } else {
                      setView(n.key);
                      setShowMobileMore(false);
                    }
                  }}
                  className={`flex flex-col items-center gap-1 py-2 text-xs ${isActive ? 'text-primary' : 'text-slate-500'}`}
                >
                  <n.icon className="w-5 h-5" />
                  <span>{n.label}</span>
                </button>
              );
            })}
          </div>

          {/* More menu drawer */}
          {showMobileMore && (
            <div className="fixed inset-0 bg-black/40 z-10" onClick={() => setShowMobileMore(false)}>
              <div
                className="absolute bottom-16 left-0 right-0 bg-white rounded-t-xl border-t p-4 space-y-2 animate-in slide-in-from-bottom duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-2 border-b">
                  <span className="font-semibold text-slate-700">More Pages</span>
                  <button onClick={() => setShowMobileMore(false)} className="p-1 hover:bg-slate-100 rounded">
                    <X className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-2">
                  {nav.slice(4).map(sub => {
                    const isSubActive = view === sub.key;
                    return (
                      <button
                        key={sub.key}
                        onClick={() => {
                          setView(sub.key);
                          setShowMobileMore(false);
                        }}
                        className={`flex flex-col items-center justify-center p-3 rounded-lg border gap-1.5 transition ${isSubActive ? 'bg-primary/10 border-primary text-primary font-medium' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'}`}
                      >
                        <sub.icon className="w-5 h-5" />
                        <span className="text-xs truncate w-full text-center">{sub.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </nav>
      </main>

      <Toaster position="top-center" />
    </div>
  );
}

export default App;
