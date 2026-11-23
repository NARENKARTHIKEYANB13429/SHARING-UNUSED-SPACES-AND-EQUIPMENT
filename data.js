/**
 * ShareSpace Realistic Institutional Seed Data
 * Persists changes in localStorage with fallback reset option
 */

const SEED_USERS = [
  {
    id: "usr-alex",
    name: "Alex Rivera",
    role: "user", // "user", "owner", "admin"
    roleLabel: "Graduate Researcher / Student",
    department: "Robotics & Mechanical Engineering",
    email: "alex.rivera@campus.edu",
    avatar: "AR",
    avatarColor: "#6366f1",
    verified: true,
    certifications: [
      { id: "cert-laser", title: "Laser Safety Level 1", verifiedDate: "2026-02-10", status: "Active" },
      { id: "cert-biosafety", title: "BioSafety Level 1", verifiedDate: "2026-03-01", status: "Active" },
      { id: "cert-media", title: "Media Production Induction", verifiedDate: "2026-01-15", status: "Active" }
    ],
    weeklyQuotaHours: 15,
    weeklyHoursUsed: 6.5
  },
  {
    id: "usr-marcus",
    name: "Dr. Marcus Vance",
    role: "owner",
    roleLabel: "Lab Director & Resource Owner",
    department: "FabLab & Advanced Robotics Center",
    email: "marcus.vance@campus.edu",
    avatar: "MV",
    avatarColor: "#10b981",
    verified: true,
    certifications: [
      { id: "cert-admin-safety", title: "Principal Safety Officer", verifiedDate: "2025-08-12", status: "Active" },
      { id: "cert-cnc-master", title: "CNC Machine Specialist", verifiedDate: "2025-05-18", status: "Active" }
    ],
    managedResourceIds: ["res-1", "res-2", "res-5"]
  },
  {
    id: "usr-elena",
    name: "Elena Rostova",
    role: "owner",
    roleLabel: "Media Studio Equipment Manager",
    department: "College of Fine Arts & Digital Media",
    email: "elena.rostova@campus.edu",
    avatar: "ER",
    avatarColor: "#f59e0b",
    verified: true,
    certifications: [
      { id: "cert-media-director", title: "Senior Studio Engineer", verifiedDate: "2025-09-01", status: "Active" }
    ],
    managedResourceIds: ["res-3", "res-6"]
  },
  {
    id: "usr-sarah",
    name: "Dean Sarah Jenkins",
    role: "admin",
    roleLabel: "Institutional Dean & Safety Compliance",
    department: "Office of Campus Research & Operations",
    email: "sarah.jenkins@campus.edu",
    avatar: "SJ",
    avatarColor: "#f43f5e",
    verified: true,
    certifications: [
      { id: "cert-compliance", title: "Campus Ethics & Compliance Board", verifiedDate: "2024-11-20", status: "Active" }
    ]
  }
];

