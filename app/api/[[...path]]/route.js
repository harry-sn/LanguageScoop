import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import webpush from 'web-push';

const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME || (process.env.NODE_ENV === 'test' ? 'classeflow_test' : 'classeflow');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';



const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BGzKxr10ebrzCPYpglx2VL5fDjZa3D-K7YVOos3QODL88qI0kbG6sAftUie1DbOOe5Cewh0xuyHl0avHDDyF5rE';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'E5j3kT7ls3HrT2_0jyH3NPTE-eFvNTuZiQDWrRRwaIc';

try {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@languagescoop.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
} catch (e) {
  console.error('VAPID setup warning:', e.message);
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
let clientPromise;

async function getDb() {
  if (db) return db;
  if (!MONGO_URL) {
    throw new Error('MONGO_URL environment variable is missing.');
  }
  if (!clientPromise) {
    client = new MongoClient(MONGO_URL, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      tls: true,
    });
    clientPromise = client.connect();
  }
  await clientPromise;
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
// ---------- PACK & ATTENDANCE HELPERS ----------

const ATTENDANCE_RULES = {
  present: { countCompleted: true, deductPack: true },
  student_no_show: { countCompleted: true, deductPack: true },
  student_cancelled_late: { countCompleted: true, deductPack: true },
  student_cancelled_on_time: { countCompleted: false, deductPack: false },
  teacher_cancelled: { countCompleted: false, deductPack: false },
  rescheduled: { countCompleted: false, deductPack: false },
  trial: { countCompleted: true, deductPack: false },
  complimentary: { countCompleted: true, deductPack: false },
  pending: { countCompleted: false, deductPack: false },
  completed: { countCompleted: true, deductPack: true },
  absent: { countCompleted: false, deductPack: false },
  cancelled: { countCompleted: false, deductPack: false },
};

function getAttendanceRules(status) {
  return ATTENDANCE_RULES[status] || { countCompleted: false, deductPack: false };
}

function getKolkataMonthRange(monthParam) {
  const now = new Date();
  let y = now.getFullYear();
  let m = now.getMonth();
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const parts = monthParam.split('-');
    y = parseInt(parts[0], 10);
    m = parseInt(parts[1], 10) - 1;
  }
  const startUTC = new Date(Date.UTC(y, m, 1, 0, 0, 0) - (5.5 * 60 * 60 * 1000));
  const endUTC = new Date(Date.UTC(y, m + 1, 1, 0, 0, 0) - (5.5 * 60 * 60 * 1000));
  return {
    monthStr: `${y}-${String(m + 1).padStart(2, '0')}`,
    startISO: startUTC.toISOString(),
    endISO: endUTC.toISOString(),
  };
}

async function recalculatePackState(database, packId) {
  if (!packId) return null;
  const pack = await database.collection('classPacks').findOne({ id: packId });
  if (!pack) return null;

  const txns = await database.collection('packTransactions').find({ packId }).toArray();
  const usedClasses = txns.reduce((sum, t) => sum + (t.quantity || 0), 0);
  const remainingClasses = Math.max(0, pack.totalClasses - usedClasses);
  
  let newStatus = pack.status;
  let completedAt = pack.completedAt;
  if (usedClasses >= pack.totalClasses && pack.status === 'active') {
    newStatus = 'completed';
    completedAt = new Date().toISOString();
  }

  await database.collection('classPacks').updateOne(
    { id: packId },
    {
      $set: {
        usedClasses,
        remainingClasses,
        status: newStatus,
        completedAt,
        updatedAt: new Date().toISOString(),
      }
    }
  );

  return await database.collection('classPacks').findOne({ id: packId });
}

