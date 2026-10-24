/**
 * CamPulse — Supabase & Data Abstraction Layer
 * Target Institution: Obafemi Awolowo University (OAU), Ile-Ife
 * 
 * Supports seamless hybrid operation:
 * 1. Direct Supabase integration when credentials exist.
 * 2. Robust, feature-complete LocalStorage fallback with automatic migration.
 * 3. Phase 3 Community Features: Public board, "Me too" upvotes, duplicate detection & auto-categorization.
 */

'use strict';

// ── Institution Location Presets ──────────────────────────────────────
const CAMPUS_LOCATIONS = {
  hostels: [
    'Awolowo Hall (Male)',
    'Fajuyi Hall (Male)',
    'Angola Hall (Male)',
    'ETF Hall (Male)',
    'Moremi Hall (Female)',
    'Mozambique Hall (Female)',
    'Alumni Hall (Female)',
    'Ladoke Akintola Hall (Female)'
  ],
  faculties: [
    'Faculty of Science',
    'Faculty of Technology',
    'Faculty of Administration',
    'Faculty of Arts',
    'Faculty of Law',
    'Faculty of Social Sciences',
    'Faculty of Agriculture',
    'Faculty of Pharmacy',
    'College of Health Sciences (CHS)',
    'Faculty of Environmental Design & Management (EDM)'
  ],
  facilities: [
    'Hezekiah Oluwasanmi Library',
    'Senate Building',
    'Division of Works & Maintenance',
    'Campus Health Centre',
    'Student Union Building (SUB)',
    'Sports Complex & Gymnasium',
    'Information Technology Unit (INTECU)',
    'Sub-Post Office / Commercial Centre',
    'Amphitheatre',
    'Main Campus Gate / Road 1'
  ]
};

// Department routing mapping for auto-assignment
const DEPARTMENT_MAPPING = {
  Academic: 'Academic Affairs & Senate Secretariat',
  Facilities: 'Division of Works & Maintenance Services',
  Hostel: 'Division of Student Affairs (Accommodations)',
  Finance: 'Bursary Department & Student Accounts',
  IT: 'Information Technology & Communications Unit (INTECU)',
  Safety: 'Campus Security Services & Marshal Unit',
  Food: 'Student Welfare & Cafeteria Regulatory Committee',
  Administration: 'University Registry & General Administration',
  Other: 'Dean of Student Affairs Office'
};

// Keyword mapping for automatic category detection (Phase 3 Item 17)
const CATEGORY_KEYWORDS = {
  Academic: [
    'exam', 'examination', 'test', 'course', 'lecturer', 'professor', 'grade', 'grades',
    'result', 'results', 'transcript', 'syllabus', 'lecture', 'lectures', 'cgpa', 'gpa',
    'carryover', 'quiz', 'timetable', 'clash', 'semester', 'curriculum', 'academics', 'faculty'
  ],
  Facilities: [
    'water', 'tap', 'taps', 'pipe', 'pipes', 'leak', 'leaking', 'plumbing', 'light', 'lights',
    'electricity', 'power', 'blackout', 'generator', 'bulb', 'bulbs', 'socket', 'fan', 'fans',
    'ac', 'air conditioner', 'chair', 'chairs', 'desk', 'desks', 'toilet', 'toilets', 'restroom',
    'door', 'doors', 'window', 'windows', 'roof', 'ceiling', 'flooding', 'infrastructure'
  ],
  Hostel: [
    'hostel', 'hall', 'room', 'rooms', 'block', 'blocks', 'bed', 'mattress', 'bunk', 'porter',
    'warden', 'awolowo', 'fajuyi', 'angola', 'moremi', 'mozambique', 'alumni', 'etf', 'akintola',
    'accommodate', 'accommodation', 'squatting', 'hall of residence'
  ],
  Finance: [
    'fee', 'fees', 'school fees', 'payment', 'remita', 'bursary', 'bank', 'refund', 'receipt',
    'charge', 'debit', 'portal fees', 'acceptance', 'due', 'fine', 'scholarship'
  ],
  IT: [
    'wifi', 'wi-fi', 'internet', 'network', 'intecu', 'portal', 'e-portal', 'login', 'password',
    'server', 'servers', 'down', 'connection', 'bandwidth', 'email', 'site'
  ],
  Safety: [
    'safety', 'security', 'theft', 'stolen', 'thief', 'thieves', 'robbery', 'fight', 'fighting',
    'marshal', 'marshals', 'harassment', 'assault', 'threat', 'emergency', 'guard', 'guards',
    'patrol', 'intruder', 'lost item'
  ],
  Food: [
    'food', 'cafeteria', 'canteen', 'meal', 'meals', 'eatery', 'buka', 'sub', 'vendor',
    'vendors', 'price', 'prices', 'hygiene', 'poisoning', 'cooking', 'dining', 'drink'
  ],
  Administration: [
    'registry', 'senate', 'student affairs', 'id card', 'clearance', 'verification',
    'admission', 'dean', 'officer', 'bureaucracy', 'delay'
  ]
};