const SEED_RESOURCES = [
  {
    id: "res-1",
    title: "Formlabs Form 3B+ & Haas Desktop CNC Mill",
    category: "Makerspace",
    location: "Engineering Complex, Room ENG-104",
    ownerId: "usr-marcus",
    ownerName: "Dr. Marcus Vance",
    ownerDept: "FabLab & Advanced Robotics",
    status: "Available", // "Available", "In Use", "Maintenance"
    description: "Industrial SLA rapid prototyping 3D printer paired with an enclosed precision Haas desktop 3-axis CNC mill. Suitable for engineering prototypes, biomedical models, and rapid tooling.",
    image: "assets/images/industrial_3d_printer.jpg",
    fairUseLimit: "Max 4 hours per reservation • 12 hrs/week",
    maxDurationHours: 4,
    requiredCertifications: ["cert-laser"],
    requiresSupervision: false,
    requiresApproval: true,
    operatingHours: "08:00 - 22:00 (Mon - Sat)",
    rules: [
      "Bring approved resin or tooling stock only.",
      "Wear ANSI Z87 approved safety goggles in work area.",
      "Complete mandatory cleaning cycle prior to checkout.",
      "Report any spindle vibration or resin spills immediately."
    ],
    accessoriesIncluded: ["Wash & Cure Stations", "Hex Key Toolset", "Digital Caliper", "Spare build platform"],
    conditionScore: 4.9
  },
  {
    id: "res-2",
    title: "8x NVIDIA H100 SXM5 Deep Learning Cluster Pod",
    category: "High Performance Compute",
    location: "Science Quad, Data Center Pod 3",
    ownerId: "usr-marcus",
    ownerName: "Dr. Marcus Vance",
    ownerDept: "HPC & AI Infrastructure Lab",
    status: "In Use",
    description: "Dedicated GPU node configured with 8x NVIDIA H100 80GB GPUs, 2TB DDR5 RAM, and 100GbE InfiniBand. Pre-loaded with PyTorch 2.3, CUDA 12.4, and JupyterLab cluster scheduler.",
    image: "assets/images/gpu_cluster.jpg",
    fairUseLimit: "Max 12 hours per job • Fair-use priority queue",
    maxDurationHours: 12,
    requiredCertifications: [],
    requiresSupervision: false,
    requiresApproval: true,
    operatingHours: "24/7 Remote / Console Access",
    rules: [
      "Job scripts must run inside containerized Docker/Singularity images.",
      "Background mining or non-academic computations are strictly barred.",
      "Ensure model checkpoints are downloaded before booking expiration."
    ],
    accessoriesIncluded: ["InfiniBand storage mount", "SLURM job scheduler profile", "SSH VPN Key"],
    conditionScore: 5.0
  },
  {
    id: "res-3",
    title: "ARRI Alexa Mini LF & Zeiss Supreme Prime Kit",
    category: "AV & Creative Media",
    location: "Arts Wing, Media Gear Locker 2B",
    ownerId: "usr-elena",
    ownerName: "Elena Rostova",
    ownerDept: "Film & Interactive Media Dept",
    status: "Available",
    description: "Full-frame cinema capture package with ARRI Alexa Mini LF body, 35mm & 50mm Zeiss Supreme Primes, Teradek wireless video link, follow focus, and heavy-duty Sachtler fluid tripod.",
    image: "assets/images/cinema_camera.jpg",
    fairUseLimit: "Max 8 hours per checkout • Deposit pledge required",
    maxDurationHours: 8,
    requiredCertifications: ["cert-media"],
    requiresSupervision: false,
    requiresApproval: true,
    operatingHours: "09:00 - 18:00 (Mon - Fri)",
    rules: [
      "Do not touch front lens optical coatings directly.",
      "Equipment must stay on campus unless off-site insurance permit is submitted.",
      "Return with all batteries fully charged to 100%."
    ],
    accessoriesIncluded: ["Pelican 1610 Flight Case", "4x V-Mount Gold Batteries", "Dual Fast Charger", "Cleaning air blower"],
    conditionScore: 4.8
  },
  {
    id: "res-4",
    title: "BSL-2 Biosafety Laminar Suite & Olympus IX83 Microscope",
    category: "Biological & Cleanroom",
    location: "Life Sciences Tower, Room BIO-302",
    ownerId: "usr-marcus",
    ownerName: "Dr. Marcus Vance",
    ownerDept: "Cellular & Tissue Engineering Lab",
    status: "Available",
    description: "Certified Class II Type A2 Biosafety Cabinet equipped with inverted multi-channel fluorescent microscope, motorized XYZ stage, CO2 incubation chamber, and automated pipette stations.",
    image: "assets/images/cleanroom_lab.jpg",
    fairUseLimit: "Max 3 hours per slot • Strict biosafety protocol",
    maxDurationHours: 3,
    requiredCertifications: ["cert-biosafety"],
    requiresSupervision: true,
    requiresApproval: true,
    operatingHours: "09:00 - 19:00 (Mon - Fri)",
    rules: [
      "Full PPE mandatory: Lab coat, nitrile gloves, safety goggles.",
      "70% Ethanol decontamination step before and after session.",
      "Biohazard waste must be bagged into red autoclaved receptacles."
    ],
    accessoriesIncluded: ["Fluorescence filter cubes (DAPI, GFP, RFP)", "Auto-pipette station", "Glass hemocytometer"],
    conditionScore: 4.95
  },
  {
    id: "res-5",
    title: "Universal Robots UR5e Collaborative Robotic Workcell",
    category: "Robotics & Automation",
    location: "Engineering Complex, Room ENG-210",
    ownerId: "usr-marcus",
    ownerName: "Dr. Marcus Vance",
    ownerDept: "Robotics & Autonomy Lab",
    status: "Available",
    description: "6-axis collaborative robotic arm with 850mm reach, 5kg payload, force-torque sensing gripper, ROS2 Galactic control node, and Intel RealSense D435 depth camera.",
    image: "assets/images/hero_banner.jpg",
    fairUseLimit: "Max 4 hours per reservation",
    maxDurationHours: 4,
    requiredCertifications: ["cert-laser"],
    requiresSupervision: false,
    requiresApproval: true,
    operatingHours: "08:30 - 20:30 (Daily)",
    rules: [
      "Emergency stop pendant must remain within arm's reach.",
      "Joint acceleration must not exceed 180 deg/s without supervisor presence.",
      "Secure workpiece fixtures before initiating trajectory programs."
    ],
    accessoriesIncluded: ["Robotiq 2F-85 Gripper", "Teach Pendant Controller", "RealSense D435 Camera", "E-Stop Box"],
    conditionScore: 4.7
  }
];

