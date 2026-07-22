import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import webpush from 'web-push';

const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME || (process.env.NODE_ENV === 'test' ? 'classeflow_test' : 'classeflow');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';



if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

async function sendPushToUser(database, userId, payload) {
  const subs = await database.collection('push_subscriptions').find({ userId }).toArray();
  const body = JSON.stringify(payload);
  await Promise.all(subs.map(async (sub) => {
    try {
      await webpush.sendNotification(sub.subscription, body);
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) {
        await database.collection('push_subscriptions').deleteOne({ _id: sub._id });
      }
    }
  }));
}

let client;
let db;
async function getDb() {
  if (db) return db;
  client = new MongoClient(MONGO_URL);
  await client.connect();
  db = client.db(DB_NAME);
  return db;
}

function json(data, status = 200) {
  return NextResponse.json(data, { status });
}

function detectPlatform(url = '') {
  const u = (url || '').toLowerCase();
  if (u.includes('zoom.us')) return 'zoom';
  if (u.includes('meet.google.com')) return 'google_meet';
  if (u.includes('teams.microsoft') || u.includes('teams.live')) return 'ms_teams';
  if (u.startsWith('http')) return 'other';
  return null;
}

async function getAuthUser(request) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const database = await getDb();
    const user = await database.collection('users').findOne({ id: decoded.userId });
    if (!user) return null;
    delete user.password;
    return user;
  } catch (e) {
    return null;
  }
}

function signToken(userId, role) {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '30d' });
}

// ---------- Seed demo data ----------
async function ensureSeed() {
  const database = await getDb();
  const existing = await database.collection('users').findOne({ email: 'teacher@demo.com' });
  if (existing) return existing.id;

  const teacherId = uuidv4();
  const teacherPw = await bcrypt.hash('demo1234', 10);
  await database.collection('users').insertOne({
    id: teacherId,
    email: 'teacher@demo.com',
    password: teacherPw,
    role: 'teacher',
    name: 'Ms. Sharma',
    academyName: 'Bonjour French Academy',
    currency: 'INR',
    createdAt: new Date().toISOString(),
  });

  // Create students
  const studentsSeed = [
    { name: 'Riya Sharma', email: 'riya@demo.com', level: 'A1', feePerClass: 800, phone: '+91 98765 43210', mode: 'online' },
    { name: 'Aarav Patel', email: 'aarav@demo.com', level: 'A2', feePerClass: 900, phone: '+91 98111 12345', mode: 'hybrid' },
    { name: 'Sneha Kapoor', email: 'sneha@demo.com', level: 'B1', feePerClass: 1000, phone: '+91 98222 22222', mode: 'offline' },
  ];
  const studentDocs = [];
  for (const s of studentsSeed) {
    const sId = uuidv4();
    const pw = await bcrypt.hash('demo1234', 10);
    await database.collection('users').insertOne({
      id: sId,
      email: s.email,
      password: pw,
      role: 'student',
      name: s.name,
      teacherId,
      createdAt: new Date().toISOString(),
    });
    const studentDoc = {
      id: uuidv4(),
      userId: sId,
      teacherId,
      name: s.name,
      email: s.email,
      phone: s.phone,
      parentName: '',
      parentPhone: '',
      level: s.level,
      mode: s.mode,
      classType: 'individual',
      feePerClass: s.feePerClass,
      defaultDuration: 60,
      permanentMeetingLink: s.mode !== 'offline' ? 'https://zoom.us/j/1234567890?pwd=demoPass' : '',
      permanentMeetingPlatform: s.mode !== 'offline' ? 'zoom' : '',
      permanentMeetingId: s.mode !== 'offline' ? '1234567890' : '',
      permanentMeetingPasscode: s.mode !== 'offline' ? 'french' : '',
      classroomLocation: s.mode !== 'online' ? 'Room 2, Bonjour Academy, Bandra West, Mumbai' : '',
      joiningDate: new Date().toISOString(),
      status: 'active',
      notes: '',
      createdAt: new Date().toISOString(),
    };
    await database.collection('students').insertOne(studentDoc);
    studentDocs.push(studentDoc);
  }

  // Create classes: today + next few days
  const now = new Date();
  const mkDate = (dayOffset, hour, minute = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };
  const classesSeed = [
    { student: studentDocs[0], start: mkDate(0, Math.max(now.getHours() + 1, 10)), topic: 'Les Salutations (Greetings)' },
    { student: studentDocs[1], start: mkDate(0, Math.max(now.getHours() + 3, 14)), topic: 'Verb Conjugation - être' },
    { student: studentDocs[2], start: mkDate(1, 17), topic: 'Reading: Le Petit Prince' },
    { student: studentDocs[0], start: mkDate(2, 17), topic: 'Numbers 1-100' },
    { student: studentDocs[1], start: mkDate(3, 15), topic: 'Present Tense Practice' },
  ];
  // Past classes
  const pastSeed = [
    { student: studentDocs[0], start: mkDate(-2, 17), topic: 'Alphabet Français', status: 'completed', billable: true },
    { student: studentDocs[0], start: mkDate(-5, 17), topic: 'Introduction', status: 'completed', billable: true },
    { student: studentDocs[1], start: mkDate(-3, 14), topic: 'Basic Vocabulary', status: 'completed', billable: true },
    { student: studentDocs[2], start: mkDate(-4, 17), topic: 'Grammar Basics', status: 'completed', billable: true },
  ];
  for (const c of [...classesSeed, ...pastSeed]) {
    const s = c.student;
    const startDate = new Date(c.start);
    const endDate = new Date(startDate.getTime() + s.defaultDuration * 60000);
    await database.collection('classes').insertOne({
      id: uuidv4(),
      teacherId,
      studentId: s.id,
      studentName: s.name,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      duration: s.defaultDuration,
      mode: s.mode === 'hybrid' ? 'online' : s.mode,
      platform: s.permanentMeetingPlatform,
      meetingLink: s.permanentMeetingLink,
      meetingId: s.permanentMeetingId,
      passcode: s.permanentMeetingPasscode,
      classroomLocation: s.classroomLocation,
      topic: c.topic,
      status: c.status || 'upcoming',
      billable: c.billable || false,
      feeSnapshot: s.feePerClass,
      notes: '',
      createdAt: new Date().toISOString(),
    });
  }

  // Homework seed
  await database.collection('homework').insertOne({
    id: uuidv4(),
    teacherId,
    studentId: studentDocs[0].id,
    title: 'Practice greetings - write 5 sentences',
    instructions: 'Write 5 different French greetings you learned today. Include time-of-day appropriate greetings.',
    dueDate: mkDate(2, 20),
    status: 'assigned',
    submissionText: '',
    feedback: '',
    score: null,
    createdAt: new Date().toISOString(),
  });

  return teacherId;
}