async function processAttendanceDeduction(database, cls, newStatus, isBillableOverride, userId) {
  const rules = getAttendanceRules(newStatus);
  const shouldDeduct = isBillableOverride !== undefined ? Boolean(isBillableOverride) : rules.deductPack;

  const student = await database.collection('students').findOne({ id: cls.studentId });
  if (!student) return cls;

  const existingDeduction = await database.collection('packTransactions').findOne({
    classId: cls.id,
    type: 'deduction'
  });
  const existingReversal = await database.collection('packTransactions').findOne({
    classId: cls.id,
    type: 'reversal'
  });

  let activePack = null;
  if (student.activePackId) {
    activePack = await database.collection('classPacks').findOne({ id: student.activePackId });
  }

  if (shouldDeduct) {
    if (existingDeduction && !existingReversal) {
      await database.collection('classes').updateOne(
        { id: cls.id },
        { $set: { status: newStatus, isBillable: true, attendanceFinalisedAt: new Date().toISOString() } }
      );
      return await database.collection('classes').findOne({ id: cls.id });
    }

    if (!activePack || activePack.status !== 'active' || activePack.remainingClasses <= 0) {
      await database.collection('classes').updateOne(
        { id: cls.id },
        {
          $set: {
            status: newStatus,
            isBillable: true,
            packId: null,
            packTransactionId: null,
            requiresPackResolution: true,
            attendanceFinalisedAt: new Date().toISOString()
          }
        }
      );
      return await database.collection('classes').findOne({ id: cls.id });
    }

    const txnId = uuidv4();
    const txn = {
      id: txnId,
      packId: activePack.id,
      studentId: student.id,
      classId: cls.id,
      type: 'deduction',
      quantity: 1,
      reason: `Class attendance: ${newStatus}`,
      attendanceStatus: newStatus,
      idempotencyKey: `${cls.id}-deduction`,
      createdBy: userId || activePack.teacherId,
      createdAt: new Date().toISOString()
    };
    await database.collection('packTransactions').insertOne(txn);

    await database.collection('classes').updateOne(
      { id: cls.id },
      {
        $set: {
          status: newStatus,
          isBillable: true,
          packId: activePack.id,
          packTransactionId: txnId,
          requiresPackResolution: false,
          attendanceFinalisedAt: new Date().toISOString()
        }
      }
    );

    await recalculatePackState(database, activePack.id);
  } else {
    if (existingDeduction && !existingReversal) {
      const revTxnId = uuidv4();
      const revTxn = {
        id: revTxnId,
        packId: existingDeduction.packId,
        studentId: student.id,
        classId: cls.id,
        type: 'reversal',
        quantity: -1,
        reason: `Reversal: attendance updated to ${newStatus}`,
        attendanceStatus: newStatus,
        idempotencyKey: `${cls.id}-reversal`,
        createdBy: userId || cls.teacherId,
        createdAt: new Date().toISOString()
      };
      await database.collection('packTransactions').insertOne(revTxn);

      await database.collection('classes').updateOne(
        { id: cls.id },
        {
          $set: {
            status: newStatus,
            isBillable: false,
            packId: null,
            packTransactionId: null,
            requiresPackResolution: false,
            attendanceFinalisedAt: new Date().toISOString()
          }
        }
      );

      await recalculatePackState(database, existingDeduction.packId);
    } else {
      await database.collection('classes').updateOne(
        { id: cls.id },
        {
          $set: {
            status: newStatus,
            isBillable: false,
            attendanceFinalisedAt: new Date().toISOString()
          }
        }
      );
    }
  }

  return await database.collection('classes').findOne({ id: cls.id });
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

    const packId = uuidv4();
    const studentId = uuidv4();
    const totalClasses = 8;
    const totalAmount = s.feePerClass * totalClasses;

    const studentDoc = {
      id: studentId,
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
      defaultPackSize: totalClasses,
      activePackId: packId,
      timezone: 'Asia/Kolkata',
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

    // Create active class pack
    await database.collection('classPacks').insertOne({
      id: packId,
      teacherId,
      studentId: studentDoc.id,
      totalClasses,
      usedClasses: 0,
      remainingClasses: totalClasses,
      feePerClassSnapshot: s.feePerClass,
      totalAmount,
      paidAmount: totalAmount,
      status: 'active',
      startedAt: new Date().toISOString(),
      completedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Record advance payment
    const paymentCount = await database.collection('payments').countDocuments({ teacherId });
    await database.collection('payments').insertOne({
      id: uuidv4(),
      teacherId,
      studentId: studentDoc.id,
      studentName: s.name,
      packId,
      amount: totalAmount,
      currency: 'INR',
      paymentDate: new Date().toISOString(),
      paymentMethod: 'upi',
      reference: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
      receiptNumber: `RCP-${String(paymentCount + 1).padStart(4, '0')}`,
      status: 'paid',
      notes: 'Initial advance pack payment',
      createdBy: teacherId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
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
    { student: studentDocs[0], start: mkDate(-2, 17), topic: 'Alphabet Français', status: 'completed' },
    { student: studentDocs[0], start: mkDate(-5, 17), topic: 'Introduction', status: 'completed' },
    { student: studentDocs[1], start: mkDate(-3, 14), topic: 'Basic Vocabulary', status: 'completed' },
    { student: studentDocs[2], start: mkDate(-4, 17), topic: 'Grammar Basics', status: 'completed' },
  ];

  for (const c of classesSeed) {
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
      status: 'upcoming',
      isBillable: false,
      packId: null,
      packTransactionId: null,
      feeSnapshot: s.feePerClass,
      notes: '',
      createdAt: new Date().toISOString(),
    });
  }

  for (const c of pastSeed) {
    const s = c.student;
    const startDate = new Date(c.start);
    const endDate = new Date(startDate.getTime() + s.defaultDuration * 60000);
    const clsDoc = {
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
      status: c.status,
      isBillable: true,
      feeSnapshot: s.feePerClass,
      notes: '',
      createdAt: new Date().toISOString(),
    };
    await database.collection('classes').insertOne(clsDoc);
    await processAttendanceDeduction(database, clsDoc, c.status, true, teacherId);
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

// ------------- Auth Rate Limiter ----------------
const authRateMap = new Map();

function checkAuthRateLimit(ip) {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 mins
  const maxReqs = 10;

  let record = authRateMap.get(ip);
  if (!record) {
    record = { count: 1, resetAt: now + windowMs };
    authRateMap.set(ip, record);
    return null;
  }

  if (now > record.resetAt) {
    record.count = 1;
    record.resetAt = now + windowMs;
    return null;
  }

  record.count += 1;
  if (record.count > maxReqs) {
    const retrySecs = Math.ceil((record.resetAt - now) / 1000);
    return retrySecs;
  }
  return null;
}

// ------------- Route Handlers ----------------
async function handle(request, context) {
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.MONGO_URL) {
      console.error('FATAL: MONGO_URL environment variable is not defined for production.');
      return json({ error: 'Database configuration error: MONGO_URL environment variable is not defined in production.' }, 500);
    }
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'dev-secret' || process.env.JWT_SECRET.length < 16) {
      console.error('FATAL: Secure JWT_SECRET must be explicitly configured in production environment (minimum 16 characters).');
      return json({ error: 'Auth configuration error: JWT_SECRET environment variable is missing or shorter than 16 characters.' }, 500);
    }
  }

  let database;
  try {
    database = await getDb();
  } catch (dbErr) {
    console.error('Database Connection Error:', dbErr.message);
    return json({ error: `Database connection failed: ${dbErr.message}. Check MONGO_URL and MongoDB Atlas Network Access IP Whitelist.` }, 500);
  }

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
    // Rate limit auth routes in production mode or when rate limit test header is present
    if (route === 'auth/register' || route === 'auth/login') {
      const isRateLimitTest = request.headers.get('x-forwarded-for') === '10.0.0.99';
      if (process.env.NODE_ENV === 'production' || isRateLimitTest) {
        const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
        const retrySecs = checkAuthRateLimit(clientIp);
        if (retrySecs !== null) {
          return json(
            { error: 'Too many authentication attempts. Please try again later.' },
            429,
            { 'Retry-After': String(retrySecs) }
          );
        }
      }
    }

    // ---- AUTH ----
    if (route === 'auth/register' && method === 'POST') {
      const rawEmail = body.email || '';
      const password = body.password || '';
      const name = body.name || '';
      const academyName = body.academyName || '';
      if (!rawEmail || !password || !name) return json({ error: 'Missing fields' }, 400);
      const email = rawEmail.trim().toLowerCase();
      const exists = await database.collection('users').findOne({ email: { $regex: `^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } });
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
      const rawEmail = body.email || '';
      const password = body.password || '';
      const email = rawEmail.trim().toLowerCase();
      const user = await database.collection('users').findOne({ email: { $regex: `^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } });
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
      for (const s of students) {
        if (s.activePackId) {
          s.activePack = await database.collection('classPacks').findOne({ id: s.activePackId });
        } else {
          s.activePack = null;
        }
      }
      return json({ students });
    }

    if (route === 'students' && method === 'POST') {
      if (user.role !== 'teacher') return json({ error: 'Forbidden' }, 403);
      const b = body;
      const sUserId = uuidv4();
      let studentEmail = (b.email || '').trim().toLowerCase();
      if (studentEmail) {
        const existingU = await database.collection('users').findOne({ email: { $regex: `^${studentEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } });
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
      const studentId = uuidv4();
      const feePerClass = Number(b.feePerClass) || 0;
      const defaultPackSize = Number(b.defaultPackSize) || 8;
      const packId = uuidv4();
      const totalAmount = feePerClass * defaultPackSize;

      const doc = {
        id: studentId,
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
        feePerClass,
        defaultPackSize,
        activePackId: packId,
        timezone: b.timezone || 'Asia/Kolkata',
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
        updatedAt: new Date().toISOString(),
      };
      await database.collection('students').insertOne(doc);

      const initialPack = {
        id: packId,
        teacherId: user.id,
        studentId,
        totalClasses: defaultPackSize,
        usedClasses: 0,
        remainingClasses: defaultPackSize,
        feePerClassSnapshot: feePerClass,
        totalAmount,
        paidAmount: b.paymentAmount !== undefined ? Number(b.paymentAmount) : totalAmount,
        status: 'active',
        startedAt: new Date().toISOString(),
        completedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await database.collection('classPacks').insertOne(initialPack);

      if (b.paymentAmount !== 0) {
        const paymentCount = await database.collection('payments').countDocuments({ teacherId: user.id });
        await database.collection('payments').insertOne({
          id: uuidv4(),
          teacherId: user.id,
          studentId,
          studentName: doc.name,
          packId,
          amount: b.paymentAmount !== undefined ? Number(b.paymentAmount) : totalAmount,
          currency: 'INR',
          paymentDate: new Date().toISOString(),
          paymentMethod: b.paymentMethod || 'upi',
          reference: b.paymentReference || '',
          receiptNumber: `RCP-${String(paymentCount + 1).padStart(4, '0')}`,
          status: 'paid',
          notes: 'Initial pack payment',
          createdBy: user.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      return json({ student: doc, pack: initialPack, tempPassword: b.email ? tempPw : null });
    }

    if (route.startsWith('students/') && pathParts.length === 2 && method === 'GET') {
      const id = pathParts[1];
      const student = await database.collection('students').findOne({ id });
      if (!student) return json({ error: 'Not found' }, 404);
      if (user.role === 'teacher' && student.teacherId !== user.id) return json({ error: 'Forbidden' }, 403);
      if (user.role === 'student' && student.userId !== user.id) return json({ error: 'Forbidden' }, 403);

      let activePack = null;
      if (student.activePackId) {
        activePack = await database.collection('classPacks').findOne({ id: student.activePackId });
      }
      const packHistory = await database.collection('classPacks').find({ studentId: id }).sort({ createdAt: -1 }).toArray();
      return json({ student, activePack, packHistory });
    }

    if (route.startsWith('students/') && pathParts.length === 2 && method === 'PUT') {
      if (user.role !== 'teacher') return json({ error: 'Forbidden' }, 403);
      const id = pathParts[1];
      const student = await database.collection('students').findOne({ id });
      if (!student || student.teacherId !== user.id) return json({ error: 'Not found' }, 404);
      const b = body;
      const updates = {
        name: b.name ?? student.name,
        email: b.email ? b.email.trim().toLowerCase() : student.email,
        phone: b.phone ?? student.phone,
        parentName: b.parentName ?? student.parentName,
        parentPhone: b.parentPhone ?? student.parentPhone,
        level: b.level ?? student.level,
        mode: b.mode ?? student.mode,
        feePerClass: Number(b.feePerClass ?? student.feePerClass),
        defaultPackSize: Number(b.defaultPackSize ?? student.defaultPackSize ?? 8),
        timezone: b.timezone ?? student.timezone ?? 'Asia/Kolkata',
        defaultDuration: Number(b.defaultDuration ?? student.defaultDuration),
        permanentMeetingLink: b.permanentMeetingLink ?? student.permanentMeetingLink,
        permanentMeetingPlatform: detectPlatform(b.permanentMeetingLink ?? student.permanentMeetingLink) || '',
        permanentMeetingId: b.permanentMeetingId ?? student.permanentMeetingId,
        permanentMeetingPasscode: b.permanentMeetingPasscode ?? student.permanentMeetingPasscode,
        classroomLocation: b.classroomLocation ?? student.classroomLocation,
        status: b.status ?? student.status,
        notes: b.notes ?? student.notes,
        updatedAt: new Date().toISOString(),
      };
      if (b.email && b.email.trim().toLowerCase() !== (student.email || '').toLowerCase()) {
        const newEmail = b.email.trim().toLowerCase();
        if (student.userId) {
          await database.collection('users').updateOne({ id: student.userId }, { $set: { email: newEmail, name: updates.name, updatedAt: new Date().toISOString() } });
        }
      }
      await database.collection('students').updateOne({ id }, { $set: updates });

      // Automatically sync all upcoming classes with the student's updated meeting info
      const classUpdates = {
        studentName: updates.name,
        studentTimezone: updates.timezone,
      };
      if (updates.permanentMeetingLink) {
        classUpdates.meetingLink = updates.permanentMeetingLink;
        classUpdates.platform = detectPlatform(updates.permanentMeetingLink) || '';
        classUpdates.meetingId = updates.permanentMeetingId || '';
        classUpdates.passcode = updates.permanentMeetingPasscode || '';
      }
      if (updates.classroomLocation) {
        classUpdates.classroomLocation = updates.classroomLocation;
      }
      await database.collection('classes').updateMany(
        { studentId: id, status: 'upcoming' },
        { $set: classUpdates }
      );

      const updated = await database.collection('students').findOne({ id });
      return json({ student: updated });
    }

    if (route.startsWith('students/') && pathParts[2] === 'renew-pack' && method === 'POST') {
      if (user.role !== 'teacher') return json({ error: 'Forbidden' }, 403);
      const id = pathParts[1];
      const student = await database.collection('students').findOne({ id, teacherId: user.id });
      if (!student) return json({ error: 'Student not found' }, 404);

      const b = body;
      const feePerClass = Number(b.feePerClass) || student.feePerClass || 0;
      const totalClasses = Number(b.totalClasses) || student.defaultPackSize || 8;
      const totalAmount = feePerClass * totalClasses;
      const paymentAmount = Number(b.paymentAmount) || 0;

      if (student.activePackId) {
        const curPack = await database.collection('classPacks').findOne({ id: student.activePackId });
        if (curPack && curPack.status === 'active') {
          await database.collection('classPacks').updateOne(
            { id: curPack.id },
            { $set: { status: 'completed', completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } }
          );
        }
      }

      const newPackId = uuidv4();
      const newPack = {
        id: newPackId,
        teacherId: user.id,
        studentId: student.id,
        totalClasses,
        usedClasses: 0,
        remainingClasses: totalClasses,
        feePerClassSnapshot: feePerClass,
        totalAmount,
        paidAmount: paymentAmount,
        status: 'active',
        startedAt: new Date().toISOString(),
        completedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await database.collection('classPacks').insertOne(newPack);

      let paymentDoc = null;
      if (paymentAmount > 0) {
        const paymentCount = await database.collection('payments').countDocuments({ teacherId: user.id });
        paymentDoc = {
          id: uuidv4(),
          teacherId: user.id,
          studentId: student.id,
          studentName: student.name,
          packId: newPackId,
          amount: paymentAmount,
          currency: 'INR',
          paymentDate: b.paymentDate || new Date().toISOString(),
          paymentMethod: b.paymentMethod || 'upi',
          reference: b.reference || '',
          receiptNumber: `RCP-${String(paymentCount + 1).padStart(4, '0')}`,
          status: paymentAmount >= totalAmount ? 'paid' : 'partially_paid',
          notes: b.notes || 'Pack renewal advance payment',
          createdBy: user.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await database.collection('payments').insertOne(paymentDoc);
      }

      await database.collection('students').updateOne(
        { id: student.id },
        { $set: { activePackId: newPackId, feePerClass, defaultPackSize: totalClasses, updatedAt: new Date().toISOString() } }
      );

      const updatedStudent = await database.collection('students').findOne({ id: student.id });
      return json({ student: updatedStudent, pack: newPack, payment: paymentDoc });
    }

    if (route.startsWith('students/') && pathParts[2] === 'reset-password' && method === 'POST') {
      if (user.role !== 'teacher') return json({ error: 'Forbidden' }, 403);
      const id = pathParts[1];
      const student = await database.collection('students').findOne({ id, teacherId: user.id });
      if (!student) return json({ error: 'Student not found' }, 404);
      const { newPassword } = body;
      if (!newPassword || newPassword.length < 6) return json({ error: 'Password must be at least 6 characters long' }, 400);

      const hashed = await bcrypt.hash(newPassword, 10);

      if (student.userId) {
        await database.collection('users').updateOne({ id: student.userId }, { $set: { password: hashed, updatedAt: new Date().toISOString() } });
      } else if (student.email) {
        const studentEmail = student.email.trim().toLowerCase();
        const existingU = await database.collection('users').findOne({ email: { $regex: `^${studentEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } });
        if (existingU) {
          await database.collection('users').updateOne({ id: existingU.id }, { $set: { password: hashed, updatedAt: new Date().toISOString() } });
          await database.collection('students').updateOne({ id: student.id }, { $set: { userId: existingU.id } });
        } else {
          const sUserId = uuidv4();
          await database.collection('users').insertOne({
            id: sUserId, email: studentEmail, password: hashed, role: 'student',
            name: student.name, teacherId: user.id, createdAt: new Date().toISOString(),
          });
          await database.collection('students').updateOne({ id: student.id }, { $set: { userId: sUserId } });
        }
      } else {
        return json({ error: 'Student has no email address associated with their profile' }, 400);
      }

      return json({ ok: true, message: 'Student password reset successfully' });
    }

    if (route.startsWith('students/') && pathParts.length === 2 && method === 'DELETE') {
      if (user.role !== 'teacher') return json({ error: 'Forbidden' }, 403);
      const id = pathParts[1];
      const student = await database.collection('students').findOne({ id });
      if (!student || student.teacherId !== user.id) return json({ error: 'Not found' }, 404);
      await database.collection('students').deleteOne({ id });
      await database.collection('classes').deleteMany({ studentId: id });
      await database.collection('classPacks').deleteMany({ studentId: id });
      await database.collection('packTransactions').deleteMany({ studentId: id });
      await database.collection('payments').deleteMany({ studentId: id });
      return json({ ok: true });
    }

    // ---- CLASS PACKS ----
    if (route === 'class-packs' && method === 'GET') {
      let filter = {};
      if (user.role === 'teacher') filter.teacherId = user.id;
      else {
        const student = await database.collection('students').findOne({ userId: user.id });
        if (!student) return json({ packs: [] });
        filter.studentId = student.id;
      }
      const packs = await database.collection('classPacks').find(filter).sort({ createdAt: -1 }).toArray();
      return json({ packs });
    }

    if (route.startsWith('class-packs/') && pathParts.length === 2 && method === 'GET') {
      const id = pathParts[1];
      const pack = await database.collection('classPacks').findOne({ id });
      if (!pack) return json({ error: 'Not found' }, 404);
      if (user.role === 'teacher' && pack.teacherId !== user.id) return json({ error: 'Forbidden' }, 403);
      if (user.role === 'student') {
        const student = await database.collection('students').findOne({ userId: user.id });
        if (!student || pack.studentId !== student.id) return json({ error: 'Forbidden' }, 403);
      }
      const transactions = await database.collection('packTransactions').find({ packId: id }).sort({ createdAt: -1 }).toArray();
      const payments = await database.collection('payments').find({ packId: id }).sort({ paymentDate: -1 }).toArray();
      return json({ pack, transactions, payments });
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
      const studentIds = [...new Set(classes.map(c => c.studentId))];
      if (studentIds.length > 0) {
        const studentList = await database.collection('students').find({ id: { $in: studentIds } }).toArray();
        const sMap = {};
        for (const s of studentList) sMap[s.id] = s;
        for (const c of classes) {
          const s = sMap[c.studentId];
          if (s && s.permanentMeetingLink && c.mode === 'online') {
            c.meetingLink = s.permanentMeetingLink;
            c.meetingId = s.permanentMeetingId || c.meetingId;
            c.passcode = s.permanentMeetingPasscode || c.passcode;
            c.platform = s.permanentMeetingPlatform || c.platform;
          }
        }
      }
      return json({ classes });
    }

    if (route === 'classes' && method === 'POST') {
      if (user.role !== 'teacher') return json({ error: 'Forbidden' }, 403);
      const b = body;
      const student = await database.collection('students').findOne({ id: b.studentId, teacherId: user.id });
      if (!student) return json({ error: 'Student not found' }, 404);

      const startTimes = [];
      if (b.recurring && Array.isArray(b.recurringDays) && b.recurringDays.length > 0) {
        const start = new Date(b.startDate || new Date().toISOString().split('T')[0]);
        const end = new Date(b.endDate || new Date(start.getTime() + 90 * 24 * 3600 * 1000));
        const defaultTimeStr = b.time || '17:00';
        const dayTimes = b.dayTimes || {}; // e.g. { "5": "18:30", "0": "10:00" }
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dayNum = d.getDay();
          if (b.recurringDays.includes(dayNum)) {
            const timeStr = dayTimes[dayNum] || dayTimes[String(dayNum)] || defaultTimeStr;
            const dateStr = d.toISOString().split('T')[0];
            const occ = new Date(`${dateStr}T${timeStr}:00+05:30`);
            startTimes.push(occ);
          }
        }
      } else if (b.startTime) {
        let st;
        if (typeof b.startTime === 'string' && !b.startTime.includes('Z') && !b.startTime.includes('+')) {
          st = new Date(`${b.startTime}:00+05:30`);
        } else {
          st = new Date(b.startTime);
        }
        startTimes.push(st);
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
          studentTimezone: student.timezone || 'Asia/Kolkata',
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
          isBillable: false,
          packId: null,
          packTransactionId: null,
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
      const cls = await database.collection('classes').findOne({ id, teacherId: user.id });
      if (cls && cls.packId) {
        await processAttendanceDeduction(database, cls, 'cancelled', false, user.id);
      }
      await database.collection('classes').deleteOne({ id, teacherId: user.id });
      return json({ ok: true });
    }

    if (route.startsWith('classes/') && pathParts[2] === 'attendance' && method === 'POST') {
      if (user.role !== 'teacher') return json({ error: 'Forbidden' }, 403);
      const id = pathParts[1];
      const cls = await database.collection('classes').findOne({ id });
      if (!cls || cls.teacherId !== user.id) return json({ error: 'Not found' }, 404);
      const { status, isBillable, notes } = body;
      if (notes !== undefined) {
        await database.collection('classes').updateOne({ id }, { $set: { notes } });
      }
      const updated = await processAttendanceDeduction(database, cls, status || cls.status, isBillable, user.id);
      return json({ class: updated });
    }

    // ---- BILLING ----
    if (route === 'billing/summary' && method === 'GET') {
      if (user.role !== 'teacher') return json({ error: 'Forbidden' }, 403);
      const monthParam = url.searchParams.get('month');
      const { monthStr, startISO, endISO } = getKolkataMonthRange(monthParam);

      const students = await database.collection('students').find({ teacherId: user.id }).toArray();
      const summaries = [];

      let completedThisMonthTotal = 0;
      let billableThisMonthTotal = 0;
      let activePacksCount = 0;
      let lowBalancePacksCount = 0;
      let exhaustedPacksCount = 0;
      let renewalsRequiredCount = 0;

      for (const s of students) {
        const classesInMonth = await database.collection('classes').find({
          teacherId: user.id,
          studentId: s.id,
          startTime: { $gte: startISO, $lt: endISO }
        }).toArray();

        const completedClasses = classesInMonth.filter(c => getAttendanceRules(c.status).countCompleted);
        const billableClasses = classesInMonth.filter(c => c.isBillable);

        completedThisMonthTotal += completedClasses.length;
        billableThisMonthTotal += billableClasses.length;

        let activePack = null;
        if (s.activePackId) {
          activePack = await database.collection('classPacks').findOne({ id: s.activePackId });
        }

        if (activePack && activePack.status === 'active') {
          activePacksCount++;
          if (activePack.remainingClasses <= 2 && activePack.remainingClasses > 0) {
            lowBalancePacksCount++;
          }
          if (activePack.remainingClasses <= 0) {
            exhaustedPacksCount++;
            renewalsRequiredCount++;
          }
        } else {
          renewalsRequiredCount++;
        }

        let advancePaymentStatus = 'none';
        if (activePack) {
          if (activePack.paidAmount >= activePack.totalAmount) advancePaymentStatus = 'paid';
          else if (activePack.paidAmount > 0) advancePaymentStatus = 'partially_paid';
          else advancePaymentStatus = 'pending';
        }

        summaries.push({
          studentId: s.id,
          studentName: s.name,
          level: s.level,
          feePerClass: s.feePerClass,
          activePack: activePack ? {
            id: activePack.id,
            totalClasses: activePack.totalClasses,
            usedClasses: activePack.usedClasses,
            remainingClasses: activePack.remainingClasses,
            status: activePack.status,
            totalAmount: activePack.totalAmount,
            paidAmount: activePack.paidAmount,
          } : null,
          completedThisMonth: completedClasses.length,
          billableThisMonth: billableClasses.length,
          advancePaymentStatus,
          renewalRequired: !activePack || activePack.status !== 'active' || activePack.remainingClasses <= 0,
        });
      }

      const paymentsInMonth = await database.collection('payments').find({
        teacherId: user.id,
        paymentDate: { $gte: startISO, $lt: endISO }
      }).toArray();
      const advancePaymentsThisMonth = paymentsInMonth.reduce((sum, p) => sum + (p.amount || 0), 0);

      const activePacksList = await database.collection('classPacks').find({ teacherId: user.id, status: 'active' }).toArray();
      const packPaymentsOutstanding = activePacksList.reduce((sum, p) => sum + Math.max(0, (p.totalAmount || 0) - (p.paidAmount || 0)), 0);

      return json({
        month: monthStr,
        summaryCards: {
          completedThisMonth: completedThisMonthTotal,
          billableThisMonth: billableThisMonthTotal,
          activeStudents: students.filter(s => s.status === 'active').length,
          activePacks: activePacksCount,
          lowBalancePacks: lowBalancePacksCount,
          exhaustedPacks: exhaustedPacksCount,
          renewalsRequired: renewalsRequiredCount,
          advancePaymentsThisMonth,
          packPaymentsOutstanding,
        },
        summaries,
      });
    }

    if (route.startsWith('billing/student/') && method === 'GET') {
      const sid = pathParts[2];
      const monthParam = url.searchParams.get('month');
      const { monthStr, startISO, endISO } = getKolkataMonthRange(monthParam);

      const student = await database.collection('students').findOne({ id: sid });
      if (!student) return json({ error: 'Not found' }, 404);
      if (user.role === 'teacher' && student.teacherId !== user.id) return json({ error: 'Forbidden' }, 403);
      if (user.role === 'student' && student.userId !== user.id) return json({ error: 'Forbidden' }, 403);

      const classes = await database.collection('classes').find({ studentId: sid, startTime: { $gte: startISO, $lt: endISO } }).sort({ startTime: 1 }).toArray();
      const payments = await database.collection('payments').find({ studentId: sid }).sort({ paymentDate: -1 }).toArray();
      const teacher = await database.collection('users').findOne({ id: student.teacherId });

      let activePack = null;
      if (student.activePackId) {
        activePack = await database.collection('classPacks').findOne({ id: student.activePackId });
      }
      const packHistory = await database.collection('classPacks').find({ studentId: sid }).sort({ createdAt: -1 }).toArray();
      const transactions = await database.collection('packTransactions').find({ studentId: sid }).sort({ createdAt: -1 }).toArray();

      const completedThisMonth = classes.filter(c => getAttendanceRules(c.status).countCompleted).length;
      const billableThisMonth = classes.filter(c => c.isBillable).length;

      return json({
        student,
        teacher: { name: teacher?.name, academyName: teacher?.academyName },
        month: monthStr,
        classes,
        payments,
        activePack,
        packHistory,
        transactions,
        completedThisMonth,
        billableThisMonth,
      });
    }

    // ---- STUDENT PORTAL ----
    if (route === 'student/me' && method === 'GET') {
      if (user.role !== 'student') return json({ error: 'Forbidden' }, 403);
      const student = await database.collection('students').findOne({ userId: user.id });
      if (!student) return json({ error: 'Not found' }, 404);
      const teacher = await database.collection('users').findOne({ id: student.teacherId });
      let activePack = null;
      if (student.activePackId) {
        activePack = await database.collection('classPacks').findOne({ id: student.activePackId });
      }
      const teacherInfo = teacher ? { name: teacher.name, academyName: teacher.academyName } : null;
      return json({ student, teacher: teacherInfo, activePack });
    }

    if (route === 'student/dashboard' && method === 'GET') {
      if (user.role !== 'student') return json({ error: 'Forbidden' }, 403);
      const student = await database.collection('students').findOne({ userId: user.id });
      if (!student) return json({ error: 'Not found' }, 404);

      const now = new Date().toISOString();
      const { startISO } = getKolkataMonthRange();

      const upcoming = await database.collection('classes').find({ studentId: student.id, startTime: { $gte: now } }).sort({ startTime: 1 }).limit(5).toArray();
      const past = await database.collection('classes').find({ studentId: student.id, startTime: { $lt: now } }).sort({ startTime: -1 }).limit(20).toArray();

      const thisMonthClasses = await database.collection('classes').find({ studentId: student.id, startTime: { $gte: startISO } }).toArray();
      const monthlyCompleted = thisMonthClasses.filter(c => getAttendanceRules(c.status).countCompleted).length;
      const monthlyBillable = thisMonthClasses.filter(c => c.isBillable).length;

      let activePack = null;
      if (student.activePackId) {
        activePack = await database.collection('classPacks').findOne({ id: student.activePackId });
      }
      const packHistory = await database.collection('classPacks').find({ studentId: student.id }).sort({ createdAt: -1 }).toArray();
      const payments = await database.collection('payments').find({ studentId: student.id }).sort({ paymentDate: -1 }).toArray();
      const homework = await database.collection('homework').find({ studentId: student.id }).sort({ createdAt: -1 }).toArray();

      return json({
        student,
        activePack,
        upcoming,
        past,
        monthlyCompleted,
        monthlyBillable,
        feePerClass: activePack ? activePack.feePerClassSnapshot : student.feePerClass,
        packHistory,
        payments,
        homework,
      });
    }

    if (route === 'student/change-password' && method === 'POST') {
      if (user.role !== 'student') return json({ error: 'Forbidden' }, 403);
      const { oldPassword, newPassword } = body;
      if (!oldPassword || !newPassword || newPassword.length < 6) {
        return json({ error: 'New password must be at least 6 characters long' }, 400);
      }

      const dbUser = await database.collection('users').findOne({ id: user.id });
      if (!dbUser) return json({ error: 'User not found' }, 404);

      const ok = await bcrypt.compare(oldPassword, dbUser.password);
      if (!ok) return json({ error: 'Current password is incorrect' }, 400);

      const hashed = await bcrypt.hash(newPassword, 10);
      await database.collection('users').updateOne({ id: user.id }, { $set: { password: hashed, updatedAt: new Date().toISOString() } });

      return json({ ok: true, message: 'Password updated successfully' });
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

    if (route === 'teacher/settings' && method === 'GET') {
      if (user.role !== 'teacher') return json({ error: 'Forbidden' }, 403);
      const dbUser = await database.collection('users').findOne({ id: user.id });
      return json({
        customTestLink: dbUser?.customTestLink || '',
        customTestTitle: dbUser?.customTestTitle || '',
        customTestDescription: dbUser?.customTestDescription || '',
        academyName: dbUser?.academyName || '',
      });
    }

    if (route === 'teacher/settings' && method === 'PUT') {
      if (user.role !== 'teacher') return json({ error: 'Forbidden' }, 403);
      const { customTestLink, customTestTitle, customTestDescription, academyName } = body;
      await database.collection('users').updateOne(
        { id: user.id },
        {
          $set: {
            customTestLink: customTestLink || '',
            customTestTitle: customTestTitle || '',
            customTestDescription: customTestDescription || '',
            academyName: academyName !== undefined ? academyName : user.academyName,
            updatedAt: new Date().toISOString(),
          }
        }
      );
      const updated = await database.collection('users').findOne({ id: user.id });
      return json({ ok: true, settings: updated });
    }

    // ---- PRACTICE EXERCISES ----
    if (route === 'practice' && method === 'GET') {
      let filter = {};
      let customTestPortal = null;
      if (user.role === 'teacher') {
        filter.teacherId = user.id;
        const dbUser = await database.collection('users').findOne({ id: user.id });
        if (dbUser?.customTestLink) {
          customTestPortal = { link: dbUser.customTestLink, title: dbUser.customTestTitle, description: dbUser.customTestDescription };
        }
      } else {
        const student = await database.collection('students').findOne({ userId: user.id });
        if (!student) return json({ practice: [], customTestPortal: null });
        filter.$or = [{ studentIds: student.id }, { studentIds: 'all' }];
        filter.teacherId = student.teacherId;
        const teacherUser = await database.collection('users').findOne({ id: student.teacherId });
        if (teacherUser?.customTestLink) {
          customTestPortal = { link: teacherUser.customTestLink, title: teacherUser.customTestTitle, description: teacherUser.customTestDescription };
        }
      }
      const practice = await database.collection('practice').find(filter).sort({ createdAt: -1 }).toArray();
      if (user.role === 'student') {
        const student = await database.collection('students').findOne({ userId: user.id });
        for (const p of practice) {
          const attempt = await database.collection('practice_attempts').findOne({ practiceId: p.id, studentId: student.id });
          p.attempt = attempt;
        }
      }
      return json({ practice, customTestPortal });
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
      // Calculate today's start and end in teacher's configured timezone (Asia/Kolkata default)
      const tz = user.timezone || 'Asia/Kolkata';
      const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
      const ymd = formatter.format(now);
      const dayStartIso = new Date(`${ymd}T00:00:00.000+05:30`).toISOString();
      const dayEndIso = new Date(`${ymd}T23:59:59.999+05:30`).toISOString();

      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const todayClasses = await database.collection('classes').find({ teacherId: user.id, startTime: { $gte: dayStartIso, $lte: dayEndIso } }).sort({ startTime: 1 }).toArray();
      const upcomingNext = await database.collection('classes').find({ teacherId: user.id, startTime: { $gte: now.toISOString() } }).sort({ startTime: 1 }).limit(1).toArray();
      const monthClasses = await database.collection('classes').find({ teacherId: user.id, startTime: { $gte: monthStart.toISOString(), $lt: monthEnd.toISOString() } }).toArray();
      const students = await database.collection('students').find({ teacherId: user.id }).toArray();
      const pendingAttendance = await database.collection('classes').countDocuments({ teacherId: user.id, endTime: { $lt: now.toISOString() }, status: 'upcoming' });
      const missingLinks = todayClasses.filter(c => c.mode === 'online' && !c.meetingLink).length;
      const homeworkToReview = await database.collection('homework').countDocuments({ teacherId: user.id, status: 'submitted' });
      const billableThisMonth = monthClasses.filter(c => c.billable).length;
      const monthlyRevenue = monthClasses.filter(c => c.billable).reduce((sum, c) => sum + (c.feeSnapshot || 0), 0);
      // Check for classes starting within 15 minutes and send automated 15-min pre-class push alarm to teacher & student
      const in15MinIso = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
      const upcoming15 = todayClasses.filter(c => c.status === 'upcoming' && c.startTime >= now.toISOString() && c.startTime <= in15MinIso);
      for (const c of upcoming15) {
        const timeStr = new Date(c.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz });
        
        // Push to Teacher
        if (!c.reminded15MinTeacher && c.teacherId) {
          sendPushToUser(database, c.teacherId, {
            title: `🔔 Class starts in 15 minutes!`,
            body: `${c.studentName} — ${c.topic || 'French Class'} at ${timeStr}. Tap to open Zoom.`,
            url: c.meetingLink || '/',
            tag: `alarm-15m-tch-${c.id}`,
            requireInteraction: true,
          }).catch(() => {});
          await database.collection('classes').updateOne({ id: c.id }, { $set: { reminded15MinTeacher: true } });
        }

        // Push to Student
        if (!c.reminded15MinStudent && c.studentId) {
          const stObj = await database.collection('students').findOne({ id: c.studentId });
          if (stObj && stObj.userId) {
            sendPushToUser(database, stObj.userId, {
              title: `🔔 Your class starts in 15 minutes!`,
              body: `${c.topic || 'Language Class'} with tutor at ${timeStr}. Tap to join Zoom!`,
              url: c.meetingLink || '/',
              tag: `alarm-15m-std-${c.id}`,
              requireInteraction: true,
            }).catch(() => {});
            await database.collection('classes').updateOne({ id: c.id }, { $set: { reminded15MinStudent: true } });
          }
        }
      }

      const sMap = {};
      for (const s of students) sMap[s.id] = s;

      for (const c of todayClasses) {
        const s = sMap[c.studentId];
        if (s && s.permanentMeetingLink && c.mode === 'online') {
          c.meetingLink = s.permanentMeetingLink;
          c.meetingId = s.permanentMeetingId || c.meetingId;
          c.passcode = s.permanentMeetingPasscode || c.passcode;
          c.platform = s.permanentMeetingPlatform || c.platform;
        }
      }
      const nextCls = upcomingNext[0] || null;
      if (nextCls && sMap[nextCls.studentId] && sMap[nextCls.studentId].permanentMeetingLink && nextCls.mode === 'online') {
        const s = sMap[nextCls.studentId];
        nextCls.meetingLink = s.permanentMeetingLink;
        nextCls.meetingId = s.permanentMeetingId || nextCls.meetingId;
        nextCls.passcode = s.permanentMeetingPasscode || nextCls.passcode;
        nextCls.platform = s.permanentMeetingPlatform || nextCls.platform;
      }

      return json({
        todayClasses,
        nextClass: nextCls,
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