const SEED_BOOKINGS = [
  {
    id: "bkg-101",
    resourceId: "res-1",
    resourceTitle: "Formlabs Form 3B+ & Haas Desktop CNC Mill",
    userId: "usr-alex",
    userName: "Alex Rivera",
    userDept: "Robotics & Mechanical Engineering",
    purpose: "Printing prosthetic finger hinges for IEEE Student Robotics Competition",
    date: "2026-10-28",
    startTime: "14:00",
    endTime: "16:30",
    durationHours: 2.5,
    status: "Approved", // "Requested", "Approved", "Checked-In", "Completed", "Waitlisted", "Rejected", "Incident"
    approvalReason: "Safety prerequisites verified; valid IEEE student team grant active.",
    reviewerName: "Dr. Marcus Vance",
    conflictCheckPassed: true,
    eligibilityPassed: true,
    checkInDetails: null,
    checkOutDetails: null,
    createdTimestamp: "2026-10-27 10:15"
  },
  {
    id: "bkg-102",
    resourceId: "res-2",
    resourceTitle: "8x NVIDIA H100 SXM5 Deep Learning Cluster Pod",
    userId: "usr-devin",
    userName: "Devin Taylor (PhD Scholar)",
    userDept: "Computer Science & AI",
    purpose: "Fine-tuning multimodal medical imaging model epoch 4",
    date: "2026-10-28",
    startTime: "11:00",
    endTime: "19:00",
    durationHours: 8,
    status: "Checked-In",
    approvalReason: "Faculty sponsor approved via CS departmental allocation.",
    reviewerName: "Dr. Marcus Vance",
    conflictCheckPassed: true,
    eligibilityPassed: true,
    checkInDetails: {
      timestamp: "2026-10-28 11:02",
      rating: 5,
      notes: "Node cluster verified online; all 8 H100 GPUs detected with zero thermal throttles.",
      cleanlinessVerified: true,
      powerVerified: true,
      accessoriesVerified: true,
      conditionPhotos: ["assets/images/gpu_cluster.jpg"]
    },
    checkOutDetails: null,
    createdTimestamp: "2026-10-26 14:00"
  },
  {
    id: "bkg-103",
    resourceId: "res-3",
    resourceTitle: "ARRI Alexa Mini LF & Zeiss Supreme Prime Kit",
    userId: "usr-alex",
    userName: "Alex Rivera",
    userDept: "Engineering / Media Collab",
    purpose: "Recording high-speed actuator testing for IEEE Conference Presentation Video",
    date: "2026-10-29",
    startTime: "10:00",
    endTime: "13:00",
    durationHours: 3.0,
    status: "Requested",
    approvalReason: null,
    reviewerName: null,
    conflictCheckPassed: true,
    eligibilityPassed: true,
    checkInDetails: null,
    checkOutDetails: null,
    createdTimestamp: "2026-10-28 09:30"
  },
  {
    id: "bkg-104",
    resourceId: "res-4",
    resourceTitle: "BSL-2 Biosafety Laminar Suite & Olympus IX83 Microscope",
    userId: "usr-chloe",
    userName: "Chloe Bennet (Bio-Engineering)",
    userDept: "Life Sciences",
    purpose: "Live HeLa cell fluorescence tagging experiment",
    date: "2026-10-27",
    startTime: "13:00",
    endTime: "15:30",
    durationHours: 2.5,
    status: "Completed",
    approvalReason: "Biosafety certification validated; mentor Dr. Vance in attendance.",
    reviewerName: "Dr. Marcus Vance",
    conflictCheckPassed: true,
    eligibilityPassed: true,
    checkInDetails: {
      timestamp: "2026-10-27 13:05",
      rating: 5,
      notes: "Laminar hood sterile and UV cycle completed beforehand.",
      cleanlinessVerified: true,
      powerVerified: true,
      accessoriesVerified: true,
      conditionPhotos: ["assets/images/cleanroom_lab.jpg"]
    },
    checkOutDetails: {
      timestamp: "2026-10-27 15:32",
      rating: 5,
      notes: "Area sprayed with 70% ethanol, bio-waste disposed in autoclave bin. Stage cleaned.",
      returnCleanlinessVerified: true,
      noDamageVerified: true,
      allAccessoriesReturned: true,
      conditionPhotos: ["assets/images/cleanroom_lab.jpg"]
    },
    createdTimestamp: "2026-10-25 11:20"
  },
  {
    id: "bkg-105",
    resourceId: "res-1",
    resourceTitle: "Formlabs Form 3B+ & Haas Desktop CNC Mill",
    userId: "usr-ryan",
    userName: "Ryan Scott (Undergrad Club)",
    userDept: "Mechanical Eng",
    purpose: "Milling aluminum bracket for FSAE racecar suspension",
    date: "2026-10-28",
    startTime: "14:30",
    endTime: "17:00",
    durationHours: 2.5,
    status: "Waitlisted",
    approvalReason: "Waitlisted: Scheduling overlap with approved reservation (bkg-101). Position #1 in queue.",
    reviewerName: "Dr. Marcus Vance",
    conflictCheckPassed: false,
    eligibilityPassed: true,
    checkInDetails: null,
    checkOutDetails: null,
    createdTimestamp: "2026-10-27 16:45"
  }
];

