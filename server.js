// CampusBuddy Backend Server - Thapar Institute of Technology
// ============================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// --------------- Middleware ---------------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve the frontend (put your campus_buddy.html in the "public" folder)
app.use(express.static(path.join(__dirname, 'public')));

// --------------- Load JSON Data ---------------
const students = require('./data/students.json');
const schedule = require('./data/schedule.json');
const assignments = require('./data/assignments.json');
const deadlines = require('./data/deadlines.json');
const seniors = require('./data/seniors.json');
const locations = require('./data/locations.json');
const notices = require('./data/notices.json');
const checklist = require('./data/checklist.json');
const messMenu = require('./data/mess-menu.json');

// In-memory state (resets on server restart)
let assignmentsState = JSON.parse(JSON.stringify(assignments));
let checklistState = JSON.parse(JSON.stringify(checklist));
let connectionRequests = [];

// --------------- FAQ Knowledge Base ---------------
const faqKnowledge = [
  {
    keywords: ["library", "where is library", "library timings", "books", "study room", "reading"],
    response: "The **Central Library & Digital Knowledge Hub** is located behind the Main Academic Quadrangle (Block 1).\n\n🕒 **Opening Hours**: Regular Days: 8:00 AM - 11:00 PM | Exam Weeks: Open 24/7\n\n✨ **Fresher Tips**: You can issue up to 4 books for 14 days. Ground floor has quiet study cubicles; 2nd floor has Wi-Fi and discussion rooms."
  },
  {
    keywords: ["club", "join club", "clubs", "induction", "societies", "aarohan"],
    response: "Joining student clubs is the best way to build skills!\n\n🎪 **Club Induction Carnival 'Aarohan 2026'**: Aug 29-30 at the Main Amphitheatre. Over 28 clubs will set up booths.\n\n🚀 **Top Clubs**: Open Source Society, IEEE Robotics, E-Cell, Music & Dramatics Society.\n\n💡 Head to Senior Connect for insider tips from club leads!"
  },
  {
    keywords: ["assignment", "due", "homework", "deadline", "submission", "pending"],
    response: "Here are your immediate deadlines:\n\n🔴 **Due Tomorrow**: CS101 - Data Structures Lab Sheet #3\n🟡 **Due in 4 Days**: MA101 - Eigenvalues Problem Set\n🔵 **Due in 6 Days**: PH101 - Spectrometer Lab Report\n\nCheck the Dashboard tab for full details!"
  },
  {
    keywords: ["wifi", "wi-fi", "internet", "eduroam", "mac address", "password"],
    response: "Follow these steps for campus Wi-Fi:\n\n1. Connect to 'Campus-Setup-Guest'\n2. Go to netreg.thapar.internal\n3. Login with Roll Number and default password\n4. Register up to 3 devices\n\n⚡ Access activates within 15 minutes!"
  },
  {
    keywords: ["canteen", "food", "mess", "lunch", "dinner", "breakfast", "coffee", "hungry"],
    response: "🍔 **Central Canteen**: Open 7:30 AM - 10:30 PM (next to SAC)\n\n🍲 **Hostel Mess Timings**:\n- Breakfast: 07:15 - 09:30 AM\n- Lunch: 12:15 - 02:15 PM\n- Snacks: 05:00 - 06:15 PM\n- Dinner: 07:30 - 09:45 PM\n\n🛵 Delivery riders allowed until 11:30 PM."
  },
  {
    keywords: ["doctor", "health", "hospital", "medical", "ambulance", "sick", "emergency"],
    response: "🏥 **Campus Health Center**: 24x7 Emergency | OPD: 9 AM - 8 PM\n\n📍 Behind Health Plaza, near Girls Hostel Complex.\n\n🚨 Emergency: 0175-2393-021 (Intercom: 2222)\n🛡️ Security: 0175-2393-001"
  },
  {
    keywords: ["admin", "id card", "fee", "scholarship", "bonafide", "certificate"],
    response: "🏢 **Admin Block** (near Flag Plaza & Clock Tower)\n\n🕒 Mon-Fri: 9:30 AM - 5:30 PM\n\n**Counters**: 1-2: Fees & Scholarships | 3: Bonafide & Grade Sheets | 4: RFID ID Cards\n\n💡 Visit before 1 PM to avoid queues."
  },
  {
    keywords: ["senior", "mentor", "guidance", "dsa", "coding", "placement", "internship"],
    response: "CampusBuddy has verified senior mentors from 3rd & 4th year!\n\nThey help with:\n🗺️ First-year roadmaps\n💻 DSA & Competitive Coding\n🏆 Hackathons & Clubs\n💼 Internships & Placements\n\nClick Senior Connect to book a 1-on-1 slot!"
  },
  {
    keywords: ["sports", "gym", "badminton", "pool", "swimming", "basketball", "fitness"],
    response: "🏋️ **Sports Complex**: Morning 6-9 AM | Evening 4:30-9:30 PM\n\nIncludes: Badminton Courts, Olympic Pool, Modern Gym, Table Tennis, Basketball & Tennis courts.\n\n💡 Gym registration is FREE for freshers in Semester 1!"
  }
];