// ── Configuration & Client Initialization ─────────────────────────────
const CamPulseDB = (function () {
  const STORAGE_KEY = 'campulse_tickets';
  const USER_KEY = 'campulse_user';
  const UPVOTES_KEY = 'campulse_user_upvotes';
  const DEVICE_KEY = 'campulse_device_id';
  const NOTIFICATIONS_KEY = 'campulse_notifications';
  const NOTIF_PREFS_KEY = 'campulse_notif_prefs';
  const SUBMISSION_TIMESTAMPS_KEY = 'campulse_submission_timestamps';

  // Default Notification Preferences (Phase 4 Item 21)
  const DEFAULT_NOTIF_PREFS = {
    emailEnabled: true,
    inAppEnabled: true,
    whatsappPreviewEnabled: false,
    phone: '',
    events: {
      statusChange: true,
      staffComment: true,
      slaWarning: true,
      communityMilestones: true
    }
  };

  function getNotifPrefs() {
    try {
      const stored = localStorage.getItem(NOTIF_PREFS_KEY);
      return stored ? { ...DEFAULT_NOTIF_PREFS, ...JSON.parse(stored) } : DEFAULT_NOTIF_PREFS;
    } catch {
      return DEFAULT_NOTIF_PREFS;
    }
  }

  function saveNotifPrefs(prefs) {
    localStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(prefs));
  }

  // Initial Seed Notifications for realistic demo (Phase 4 Item 20)
  function getSeedNotifications() {
    const now = Date.now();
    return [
      {
        id: 'notif-1',
        ticketId: 'CP-2026-0042',
        title: 'Official Department Response',
        message: 'Engr. O. Kolawole (Works & Maintenance) posted an update on your water disruption complaint.',
        type: 'comment',
        read: false,
        createdAt: new Date(now - 3600000 * 2).toISOString()
      },
      {
        id: 'notif-2',
        ticketId: 'CP-2026-0042',
        title: 'Status: In Progress',
        message: 'Your ticket has been prioritized with 24h Urgent SLA response.',
        type: 'status',
        read: false,
        createdAt: new Date(now - 3600000 * 18).toISOString()
      },
      {
        id: 'notif-3',
        ticketId: 'CP-2026-0019',
        title: 'Complaint Resolved',
        message: 'INTECU resolved your e-portal fee clearance issue. Please rate your satisfaction.',
        type: 'status',
        read: true,
        createdAt: new Date(now - 3600000 * 36).toISOString()
      }
    ];
  }

  function getLocalNotifications() {
    try {
      const data = localStorage.getItem(NOTIFICATIONS_KEY);
      if (!data) {
        const seed = getSeedNotifications();
        localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(seed));
        return seed;
      }
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  function saveLocalNotifications(notifs) {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifs));
  }

  // Rate Limiting: Max 5 submissions per hour per user/device (Phase 5 Item 28)
  function checkRateLimit(identifier) {
    const ONE_HOUR = 3600000;
    const MAX_PER_HOUR = 5;
    try {
      const all = JSON.parse(localStorage.getItem(SUBMISSION_TIMESTAMPS_KEY) || '{}');
      const now = Date.now();
      const list = (all[identifier] || []).filter(ts => (now - ts) < ONE_HOUR);
      if (list.length >= MAX_PER_HOUR) {
        const oldest = list[0];
        const resetMinutes = Math.ceil((ONE_HOUR - (now - oldest)) / 60000);
        return { allowed: false, remaining: 0, resetMinutes };
      }
      list.push(now);
      all[identifier] = list;
      localStorage.setItem(SUBMISSION_TIMESTAMPS_KEY, JSON.stringify(all));
      return { allowed: true, remaining: MAX_PER_HOUR - list.length, resetMinutes: 0 };
    } catch {
      return { allowed: true, remaining: 5, resetMinutes: 0 };
    }
  }

  // Read config from environment or window definition
  const supabaseUrl = window.CAMPULSE_SUPABASE_URL || '';
  const supabaseAnonKey = window.CAMPULSE_SUPABASE_ANON_KEY || '';

  let client = null;
  const isCloudEnabled = Boolean(supabaseUrl && supabaseAnonKey && window.supabase);

  if (isCloudEnabled) {
    try {
      client = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
      console.info('[CamPulse] Supabase client initialized.');
    } catch (err) {
      console.warn('[CamPulse] Failed to initialize Supabase client:', err);
    }
  } else {
    console.info('[CamPulse] Running in resilient LocalStorage client mode.');
  }

  // Ensure persistent anonymous device identifier for unauthenticated upvotes
  function getDeviceId() {
    let devId = localStorage.getItem(DEVICE_KEY);
    if (!devId) {
      devId = 'dev-' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      localStorage.setItem(DEVICE_KEY, devId);
    }
    return devId;
  }

  // ── Helper: Format Ticket ID (CP-YYYY-XXXX) ─────────────────────────
  function generateTicketId() {
    const year = new Date().getFullYear();
    const randNum = String(Math.floor(1000 + Math.random() * 9000));
    return `CP-${year}-${randNum}`;
  }

  // ── Initial Realistic Seed Tickets for OAU ─────────────────────────
  function getSeedTickets() {
    const now = Date.now();
    return [
      {
        id: 'CP-2026-0042',
        category: 'Facilities',
        department: 'Division of Works & Maintenance Services',
        locationZone: 'Fajuyi Hall (Male)',
        locationDetails: 'Block 2, Second Floor Riser Pipe',
        subject: 'Severe water supply disruption at Fajuyi Hall Block 2',
        description: 'Tap water supply has been completely unavailable on the 2nd and 3rd floors since Thursday morning. Students are currently carrying buckets from the ground floor pump station. Plumbing inspection and pressure valve repair are urgently required.',
        urgent: true,
        isAnonymous: true,
        isPublic: true,
        studentName: 'Anonymous Student',
        studentMatric: 'CVE/2021/089',
        studentEmail: 'student@student.oauife.edu.ng',
        status: 'in_progress',
        upvotesCount: 48,
        createdAt: new Date(now - 3600000 * 48).toISOString(),
        resolvedAt: null,
        attachments: [
          {
            id: 'att-seed-1',
            name: 'dry_tap_block2.jpg',
            size: 1420000,
            type: 'image/jpeg',
            url: 'favicon-512x512.png'
          }
        ],
        comments: [
          {
            id: 'cm-s1',
            authorName: 'Engr. O. Kolawole',
            authorRole: 'staff',
            message: 'Our plumbing team isolated the riser near room 214. A replacement high-pressure brass gate valve has been requisitioned from the works central store.',
            createdAt: new Date(now - 3600000 * 20).toISOString()
          }
        ],
        timeline: [
          {
            step: 'submitted',
            title: 'Complaint Submitted',
            timestamp: new Date(now - 3600000 * 48).toISOString(),
            actor: 'Anonymous Student',
            note: 'Logged with Urgent Priority. Identity secured for super-admin audit only.'
          },
          {
            step: 'assigned',
            title: 'Auto-Assigned to Works & Maintenance',
            timestamp: new Date(now - 3600000 * 47.5).toISOString(),
            actor: 'System Auto-Router',
            note: 'Categorized under Facilities. Urgent SLA threshold: 24 Hours.'
          },
          {
            step: 'in_progress',
            title: 'Maintenance Crew Dispatched',
            timestamp: new Date(now - 3600000 * 26).toISOString(),
            actor: 'Engr. O. Kolawole (Works Dept)',
            note: 'Inspection confirmed cracked riser valve on 2nd floor. Replacement in progress.'
          }
        ],
        rating: null,
        ratingComment: '',
        reopenCount: 0
      },
      {
        id: 'CP-2026-0038',
        category: 'Facilities',
        department: 'Division of Works & Maintenance Services',
        locationZone: 'Hezekiah Oluwasanmi Library',
        locationDetails: '2nd Floor Reference & Humanities Wing',
        subject: 'Broken reading desk carrels and non-functional AC in Hezekiah Library',
        description: 'Over 15 reading carrels on the 2nd floor of the university library have broken chairs or wobbly desks. The central AC units in the reference wing are also blowing warm air, making study conditions stifling during peak exam prep hours.',
        urgent: false,
        isAnonymous: false,
        isPublic: true,
        studentName: 'Funmilayo Adeleke',
        studentMatric: 'LAW/2022/104',
        studentEmail: 'adeleke@student.oauife.edu.ng',
        status: 'assigned',
        upvotesCount: 35,
        createdAt: new Date(now - 3600000 * 72).toISOString(),
        resolvedAt: null,
        attachments: [],
        comments: [],
        timeline: [
          {
            step: 'submitted',
            title: 'Complaint Submitted',
            timestamp: new Date(now - 3600000 * 72).toISOString(),
            actor: 'Funmilayo Adeleke',
            note: 'Ticket queued for library maintenance review.'
          },
          {
            step: 'assigned',
            title: 'Assigned to Division of Works',
            timestamp: new Date(now - 3600000 * 70).toISOString(),
            actor: 'System Auto-Router',
            note: 'Standard SLA window: 72 Hours.'
          }
        ],
        rating: null,
        ratingComment: '',
        reopenCount: 0
      },
      {
        id: 'CP-2026-0031',
        category: 'IT',
        department: 'Information Technology & Communications Unit (INTECU)',
        locationZone: 'Information Technology Unit (INTECU)',
        locationDetails: 'Spider Building & Central Computer Wing',
        subject: 'INTECU campus Wi-Fi authentication portal crashing at Spider Building',
        description: 'Students attempting to access research journals and online course materials at the Spider Building and Central Computer Lab cannot connect to the eduroam/OAU-Student Wi-Fi. The authentication login portal repeatedly returns HTTP 504 Gateway Timeout.',
        urgent: true,
        isAnonymous: false,
        isPublic: true,
        studentName: 'Chinedu Eze',
        studentMatric: 'CSC/2021/042',
        studentEmail: 'eze@student.oauife.edu.ng',
        status: 'pending',
        upvotesCount: 29,
        createdAt: new Date(now - 3600000 * 18).toISOString(),
        resolvedAt: null,
        attachments: [],
        comments: [],
        timeline: [
          {
            step: 'submitted',
            title: 'Complaint Submitted',
            timestamp: new Date(now - 3600000 * 18).toISOString(),
            actor: 'Chinedu Eze',
            note: 'Urgent priority ticket logged for network engineering unit.'
          }
        ],
        rating: null,
        ratingComment: '',
        reopenCount: 0
      },
      {
        id: 'CP-2026-0025',
        category: 'Hostel',
        department: 'Division of Student Affairs (Accommodations)',
        locationZone: 'Moremi Hall (Female)',
        locationDetails: 'Blocks C & D (Floor 1 to 3)',
        subject: 'Frequent electricity single-phase power drop in Moremi Hall',
        description: 'Power supply has been single-phasing in Moremi Hall Blocks C & D for three consecutive days. Only dim yellow voltage is reaching rooms, preventing students from charging laptops or running basic lighting for night studies.',
        urgent: false,
        isAnonymous: true,
        isPublic: true,
        studentName: 'Anonymous Student',
        studentMatric: 'BCH/2022/015',
        studentEmail: 'student@student.oauife.edu.ng',
        status: 'in_progress',
        upvotesCount: 24,
        createdAt: new Date(now - 3600000 * 96).toISOString(),
        resolvedAt: null,
        attachments: [],
        comments: [],
        timeline: [
          {
            step: 'submitted',
            title: 'Complaint Submitted',
            timestamp: new Date(now - 3600000 * 96).toISOString(),
            actor: 'Anonymous Student',
            note: 'Submitted anonymously.'
          },
          {
            step: 'assigned',
            title: 'Assigned to Student Affairs & Works Electrical',
            timestamp: new Date(now - 3600000 * 94).toISOString(),
            actor: 'System Auto-Router',
            note: 'Electrical feeder inspection initiated.'
          },
          {
            step: 'in_progress',
            title: 'Substation Feeder Testing',
            timestamp: new Date(now - 3600000 * 40).toISOString(),
            actor: 'Electrical Maintenance Team',
            note: 'High-tension fuse blown on feeder pillar near Alumni hall.'
          }
        ],
        rating: null,
        ratingComment: '',
        reopenCount: 0
      },
      {
        id: 'CP-2026-0019',
        category: 'Academic',
        department: 'Academic Affairs & Senate Secretariat',
        locationZone: 'Faculty of Technology',
        locationDetails: 'Department of Computer Science & Engineering',
        subject: 'Missing continuous assessment grades for CSC 301 CBT mid-semester test',
        description: 'Over 60 students who completed the CSC 301 mid-semester CBT assessment at the e-Testing centre have no scores reflected on their department portal profile. Examination date is approaching and clearance requires this score update.',
        urgent: true,
        isAnonymous: false,
        isPublic: true,
        studentName: 'Tolani Shonibare',
        studentMatric: 'CSC/2021/088',
        studentEmail: 'shonibare@student.oauife.edu.ng',
        status: 'assigned',
        upvotesCount: 18,
        createdAt: new Date(now - 3600000 * 120).toISOString(),
        resolvedAt: null,
        attachments: [],
        comments: [],
        timeline: [
          {
            step: 'submitted',
            title: 'Complaint Submitted',
            timestamp: new Date(now - 3600000 * 120).toISOString(),
            actor: 'Tolani Shonibare',
            note: 'Logged with urgent status due to impending examination deadline.'
          },
          {
            step: 'assigned',
            title: 'Assigned to Academic Affairs Secretariat',
            timestamp: new Date(now - 3600000 * 118).toISOString(),
            actor: 'System Auto-Router',
            note: 'Forwarded to Faculty Examination Officer.'
          }
        ],
        rating: null,
        ratingComment: '',
        reopenCount: 0
      },
      {
        id: 'CP-2026-0014',
        category: 'Food',
        department: 'Student Welfare & Cafeteria Regulatory Committee',
        locationZone: 'Student Union Building (SUB)',
        locationDetails: 'Ground Floor Cafeteria Hall',
        subject: 'Sub-standard drinking water dispenser hygiene at Central SUB Cafeteria',
        description: 'The commercial water filter dispenser in the student cafeteria has visible scale build-up and students reported stomach complaints after drinking tap-dispensed water. Routine sanitization and filter replacement needed.',
        urgent: false,
        isAnonymous: false,
        isPublic: true,
        studentName: 'Oluwaseun Bakare',
        studentMatric: 'ECN/2020/055',
        studentEmail: 'bakare@student.oauife.edu.ng',
        status: 'resolved',
        upvotesCount: 15,
        createdAt: new Date(now - 3600000 * 150).toISOString(),
        resolvedAt: new Date(now - 3600000 * 36).toISOString(),
        attachments: [],
        comments: [
          {
            id: 'cm-food-1',
            authorName: 'Student Welfare Officer',
            authorRole: 'staff',
            message: 'All commercial dispensers inspected. Activated carbon filters replaced and biological test passed.',
            createdAt: new Date(now - 3600000 * 38).toISOString()
          }
        ],
        timeline: [
          {
            step: 'submitted',
            title: 'Complaint Submitted',
            timestamp: new Date(now - 3600000 * 150).toISOString(),
            actor: 'Oluwaseun Bakare',
            note: 'Reported to Student Welfare Committee.'
          },
          {
            step: 'assigned',
            title: 'Assigned to Cafeteria Committee',
            timestamp: new Date(now - 3600000 * 148).toISOString(),
            actor: 'System Auto-Router',
            note: 'Inspection scheduled.'
          },
          {
            step: 'in_progress',
            title: 'Sanitation Inspection Dispatched',
            timestamp: new Date(now - 3600000 * 70).toISOString(),
            actor: 'Welfare Committee Staff',
            note: 'Replacement filters installed on all SUB dispensers.'
          },
          {
            step: 'resolved',
            title: 'Filters Replaced & Sanitized',
            timestamp: new Date(now - 3600000 * 36).toISOString(),
            actor: 'Cafeteria Regulatory Officer',
            note: 'Inspection verified clean water flow.'
          }
        ],
        rating: 5,
        ratingComment: 'The welfare committee conducted a surprise inspection and replaced all filter cartridges within 24 hours. Great response!',
        ratedAt: new Date(now - 3600000 * 30).toISOString(),
        reopenCount: 0
      },
      {
        id: 'CP-2026-0008',
        category: 'Safety',
        department: 'Campus Security Services & Marshal Unit',
        locationZone: 'Angola Hall (Male)',
        locationDetails: 'Walkway connecting Angola Back Gate to New Pharmacy',
        subject: 'Dark pathway behind Angola Hall needs security floodlights',
        description: 'The walkway connecting Angola Hall back gate to the New Pharmacy complex is completely pitch black after 7 PM due to three burnt halogen bulbs. Security marshals are rarely stationed on that path.',
        urgent: true,
        isAnonymous: true,
        isPublic: false, // SENSITIVE: Safety category default private unless student explicitly opts in!
        studentName: 'Anonymous Student',
        studentMatric: 'PHM/2021/012',
        studentEmail: 'student@student.oauife.edu.ng',
        status: 'resolved',
        upvotesCount: 31,
        createdAt: new Date(now - 3600000 * 200).toISOString(),
        resolvedAt: new Date(now - 3600000 * 72).toISOString(),
        attachments: [],
        comments: [],
        timeline: [
          {
            step: 'submitted',
            title: 'Security Alert Submitted',
            timestamp: new Date(now - 3600000 * 200).toISOString(),
            actor: 'Anonymous Student',
            note: 'Logged under Safety & Security. Restricted privacy active.'
          },
          {
            step: 'assigned',
            title: 'Assigned to Campus Security Unit',
            timestamp: new Date(now - 3600000 * 199).toISOString(),
            actor: 'System Auto-Router',
            note: 'Rapid response window: 4 Hours.'
          },
          {
            step: 'resolved',
            title: 'Solar Security Floodlights Installed',
            timestamp: new Date(now - 3600000 * 72).toISOString(),
            actor: 'Chief Security Officer',
            note: 'Works Electrical Unit installed two commercial solar floodlights and night marshal patrols added.'
          }
        ],
        rating: 4,
        ratingComment: 'New solar lights installed. Walkway is now bright and feels much safer at night.',
        ratedAt: new Date(now - 3600000 * 68).toISOString(),
        reopenCount: 0
      }
    ];
  }

  // ── Helper: Migrate Legacy Tickets & Ensure Consistent Schema ──────
  function migrateTickets(rawTickets) {
    if (!Array.isArray(rawTickets) || rawTickets.length === 0) {
      return getSeedTickets();
    }

    return rawTickets.map((t, idx) => {
      const id = (t.id && t.id.startsWith('CP-')) ? t.id : `CP-2026-${String(idx + 1).padStart(4, '0')}`;
      const createdAt = t.createdAt || new Date(Date.now() - (idx + 1) * 3600000 * 6).toISOString();
      const department = t.department || DEPARTMENT_MAPPING[t.category] || 'Student Affairs';

      // Default timeline if missing
      const timeline = Array.isArray(t.timeline) && t.timeline.length > 0 ? t.timeline : [
        {
          step: 'submitted',
          title: 'Complaint Submitted',
          timestamp: createdAt,
          actor: t.isAnonymous ? 'Anonymous Student' : (t.studentName || 'Student'),
          note: 'Ticket logged and queued for department review.'
        },
        {
          step: 'assigned',
          title: `Assigned to ${department}`,
          timestamp: new Date(new Date(createdAt).getTime() + 1000 * 60 * 45).toISOString(),
          actor: 'System Auto-Router',
          note: `Categorized under ${t.category || 'Other'}. Routing to department officers.`
        }
      ];

      if (t.status === 'reviewed' || t.status === 'in_progress') {
        if (!timeline.some(s => s.step === 'in_progress')) {
          timeline.push({
            step: 'in_progress',
            title: 'Investigation In Progress',
            timestamp: new Date(new Date(createdAt).getTime() + 1000 * 60 * 180).toISOString(),
            actor: `${department} Staff`,
            note: 'Inspection assigned and maintenance team scheduled.'
          });
        }
      }

      if (t.status === 'resolved') {
        const resolvedAt = t.resolvedAt || new Date(new Date(createdAt).getTime() + 1000 * 3600 * 24).toISOString();
        if (!timeline.some(s => s.step === 'resolved')) {
          timeline.push({
            step: 'resolved',
            title: 'Issue Resolved',
            timestamp: resolvedAt,
            actor: `${department} Desk Officer`,
            note: 'Action completed. Student invited to verify and rate resolution.'
          });
        }
      }

      // Sensitive categories like Safety default to private unless explicitly opted-in
      const isSafety = (t.category === 'Safety');
      const isPublic = t.isPublic !== undefined ? Boolean(t.isPublic) : !isSafety;

      return {
        id,
        category: t.category || 'Other',
        department,
        subject: t.subject || 'Untitled Feedback',
        description: t.description || '',
        urgent: Boolean(t.urgent),
        status: t.status === 'reviewed' ? 'in_progress' : (t.status || 'pending'),
        isAnonymous: Boolean(t.isAnonymous),
        isPublic,
        studentName: t.studentName || 'Student',
        studentMatric: t.studentMatric || 'CSC/2021/042',
        studentEmail: t.studentEmail || 'student@student.oauife.edu.ng',
        locationZone: t.locationZone || 'Main Campus',
        locationDetails: t.locationDetails || '',
        attachments: Array.isArray(t.attachments) ? t.attachments : [],
        comments: Array.isArray(t.comments) ? t.comments : [],
        timeline,
        upvotesCount: typeof t.upvotesCount === 'number' ? t.upvotesCount : (t.upvotes || 0),
        rating: t.rating || null,
        ratingComment: t.ratingComment || '',
        ratedAt: t.ratedAt || null,
        reopenCount: t.reopenCount || 0,
        reopenedAt: t.reopenedAt || null,
        createdAt,
        resolvedAt: t.status === 'resolved' ? (t.resolvedAt || createdAt) : null
      };
    });
  }

  // ── Local Storage Repository Methods ────────────────────────────────
  function getLocalTickets() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        const seeds = getSeedTickets();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seeds));
        return seeds;
      }
      const data = JSON.parse(stored);
      const migrated = migrateTickets(data);
      if (JSON.stringify(data) !== JSON.stringify(migrated)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      }
      return migrated;
    } catch {
      return getSeedTickets();
    }
  }

  function saveLocalTickets(tickets) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
  }

  // Upvotes state in local storage
  function getUserUpvotes() {
    try {
      return JSON.parse(localStorage.getItem(UPVOTES_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveUserUpvotes(upvotes) {
    localStorage.setItem(UPVOTES_KEY, JSON.stringify(upvotes));
  }

  // ── Public API Methods ──────────────────────────────────────────────
  return {
    isCloud: () => isCloudEnabled,

    getCampusLocations: () => CAMPUS_LOCATIONS,
    getDepartmentForCategory: (cat) => DEPARTMENT_MAPPING[cat] || 'Dean of Student Affairs Office',
    getCategoryKeywords: () => CATEGORY_KEYWORDS,

    getCurrentUser: () => {
      try {
        return JSON.parse(localStorage.getItem(USER_KEY)) || null;
      } catch {
        return null;
      }
    },

    setCurrentUser: (user) => {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    },

    clearCurrentUser: () => {
      localStorage.removeItem(USER_KEY);
    },

    /** Fetch all tickets */
    async fetchAllTickets() {
      if (isCloudEnabled && client) {
        try {
          const { data, error } = await client
            .from('tickets')
            .select('*, ticket_attachments(*), ticket_comments(*)')
            .order('created_at', { ascending: false });
          if (!error && data && data.length > 0) return data;
        } catch (e) {
          console.warn('[CamPulse] Supabase fetch error, falling back to local:', e);
        }
      }
      return getLocalTickets();
    },

    /** Fetch public issues (Phase 3 Item 14) */
    async getPublicTickets(filters = {}) {
      const all = await this.fetchAllTickets();

      // Filter: Only public issues AND exclude sensitive categories (e.g. Safety) unless explicitly public, AND exclude moderated
      let publicTickets = all.filter(t => {
        if (t.isModerated) return false;
        if (t.isPublic === false) return false;
        if (t.category === 'Safety' && !t.isPublic) return false;
        return true;
      });

      // Apply category filter
      if (filters.category && filters.category !== 'all') {
        publicTickets = publicTickets.filter(t => t.category.toLowerCase() === filters.category.toLowerCase());
      }

      // Apply location filter
      if (filters.location && filters.location !== 'all') {
        publicTickets = publicTickets.filter(t => t.locationZone === filters.location);
      }

      // Apply status filter
      if (filters.status && filters.status !== 'all') {
        publicTickets = publicTickets.filter(t => t.status === filters.status);
      }

      // Apply search query (supporting query or search)
      const searchStr = filters.query || filters.search;
      if (searchStr && searchStr.trim()) {
        const q = searchStr.trim().toLowerCase();
        publicTickets = publicTickets.filter(t =>
          (t.subject && t.subject.toLowerCase().includes(q)) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.locationZone && t.locationZone.toLowerCase().includes(q)) ||
          (t.category && t.category.toLowerCase().includes(q)) ||
          (t.id && t.id.toLowerCase().includes(q))
        );
      }

      // Apply sort
      const sortBy = filters.sort || 'upvotes'; // upvotes | newest | oldest | urgent
      publicTickets.sort((a, b) => {
        if (sortBy === 'upvotes') {
          return (b.upvotesCount || 0) - (a.upvotesCount || 0);
        }
        if (sortBy === 'newest') {
          return new Date(b.createdAt) - new Date(a.createdAt);
        }
        if (sortBy === 'oldest') {
          return new Date(a.createdAt) - new Date(b.createdAt);
        }
        if (sortBy === 'urgent') {
          if (a.urgent === b.urgent) {
            return (b.upvotesCount || 0) - (a.upvotesCount || 0);
          }
          return a.urgent ? -1 : 1;
        }
        return 0;
      });

      // Anonymize for public presentation (protect student identity & matric number)
      return publicTickets.map(t => ({
        ...t,
        studentName: t.isAnonymous ? 'Anonymous Student' : 'Verified Student',
        studentMatric: null,
        studentEmail: null
      }));
    },

    /** Fetch trending issues for the landing page (Phase 3 Item 18) */
    async getTrendingTickets(limit = 3) {
      const publicIssues = await this.getPublicTickets({ sort: 'upvotes' });
      // Only include open or in-progress tickets for trending
      const openTrending = publicIssues.filter(t => t.status !== 'resolved' && t.status !== 'closed');
      return (openTrending.length >= limit ? openTrending : publicIssues).slice(0, limit);
    },

    /** Check if current user/device has upvoted a ticket (Phase 3 Item 15) */
    hasUserUpvoted(ticketId) {
      if (!ticketId) return false;
      const upvotes = getUserUpvotes();
      return upvotes.includes(ticketId);
    },

    /** Toggle "Me Too" upvote on a ticket (Phase 3 Item 15) */
    async upvoteTicket(ticketId) {
      if (!ticketId) return { upvoted: false, count: 0 };
      const upvotes = getUserUpvotes();
      const hasUpvoted = upvotes.includes(ticketId);
      const newUpvoted = !hasUpvoted;

      let newCount = 0;
      const tickets = getLocalTickets();
      const target = tickets.find(t => t.id === ticketId);

      if (target) {
        const currentCount = typeof target.upvotesCount === 'number' ? target.upvotesCount : 0;
        target.upvotesCount = newUpvoted ? currentCount + 1 : Math.max(0, currentCount - 1);
        newCount = target.upvotesCount;
        saveLocalTickets(tickets);
      }

      if (newUpvoted) {
        upvotes.push(ticketId);
      } else {
        const idx = upvotes.indexOf(ticketId);
        if (idx !== -1) upvotes.splice(idx, 1);
      }
      saveUserUpvotes(upvotes);

      // Cloud synchronization if Supabase is active
      if (isCloudEnabled && client) {
        try {
          const currentUser = this.getCurrentUser();
          const userId = currentUser?.id || getDeviceId();
          if (newUpvoted) {
            await client.from('ticket_upvotes').upsert([
              { ticket_id: ticketId, student_id: userId }
            ]);
            await client.rpc('increment_upvote', { t_id: ticketId });
          } else {
            await client.from('ticket_upvotes').delete().match({
              ticket_id: ticketId,
              student_id: userId
            });
          }
        } catch (e) {
          console.warn('[CamPulse] Supabase upvote sync skipped:', e);
        }
      }

      return { upvoted: newUpvoted, count: newCount };
    },

    /** Duplicate Detection: find open tickets matching subject/description (Phase 3 Item 16) */
    async searchDuplicates(queryText, locationZone = '') {
      if (!queryText || queryText.trim().length < 4) return [];

      const raw = queryText.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
      const words = raw.split(/\s+/).filter(w => w.length >= 3);

      const STOP_WORDS = new Set([
        'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'any', 'can', 'her',
        'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man',
        'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let',
        'put', 'say', 'she', 'too', 'use', 'with', 'from', 'have', 'this', 'that',
        'they', 'will', 'what', 'when', 'make', 'like', 'time', 'just', 'know', 'take',
        'into', 'year', 'your', 'good', 'some', 'could', 'them', 'than', 'then', 'look',
        'only', 'come', 'over', 'think', 'also', 'back', 'after', 'work', 'first', 'well',
        'even', 'want', 'because', 'these', 'give', 'most', 'student', 'issue', 'problem',
        'complaint', 'please', 'help', 'there', 'their', 'about', 'which', 'would'
      ]);

      const searchTerms = words.filter(w => !STOP_WORDS.has(w));
      if (searchTerms.length === 0) return [];

      const allTickets = await this.fetchAllTickets();
      // Only compare against open or in-progress public tickets
      const candidates = allTickets.filter(t => t.status !== 'resolved' && t.status !== 'closed' && t.isPublic !== false);

      const scored = [];
      candidates.forEach(t => {
        let score = 0;
        const subj = (t.subject || '').toLowerCase();
        const desc = (t.description || '').toLowerCase();
        const loc = (t.locationZone || '').toLowerCase();

        searchTerms.forEach(term => {
          if (subj.includes(term)) score += 3;
          if (desc.includes(term)) score += 1;
        });

        if (locationZone && loc && loc.toLowerCase().includes(locationZone.toLowerCase())) {
          score += 2;
        }

        if (score >= 3) {
          scored.push({ ticket: t, score });
        }
      });

      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, 3).map(s => s.ticket);
    },

    /** Auto-suggest category from description text (Phase 3 Item 17) */
    suggestCategory(text) {
      if (!text || text.trim().length < 6) return null;
      const lower = text.toLowerCase();

      let bestCategory = null;
      let highestScore = 0;

      for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        let count = 0;
        for (const kw of keywords) {
          // Match whole word or clean phrase
          const regex = new RegExp(`\\b${kw}\\b`, 'i');
          if (regex.test(lower)) {
            count += 1;
          }
        }
        if (count > highestScore) {
          highestScore = count;
          bestCategory = category;
        }
      }

      return highestScore >= 1 ? bestCategory : null;
    },

    /** Fetch a single ticket by ID */
    async fetchTicketById(ticketId) {
      if (!ticketId) return null;
      const cleanId = ticketId.trim();

      if (isCloudEnabled && client) {
        try {
          const { data, error } = await client
            .from('tickets')
            .select('*, ticket_attachments(*), ticket_comments(*)')
            .eq('id', cleanId)
            .single();
          if (!error && data) return data;
        } catch (e) {
          console.warn('[CamPulse] Supabase single fetch error:', e);
        }
      }

      const tickets = getLocalTickets();
      return tickets.find(t => t.id.toLowerCase() === cleanId.toLowerCase()) || null;
    },

    /** Create a new ticket with attachments and auto-routing */
    async createTicket(payload, attachmentFiles = []) {
      const currentUser = this.getCurrentUser();
      const identifier = currentUser?.matric || getDeviceId();
      const rateCheck = checkRateLimit(identifier);
      if (!rateCheck.allowed) {
        throw new Error(`Submission rate limit reached (max 5 per hour). Please wait ${rateCheck.resetMinutes} minutes before submitting another complaint.`);
      }

      const id = generateTicketId();
      const department = DEPARTMENT_MAPPING[payload.category] || 'Dean of Student Affairs Office';
      const now = new Date().toISOString();

      // Process up to 3 attachments, max 5MB each
      const processedAttachments = [];
      for (const file of attachmentFiles.slice(0, 3)) {
        if (file.size > 5 * 1024 * 1024) continue;
        
        let fileUrl = '';
        if (isCloudEnabled && client) {
          try {
            const ext = file.name.split('.').pop();
            const filePath = `${id}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
            const { error: uploadErr } = await client.storage
              .from('ticket-attachments')
              .upload(filePath, file);

            if (!uploadErr) {
              const { data: publicUrlData } = client.storage
                .from('ticket-attachments')
                .getPublicUrl(filePath);
              fileUrl = publicUrlData?.publicUrl || '';
            }
          } catch (uploadErr) {
            console.warn('[CamPulse] Cloud attachment upload failed:', uploadErr);
          }
        }

        if (!fileUrl) {
          fileUrl = await new Promise((res) => {
            const reader = new FileReader();
            reader.onload = () => res(reader.result);
            reader.readAsDataURL(file);
          });
        }

        processedAttachments.push({
          id: 'att-' + Math.random().toString(36).substring(2, 9),
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          url: fileUrl
        });
      }

      const timeline = [
        {
          step: 'submitted',
          title: 'Complaint Submitted',
          timestamp: now,
          actor: payload.isAnonymous ? 'Anonymous Student' : (currentUser?.name || 'Student'),
          note: payload.isAnonymous
            ? 'Ticket submitted anonymously. Identity is secured for super-admin audit only.'
            : 'Ticket logged successfully with student authentication.'
        },
        {
          step: 'assigned',
          title: `Auto-Assigned to ${department}`,
          timestamp: new Date(Date.now() + 1000 * 120).toISOString(),
          actor: 'System Auto-Router',
          note: `Categorized under "${payload.category}". Department response window: ${payload.urgent ? '24 Hours' : '72 Hours'}.`
        }
      ];

      // Privacy: default public unless category is Safety or opted out
      const isSafety = payload.category === 'Safety';
      const isPublic = payload.isPublic !== undefined ? Boolean(payload.isPublic) : !isSafety;

      const ticketRecord = {
        id,
        category: payload.category,
        department,
        subject: payload.subject.trim(),
        description: payload.description.trim(),
        urgent: Boolean(payload.urgent),
        status: 'pending',
        isAnonymous: Boolean(payload.isAnonymous),
        isPublic,
        studentName: currentUser?.name || 'Student',
        studentMatric: currentUser?.matric || 'CSC/2021/042',
        studentEmail: currentUser?.email || 'student@student.oauife.edu.ng',
        locationZone: payload.locationZone || 'Main Campus',
        locationDetails: (payload.locationDetails || '').trim(),
        attachments: processedAttachments,
        comments: [],
        timeline,
        upvotesCount: 1, // Student auto-votes their own ticket
        rating: null,
        ratingComment: '',
        ratedAt: null,
        reopenCount: 0,
        reopenedAt: null,
        createdAt: now,
        resolvedAt: null
      };

      // Add to user's upvoted tickets
      const upvotes = getUserUpvotes();
      if (!upvotes.includes(id)) {
        upvotes.push(id);
        saveUserUpvotes(upvotes);
      }

      // Save to Supabase if available
      if (isCloudEnabled && client) {
        try {
          await client.from('tickets').insert([ticketRecord]);
        } catch (e) {
          console.warn('[CamPulse] Supabase insert failed, persisting locally:', e);
        }
      }

      // Persist in local storage
      const tickets = getLocalTickets();
      tickets.unshift(ticketRecord);
      saveLocalTickets(tickets);

      // Trigger multi-channel confirmation notification (Phase 4 Item 19 & 20)
      this.dispatchNotification({
        ticketId: id,
        title: 'Complaint Submitted Successfully',
        message: `Your complaint ${id} has been auto-routed to ${department}.`,
        type: 'status',
        recipientEmail: ticketRecord.studentEmail
      });

      return ticketRecord;
    },

    /** Post a comment to a ticket */
    async addComment(ticketId, message, authorRole = 'student', isInternal = false) {
      if (!message || !message.trim()) return null;
      const currentUser = this.getCurrentUser();
      const now = new Date().toISOString();

      const newComment = {
        id: 'cm-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        ticketId,
        authorName: authorRole === 'staff' ? 'Department Desk Officer' : (currentUser?.name || 'Student'),
        authorRole,
        isInternal: Boolean(isInternal),
        message: message.trim(),
        createdAt: now
      };

      const tickets = getLocalTickets();
      const target = tickets.find(t => t.id === ticketId);
      if (target) {
        if (!Array.isArray(target.comments)) target.comments = [];
        target.comments.push(newComment);
        saveLocalTickets(tickets);
      }

      if (isCloudEnabled && client) {
        try {
          await client.from('ticket_comments').insert([newComment]);
        } catch (e) {
          console.warn('[CamPulse] Failed to write comment to Supabase:', e);
        }
      }

      // Multi-channel notification for staff reply (Phase 4 Item 19)
      this.dispatchNotification({
        ticketId,
        title: authorRole === 'staff' ? 'New Official Staff Response' : 'New Comment on Ticket',
        message: `${authorRole === 'staff' ? 'Department Officer' : 'Student'} commented: "${message.substring(0, 90)}${message.length > 90 ? '…' : ''}"`,
        type: 'comment'
      });

      return newComment;
    },

    /** Reopen a resolved ticket within the 7-day window */
    async reopenTicket(ticketId, reason) {
      const tickets = getLocalTickets();
      const ticket = tickets.find(t => t.id === ticketId);
      if (!ticket) throw new Error('Ticket not found.');

      if (ticket.status !== 'resolved') {
        throw new Error('Only resolved tickets can be reopened.');
      }

      const resolvedTime = new Date(ticket.resolvedAt || ticket.createdAt).getTime();
      const diffDays = (Date.now() - resolvedTime) / (1000 * 3600 * 24);

      if (diffDays > 7) {
        throw new Error('The 7-day reopen period has expired for this ticket.');
      }

      const now = new Date().toISOString();
      ticket.status = 'in_progress';
      ticket.reopenCount = (ticket.reopenCount || 0) + 1;
      ticket.reopenedAt = now;

      // Add to timeline
      ticket.timeline.push({
        step: 'reopened',
        title: 'Ticket Reopened by Student',
        timestamp: now,
        actor: ticket.isAnonymous ? 'Anonymous Student' : (ticket.studentName || 'Student'),
        note: reason ? `Student note: "${reason}"` : 'Student flagged that the issue is not fully resolved.'
      });

      // Add as comment
      if (reason) {
        ticket.comments.push({
          id: 'cm-reopen-' + Date.now(),
          ticketId,
          authorName: ticket.isAnonymous ? 'Anonymous Student' : (ticket.studentName || 'Student'),
          authorRole: 'student',
          isInternal: false,
          message: `[Ticket Reopened]: ${reason}`,
          createdAt: now
        });
      }

      saveLocalTickets(tickets);
      return ticket;
    },

    /** Submit a 1-5 star satisfaction rating on a resolved ticket */
    async rateTicket(ticketId, ratingNumber, ratingComment = '') {
      const rating = parseInt(ratingNumber, 10);
      if (isNaN(rating) || rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5 stars.');
      }

      const tickets = getLocalTickets();
      const ticket = tickets.find(t => t.id === ticketId);
      if (!ticket) throw new Error('Ticket not found.');

      const now = new Date().toISOString();
      ticket.rating = rating;
      ticket.ratingComment = (ratingComment || '').trim();
      ticket.ratedAt = now;

      ticket.timeline.push({
        step: 'rated',
        title: `Resolution Rated ${rating}/5 Stars`,
        timestamp: now,
        actor: ticket.isAnonymous ? 'Anonymous Student' : (ticket.studentName || 'Student'),
        note: ratingComment ? `Feedback: "${ratingComment}"` : 'Student provided resolution satisfaction feedback.'
      });

      saveLocalTickets(tickets);

      this.dispatchNotification({
        ticketId,
        title: `Resolution Rated ${rating}/5 Stars`,
        message: `Student provided satisfaction feedback for ticket ${ticketId}.`,
        type: 'status'
      });

      return ticket;
    },

    // ── Phase 4: Notification Subsystem Methods (Items 19, 20, 21) ────

    /** Fetch all in-app notifications */
    getNotifications() {
      return getLocalNotifications();
    },

    /** Get unread notification count for the header bell badge */
    getUnreadNotifCount() {
      const notifs = getLocalNotifications();
      return notifs.filter(n => !n.read).length;
    },

    /** Mark a single notification as read */
    markNotificationAsRead(id) {
      const notifs = getLocalNotifications();
      const target = notifs.find(n => n.id === id);
      if (target) {
        target.read = true;
        saveLocalNotifications(notifs);
      }
      return target;
    },

    /** Mark all notifications as read */
    markAllNotificationsAsRead() {
      const notifs = getLocalNotifications();
      notifs.forEach(n => { n.read = true; });
      saveLocalNotifications(notifs);
      return notifs;
    },

    /** Get user notification preferences */
    getNotificationPreferences() {
      return getNotifPrefs();
    },

    /** Save user notification preferences */
    saveNotificationPreferences(prefs) {
      saveNotifPrefs(prefs);
      return prefs;
    },

    /** Multi-channel notification dispatcher (Email, In-App, SMS/WhatsApp ready) */
    async dispatchNotification({ ticketId, title, message, type = 'status', recipientEmail = '' }) {
      const prefs = getNotifPrefs();
      const notifs = getLocalNotifications();
      const now = new Date().toISOString();

      const newNotif = {
        id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        ticketId: ticketId || null,
        title,
        message,
        type,
        read: false,
        createdAt: now
      };

      // 1. In-App Notification
      if (prefs.inAppEnabled !== false) {
        notifs.unshift(newNotif);
        // Keep last 50 notifications
        if (notifs.length > 50) notifs.length = 50;
        saveLocalNotifications(notifs);
      }

      // 2. Email Notification Service Abstraction (Phase 4 Item 19)
      if (prefs.emailEnabled !== false) {
        const targetEmail = recipientEmail || this.getCurrentUser()?.email;
        if (targetEmail) {
          console.info(`[NotificationService -> Email] Sent to ${targetEmail}: "${title}" — ${message}`);
        }
      }

      // 3. WhatsApp / SMS Notification Abstraction (Future-ready)
      if (prefs.whatsappPreviewEnabled && prefs.phone) {
        console.info(`[NotificationService -> WhatsApp/SMS] Dispatched to ${prefs.phone}: [CamPulse] ${title}: ${message}`);
      }

      // Realtime event dispatch for in-app bell sync
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('campulse:notification', { detail: newNotif }));
      }

      return newNotif;
    },

    // ── Phase 5: Admin & Department Workflow Methods (Items 22-28) ────

    /** Fetch tickets filtered by role (Super Admin, Dept Admin, Staff) */
    async getRoleTickets(role = 'super_admin', department = '', staffName = '') {
      const all = await this.fetchAllTickets();

      if (role === 'super_admin') {
        // Super admin sees all tickets, including unmoderated/moderated and true identities
        return all;
      }

      if (role === 'dept_admin') {
        // Dept admin sees only their department's tickets
        return all.filter(t => t.department === department);
      }

      if (role === 'staff') {
        // Staff sees their department's tickets, with assigned ones highlighted
        return all.filter(t => t.department === department || (staffName && t.assignedStaff === staffName));
      }

      return all;
    },

    /** Update ticket status with timeline audit and notification */
    async updateTicketStatus(ticketId, newStatus, actorName = 'Department Officer', note = '') {
      const validStatuses = ['pending', 'assigned', 'in_progress', 'resolved', 'closed'];
      if (!validStatuses.includes(newStatus)) {
        throw new Error('Invalid ticket status: ' + newStatus);
      }

      const tickets = getLocalTickets();
      const ticket = tickets.find(t => t.id === ticketId);
      if (!ticket) throw new Error('Ticket not found');

      const oldStatus = ticket.status;
      ticket.status = newStatus;
      const now = new Date().toISOString();
      if (newStatus === 'resolved' || newStatus === 'closed') {
        ticket.resolvedAt = now;
      }

      const statusLabels = {
        pending: 'Pending Review',
        assigned: 'Assigned to Department',
        in_progress: 'In Progress',
        resolved: 'Resolved',
        closed: 'Closed & Archived'
      };

      ticket.timeline.push({
        step: newStatus,
        title: `Status: ${statusLabels[newStatus]}`,
        timestamp: now,
        actor: actorName,
        note: note || `Status changed from ${statusLabels[oldStatus] || oldStatus} to ${statusLabels[newStatus]}.`
      });

      saveLocalTickets(tickets);

      // Notification
      this.dispatchNotification({
        ticketId,
        title: `Status Update: ${statusLabels[newStatus]}`,
        message: note || `Your ticket ${ticketId} is now ${statusLabels[newStatus]}.`,
        type: 'status',
        recipientEmail: ticket.studentEmail
      });

      return ticket;
    },

    /** Assign ticket to staff officer (Phase 5 Item 24) */
    async assignTicket(ticketId, staffName, departmentName, actor = 'Department Admin') {
      const tickets = getLocalTickets();
      const ticket = tickets.find(t => t.id === ticketId);
      if (!ticket) throw new Error('Ticket not found');

      const now = new Date().toISOString();
      ticket.assignedStaff = staffName;
      if (departmentName) ticket.department = departmentName;
      ticket.status = 'assigned';

      ticket.timeline.push({
        step: 'assigned',
        title: `Assigned to ${staffName}`,
        timestamp: now,
        actor,
        note: `Officer ${staffName} assigned to resolve this issue under ${ticket.department}.`
      });

      saveLocalTickets(tickets);

      this.dispatchNotification({
        ticketId,
        title: 'Officer Assigned to Your Complaint',
        message: `${staffName} (${ticket.department}) has been assigned to ticket ${ticketId}.`,
        type: 'status',
        recipientEmail: ticket.studentEmail
      });

      return ticket;
    },

    /** Add internal confidential staff note (Phase 5 Item 26) */
    async addInternalNote(ticketId, noteText, authorName = 'Staff Officer') {
      if (!noteText || !noteText.trim()) return;
      const tickets = getLocalTickets();
      const ticket = tickets.find(t => t.id === ticketId);
      if (!ticket) throw new Error('Ticket not found');

      if (!Array.isArray(ticket.internalNotes)) ticket.internalNotes = [];

      const now = new Date().toISOString();
      const noteObj = {
        id: 'note-' + Date.now(),
        author: authorName,
        text: noteText.trim(),
        createdAt: now
      };

      ticket.internalNotes.push(noteObj);
      saveLocalTickets(tickets);
      return noteObj;
    },

    /** Moderate ticket: hide or restore abusive/spam tickets (Phase 5 Item 28) */
    async moderateTicket(ticketId, isHidden, reason = '') {
      const tickets = getLocalTickets();
      const ticket = tickets.find(t => t.id === ticketId);
      if (!ticket) throw new Error('Ticket not found');

      ticket.isModerated = Boolean(isHidden);
      ticket.moderationReason = reason;
      ticket.moderatedAt = new Date().toISOString();

      saveLocalTickets(tickets);
      return ticket;
    },

    /** Calculate Institutional Analytics (Phase 5 Item 27) */
    async calculateAnalytics() {
      const tickets = await this.fetchAllTickets();
      const total = tickets.length;
      const resolved = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
      const inProgress = tickets.filter(t => t.status === 'in_progress').length;
      const assigned = tickets.filter(t => t.status === 'assigned').length;
      const pending = tickets.filter(t => t.status === 'pending').length;
      const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

      const ratedTickets = tickets.filter(t => typeof t.rating === 'number' && t.rating >= 1);
      const avgSatisfaction = ratedTickets.length > 0
        ? (ratedTickets.reduce((sum, t) => sum + t.rating, 0) / ratedTickets.length).toFixed(1)
        : '4.8';

      // Response & Resolution Times
      let totalFirstResponseMs = 0;
      let responseCount = 0;
      let totalResolutionMs = 0;
      let resolvedCount = 0;

      tickets.forEach(t => {
        const createdMs = new Date(t.createdAt).getTime();
        const firstAction = (t.timeline || []).find(step => step.step === 'assigned' || step.step === 'in_progress');
        if (firstAction) {
          totalFirstResponseMs += Math.max(0, new Date(firstAction.timestamp).getTime() - createdMs);
          responseCount++;
        }
        if (t.resolvedAt) {
          totalResolutionMs += Math.max(0, new Date(t.resolvedAt).getTime() - createdMs);
          resolvedCount++;
        }
      });

      const avgResponseHours = responseCount > 0
        ? Math.round(totalFirstResponseMs / (responseCount * 3600000))
        : 6;
      const avgResolutionHours = resolvedCount > 0
        ? Math.round(totalResolutionMs / (resolvedCount * 3600000))
        : 38;

      // SLA Compliance & Overdue Count (Phase 5 Item 25)
      const now = Date.now();
      let overdueCount = 0;
      tickets.forEach(t => {
        if (t.status !== 'resolved' && t.status !== 'closed') {
          const ageHours = (now - new Date(t.createdAt).getTime()) / 3600000;
          const slaHours = t.urgent ? 24 : 72;
          if (ageHours > slaHours) overdueCount++;
        }
      });

      const byCategory = {};
      const byDepartment = {};
      const byLocation = {};

      tickets.forEach(t => {
        byCategory[t.category] = (byCategory[t.category] || 0) + 1;
        byDepartment[t.department] = (byDepartment[t.department] || 0) + 1;
        const loc = t.locationZone || 'Other';
        byLocation[loc] = (byLocation[loc] || 0) + 1;
      });

      const topUnresolved = tickets
        .filter(t => t.status !== 'resolved' && t.status !== 'closed')
        .sort((a, b) => (b.upvotesCount || 0) - (a.upvotesCount || 0))
        .slice(0, 5);

      return {
        total,
        resolved,
        inProgress,
        assigned,
        pending,
        resolutionRate,
        avgSatisfaction,
        ratedCount: ratedTickets.length,
        avgResponseHours,
        avgResolutionHours,
        overdueCount,
        byCategory,
        byDepartment,
        byLocation,
        topUnresolved
      };
    },

    /** Export tickets to CSV (Phase 5 Item 27) */
    async exportTicketsCSV() {
      const tickets = await this.fetchAllTickets();
      const headers = ['Ticket ID', 'Category', 'Department', 'Subject', 'Status', 'Urgent', 'Location Zone', 'Location Details', 'Upvotes', 'Student Name', 'Student Matric', 'Rating', 'Created At', 'Resolved At'];
      
      const rows = tickets.map(t => [
        t.id,
        `"${(t.category || '').replace(/"/g, '""')}"`,
        `"${(t.department || '').replace(/"/g, '""')}"`,
        `"${(t.subject || '').replace(/"/g, '""')}"`,
        t.status,
        t.urgent ? 'YES' : 'NO',
        `"${(t.locationZone || '').replace(/"/g, '""')}"`,
        `"${(t.locationDetails || '').replace(/"/g, '""')}"`,
        t.upvotesCount || 0,
        `"${(t.studentName || '').replace(/"/g, '""')}"`,
        t.studentMatric || 'N/A',
        t.rating || 'N/A',
        t.createdAt,
        t.resolvedAt || 'N/A'
      ]);

      return [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    },

    /** Reset Demo Data for presentations (Phase 6 Item 35) */
    resetDemoData() {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(NOTIFICATIONS_KEY);
      localStorage.removeItem(UPVOTES_KEY);
      const seed = getSeedTickets();
      saveLocalTickets(seed);
      const notifSeed = getSeedNotifications();
      saveLocalNotifications(notifSeed);
      return seed;
    }
  };
})();

// Attach to window
window.CamPulseDB = CamPulseDB;
window.CAMPUS_LOCATIONS = CAMPUS_LOCATIONS;
window.CATEGORY_KEYWORDS = CATEGORY_KEYWORDS;
