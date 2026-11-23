# ⚡ ShareSpace — Campus & Community Resource Sharing Platform

> A functional, trusted web application that empowers colleges, research laboratories, makerspaces, and community organizations to safely share underused spaces, equipment, and technical resources.

---

## 🌟 Overview & Problem Solved

Colleges, laboratories, makerspaces, community organisations, and small businesses often have high-value resources sitting unused—precision CNC mills, industrial 3D printers, high-performance GPU clusters, cinema cameras, and sterile biosafety cleanrooms. At the same time, students, researchers, creators, and early-stage teams cannot afford to buy or rent them.

Basic booking systems fail because they treat high-value equipment like meeting rooms: they lack **eligibility and safety verification**, **owner approval controls**, **pre/post condition inspections**, **damage and delay accountability**, **scheduling conflict resolution**, and **fair-use quotas**.

**ShareSpace** provides an end-to-end institutional sharing network with:
1. **Safety & Prerequisite Qualifications Engine**: Verifies laser safety, biosafety, and equipment inductions before booking.
2. **Scheduling Conflict & Fair-Use Quota Engine**: Automatically flags time overlaps, manages a priority waiting list, and prevents monopolisation.
3. **Owner & Manager Review Dashboard**: Empowers lab owners to review requests and approve, waitlist, or decline with mandatory constructive notes.
4. **Digital Condition Check-In & Check-Out**: Requires before-and-after inspections (cleanliness, power calibration, accessory inventory, star rating, and photo verification) to eliminate dispute ambiguity.
5. **Incident & Damage Resolution Center**: Formal logging of delays, broken components, or tool jams with administrative safety waivers and repair orders.
6. **Immutable Audit Trail**: Full chronological ledger of all actions, timestamps, and decisions with JSON export.

---

## 🚀 Quick Start: Running the Application