// ============================================================
// API ROUTES
// ============================================================

// --- Student Profile ---
app.get('/api/student', (req, res) => {
  res.json({ success: true, data: students });
});

// --- Schedule ---
app.get('/api/schedule', (req, res) => {
  res.json({ success: true, data: schedule });
});

// --- Assignments ---
app.get('/api/assignments', (req, res) => {
  const { filter } = req.query; // all | pending | submitted
  let filtered = assignmentsState;
  if (filter === 'pending') filtered = assignmentsState.filter(a => !a.submitted);
  if (filter === 'submitted') filtered = assignmentsState.filter(a => a.submitted);
  res.json({ success: true, data: filtered });
});

app.put('/api/assignments/:id/submit', (req, res) => {
  const asg = assignmentsState.find(a => a.id === req.params.id);
  if (!asg) return res.status(404).json({ success: false, message: 'Assignment not found' });
  asg.submitted = true;
  res.json({ success: true, message: `Assignment "${asg.title}" submitted successfully!`, data: asg });
});

// --- Deadlines ---
app.get('/api/deadlines', (req, res) => {
  res.json({ success: true, data: deadlines });
});

// --- Senior Mentors ---
app.get('/api/seniors', (req, res) => {
  const { branch, search } = req.query;
  let filtered = seniors;

  if (branch && branch !== 'All') {
    filtered = filtered.filter(s => s.branch.toLowerCase().includes(branch.toLowerCase()));
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.bio.toLowerCase().includes(q) ||
      s.badge.toLowerCase().includes(q) ||
      s.interests.some(i => i.toLowerCase().includes(q))
    );
  }

  res.json({ success: true, count: filtered.length, data: filtered });
});

