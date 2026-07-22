'use client';

import { useState, useEffect, useMemo } from 'react';
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
  CheckCircle2, XCircle, AlertCircle, Sparkles, Check, Home, Send
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

const fmtTime = (iso) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
const fmtDateLong = (iso) => new Date(iso).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const fmtMoney = (n) => `₹${(n || 0).toLocaleString('en-IN')}`;
const initials = (name = '') => name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase();

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

function LoginScreen({ onLogin }) {
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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-3 shadow-lg shadow-primary/30">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">ClasseFlow</h1>
          <p className="text-muted-foreground mt-1">Never miss a class, never lose the Zoom link.</p>
        </div>
        <Card className="border-0 shadow-xl">
          <CardHeader>
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
            <div className="space-y-2"><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
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

function ClassCard({ cls, isStudent = false, onMarkAttendance }) {
  const countdown = useCountdown(cls.startTime);
  const isUpcoming = new Date(cls.startTime) > new Date();
  const isPast = new Date(cls.endTime) < new Date();
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
    const message = `Hi ${cls.studentName}, your French class is scheduled for ${fmtDate(cls.startTime)} at ${fmtTime(cls.startTime)}.${cls.meetingLink ? `\n\nJoin: ${cls.meetingLink}` : ''}${cls.meetingId ? `\nMeeting ID: ${cls.meetingId}` : ''}${cls.passcode ? `\nPasscode: ${cls.passcode}` : ''}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-lg font-semibold">{fmtTime(cls.startTime)}</span>
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
        <div className="mt-3 flex flex-wrap gap-2">
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
      </CardContent>
    </Card>
  );
}

function AttendanceDialog({ cls, open, onClose, onDone }) {
  const [status, setStatus] = useState('completed');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (cls) { setStatus('completed'); setNotes(cls.notes || ''); } }, [cls]);

  const save = async () => {
    setSaving(true);
    try {
      await api(`/classes/${cls.id}/attendance`, { method: 'POST', body: { status, notes } });
      toast.success('Attendance saved');
      onDone(); onClose();
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  if (!cls) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Did this class happen?</DialogTitle>
          <DialogDescription>{cls.studentName} · {fmtDate(cls.startTime)} at {fmtTime(cls.startTime)}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 py-2">
          {[
            { key: 'completed', label: 'Completed', icon: CheckCircle2, cls: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 text-emerald-900' },
            { key: 'absent', label: 'Student Absent', icon: XCircle, cls: 'bg-orange-50 border-orange-200 hover:bg-orange-100 text-orange-900' },
            { key: 'cancelled', label: 'Teacher Cancelled', icon: XCircle, cls: 'bg-slate-50 border-slate-200 hover:bg-slate-100' },
            { key: 'rescheduled', label: 'Rescheduled', icon: AlertCircle, cls: 'bg-amber-50 border-amber-200 hover:bg-amber-100 text-amber-900' },
          ].map(opt => (
            <button key={opt.key} onClick={() => setStatus(opt.key)}
              className={`p-3 rounded-lg border-2 text-left transition ${status === opt.key ? 'border-primary ring-2 ring-primary/20' : 'border-transparent'} ${opt.cls}`}>
              <opt.icon className="w-5 h-5 mb-1" />
              <div className="font-medium text-sm">{opt.label}</div>
            </button>
          ))}
        </div>
        <div className="space-y-2">
          <Label>Notes (optional)</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Lesson topic, homework given..." />
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
  const nextClass = data?.nextClass;
  const countdown = useCountdown(nextClass?.startTime);

  const load = async () => {
    try { setData(await api('/dashboard')); } catch (e) { toast.error(e.message); }
  };
  useEffect(() => { load(); }, []);

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
            {data.todayClasses.map(c => <ClassCard key={c.id} cls={c} onMarkAttendance={setAttCls} />)}
          </div>
        )}
      </div>

      <AttendanceDialog cls={attCls} open={!!attCls} onClose={() => setAttCls(null)} onDone={load} />
    </div>
  );
}

function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const empty = { name: '', email: '', phone: '', parentName: '', parentPhone: '', level: 'A1', mode: 'online', feePerClass: 800, defaultDuration: 60, permanentMeetingLink: '', permanentMeetingId: '', permanentMeetingPasscode: '', classroomLocation: '', notes: '' };
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

  const openEdit = (s) => { setSelected(s); setForm({ ...empty, ...s }); setShowAdd(true); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Students</h1><p className="text-muted-foreground text-sm">{students.length} total</p></div>
        <Button onClick={() => { setSelected(null); setForm(empty); setShowAdd(true); }} className="gap-1.5"><Plus className="w-4 h-4" />Add Student</Button>
      </div>
      {students.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No students yet.</CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {students.map(s => (
            <Card key={s.id} className="hover:shadow-md transition cursor-pointer" onClick={() => openEdit(s)}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="w-12 h-12"><AvatarFallback className="bg-primary/10 text-primary font-semibold">{initials(s.name)}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{s.name}</div>
                    <div className="text-sm text-muted-foreground truncate">{s.email}</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant="outline">Level {s.level}</Badge>
                      <Badge variant="outline" className="capitalize">{s.mode}</Badge>
                      <Badge variant="outline">{fmtMoney(s.feePerClass)}/class</Badge>
                    </div>
                    {s.permanentMeetingLink && s.mode !== 'offline' && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
                        <Check className="w-3 h-3" />Permanent {s.permanentMeetingPlatform === 'zoom' ? 'Zoom' : 'meeting'} link saved
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={(o) => { if (!o) { setShowAdd(false); setSelected(null); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected ? 'Edit Student' : 'Add New Student'}</DialogTitle>
            <DialogDescription>Store details, permanent Zoom link, and fee.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Full Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-1"><Label>Email {!selected && '(for login)'}</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!!selected} /></div>
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
              <div className="space-y-1"><Label>Duration (min)</Label><Input type="number" value={form.defaultDuration} onChange={(e) => setForm({ ...form, defaultDuration: Number(e.target.value) })} /></div>
            </div>
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
  const [filter, setFilter] = useState('upcoming');
  const empty = { studentId: '', startTime: '', duration: 60, mode: 'online', topic: '', useStudentLink: true, recurring: false, recurringDays: [], startDate: '', endDate: '', time: '17:00' };
  const [form, setForm] = useState(empty);

  const load = async () => {
    try {
      const [c, s] = await Promise.all([api('/classes'), api('/students')]);
      setClasses(c.classes); setStudents(s.students);
    } catch (e) { toast.error(e.message); }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const now = new Date();
    if (filter === 'upcoming') return classes.filter(c => new Date(c.startTime) >= now).sort((a,b) => new Date(a.startTime) - new Date(b.startTime));
    if (filter === 'past') return classes.filter(c => new Date(c.startTime) < now).sort((a,b) => new Date(b.startTime) - new Date(a.startTime));
    return classes;
  }, [classes, filter]);

  const create = async () => {
    try {
      const d = await api('/classes', { method: 'POST', body: form });
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

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No classes here yet.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map(c => (
            <div key={c.id}>
              <div className="text-xs text-muted-foreground mb-1 ml-1">{fmtDate(c.startTime)}</div>
              <ClassCard cls={c} onMarkAttendance={setAttCls} />
            </div>
          ))}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Schedule Class</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Student</Label>
              <Select value={form.studentId} onValueChange={(v) => {
                const s = students.find(x => x.id === v);
                setForm({ ...form, studentId: v, mode: s?.mode === 'hybrid' ? 'online' : (s?.mode || 'online'), duration: s?.defaultDuration || 60 });
              }}>
                <SelectTrigger><SelectValue placeholder="Choose student" /></SelectTrigger>
                <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.level})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Topic (optional)</Label><Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="Verb Conjugation..." /></div>

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
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1"><Label>Start</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
                  <div className="space-y-1"><Label>End</Label><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
                  <div className="space-y-1"><Label>Time</Label><Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></div>
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
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`);

  useEffect(() => { api(`/billing/summary?month=${month}`).then(setData).catch(e => toast.error(e.message)); }, [month]);

  const total = (data?.summaries || []).reduce((s, x) => s + x.totalDue, 0);
  const totalBillable = (data?.summaries || []).reduce((s, x) => s + x.billable, 0);

  const shareWhatsapp = (s) => {
    const msg = `Fee Summary - ${s.studentName} - ${month}\n\nBillable classes: ${s.billable}\nFee per class: ${fmtMoney(s.feePerClass)}\n*Total Due: ${fmtMoney(s.totalDue)}*`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold">Billing & Fees</h1><p className="text-muted-foreground text-sm">Monthly billable class calculation</p></div>
        <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-auto" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Total Due</p><p className="text-2xl font-bold text-emerald-600 mt-1">{fmtMoney(total)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Billable</p><p className="text-2xl font-bold mt-1">{totalBillable}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Students</p><p className="text-2xl font-bold mt-1">{data?.summaries?.length || 0}</p></CardContent></Card>
      </div>
      <div className="grid gap-3">
        {(data?.summaries || []).map(s => (
          <Card key={s.studentId}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <Avatar><AvatarFallback className="bg-primary/10 text-primary">{initials(s.studentName)}</AvatarFallback></Avatar>
                  <div>
                    <div className="font-semibold">{s.studentName}</div>
                    <div className="text-sm text-muted-foreground">Level {s.level} · {fmtMoney(s.feePerClass)}/class</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-emerald-600">{fmtMoney(s.totalDue)}</div>
                  <div className="text-xs text-muted-foreground">{s.billable} × {fmtMoney(s.feePerClass)}</div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                <div className="p-2 bg-slate-50 rounded"><div className="text-muted-foreground text-xs">Scheduled</div><div className="font-semibold">{s.scheduled}</div></div>
                <div className="p-2 bg-blue-50 rounded"><div className="text-blue-700 text-xs">Completed</div><div className="font-semibold">{s.completed}</div></div>
                <div className="p-2 bg-emerald-50 rounded"><div className="text-emerald-700 text-xs">Billable</div><div className="font-semibold">{s.billable}</div></div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => shareWhatsapp(s)} className="gap-1.5"><Send className="w-4 h-4" />Share on WhatsApp</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function HomeworkPage() {
  const [items, setItems] = useState([]);
  const [students, setStudents] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [review, setReview] = useState(null);
  const [form, setForm] = useState({ studentId: '', title: '', instructions: '', dueDate: '' });

  const load = async () => {
    try {
      const [h, s] = await Promise.all([api('/homework'), api('/students')]);
      setItems(h.homework); setStudents(s.students);
    } catch (e) { toast.error(e.message); }
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    try { await api('/homework', { method: 'POST', body: form }); toast.success('Homework assigned'); setShowAdd(false); setForm({ studentId: '', title: '', instructions: '', dueDate: '' }); load(); }
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
                    {h.submissionText && (
                      <div className="mt-2 p-3 bg-slate-50 rounded text-sm">
                        <div className="text-xs text-muted-foreground mb-1">Submission:</div>{h.submissionText}
                      </div>
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
  const next = data?.upcoming?.[0];
  const countdown = useCountdown(next?.startTime);

  useEffect(() => { api('/student/dashboard').then(setData).catch(e => toast.error(e.message)); }, []);
  if (!data) return <div className="p-6 text-muted-foreground">Loading...</div>;

  const pendingHw = data.homework.filter(h => h.status === 'assigned');
  const feeDue = data.monthlyBillable * (data.feePerClass || 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Bonjour, {data.student.name.split(' ')[0]}! 👋</h1>
        <p className="text-muted-foreground">{fmtDateLong(new Date().toISOString())}</p>
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
          <div className="text-xs text-muted-foreground uppercase">This Month</div>
          <div className="text-2xl font-bold mt-1">{data.monthlyCompleted}</div>
          <div className="text-xs text-muted-foreground">classes attended</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Fee Status</div>
          <div className="text-2xl font-bold mt-1 text-emerald-600">{fmtMoney(feeDue)}</div>
          <div className="text-xs text-muted-foreground">{data.monthlyBillable} billable</div>
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

  const load = async () => { try { const d = await api('/homework'); setItems(d.homework); } catch (e) { toast.error(e.message); } };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    try {
      await api(`/homework/${selected.id}/submit`, { method: 'POST', body: { submissionText } });
      toast.success('Homework submitted!'); setSelected(null); setSubmissionText(''); load();
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
          <Card key={h.id} className="cursor-pointer hover:shadow-md" onClick={() => { setSelected(h); setSubmissionText(h.submissionText || ''); }}>
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
        <DialogContent>
          <DialogHeader><DialogTitle>{selected?.title}</DialogTitle><DialogDescription>Due {selected?.dueDate ? fmtDate(selected.dueDate) : '—'}</DialogDescription></DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="text-sm p-3 bg-slate-50 rounded">{selected.instructions}</div>
              <div className="space-y-1">
                <Label>Your submission</Label>
                <Textarea value={submissionText} onChange={(e) => setSubmissionText(e.target.value)} rows={6} disabled={selected.status === 'reviewed'} placeholder="Type your answer here..." />
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
            {selected?.status !== 'reviewed' && <Button onClick={submit} disabled={!submissionText.trim()}>{selected?.status === 'submitted' ? 'Resubmit' : 'Submit'}</Button>}
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
  const due = data.monthlyBillable * (data.feePerClass || 0);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Fees</h1>
      <Card className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white border-0">
        <CardContent className="p-6">
          <div className="text-emerald-100 text-sm">Current month due</div>
          <div className="text-4xl font-bold mt-1">{fmtMoney(due)}</div>
          <div className="text-emerald-100 mt-1">{data.monthlyBillable} billable × {fmtMoney(data.feePerClass)}</div>
        </CardContent>
      </Card>
      <Card><CardContent className="p-4 space-y-2">
        <div className="flex justify-between"><span className="text-muted-foreground">Fee per class</span><span className="font-medium">{fmtMoney(data.feePerClass)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Classes attended this month</span><span className="font-medium">{data.monthlyCompleted}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Billable classes</span><span className="font-medium">{data.monthlyBillable}</span></div>
        <Separator />
        <div className="flex justify-between text-lg"><span className="font-semibold">Total Due</span><span className="font-bold text-emerald-600">{fmtMoney(due)}</span></div>
      </CardContent></Card>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('cf_token');
    if (!token) { setLoading(false); return; }
    api('/auth/me').then(d => { setUser(d.user); setLoading(false); }).catch(() => { localStorage.clear(); setLoading(false); });
  }, []);

  useEffect(() => {
    if (user) setView(user.role === 'teacher' ? 'dashboard' : 'home');
  }, [user]);

  const logout = () => { localStorage.clear(); setUser(null); };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-muted-foreground">Loading ClasseFlow...</div></div>;
  if (!user) return (<><LoginScreen onLogin={setUser} /><Toaster position="top-center" /></>);

  const teacherNav = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'classes', label: 'Classes', icon: CalendarDays },
    { key: 'students', label: 'Students', icon: Users },
    { key: 'homework', label: 'Homework', icon: BookOpen },
    { key: 'billing', label: 'Billing', icon: IndianRupee },
  ];
  const studentNav = [
    { key: 'home', label: 'Home', icon: Home },
    { key: 'classes', label: 'Classes', icon: CalendarDays },
    { key: 'homework', label: 'Homework', icon: BookOpen },
    { key: 'attendance', label: 'Attendance', icon: ClipboardList },
    { key: 'fees', label: 'Fees', icon: IndianRupee },
  ];
  const nav = user.role === 'teacher' ? teacherNav : studentNav;

  const renderView = () => {
    if (user.role === 'teacher') {
      if (view === 'dashboard') return <TeacherDashboard onNavigate={setView} />;
      if (view === 'students') return <StudentsPage />;
      if (view === 'classes') return <ClassesPage />;
      if (view === 'homework') return <HomeworkPage />;
      if (view === 'billing') return <BillingPage />;
    } else {
      if (view === 'home') return <StudentHome onNavigate={setView} />;
      if (view === 'classes') return <StudentClasses />;
      if (view === 'homework') return <StudentHomework />;
      if (view === 'attendance') return <StudentAttendance />;
      if (view === 'fees') return <StudentFees />;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="hidden md:flex w-64 flex-col bg-white border-r p-4">
        <div className="flex items-center gap-2 mb-6 px-2">
          <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center"><GraduationCap className="w-5 h-5" /></div>
          <div>
            <div className="font-bold">ClasseFlow</div>
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
          <Button variant="outline" size="sm" onClick={logout} className="w-full gap-1.5"><LogOut className="w-3.5 h-3.5" />Sign out</Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden bg-white border-b p-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center"><GraduationCap className="w-4 h-4" /></div>
            <div className="font-bold">ClasseFlow</div>
          </div>
          <Button variant="ghost" size="sm" onClick={logout}><LogOut className="w-4 h-4" /></Button>
        </header>

        <div className="flex-1 p-4 md:p-6 pb-24 md:pb-6 overflow-y-auto">
          <div className="max-w-5xl mx-auto">{renderView()}</div>
        </div>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-20">
          <div className="grid" style={{ gridTemplateColumns: `repeat(${nav.length}, 1fr)` }}>
            {nav.map(n => (
              <button key={n.key} onClick={() => setView(n.key)} className={`flex flex-col items-center gap-1 py-2 text-xs ${view === n.key ? 'text-primary' : 'text-slate-500'}`}>
                <n.icon className="w-5 h-5" />
                <span>{n.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </main>

      <Toaster position="top-center" />
    </div>
  );
}

export default App;