### Option A: Local Python Server (Recommended)
The server is already running on your machine at:
```bash
# To run or restart the server:
python server.py
```
Open your browser to:
👉 **[http://localhost:8000](http://localhost:8000)**

### Option B: Standalone Browser Opening
You can also open `index.html` directly in any modern browser (Chrome, Edge, Firefox, Safari). All state and workflows persist automatically in browser `localStorage`.

---

## 🎭 Interactive Demo Personas (Role Switcher in Header)

Use the dropdown in the top navigation bar to test all user journeys seamlessly:

| Persona | Role | Department | Key Capabilities |
| :--- | :--- | :--- | :--- |
| **Alex Rivera** | Student / Researcher | Robotics & Mechanical Eng | • Laser Safety L1 & BioSafety L1 certified<br>• Weekly Fair-Use: 6.5 / 15 hrs used<br>• Has an approved reservation ready to **Check-In** |
| **Dr. Marcus Vance** | Resource Owner / Lab Director | FabLab & Advanced Robotics | • Manages 3D printers, CNC mills, GPU clusters<br>• Can **Approve**, **Waitlist**, or **Reject** incoming requests with reasons |
| **Elena Rostova** | Equipment Host / Manager | Media & Creative Arts | • Manages 4K ARRI cinema packages<br>• Reviews gear checkout returns and condition reports |
| **Dean Sarah Jenkins** | Institutional Safety Admin | Campus Research & Operations | • Oversees compliance, resolves incident/damage disputes, reviews campus audit logs |

---

## 🧭 Complete End-to-End User Journeys

### Journey 1: Resource Discovery & Eligibility Verification
1. On the **Browse Resources** tab, search for equipment (e.g., *"3D printer"*, *"GPU"*, or *"cleanroom"*).
2. Filter by category (*Makerspace*, *High Performance Compute*, *AV & Creative Media*, *Biological & Cleanroom*).
3. Switch eligibility filter between *"All Requirements"* and *"Verified Eligible Only (For You)"*.
4. Notice the dynamic qualification badges:
   - Green `✓ Laser/Machine Safety L1` indicates qualifications you have.
   - Red `⚠️ Training Needed` warns if you lack prerequisites.

### Journey 2: Request a Booking with Conflict & Fair-Use Checks
1. Click **"Request Booking"** on any resource (e.g., *Formlabs Form 3B+* or *ARRI Alexa Mini*).
2. Change the time slot or date.
3. Observe the **Live Conflict Detection**:
   - If an overlapping booking exists, the system warns you in real-time and converts the submission into a **Priority Waitlist Request**.
   - If the slot is clear, it submits as an **Approved-Awaiting Owner Review** booking.
4. Fill in project purpose and sign the safety pledge.

### Journey 3: Digital Pre-Use Check-In (Before Use)
1. Switch to **Alex Rivera** and click the **"My Bookings"** tab.
2. Locate the approved reservation `#bkg-101` and click **"📝 Begin Check-In"**.
3. Complete the digital checklist:
   - Cleanliness & Surface State
   - Power & Diagnostic Calibration
   - Accessories & Tooling Accounted For
   - Structural Integrity Check
   - Star Rating (1–5 Stars) and Condition Notes
4. Click **"Confirm & Check-In"**. The status changes to **Checked-In (Active)**, and the resource is marked **In Use**.

### Journey 4: Owner Review & Decision Center
1. In the header switcher, change persona to **Dr. Marcus Vance (Owner)**.
2. Click the **"Owner Review"** tab.
3. Review the incoming request queue with conflict warnings and prerequisite validation.
4. Click **"Approve Request"**, **"Waitlist Request"**, or **"Decline with Reason"**.
5. Customize the review feedback (e.g., *"Approved: 5-minute safety walk-through on arrival required"*).
6. Requester receives notification and audit trail updates immediately.

### Journey 5: Return Check-Out (After Use)
1. In **My Bookings** or **Owner Review**, find an active session (e.g., `#bkg-102` or `#bkg-101`).
2. Click **"🏁 Return Check-Out"**.
3. Review the return inspection checklist (sanitization, tooling returned, zero new defects).
4. Provide return rating and notes. Click **"Complete Return & Sign Off"**.
5. The resource is immediately released back to **Available** status.

### Journey 6: Incident, Damage & Delay Reporting
1. Click the **"Incident Center"** tab.
2. Click **"⚠️ File Incident or Damage Report"**.
3. Select equipment, category (*Equipment Damage*, *Delayed Return*, *Missing Tool*, *Safety Violation*), severity (*Low*, *Medium*, *Critical*), and description.
4. As **Dean Sarah Jenkins (Admin)**, click **"⚖️ Resolve & Log Decision"** to issue a safety waiver or maintenance work order.

### Journey 7: Immutable Audit Trail & Activity History
1. Click the **"Audit Trail"** tab.
2. View chronological records of every booking request, approval reason, condition check-in, return sign-off, and incident intervention.
3. Click **"📥 Export Audit Log (JSON)"** to download the auditable compliance ledger.

---

## 🎨 Design & Aesthetic Highlights
- **Curated Palette**: Deep slate background (`#0b0f19`) paired with glowing indigo (`#6366f1`), emerald (`#10b981`), amber (`#f59e0b`), and cyan accents (`#06b6d4`).
- **Real High-Resolution Assets**: Realistic photographs for all equipment categories generated and stored in `assets/images/`.
- **Light / Dark Mode**: One-click theme toggle in top header.
- **Micro-Animations**: Hover lifts, smooth transitions, status indicators, and slide-in toast notifications.
- **Instant Data Reset**: Built-in **"🔄 Reset Demo State"** button in the demo banner resets `localStorage` to pristine seed data at any time.

---

## 📁 Repository Structure
```
CODE CRUSHERS 2/
├── index.html         # Main semantic and responsive web application shell
├── styles.css         # Custom modern CSS design system, dark/light theme, glassmorphism
├── data.js            # Realistic institutional seed data (users, resources, bookings, audit logs)
├── app.js             # Core logic: conflict checks, fair-use calculation, inspections, state
├── server.py          # Local Python development server (port 8000)
├── README.md          # Comprehensive user manual & demonstration guide
└── assets/
    └── images/        # High-definition imagery for hero and equipment categories
        ├── hero_banner.jpg
        ├── industrial_3d_printer.jpg
        ├── gpu_cluster.jpg
        ├── cinema_camera.jpg
        └── cleanroom_lab.jpg
```