app.post('/api/seniors/:id/connect', (req, res) => {
  const mentor = seniors.find(s => s.id === req.params.id);
  if (!mentor) return res.status(404).json({ success: false, message: 'Mentor not found' });

  const { topic, slot, note } = req.body;
  const request = {
    id: `req-${Date.now()}`,
    mentorId: mentor.id,
    mentorName: mentor.name,
    mentorBranch: mentor.branch,
    topic: topic || 'General Fresher Mentorship',
    slot: slot || mentor.slots[0],
    note: note || '',
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  connectionRequests.push(request);
  res.json({
    success: true,
    message: `Request sent! Notification sent to adityalovespatna0106@gmail.com`,
    data: request
  });
});

app.get('/api/connections', (req, res) => {
  res.json({ success: true, data: connectionRequests });
});

// --- Campus Locations ---
app.get('/api/locations', (req, res) => {
  const { category } = req.query;
  let filtered = locations;

  if (category && category !== 'All') {
    filtered = filtered.filter(l =>
      l.category.toLowerCase().includes(category.toLowerCase().split(' ')[0])
    );
  }

  res.json({ success: true, data: filtered });
});

app.get('/api/locations/:id', (req, res) => {
  const loc = locations.find(l => l.id === req.params.id);
  if (!loc) return res.status(404).json({ success: false, message: 'Location not found' });
  res.json({ success: true, data: loc });
});

// --- Notices ---
app.get('/api/notices', (req, res) => {
  const { search, category } = req.query;
  let filtered = notices;

  if (category && category !== 'All') {
    filtered = filtered.filter(n =>
      n.category.toLowerCase().includes(category.toLowerCase().split(' ')[0])
    );
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(n =>
      n.title.toLowerCase().includes(q) ||
      n.summary.toLowerCase().includes(q) ||
      n.refNo.toLowerCase().includes(q)
    );
  }

  res.json({ success: true, data: filtered });
});

app.get('/api/notices/:id', (req, res) => {
  const notice = notices.find(n => n.id === req.params.id);
  if (!notice) return res.status(404).json({ success: false, message: 'Notice not found' });
  res.json({ success: true, data: notice });
});

// --- Chat / Ask CampusBuddy ---
app.post('/api/chat', (req, res) => {
  const { question } = req.body;
  if (!question) return res.status(400).json({ success: false, message: 'Question is required' });

  const lower = question.toLowerCase();
  let matched = null;

  for (const item of faqKnowledge) {
    if (item.keywords.some(k => lower.includes(k))) {
      matched = item;
      break;
    }
  }

  let reply;
  if (matched) {
    reply = matched.response;
  } else {
    reply = `I searched our knowledge base for: "${question}"\n\nHere is some helpful guidance: Freshers can find academic policies in the Important Notices tab, book 1-on-1 guidance with seniors in Senior Connect, or locate facilities using the Campus Guide!\n\nWould you like to ask about the Library, Clubs, Wi-Fi setup, or Mess menu?`;
  }

  res.json({
    success: true,
    data: {
      sender: 'ai',
      text: reply,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  });
});

// --- Fresher Checklist ---
app.get('/api/checklist', (req, res) => {
  const completed = checklistState.filter(c => c.done).length;
  res.json({
    success: true,
    completed,
    total: checklistState.length,
    percentage: Math.round((completed / checklistState.length) * 100),
    data: checklistState
  });
});

app.put('/api/checklist/:id/toggle', (req, res) => {
  const item = checklistState.find(c => c.id === req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Checklist item not found' });
  item.done = !item.done;
  const completed = checklistState.filter(c => c.done).length;
  res.json({
    success: true,
    message: item.done ? 'Task marked as complete! 🎉' : 'Task marked pending.',
    completed,
    total: checklistState.length,
    data: item
  });
});

// --- Mess Menu ---
app.get('/api/mess-menu', (req, res) => {
  const { meal } = req.query;
  if (meal && messMenu[meal]) {
    res.json({ success: true, data: { meal, menu: messMenu[meal] } });
  } else {
    res.json({ success: true, data: messMenu });
  }
});

// --- Contact Support ---
app.post('/api/contact', (req, res) => {
  const { name, email, message } = req.body;
  // In production, this would send an email
  console.log(`[CONTACT SUPPORT] From: ${name} (${email}) - ${message}`);
  res.json({
    success: true,
    message: 'Your message has been sent to adityalovespatna0106@gmail.com. We will get back to you soon!',
    supportEmail: 'adityalovespatna0106@gmail.com'
  });
});

// --- Health Check ---
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    server: 'CampusBuddy Backend API',
    institution: 'Thapar Institute of Technology',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// --- Catch-all: Serve frontend for non-API routes ---
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --------------- Error Handler ---------------
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// --------------- Start Server ---------------
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════════╗
  ║   🎓 CampusBuddy Backend Server                 ║
  ║   Thapar Institute of Technology                 ║
  ║                                                  ║
  ║   🌐 Server:  http://localhost:${PORT}              ║
  ║   📡 API:     http://localhost:${PORT}/api           ║
  ║   💌 Support: adityalovespatna0106@gmail.com     ║
  ╚══════════════════════════════════════════════════╝
  `);
});