const ALLOWED_TYPES = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'text/plain': ['.txt'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx']
};

function validateUpload(name, type, size, dataUrl) {
  if (!name || !type || !dataUrl) {
    return 'Missing required file fields';
  }
  if (size > 5 * 1024 * 1024) {
    return 'File too large (max 5MB)';
  }
  const parts = name.split('.');
  if (parts.length > 2) {
    return 'Double extensions are not allowed';
  }
  if (name.includes('/') || name.includes('\\') || name.includes('..')) {
    return 'Invalid characters in filename';
  }
  const allowedExts = ALLOWED_TYPES[type];
  if (!allowedExts) {
    return 'File type not allowed';
  }
  const lastDotIdx = name.lastIndexOf('.');
  if (lastDotIdx === -1) {
    return 'Missing file extension';
  }
  const ext = name.slice(lastDotIdx).toLowerCase();
  if (!allowedExts.includes(ext)) {
    return 'Filename extension does not match file type';
  }
  const dataUrlPrefix = `data:${type};base64,`;
  if (!dataUrl.startsWith(dataUrlPrefix)) {
    return 'MIME type mismatch in file contents';
  }
  return null;
}

function sanitizeFilename(name) {
  const lastDotIdx = name.lastIndexOf('.');
  const ext = name.slice(lastDotIdx).toLowerCase();
  const base = name.slice(0, lastDotIdx);
  const safeBase = base.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${safeBase}${ext}`;
}

// ------------- Route Handlers ----------------
async function handle(request, context) {
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.MONGO_URL) {
      console.error('FATAL: MONGO_URL environment variable is not defined for production.');
      throw new Error('Database configuration error: missing MONGO_URL');
    }
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'dev-secret' || process.env.JWT_SECRET.length < 16) {
      console.error('FATAL: Secure JWT_SECRET must be explicitly configured in production environment (minimum 16 characters).');
      throw new Error('Auth configuration error: missing or insecure JWT_SECRET');
    }
  }

  const database = await getDb();
  if (process.env.NODE_ENV !== 'production') {
    await ensureSeed();
  }

  const method = request.method;
  const params = await context.params;
  const pathParts = (params?.path || []);
  const route = pathParts.join('/');
  const url = new URL(request.url);

  let body = {};
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    try { body = await request.json(); } catch (e) { body = {}; }
  }

  try {
    // ---- AUTH ----
    if (route === 'auth/register' && method === 'POST') {
      const { email, password, name, academyName } = body;
      if (!email || !password || !name) return json({ error: 'Missing fields' }, 400);
      const exists = await database.collection('users').findOne({ email });
      if (exists) return json({ error: 'Email already registered' }, 400);
      const id = uuidv4();
      const hashed = await bcrypt.hash(password, 10);
      await database.collection('users').insertOne({
        id, email, password: hashed, role: 'teacher', name,
        academyName: academyName || '', currency: 'INR', createdAt: new Date().toISOString()
      });
      const token = signToken(id, 'teacher');
      return json({ token, user: { id, email, name, role: 'teacher', academyName } });
    }

    if (route === 'auth/login' && method === 'POST') {
      const { email, password } = body;
      const user = await database.collection('users').findOne({ email });
      if (!user) return json({ error: 'Invalid credentials' }, 401);
      const ok = await bcrypt.compare(password, user.password);
      if (!ok) return json({ error: 'Invalid credentials' }, 401);
      const token = signToken(user.id, user.role);
      const { password: _pw, ...safe } = user;
      return json({ token, user: safe });
    }

    if (route === 'auth/me' && method === 'GET') {
      const user = await getAuthUser(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      return json({ user });
    }



    // From here, require auth
    const user = await getAuthUser(request);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    // ---- STUDENTS (teacher) ----
    if (route === 'students' && method === 'GET') {
      if (user.role !== 'teacher') return json({ error: 'Forbidden' }, 403);
      const students = await database.collection('students').find({ teacherId: user.id }).sort({ createdAt: -1 }).toArray();
      return json({ students });
    }

    if (route === 'students' && method === 'POST') {
      if (user.role !== 'teacher') return json({ error: 'Forbidden' }, 403);
      const b = body;
      // Create user account for student
      const sUserId = uuidv4();
      let studentEmail = b.email;
      if (studentEmail) {
        const existingU = await database.collection('users').findOne({ email: studentEmail });
        if (existingU) return json({ error: 'Student email already registered' }, 400);
      }
      const tempPw = b.password || 'demo1234';
      const hashed = await bcrypt.hash(tempPw, 10);
      if (studentEmail) {
        await database.collection('users').insertOne({
          id: sUserId, email: studentEmail, password: hashed, role: 'student',
          name: b.name, teacherId: user.id, createdAt: new Date().toISOString(),
        });
      }
      const doc = {
        id: uuidv4(),
        userId: studentEmail ? sUserId : null,
        teacherId: user.id,
        name: b.name || '',
        email: b.email || '',
        phone: b.phone || '',
        parentName: b.parentName || '',
        parentPhone: b.parentPhone || '',
        level: b.level || 'A1',
        mode: b.mode || 'online',
        classType: b.classType || 'individual',
        feePerClass: Number(b.feePerClass) || 0,
        defaultDuration: Number(b.defaultDuration) || 60,
        permanentMeetingLink: b.permanentMeetingLink || '',
        permanentMeetingPlatform: detectPlatform(b.permanentMeetingLink) || '',
        permanentMeetingId: b.permanentMeetingId || '',
        permanentMeetingPasscode: b.permanentMeetingPasscode || '',
        classroomLocation: b.classroomLocation || '',
        joiningDate: b.joiningDate || new Date().toISOString(),
        status: 'active',
        notes: b.notes || '',
        createdAt: new Date().toISOString(),
      };
      await database.collection('students').insertOne(doc);
      return json({ student: doc, tempPassword: b.email ? tempPw : null });
    }

    if (route.startsWith('students/') && method === 'GET') {
      const id = pathParts[1];
      const student = await database.collection('students').findOne({ id });
      if (!student) return json({ error: 'Not found' }, 404);
      if (user.role === 'teacher' && student.teacherId !== user.id) return json({ error: 'Forbidden' }, 403);
      if (user.role === 'student' && student.userId !== user.id) return json({ error: 'Forbidden' }, 403);
      return json({ student });
    }

    if (route.startsWith('students/') && method === 'PUT') {
      if (user.role !== 'teacher') return json({ error: 'Forbidden' }, 403);
      const id = pathParts[1];
      const student = await database.collection('students').findOne({ id });
      if (!student || student.teacherId !== user.id) return json({ error: 'Not found' }, 404);
      const b = body;
      const updates = {
        name: b.name ?? student.name,
        phone: b.phone ?? student.phone,
        parentName: b.parentName ?? student.parentName,
        parentPhone: b.parentPhone ?? student.parentPhone,
        level: b.level ?? student.level,
        mode: b.mode ?? student.mode,
        feePerClass: Number(b.feePerClass ?? student.feePerClass),
        defaultDuration: Number(b.defaultDuration ?? student.defaultDuration),
        permanentMeetingLink: b.permanentMeetingLink ?? student.permanentMeetingLink,
        permanentMeetingPlatform: detectPlatform(b.permanentMeetingLink ?? student.permanentMeetingLink) || '',
        permanentMeetingId: b.permanentMeetingId ?? student.permanentMeetingId,
        permanentMeetingPasscode: b.permanentMeetingPasscode ?? student.permanentMeetingPasscode,
        classroomLocation: b.classroomLocation ?? student.classroomLocation,
        status: b.status ?? student.status,
        notes: b.notes ?? student.notes,
      };
      await database.collection('students').updateOne({ id }, { $set: updates });
      const updated = await database.collection('students').findOne({ id });
      return json({ student: updated });
    }

    if (route.startsWith('students/') && method === 'DELETE') {
      if (user.role !== 'teacher') return json({ error: 'Forbidden' }, 403);
      const id = pathParts[1];
      const student = await database.collection('students').findOne({ id });
      if (!student || student.teacherId !== user.id) return json({ error: 'Not found' }, 404);
      await database.collection('students').deleteOne({ id });
      await database.collection('classes').deleteMany({ studentId: id });
      return json({ ok: true });
    }

    // ---- CLASSES ----
    if (route === 'classes' && method === 'GET') {
      let filter = {};
      if (user.role === 'teacher') filter.teacherId = user.id;
      else {
        const student = await database.collection('students').findOne({ userId: user.id });
        if (!student) return json({ classes: [] });
        filter.studentId = student.id;
      }
      const from = url.searchParams.get('from');
      const to = url.searchParams.get('to');
      if (from) filter.startTime = { ...(filter.startTime || {}), $gte: from };
      if (to) filter.startTime = { ...(filter.startTime || {}), $lte: to };
      const classes = await database.collection('classes').find(filter).sort({ startTime: 1 }).toArray();
      return json({ classes });
    }

    if (route === 'classes' && method === 'POST') {
      if (user.role !== 'teacher') return json({ error: 'Forbidden' }, 403);
      const b = body;
      const student = await database.collection('students').findOne({ id: b.studentId, teacherId: user.id });
      if (!student) return json({ error: 'Student not found' }, 404);

      // Build occurrence dates
      const startTimes = [];
      if (b.recurring && Array.isArray(b.recurringDays) && b.recurringDays.length > 0) {
        const start = new Date(b.startDate);
        const end = new Date(b.endDate || new Date(start.getTime() + 90 * 24 * 3600 * 1000));
        const [hh, mm] = (b.time || '17:00').split(':').map(Number);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          if (b.recurringDays.includes(d.getDay())) {
            const occ = new Date(d);
            occ.setHours(hh, mm, 0, 0);
            startTimes.push(new Date(occ));
          }
        }
      } else {
        startTimes.push(new Date(b.startTime));
      }

      const duration = Number(b.duration) || student.defaultDuration || 60;
      const mode = b.mode || student.mode || 'online';
      const useLink = b.useStudentLink !== false;
      const meetingLink = useLink ? student.permanentMeetingLink : (b.meetingLink || '');
      const platform = useLink ? student.permanentMeetingPlatform : (detectPlatform(b.meetingLink) || '');

      const created = [];
      for (const st of startTimes) {
        const doc = {
          id: uuidv4(),
          teacherId: user.id,
          studentId: student.id,
          studentName: student.name,
          startTime: st.toISOString(),
          endTime: new Date(st.getTime() + duration * 60000).toISOString(),
          duration,
          mode: mode === 'hybrid' ? 'online' : mode,
          platform: mode === 'offline' ? '' : platform,
          meetingLink: mode === 'offline' ? '' : meetingLink,
          meetingId: mode === 'offline' ? '' : (useLink ? student.permanentMeetingId : b.meetingId || ''),
          passcode: mode === 'offline' ? '' : (useLink ? student.permanentMeetingPasscode : b.passcode || ''),
          classroomLocation: mode === 'online' ? '' : (b.classroomLocation || student.classroomLocation || ''),
          topic: b.topic || '',
          status: 'upcoming',
          billable: false,
          feeSnapshot: student.feePerClass,
          notes: '',
          createdAt: new Date().toISOString(),
        };
        await database.collection('classes').insertOne(doc);
        created.push(doc);
      }
      return json({ classes: created });
    }

    if (route.startsWith('classes/') && pathParts.length === 2 && method === 'PUT') {
      if (user.role !== 'teacher') return json({ error: 'Forbidden' }, 403);
      const id = pathParts[1];
      const cls = await database.collection('classes').findOne({ id });
      if (!cls || cls.teacherId !== user.id) return json({ error: 'Not found' }, 404);
      const b = body;
      const updates = {};
      if (b.startTime) {
        updates.startTime = new Date(b.startTime).toISOString();
        updates.endTime = new Date(new Date(b.startTime).getTime() + (b.duration || cls.duration) * 60000).toISOString();
      }
      ['topic','notes','meetingLink','meetingId','passcode','classroomLocation','mode','duration'].forEach(k => {
        if (b[k] !== undefined) updates[k] = b[k];
      });
      if (b.meetingLink !== undefined) updates.platform = detectPlatform(b.meetingLink) || '';
      await database.collection('classes').updateOne({ id }, { $set: updates });
      const updated = await database.collection('classes').findOne({ id });
      return json({ class: updated });
    }

    if (route.startsWith('classes/') && pathParts.length === 2 && method === 'DELETE') {
      if (user.role !== 'teacher') return json({ error: 'Forbidden' }, 403);
      const id = pathParts[1];
      await database.collection('classes').deleteOne({ id, teacherId: user.id });
      return json({ ok: true });
    }

    if (route.startsWith('classes/') && pathParts[2] === 'attendance' && method === 'POST') {
      if (user.role !== 'teacher') return json({ error: 'Forbidden' }, 403);
      const id = pathParts[1];
      const cls = await database.collection('classes').findOne({ id });
      if (!cls || cls.teacherId !== user.id) return json({ error: 'Not found' }, 404);
      const { status, notes } = body; // completed | absent | cancelled | rescheduled
      const billableMap = { completed: true, absent: false, cancelled: false, rescheduled: false };
      await database.collection('classes').updateOne({ id }, { $set: { status, notes: notes || cls.notes || '', billable: billableMap[status] ?? false } });
      const updated = await database.collection('classes').findOne({ id });
      return json({ class: updated });
    }

    // ---- BILLING ----
    if (route === 'billing/summary' && method === 'GET') {
      if (user.role !== 'teacher') return json({ error: 'Forbidden' }, 403);
      const monthParam = url.searchParams.get('month'); // YYYY-MM
      const now = new Date();
      const y = monthParam ? Number(monthParam.split('-')[0]) : now.getFullYear();
      const m = monthParam ? Number(monthParam.split('-')[1]) - 1 : now.getMonth();
      const start = new Date(y, m, 1).toISOString();
      const end = new Date(y, m + 1, 1).toISOString();
      const students = await database.collection('students').find({ teacherId: user.id }).toArray();
      const summaries = [];
      for (const s of students) {
        const classes = await database.collection('classes').find({ teacherId: user.id, studentId: s.id, startTime: { $gte: start, $lt: end } }).toArray();
        const scheduled = classes.length;
        const completed = classes.filter(c => c.status === 'completed').length;
        const billable = classes.filter(c => c.billable).length;
        const totalDue = billable * (s.feePerClass || 0);
        summaries.push({
          studentId: s.id, studentName: s.name, level: s.level,
          scheduled, completed, billable, feePerClass: s.feePerClass, totalDue,
        });
      }
      return json({ month: `${y}-${String(m+1).padStart(2,'0')}`, summaries });
    }

    // ---- STUDENT PORTAL ----
    if (route === 'student/me' && method === 'GET') {
      if (user.role !== 'student') return json({ error: 'Forbidden' }, 403);
      const student = await database.collection('students').findOne({ userId: user.id });
      if (!student) return json({ error: 'Not found' }, 404);
      const teacher = await database.collection('users').findOne({ id: student.teacherId });
      const teacherInfo = teacher ? { name: teacher.name, academyName: teacher.academyName } : null;
      return json({ student, teacher: teacherInfo });
    }

    if (route === 'student/dashboard' && method === 'GET') {
      if (user.role !== 'student') return json({ error: 'Forbidden' }, 403);
      const student = await database.collection('students').findOne({ userId: user.id });
      if (!student) return json({ error: 'Not found' }, 404);
      const now = new Date().toISOString();
      const upcoming = await database.collection('classes').find({ studentId: student.id, startTime: { $gte: now } }).sort({ startTime: 1 }).limit(5).toArray();
      const past = await database.collection('classes').find({ studentId: student.id, startTime: { $lt: now } }).sort({ startTime: -1 }).limit(20).toArray();
      const monthStart = new Date();
      monthStart.setDate(1); monthStart.setHours(0,0,0,0);
      const thisMonth = await database.collection('classes').find({ studentId: student.id, startTime: { $gte: monthStart.toISOString() } }).toArray();
      const monthlyCompleted = thisMonth.filter(c => c.status === 'completed').length;
      const monthlyBillable = thisMonth.filter(c => c.billable).length;
      const homework = await database.collection('homework').find({ studentId: student.id }).sort({ createdAt: -1 }).toArray();
      return json({ student, upcoming, past, monthlyCompleted, monthlyBillable, feePerClass: student.feePerClass, homework });
    }

    // ---- HOMEWORK ----
    if (route === 'homework' && method === 'GET') {
      let filter = {};
      if (user.role === 'teacher') filter.teacherId = user.id;
      else {
        const student = await database.collection('students').findOne({ userId: user.id });
        if (!student) return json({ homework: [] });
        filter.studentId = student.id;
      }
      const homework = await database.collection('homework').find(filter).sort({ createdAt: -1 }).toArray();
      return json({ homework });
    }

    if (route === 'homework' && method === 'POST') {
      if (user.role !== 'teacher') return json({ error: 'Forbidden' }, 403);
      const b = body;
      const student = await database.collection('students').findOne({ id: b.studentId, teacherId: user.id });
      if (!student) return json({ error: 'Student not found' }, 404);
      const doc = {
        id: uuidv4(),
        teacherId: user.id,
        studentId: student.id,
        classId: b.classId || null,
        title: b.title || '',
        instructions: b.instructions || '',
        dueDate: b.dueDate ? new Date(b.dueDate).toISOString() : null,
        status: 'assigned',
        attachments: b.attachments || [],
        submissionText: '',
        submissionAttachments: [],
        feedback: '',
        score: null,
        createdAt: new Date().toISOString(),
      };
      await database.collection('homework').insertOne(doc);
      // Push notification to student
      if (student.userId) {
        try {
          await sendPushToUser(database, student.userId, {
            title: '📚 New homework assigned',
            body: `${doc.title}${doc.dueDate ? ` · Due ${new Date(doc.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}`,
            url: '/',
            tag: `homework-${doc.id}`,
          });
        } catch (e) {}
      }
      return json({ homework: doc });
    }

    if (route.startsWith('homework/') && pathParts[2] === 'submit' && method === 'POST') {
      if (user.role !== 'student') return json({ error: 'Forbidden' }, 403);
      const id = pathParts[1];
      const student = await database.collection('students').findOne({ userId: user.id });
      const hw = await database.collection('homework').findOne({ id });
      if (!hw || hw.studentId !== student.id) return json({ error: 'Not found' }, 404);
      await database.collection('homework').updateOne({ id }, { $set: { submissionText: body.submissionText || '', submissionAttachments: body.submissionAttachments || [], status: 'submitted', submittedAt: new Date().toISOString() } });
      const updated = await database.collection('homework').findOne({ id });
      // Notify teacher
      try {
        await sendPushToUser(database, hw.teacherId, {
          title: '✅ Homework submitted',
          body: `${student.name} submitted: ${hw.title}`,
          url: '/',
          tag: `hw-sub-${hw.id}`,
        });
      } catch (e) {}
      return json({ homework: updated });
    }

    if (route.startsWith('homework/') && pathParts[2] === 'review' && method === 'POST') {
      if (user.role !== 'teacher') return json({ error: 'Forbidden' }, 403);
      const id = pathParts[1];
      const hw = await database.collection('homework').findOne({ id });
      if (!hw || hw.teacherId !== user.id) return json({ error: 'Not found' }, 404);
      await database.collection('homework').updateOne({ id }, { $set: { feedback: body.feedback || '', score: body.score ?? null, status: 'reviewed' } });
      const updated = await database.collection('homework').findOne({ id });
      // Notify student
      const student = await database.collection('students').findOne({ id: hw.studentId });
      if (student && student.userId) {
        try {
          await sendPushToUser(database, student.userId, {
            title: '⭐ Feedback received',
            body: `${hw.title}${body.score != null ? ` · Score: ${body.score}` : ''}`,
            url: '/',
            tag: `hw-fb-${hw.id}`,
          });
        } catch (e) {}
      }
      return json({ homework: updated });
    }

    // ---- PRACTICE EXERCISES ----
    if (route === 'practice' && method === 'GET') {
      let filter = {};
      if (user.role === 'teacher') filter.teacherId = user.id;
      else {
        const student = await database.collection('students').findOne({ userId: user.id });
        if (!student) return json({ practice: [] });
        filter.$or = [{ studentIds: student.id }, { studentIds: 'all' }];
        filter.teacherId = student.teacherId;
      }
      const practice = await database.collection('practice').find(filter).sort({ createdAt: -1 }).toArray();
      if (user.role === 'student') {
        const student = await database.collection('students').findOne({ userId: user.id });
        for (const p of practice) {
          const attempt = await database.collection('practice_attempts').findOne({ practiceId: p.id, studentId: student.id });
          p.attempt = attempt;
        }
      }
      return json({ practice });
    }

    if (route === 'practice' && method === 'POST') {
      if (user.role !== 'teacher') return json({ error: 'Forbidden' }, 403);
      const b = body;
      const doc = {
        id: uuidv4(),
        teacherId: user.id,
        title: b.title || '',
        description: b.description || '',
        level: b.level || 'A1',
        topic: b.topic || '',
        studentIds: b.studentIds || 'all',
        questions: (b.questions || []).map(q => ({
          id: uuidv4(),
          type: q.type,
          text: q.text,
          options: q.options || [],
          correctAnswer: q.correctAnswer,
          marks: Number(q.marks) || 1,
          explanation: q.explanation || '',
        })),
        dueDate: b.dueDate ? new Date(b.dueDate).toISOString() : null,
        createdAt: new Date().toISOString(),
      };
      await database.collection('practice').insertOne(doc);
      return json({ practice: doc });
    }

    if (route.startsWith('practice/') && pathParts[2] === 'submit' && method === 'POST') {
      if (user.role !== 'student') return json({ error: 'Forbidden' }, 403);
      const id = pathParts[1];
      const student = await database.collection('students').findOne({ userId: user.id });
      const p = await database.collection('practice').findOne({ id });
      if (!p) return json({ error: 'Not found' }, 404);
      const answers = body.answers || {};
      let score = 0, maxScore = 0, autoScored = true;
      const results = [];
      for (const q of p.questions) {
        maxScore += q.marks;
        const ans = answers[q.id];
        let correct = null;
        if (['mcq','truefalse','fill'].includes(q.type)) {
          const a = (ans || '').toString().trim().toLowerCase();
          const c = (q.correctAnswer || '').toString().trim().toLowerCase();
          correct = a === c;
          if (correct) score += q.marks;
        } else {
          autoScored = false;
        }
        results.push({ questionId: q.id, answer: ans, correct });
      }
      const attemptDoc = {
        id: uuidv4(),
        practiceId: p.id,
        studentId: student.id,
        teacherId: p.teacherId,
        answers, results, score, maxScore, autoScored,
        status: autoScored ? 'reviewed' : 'submitted',
        submittedAt: new Date().toISOString(),
      };
      await database.collection('practice_attempts').replaceOne({ practiceId: p.id, studentId: student.id }, attemptDoc, { upsert: true });
      return json({ attempt: attemptDoc });
    }

    if (route.startsWith('practice/') && pathParts.length === 2 && method === 'GET') {
      const id = pathParts[1];
      const p = await database.collection('practice').findOne({ id });
      if (!p) return json({ error: 'Not found' }, 404);
      const attempts = await database.collection('practice_attempts').find({ practiceId: id }).toArray();
      return json({ practice: p, attempts });
    }

    // ---- PAYMENTS ----
    if (route === 'payments' && method === 'GET') {
      let filter = {};
      if (user.role === 'teacher') filter.teacherId = user.id;
      else {
        const student = await database.collection('students').findOne({ userId: user.id });
        if (!student) return json({ payments: [] });
        filter.studentId = student.id;
      }
      const payments = await database.collection('payments').find(filter).sort({ paymentDate: -1 }).toArray();
      return json({ payments });
    }

    if (route === 'payments' && method === 'POST') {
      if (user.role !== 'teacher') return json({ error: 'Forbidden' }, 403);
      const b = body;
      const student = await database.collection('students').findOne({ id: b.studentId, teacherId: user.id });
      if (!student) return json({ error: 'Student not found' }, 404);
      const count = await database.collection('payments').countDocuments({ teacherId: user.id });
      const doc = {
        id: uuidv4(),
        teacherId: user.id,
        studentId: student.id,
        studentName: student.name,
        month: b.month || `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`,
        amount: Number(b.amount) || 0,
        paymentDate: b.paymentDate || new Date().toISOString(),
        method: b.method || 'cash',
        transactionRef: b.transactionRef || '',
        receiptNumber: `RCP-${String(count + 1).padStart(4, '0')}`,
        notes: b.notes || '',
        createdAt: new Date().toISOString(),
      };
      await database.collection('payments').insertOne(doc);
      return json({ payment: doc });
    }

    if (route.startsWith('payments/') && method === 'DELETE') {
      if (user.role !== 'teacher') return json({ error: 'Forbidden' }, 403);
      const id = pathParts[1];
      await database.collection('payments').deleteOne({ id, teacherId: user.id });
      return json({ ok: true });
    }

    // ---- CSV IMPORT ----
    if (route === 'students/import' && method === 'POST') {
      if (user.role !== 'teacher') return json({ error: 'Forbidden' }, 403);
      const rows = body.rows || [];
      const created = [];
      for (const r of rows) {
        if (!r.name) continue;
        const doc = {
          id: uuidv4(), userId: null, teacherId: user.id,
          name: r.name, email: r.email || '', phone: r.phone || '',
          parentName: r.parentName || '', parentPhone: r.parentPhone || '',
          level: r.level || 'A1', mode: r.mode || 'online', classType: 'individual',
          feePerClass: Number(r.feePerClass) || 0, defaultDuration: 60,
          permanentMeetingLink: r.permanentMeetingLink || '',
          permanentMeetingPlatform: detectPlatform(r.permanentMeetingLink) || '',
          permanentMeetingId: r.meetingId || '', permanentMeetingPasscode: r.passcode || '',
          classroomLocation: r.classroomLocation || '',
          joiningDate: new Date().toISOString(), status: 'active', notes: '',
          createdAt: new Date().toISOString(),
        };
        if (r.email) {
          const existingU = await database.collection('users').findOne({ email: r.email });
          if (!existingU) {
            const sUserId = uuidv4();
            const hashed = await bcrypt.hash('demo1234', 10);
            await database.collection('users').insertOne({ id: sUserId, email: r.email, password: hashed, role: 'student', name: r.name, teacherId: user.id, createdAt: new Date().toISOString() });
            doc.userId = sUserId;
          }
        }
        await database.collection('students').insertOne(doc);
        created.push(doc);
      }
      return json({ created: created.length, students: created });
    }

    // ---- MONTHLY SUMMARY (for PDF) ----
    if (route.startsWith('billing/student/') && method === 'GET') {
      const sid = pathParts[2];
      const monthParam = url.searchParams.get('month');
      const now = new Date();
      const y = monthParam ? Number(monthParam.split('-')[0]) : now.getFullYear();
      const m = monthParam ? Number(monthParam.split('-')[1]) - 1 : now.getMonth();
      const start = new Date(y, m, 1).toISOString();
      const end = new Date(y, m + 1, 1).toISOString();
      const student = await database.collection('students').findOne({ id: sid });
      if (!student) return json({ error: 'Not found' }, 404);
      if (user.role === 'teacher' && student.teacherId !== user.id) return json({ error: 'Forbidden' }, 403);
      if (user.role === 'student' && student.userId !== user.id) return json({ error: 'Forbidden' }, 403);
      const classes = await database.collection('classes').find({ studentId: sid, startTime: { $gte: start, $lt: end } }).sort({ startTime: 1 }).toArray();
      const monthStr = `${y}-${String(m+1).padStart(2,'0')}`;
      const payments = await database.collection('payments').find({ studentId: sid, month: monthStr }).toArray();
      const teacher = await database.collection('users').findOne({ id: student.teacherId });
      const billable = classes.filter(c => c.billable).length;
      const totalDue = billable * (student.feePerClass || 0);
      const paid = payments.reduce((s, p) => s + p.amount, 0);
      return json({ student, teacher: { name: teacher?.name, academyName: teacher?.academyName }, month: monthStr, classes, payments, billable, totalDue, paid, balance: totalDue - paid });
    }

    // ---- PUSH NOTIFICATIONS ----
    if (route === 'push/subscribe' && method === 'POST') {
      const { subscription } = body;
      if (!subscription || !subscription.endpoint) return json({ error: 'Invalid subscription' }, 400);
      await database.collection('push_subscriptions').replaceOne(
        { userId: user.id, 'subscription.endpoint': subscription.endpoint },
        { userId: user.id, role: user.role, subscription, createdAt: new Date().toISOString() },
        { upsert: true }
      );
      // Send a welcome test notification
      try {
        await sendPushToUser(database, user.id, { title: 'Notifications enabled 🔔', body: 'You\u2019ll get reminders before classes and when homework is assigned.', url: '/' });
      } catch (e) {}
      return json({ ok: true });
    }

    if (route === 'push/unsubscribe' && method === 'POST') {
      const { endpoint } = body;
      await database.collection('push_subscriptions').deleteOne({ userId: user.id, 'subscription.endpoint': endpoint });
      return json({ ok: true });
    }

    if (route === 'push/status' && method === 'GET') {
      const count = await database.collection('push_subscriptions').countDocuments({ userId: user.id });
      return json({ enabled: count > 0, count });
    }

    if (route === 'push/test' && method === 'POST') {
      await sendPushToUser(database, user.id, { title: 'Language Scoop test 🔔', body: 'Push notifications are working perfectly!', url: '/' });
      return json({ ok: true });
    }

    // Teacher can send reminder to specific student
    if (route.startsWith('classes/') && pathParts[2] === 'remind' && method === 'POST') {
      if (user.role !== 'teacher') return json({ error: 'Forbidden' }, 403);
      const id = pathParts[1];
      const cls = await database.collection('classes').findOne({ id });
      if (!cls || cls.teacherId !== user.id) return json({ error: 'Not found' }, 404);
      const student = await database.collection('students').findOne({ id: cls.studentId });
      if (!student || !student.userId) return json({ error: 'Student has no account' }, 404);
      const timeStr = new Date(cls.startTime).toLocaleString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, day: 'numeric', month: 'short' });
      await sendPushToUser(database, student.userId, {
        title: `Class reminder: ${cls.topic || 'French class'}`,
        body: `Your class is at ${timeStr}${cls.meetingLink ? ' — tap to join Zoom' : ''}`,
        url: '/',
        tag: `class-${cls.id}`,
      });
      return json({ ok: true });
    }

    // ---- FILE UPLOADS (stored in MongoDB as base64, max 5MB) ----
    if (route === 'files/upload' && method === 'POST') {
      const { name, type, size, dataUrl } = body;
      const validationError = validateUpload(name, type, size, dataUrl);
      if (validationError) {
        return json({ error: validationError }, 400);
      }
      const safeName = sanitizeFilename(name);
      const id = uuidv4();
      await database.collection('files').insertOne({
        id, name: safeName, type, size,
        data: dataUrl, // base64 data URL
        uploaderId: user.id,
        uploaderRole: user.role,
        createdAt: new Date().toISOString(),
      });
      return json({ id, name: safeName, type, size, url: `/api/files/${id}` });
    }

    if (route.startsWith('files/') && pathParts.length === 2 && method === 'GET') {
      const id = pathParts[1];
      const f = await database.collection('files').findOne({ id });
      if (!f) return json({ error: 'Not found' }, 404);

      let isAuthorized = false;
      if (f.uploaderId === user.id) {
        isAuthorized = true;
      } else if (user.role === 'teacher') {
        const studentOwner = await database.collection('students').findOne({ userId: f.uploaderId });
        if (studentOwner && studentOwner.teacherId === user.id) {
          isAuthorized = true;
        } else {
          const hw = await database.collection('homework').findOne({
            teacherId: user.id,
            $or: [
              { 'attachments.id': f.id },
              { 'submissionAttachments.id': f.id }
            ]
          });
          if (hw) isAuthorized = true;
        }
      } else if (user.role === 'student') {
        const studentProfile = await database.collection('students').findOne({ userId: user.id });
        if (studentProfile) {
          if (f.uploaderRole === 'teacher' && f.uploaderId === studentProfile.teacherId) {
            isAuthorized = true;
          } else {
            const hw = await database.collection('homework').findOne({
              studentId: studentProfile.id,
              $or: [
                { 'attachments.id': f.id },
                { 'submissionAttachments.id': f.id }
              ]
            });
            if (hw) isAuthorized = true;
          }
        }
      }

      if (!isAuthorized) {
        return json({ error: 'Forbidden' }, 403);
      }

      const match = /^data:([^;]+);base64,(.+)$/.exec(f.data);
      if (!match) return json({ error: 'Invalid file' }, 500);
      const buffer = Buffer.from(match[2], 'base64');
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': f.type || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(f.name)}"`,
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'private, max-age=3600',
        },
      });
    }

    // ---- DASHBOARD (teacher) ----
    if (route === 'dashboard' && method === 'GET') {
      if (user.role !== 'teacher') return json({ error: 'Forbidden' }, 403);
      const now = new Date();
      const dayStart = new Date(now); dayStart.setHours(0,0,0,0);
      const dayEnd = new Date(now); dayEnd.setHours(23,59,59,999);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const todayClasses = await database.collection('classes').find({ teacherId: user.id, startTime: { $gte: dayStart.toISOString(), $lte: dayEnd.toISOString() } }).sort({ startTime: 1 }).toArray();
      const upcomingNext = await database.collection('classes').find({ teacherId: user.id, startTime: { $gte: now.toISOString() } }).sort({ startTime: 1 }).limit(1).toArray();
      const monthClasses = await database.collection('classes').find({ teacherId: user.id, startTime: { $gte: monthStart.toISOString(), $lt: monthEnd.toISOString() } }).toArray();
      const students = await database.collection('students').find({ teacherId: user.id }).toArray();
      const pendingAttendance = await database.collection('classes').countDocuments({ teacherId: user.id, endTime: { $lt: now.toISOString() }, status: 'upcoming' });
      const missingLinks = todayClasses.filter(c => c.mode === 'online' && !c.meetingLink).length;
      const homeworkToReview = await database.collection('homework').countDocuments({ teacherId: user.id, status: 'submitted' });
      const billableThisMonth = monthClasses.filter(c => c.billable).length;
      const monthlyRevenue = monthClasses.filter(c => c.billable).reduce((sum, c) => sum + (c.feeSnapshot || 0), 0);
      return json({
        todayClasses,
        nextClass: upcomingNext[0] || null,
        stats: {
          classesToday: todayClasses.length,
          onlineToday: todayClasses.filter(c => c.mode === 'online').length,
          offlineToday: todayClasses.filter(c => c.mode === 'offline').length,
          pendingAttendance,
          missingLinks,
          homeworkToReview,
          monthlyRevenue,
          billableThisMonth,
          totalStudents: students.length,
          activeStudents: students.filter(s => s.status === 'active').length,
        }
      });
    }

    return json({ error: 'Not found', route, method }, 404);
  } catch (err) {
    console.error('API error:', err);
    return json({ error: err.message || 'Server error' }, 500);
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