const SEED_INCIDENTS = [
  {
    id: "inc-201",
    bookingId: "bkg-094",
    resourceId: "res-3",
    resourceTitle: "ARRI Alexa Mini LF & Zeiss Supreme Prime Kit",
    reportedBy: "Elena Rostova (Manager)",
    userInvolved: "Maya Lin (Fine Arts)",
    type: "Equipment Damage",
    severity: "Medium",
    date: "2026-10-26",
    status: "Under Review", // "Open", "Under Review", "Resolved"
    description: "Zeiss 35mm lens hood thread slightly dented. Lens glass itself is pristine and unscratched. Student reported accidental contact with matte box rail.",
    resolution: "Safety officer assigned repair work order; fine waived under first-time incident safety policy.",
    photos: ["assets/images/cinema_camera.jpg"]
  }
];

const SEED_AUDIT_LOGS = [
  {
    id: "aud-301",
    timestamp: "2026-10-28 11:02:18",
    actor: "Devin Taylor",
    action: "CHECK_IN_COMPLETED",
    target: "8x NVIDIA H100 SXM5 Deep Learning Cluster Pod",
    details: "Checked in with condition score 5/5. Initial condition report logged."
  },
  {
    id: "aud-302",
    timestamp: "2026-10-28 09:30:45",
    actor: "Alex Rivera",
    action: "BOOKING_REQUESTED",
    target: "ARRI Alexa Mini LF & Zeiss Supreme Prime Kit",
    details: "Requested booking for 2026-10-29 10:00-13:00. Eligibility pre-check passed."
  },
  {
    id: "aud-303",
    timestamp: "2026-10-27 16:45:10",
    actor: "Dr. Marcus Vance",
    action: "BOOKING_WAITLISTED",
    target: "Formlabs Form 3B+ & Haas Desktop CNC Mill",
    details: "Waitlisted Ryan Scott due to direct time overlap with booking #101."
  },
  {
    id: "aud-304",
    timestamp: "2026-10-27 10:20:00",
    actor: "Dr. Marcus Vance",
    action: "BOOKING_APPROVED",
    target: "Formlabs Form 3B+ & Haas Desktop CNC Mill",
    details: "Approved booking #101 for Alex Rivera for 2026-10-28."
  },
  {
    id: "aud-305",
    timestamp: "2026-10-27 15:32:40",
    actor: "Chloe Bennet",
    action: "CHECK_OUT_VERIFIED",
    target: "BSL-2 Biosafety Laminar Suite & Olympus IX83 Microscope",
    details: "Clean checkout signed off. All accessories returned, autoclave decontamination logged."
  }
];
