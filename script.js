const SEED_ACTIVITIES = [
  {id:"garden",title:"Campus Garden Revival",category:"Environment",emoji:"🌻",date:"2026-11-25",time:"9:00 AM – 12:00 PM",location:"East Campus Garden",hours:3,spots:8,description:"Plant seasonal flowers and bring our community garden back to life."},
  {id:"food",title:"Community Food Drive",category:"Community",emoji:"🥫",date:"2026-11-27",time:"1:00 PM – 4:00 PM",location:"Student Union Hall",hours:3,spots:12,description:"Sort and pack donated groceries for families in our neighborhood."},
  {id:"tutoring",title:"After-School Tutors",category:"Education",emoji:"📚",date:"2026-11-29",time:"3:30 PM – 5:30 PM",location:"Maple Street School",hours:2,spots:5,description:"Help younger students build confidence in a subject you love."},
  {id:"cleanup",title:"Riverside Cleanup",category:"Environment",emoji:"🌊",date:"2026-12-02",time:"8:30 AM – 11:30 AM",location:"Riverside Trail",hours:3,spots:15,description:"Clean the riverside trail and protect local wildlife."},
  {id:"wellness",title:"Wellness Fair Helpers",category:"Wellness",emoji:"☀️",date:"2026-12-04",time:"10:00 AM – 1:00 PM",location:"Campus Quad",hours:3,spots:6,description:"Welcome visitors and help campus groups run a wellness fair."},
  {id:"shelter",title:"Shelter Supply Sorting",category:"Animal Welfare",emoji:"🐾",date:"2026-12-07",time:"11:00 AM – 1:00 PM",location:"Hope Shelter",hours:2,spots:10,description:"Sort donated food and supplies for pets in local shelters."},
  {id:"reading",title:"Little Readers Club",category:"Education",emoji:"📖",date:"2026-12-10",time:"2:00 PM – 4:00 PM",location:"LPU Central Library",hours:2,spots:7,description:"Read stories and make learning fun for elementary students."},
  {id:"meal",title:"Community Meal Service",category:"Community",emoji:"🍲",date:"2026-12-12",time:"4:00 PM – 7:00 PM",location:"Community Kitchen",hours:3,spots:9,description:"Prepare and serve a warm meal alongside neighborhood volunteers."},
  {id:"trail",title:"Native Tree Planting",category:"Environment",emoji:"🌳",date:"2026-12-14",time:"9:00 AM – 12:00 PM",location:"LPU Green Belt",hours:3,spots:20,description:"Plant native trees and help restore a green corridor on campus."}
];

const KEY = "campusKindInteractive_v1";
const CATEGORY_CLASS = {
  Environment:"environment",
  Community:"community",
  Education:"education",
  Wellness:"wellness",
  "Animal Welfare":"animal"
};

let state = readState();
let role = "Student";
let activePage = "dashboard";
let toastTimer;

function readState() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && Array.isArray(saved.activities) && Array.isArray(saved.records)) {
      saved.activities.forEach(a => {
        if (a.location) a.location = a.location.replaceAll("Northfield", "LPU");
      });
      return saved;
    }
  } catch (error) {}
  return { activities: SEED_ACTIVITIES.map(a => ({...a})), records: [], name: "Alex Student" };
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[char]));
}

function fmtDate(value) {
  if (!value) return "—";
  return new Date(value + "T12:00:00").toLocaleDateString("en-US", {
    month:"short", day:"numeric", year:"numeric"
  });
}

function activity(id) {
  return state.activities.find(item => item.id === id);
}

function recordsFor(id) {
  return state.records.filter(record => record.activityId === id);
}

function studentRecords() {
  return state.records.filter(record => record.student === (state.name || "Alex Student"));
}

function toast(message) {
  const element = document.getElementById("toast");
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove("show"), 2400);
}

function go(page) {
  if (!document.getElementById(`page-${page}`)) page = "dashboard";
  activePage = page;
  document.querySelectorAll(".page-view").forEach(view => {
    view.classList.toggle("active", view.id === `page-${page}`);
  });
  document.querySelectorAll(".nav-link").forEach(link => {
    link.classList.toggle("active", link.dataset.page === page);
  });
  const link = document.querySelector(`[data-page="${page}"]`);
  const titles = {
    dashboard:"Overview", activities:"Discover activities",
    "my-hours":"My volunteer hours", certificates:"Certificates",
    verification:"Verify submissions", manage:"Manage activities",
    reports:"Reports & analytics"
  };
  document.getElementById("crumb-title").textContent = link
    ? link.textContent.trim().replace(/\s+\d+$/, "")
    : titles[page];
  history.replaceState(null, "", `#${page}`);
  document.getElementById("sidebar").classList.remove("open");
  renderPage(page);
}

document.addEventListener("click", event => {
  const nav = event.target.closest("[data-page]");
  if (nav) {
    event.preventDefault();
    go(nav.dataset.page);
    return;
  }
  const destination = event.target.closest("[data-go]");
  if (destination) go(destination.dataset.go);
});

function statusBadge(status) {
  return `<span class="status status-${status.toLowerCase()}">${esc(status)}</span>`;
}

function compactActivity(item) {
  const categoryClass = CATEGORY_CLASS[item.category] || "";
  return `<div class="compact-activity">
    <div class="activity-emoji ${categoryClass}">${item.emoji}</div>
    <div><b>${esc(item.title)}</b><small>${fmtDate(item.date)} · ${esc(item.location)}</small></div>
    <span class="compact-hours">${item.hours} hrs</span>
  </div>`;
}

function historyRow(record) {
  const item = activity(record.activityId);
  if (!item) return "";
  return `<div class="history-row">
    <div class="history-activity">${item.emoji} ${esc(item.title)}<small>${record.attendance ? "Attendance submitted" : "Registered"}</small></div>
    <span class="history-date">${fmtDate(item.date)}</span>
    <span class="history-hours">${record.hours ? `${record.hours} hrs` : "—"}</span>
    ${statusBadge(record.status)}
  </div>`;
}

function renderDashboard() {
  const records = studentRecords();
  const verified = records.filter(r => r.status === "Verified").reduce((sum, r) => sum + (+r.hours || 0), 0);
  const pending = records.filter(r => r.status === "Pending").reduce((sum, r) => sum + (+r.hours || 0), 0);

  document.getElementById("stat-verified").textContent = verified;
  document.getElementById("stat-joined").textContent = records.length;
  document.getElementById("stat-pending").textContent = pending;
  document.getElementById("stat-certs").textContent = records.filter(r => r.status === "Verified").length;

  const percent = Math.min(100, Math.round(verified / 20 * 100));
  document.getElementById("goal-hours").textContent = verified;
  document.getElementById("goal-progress").style.width = percent + "%";
  document.getElementById("goal-percent").textContent = percent + "%";
  document.getElementById("goal-message").textContent = verified >= 20
    ? "Amazing work! You've reached your goal."
    : verified
      ? `${20 - verified} more hours to reach your goal.`
      : "You're just getting started. Find your first activity!";

  const upcoming = state.activities
    .filter(item => item.date >= new Date().toISOString().slice(0, 10))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);

  document.getElementById("dashboard-activities").innerHTML = upcoming.length
    ? upcoming.map(compactActivity).join("")
    : '<p class="empty-copy">No upcoming activities. Check back soon!</p>';

  document.getElementById("dashboard-history").innerHTML = records.length
    ? records.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 4).map(historyRow).join("")
    : '<div class="empty-copy">Your volunteer story starts here. <button class="link-button" data-go="activities">Find an activity →</button></div>';
}

function renderActivities() {
  const query = (document.getElementById("activity-search")?.value || "").toLowerCase();
  const category = document.getElementById("category-filter")?.value || "All";
  const sort = document.getElementById("sort-filter")?.value || "date";

  const items = state.activities.filter(item =>
    (category === "All" || item.category === category) &&
    `${item.title} ${item.category} ${item.location} ${item.description}`.toLowerCase().includes(query)
  );

  items.sort(sort === "hours"
    ? (a, b) => b.hours - a.hours
    : (a, b) => a.date.localeCompare(b.date));

  document.getElementById("activity-results").textContent =
    `${items.length} activit${items.length === 1 ? "y" : "ies"}`;

  document.getElementById("activity-grid").innerHTML = items.length
    ? items.map(item => {
      const joined = studentRecords().find(record => record.activityId === item.id);
      const signed = recordsFor(item.id).length;
      const action = joined
        ? joined.status === "Joined"
          ? `<button class="button button-outline registered-button" data-attend="${esc(item.id)}">Submit attendance & hours →</button>`
          : `<button class="button button-outline registered-button" disabled>${joined.status === "Verified" ? "✓ Hours verified" : joined.status === "Pending" ? "⌛ Awaiting verification" : "Submission rejected"}</button>`
        : `<button class="button button-green card-register" data-register="${esc(item.id)}">Register for activity →</button>`;

      return `<article class="activity-card">
        <div class="activity-cover ${CATEGORY_CLASS[item.category] || ""}">
          <span class="cause-pill">${esc(item.category)}</span>
          <span class="spots-pill">${Math.max(0, item.spots - signed)} spots left</span>
          ${item.emoji}
        </div>
        <div class="activity-card-body">
          <h3>${esc(item.title)}</h3><p>${esc(item.description)}</p>
          <div class="activity-detail"><span>◷ ${fmtDate(item.date)} · ${esc(item.time)}</span><strong>${item.hours} hrs</strong></div>
          <div class="activity-detail"><span>⌖ ${esc(item.location)}</span><span>${signed} joined</span></div>
          ${action}
        </div>
      </article>`;
    }).join("")
    : '<div class="empty-box">No activities match those filters. Try a different search.</div>';
}

function renderHours() {
  const records = studentRecords();
  const filter = document.getElementById("history-filter").value;
  const shown = records.filter(record => filter === "All" || record.status === filter);

  document.getElementById("hours-verified-total").textContent =
    records.filter(r => r.status === "Verified").reduce((sum, r) => sum + (+r.hours || 0), 0) + " hrs";
  document.getElementById("hours-pending-total").textContent =
    records.filter(r => r.status === "Pending").reduce((sum, r) => sum + (+r.hours || 0), 0) + " hrs";
  document.getElementById("hours-activity-total").textContent = records.length;

  document.getElementById("hours-table").innerHTML = shown.map(record => {
    const item = activity(record.activityId);
    if (!item) return "";
    return `<tr>
      <td><div class="table-activity"><span class="table-emoji">${item.emoji}</span><span><strong>${esc(item.title)}</strong><small>${esc(item.category)} · ${esc(item.location)}</small></span></div></td>
      <td>${fmtDate(item.date)}</td><td>${record.hours ? `${record.hours} hrs` : "—"}</td>
      <td>${statusBadge(record.status)}</td><td>${record.attendance ? `Attendance: ${esc(record.attendance)}` : "Not submitted"}</td>
    </tr>`;
  }).join("");

  document.getElementById("hours-empty").classList.toggle("hidden", shown.length > 0);
  document.querySelector("#page-my-hours .table-scroll").classList.toggle("hidden", shown.length === 0);
}

function renderCertificates() {
  const records = studentRecords().filter(record => record.status === "Verified");
  const grid = document.getElementById("certificate-grid");

  grid.innerHTML = records.length
    ? records.map(record => {
      const item = activity(record.activityId);
      return `<article class="certificate-card">
        <div class="certificate-preview"><div><span>🏅</span><b>Certificate of Service</b><small>${esc(state.name)} · ${record.hours} verified hours</small></div></div>
        <h3>${item ? esc(item.title) : "Volunteer Service"}</h3>
        <p>Verified ${record.verifiedAt ? new Date(record.verifiedAt).toLocaleDateString() : ""} · ${record.hours} service hours</p>
        <button class="button button-outline" data-certificate="${esc(record.id)}">View / print certificate</button>
      </article>`;
    }).join("")
    : '<div class="empty-box">No certificates yet. Once an organizer verifies your submitted hours, your certificate will appear here.</div>';
}

function renderVerification() {
  const filter = document.getElementById("review-filter").value;
  const all = state.records.filter(record => record.attendance);
  const pending = all.filter(record => record.status === "Pending");
  const verified = all.filter(record => record.status === "Verified");

  document.getElementById("review-pending-count").textContent = pending.length;
  document.getElementById("review-pending-hours").textContent =
    pending.reduce((sum, record) => sum + (+record.hours || 0), 0);
  document.getElementById("review-verified-count").textContent = verified.length;

  const shown = all.filter(record => filter === "All" || record.status === filter);
  document.getElementById("review-table").innerHTML = shown.map(record => {
    const item = activity(record.activityId);
    if (!item) return "";
    return `<tr>
      <td><strong>${esc(record.student)}</strong><small style="display:block;color:#98a098;margin-top:3px">Student volunteer</small></td>
      <td><div class="table-activity"><span class="table-emoji">${item.emoji}</span><strong>${esc(item.title)}</strong></div></td>
      <td>${esc(record.attendance)}<small style="display:block;color:#98a098;margin-top:3px">${record.submittedAt ? new Date(record.submittedAt).toLocaleDateString() : ""}</small></td>
      <td><strong>${record.hours} hrs</strong></td>
      <td>${record.status === "Pending"
        ? `<div class="review-actions"><button class="approve" data-review="approve" data-id="${record.id}">✓ Approve</button><button class="reject" data-review="reject" data-id="${record.id}">Reject</button></div>`
        : statusBadge(record.status)}</td>
    </tr>`;
  }).join("");

  document.getElementById("review-empty").classList.toggle("hidden", shown.length > 0);
  document.querySelector("#page-verification .table-scroll").classList.toggle("hidden", shown.length === 0);
}

function renderManage() {
  document.getElementById("manage-count").textContent = state.activities.length;
  document.getElementById("manage-registrations").textContent = state.records.length;
  document.getElementById("manage-hours").textContent =
    state.activities.reduce((sum, item) => sum + (+item.hours || 0), 0);

  document.getElementById("manage-table").innerHTML = state.activities.map(item =>
    `<tr><td><div class="table-activity"><span class="table-emoji">${item.emoji}</span><strong>${esc(item.title)}</strong></div></td>
    <td>${fmtDate(item.date)}</td><td>${esc(item.category)}</td><td>${item.hours}</td>
    <td>${recordsFor(item.id).length} / ${item.spots}</td>
    <td><button class="text-action" data-delete-activity="${esc(item.id)}">Remove</button></td></tr>`
  ).join("");
}

function renderReports() {
  const verified = state.records.filter(record => record.status === "Verified");
  const pending = state.records.filter(record => record.status === "Pending");

  document.getElementById("report-total-hours").textContent =
    verified.reduce((sum, record) => sum + (+record.hours || 0), 0);
  document.getElementById("report-pending-hours").textContent =
    pending.reduce((sum, record) => sum + (+record.hours || 0), 0);
  document.getElementById("report-registrations").textContent = state.records.length;
  document.getElementById("report-activities").textContent = state.activities.length;

  const max = Math.max(1, ...state.activities.map(item =>
    verified.filter(record => record.activityId === item.id).reduce((sum, record) => sum + (+record.hours || 0), 0)
  ));

  document.getElementById("hours-chart").innerHTML = state.activities.slice(0, 7).map(item => {
    const hours = verified.filter(record => record.activityId === item.id)
      .reduce((sum, record) => sum + (+record.hours || 0), 0);
    return `<div class="bar-item"><span class="bar-value">${hours}</span><div class="bar" style="height:${Math.max(3, hours / max * 115)}px"></div><span class="bar-label">${esc(item.title)}</span></div>`;
  }).join("");

  const categories = [...new Set(state.activities.map(item => item.category))];
  document.getElementById("category-breakdown").innerHTML = categories.map(category =>
    `<div class="category-row"><span class="category-name"><i class="category-dot"></i>${esc(category)}</span><span class="category-count">${state.activities.filter(item => item.category === category).length} activities</span></div>`
  ).join("");

  document.getElementById("student-summary").innerHTML =
    `<tr><td><strong>${esc(state.name)}</strong></td><td>${state.records.length}</td><td>${verified.reduce((sum, record) => sum + (+record.hours || 0), 0)}</td><td>${pending.reduce((sum, record) => sum + (+record.hours || 0), 0)}</td></tr>`;
}

function renderPage(page) {
  if (page === "dashboard") renderDashboard();
  if (page === "activities") renderActivities();
  if (page === "my-hours") renderHours();
  if (page === "certificates") renderCertificates();
  if (page === "verification") renderVerification();
  if (page === "manage") renderManage();
  if (page === "reports") renderReports();
}

function openModal(html) {
  document.getElementById("modal-content").innerHTML = html;
  document.getElementById("modal-backdrop").classList.remove("hidden");
  document.querySelector(".modal").scrollTop = 0;
}

function closeModal() {
  document.getElementById("modal-backdrop").classList.add("hidden");
}

function register(id) {
  const item = activity(id);
  if (!item || studentRecords().some(record => record.activityId === id)) return;

  openModal(`<span class="section-kicker">JOIN THE COMMUNITY</span>
    <h2 id="modal-title">Register for ${esc(item.title)}</h2>
    <p class="modal-intro">Confirm your details to reserve a place. You can submit your attendance and hours after the activity.</p>
    <form id="register-form">
      <div class="form-grid">
        <div class="form-field full"><label for="student-name">Your name</label><input id="student-name" required value="${esc(state.name)}"></div>
        <div class="form-field full"><label for="student-email">Student email</label><input id="student-email" type="email" required placeholder="student@example.com"></div>
      </div>
      <div class="attendance-card"><b>${item.emoji} ${esc(item.title)}</b><br>${fmtDate(item.date)} · ${esc(item.time)} · ${item.hours} planned hours<br>${esc(item.location)}</div>
      <div class="form-actions"><button type="button" class="button button-outline" data-close>Cancel</button><button class="button button-green">Confirm registration</button></div>
    </form>`);

  document.getElementById("register-form").addEventListener("submit", event => {
    event.preventDefault();
    state.name = document.getElementById("student-name").value.trim();
    state.records.push({
      id: crypto.randomUUID(),
      activityId: id,
      student: state.name,
      status: "Joined",
      hours: 0,
      createdAt: Date.now(),
      email: document.getElementById("student-email").value
    });
    save();
    closeModal();
    refresh();
    toast("You're registered! After attending, submit your hours for review.");
  });
}

function submitAttendance(id) {
  const item = activity(id);
  const record = studentRecords().find(r => r.activityId === id);
  if (!item || !record || record.status !== "Joined") return;

  openModal(`<span class="section-kicker">ATTENDANCE & SERVICE HOURS</span>
    <h2 id="modal-title">Submit your attendance</h2>
    <p class="modal-intro">Let the organizer know you attended. Your submitted hours remain pending until they verify them.</p>
    <form id="attendance-form">
      <div class="form-grid">
        <div class="form-field full"><label>Activity</label><input value="${esc(item.title)}" disabled></div>
        <div class="form-field"><label for="attended-hours">Hours served</label><input type="number" id="attended-hours" min="0.5" max="24" step="0.5" value="${item.hours}" required></div>
        <div class="form-field"><label for="attended-date">Date attended</label><input type="date" id="attended-date" value="${item.date}" required></div>
        <div class="form-field full"><label for="attendance-note">Attendance note (optional)</label><textarea id="attendance-note" placeholder="What did you help with?"></textarea></div>
      </div>
      <div class="form-actions"><button type="button" class="button button-outline" data-close>Cancel</button><button class="button button-green">Submit for verification</button></div>
    </form>`);

  document.getElementById("attendance-form").addEventListener("submit", event => {
    event.preventDefault();
    const hours = Number(document.getElementById("attended-hours").value);
    if (hours <= 0 || hours > 24) return;
    record.hours = hours;
    record.attendance = document.getElementById("attended-date").value;
    record.note = document.getElementById("attendance-note").value.trim();
    record.submittedAt = Date.now();
    record.status = "Pending";
    save();
    closeModal();
    refresh();
    toast("Attendance submitted. Your hours are awaiting organizer verification.");
  });
}

function createActivity() {
  openModal(`<span class="section-kicker">ORGANIZER TOOL</span><h2 id="modal-title">Create an activity</h2>
    <p class="modal-intro">Add a volunteer opportunity to your campus listings.</p>
    <form id="create-form">
      <div class="form-grid">
        <div class="form-field full"><label>Activity name</label><input name="title" required placeholder="e.g. Campus Cleanup Day"></div>
        <div class="form-field"><label>Cause</label><select name="category"><option>Environment</option><option>Community</option><option>Education</option><option>Wellness</option><option>Animal Welfare</option></select></div>
        <div class="form-field"><label>Activity date</label><input type="date" name="date" required></div>
        <div class="form-field"><label>Time</label><input name="time" required placeholder="9:00 AM – 12:00 PM"></div>
        <div class="form-field"><label>Hours</label><input type="number" name="hours" min="1" max="24" value="2" required></div>
        <div class="form-field"><label>Location</label><input name="location" required placeholder="Campus location"></div>
        <div class="form-field"><label>Available places</label><input type="number" name="spots" min="1" value="10" required></div>
        <div class="form-field full"><label>Description</label><textarea name="description" required placeholder="Tell students what they'll be doing"></textarea></div>
      </div>
      <div class="form-actions"><button type="button" class="button button-outline" data-close>Cancel</button><button class="button button-green">Publish activity</button></div>
    </form>`);

  document.getElementById("create-form").addEventListener("submit", event => {
    event.preventDefault();
    const form = new FormData(event.target);
    const category = form.get("category");
    const emojis = {Environment:"🌿", Community:"🤝", Education:"📚", Wellness:"☀️", "Animal Welfare":"🐾"};
    state.activities.push({
      id:"a" + Date.now(),
      title:form.get("title").trim(),
      category,
      emoji:emojis[category],
      date:form.get("date"),
      time:form.get("time"),
      location:form.get("location").trim(),
      hours:+form.get("hours"),
      spots:+form.get("spots"),
      description:form.get("description").trim()
    });
    save();
    closeModal();
    refresh();
    go("manage");
    toast("Activity published to your campus listings.");
  });
}

function decision(id, action) {
  const record = state.records.find(item => item.id === id);
  if (!record) return;
  record.status = action === "approve" ? "Verified" : "Rejected";
  record.verifiedAt = action === "approve" ? Date.now() : null;
  record.reviewedBy = "Campus organizer";
  save();
  refresh();
  toast(action === "approve"
    ? `${record.hours} hours verified. Certificate unlocked!`
    : "Submission rejected. Student history updated.");
}

function download(filename, content, type = "text/csv") {
  const blob = new Blob([content], {type});
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportCsv(records = studentRecords(), filename = "volunteer-hours-report.csv") {
  const rows = [
    ["Student", "Activity", "Category", "Activity Date", "Attendance Date", "Hours", "Status", "Location"],
    ...records.map(record => {
      const item = activity(record.activityId) || {};
      return [record.student, item.title, item.category, item.date, record.attendance, record.hours, record.status, item.location];
    })
  ];
  const csv = rows.map(row =>
    row.map(value => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")
  ).join("\n");
  download(filename, csv);
}

function certificate(id) {
  const record = state.records.find(item => item.id === id);
  const item = record && activity(record.activityId);
  if (!record || !item) return;

  openModal(`<span class="section-kicker">CERTIFICATE OF SERVICE</span>
    <h2 id="modal-title">A record of your impact</h2>
    <div class="certificate-detail"><div class="medal">🏅</div><h3>Certificate of Volunteer Service</h3>
    <p>This recognizes <b>${esc(record.student)}</b> for contributing <b>${record.hours} verified service hours</b> to<br><b>${esc(item.title)}</b></p>
    <p>Lovely Professional University · ${record.verifiedAt ? new Date(record.verifiedAt).toLocaleDateString() : ""}</p></div>
    <p class="modal-intro">Use your browser's print dialog to save this certificate as a PDF.</p>
    <div class="form-actions"><button class="button button-outline" data-close>Close</button><button class="button button-green" id="print-certificate">Print / save PDF</button></div>`);
  document.getElementById("print-certificate").onclick = () => window.print();
}

document.addEventListener("click", event => {
  const registerButton = event.target.closest("[data-register]");
  if (registerButton) register(registerButton.dataset.register);

  const attendanceButton = event.target.closest("[data-attend]");
  if (attendanceButton) submitAttendance(attendanceButton.dataset.attend);

  const reviewButton = event.target.closest("[data-review]");
  if (reviewButton) decision(reviewButton.dataset.id, reviewButton.dataset.review);

  const certificateButton = event.target.closest("[data-certificate]");
  if (certificateButton) certificate(certificateButton.dataset.certificate);

  const deleteButton = event.target.closest("[data-delete-activity]");
  if (deleteButton && confirm("Remove this activity listing? Existing service records will remain.")) {
    state.activities = state.activities.filter(item => item.id !== deleteButton.dataset.deleteActivity);
    save();
    refresh();
    toast("Activity listing removed.");
  }

  if (event.target.closest("[data-close]")) closeModal();
});

document.getElementById("activity-search").addEventListener("input", renderActivities);
["category-filter", "sort-filter"].forEach(id =>
  document.getElementById(id).addEventListener("change", renderActivities)
);
document.getElementById("history-filter").addEventListener("change", renderHours);
document.getElementById("review-filter").addEventListener("change", renderVerification);
document.getElementById("new-activity-button").addEventListener("click", createActivity);

function toggleRole() {
  role = role === "Student" ? "Organizer" : "Student";
  document.getElementById("role-label").textContent = role + " view";
  document.querySelectorAll(".organizer-only").forEach(element =>
    element.classList.toggle("hidden", role !== "Organizer")
  );
  document.querySelectorAll('[data-page="verification"],[data-page="manage"],[data-page="reports"]').forEach(element =>
    element.classList.toggle("admin-nav-hidden", role !== "Organizer")
  );
  if (role === "Organizer" && ["verification", "manage", "reports"].includes(activePage)) go("dashboard");
  toast(`${role} view enabled. Use the Organizer section in the sidebar.`);
}

document.getElementById("role-switch").addEventListener("click", toggleRole);
document.getElementById("mobile-menu").addEventListener("click", () =>
  document.getElementById("sidebar").classList.toggle("open")
);
document.getElementById("modal-close").addEventListener("click", closeModal);
document.getElementById("modal-backdrop").addEventListener("click", event => {
  if (event.target.id === "modal-backdrop") closeModal();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeModal();
});

document.getElementById("hours-export").addEventListener("click", () => exportCsv());
document.getElementById("report-export").addEventListener("click", () =>
  exportCsv(state.records, "campus-wide-volunteer-report.csv")
);
document.getElementById("notification-button").addEventListener("click", () => {
  const pending = studentRecords().filter(record => record.status === "Pending").length;
  toast(pending
    ? `${pending} hour submission${pending === 1 ? " is" : "s are"} awaiting organizer review.`
    : "You're all caught up. No new notifications.");
});

document.getElementById("help-button").addEventListener("click", () =>
  openModal(`<span class="section-kicker">CAMPUSKIND HELP</span><h2 id="modal-title">How the tracker works</h2>
  <div class="attendance-card"><b>1. Register</b><br>Choose an activity and confirm your student details.<br><br>
  <b>2. Submit attendance</b><br>After attending, open My volunteer hours and use the activity's attendance action to record time served.<br><br>
  <b>3. Get verified</b><br>An organizer reviews your submission. Verified hours count toward your goal and unlock a certificate.<br><br>
  <b>Demo data</b><br>Your records are stored in this browser on this device.</div>
  <div class="form-actions"><button class="button button-green" data-close>Got it</button></div>`)
);

document.getElementById("profile-menu").addEventListener("click", () =>
  openModal(`<span class="section-kicker">STUDENT PROFILE</span><h2 id="modal-title">Your demo profile</h2>
  <p class="modal-intro">This simple demo uses one student profile saved in this browser. You can edit your display name here.</p>
  <form id="profile-form"><div class="form-field"><label for="profile-name">Display name</label><input id="profile-name" required value="${esc(state.name)}"></div>
  <div class="form-actions"><button type="button" class="button button-outline" data-close>Cancel</button><button class="button button-green">Save profile</button></div></form>`)
);

document.addEventListener("submit", event => {
  if (event.target.id !== "profile-form") return;
  event.preventDefault();
  state.name = document.getElementById("profile-name").value.trim();
  state.records.filter(record => record.student === "Alex Student")
    .forEach(record => record.student = state.name);
  save();
  document.getElementById("sidebar-name").textContent = state.name;
  document.getElementById("greeting-name").textContent = state.name.split(" ")[0];
  closeModal();
  refresh();
  toast("Profile updated.");
});

function refresh() {
  document.getElementById("sidebar-name").textContent = state.name || "Alex Student";
  document.getElementById("greeting-name").textContent = (state.name || "Alex Student").split(" ")[0];
  document.getElementById("nav-activity-count").textContent = state.activities.length;
  document.getElementById("pending-count").textContent =
    state.records.filter(record => record.status === "Pending").length;
  renderPage(activePage);
  renderDashboard();
  if (role === "Organizer" && activePage !== "verification") renderVerification();
}

document.getElementById("welcome-date").textContent =
  new Date().toLocaleDateString("en-US", {weekday:"long", month:"long", day:"numeric"}).toUpperCase();
document.getElementById("greeting-name").textContent = (state.name || "Alex Student").split(" ")[0];
document.getElementById("sidebar-name").textContent = state.name || "Alex Student";
document.getElementById("today-label").textContent =
  "LPU · " + new Date().toLocaleDateString("en-US", {month:"short", day:"numeric"}).toUpperCase();
document.getElementById("nav-activity-count").textContent = state.activities.length;
document.getElementById("pending-count").textContent =
  state.records.filter(record => record.status === "Pending").length;

document.querySelectorAll(".organizer-only").forEach(element => element.classList.add("hidden"));
document.querySelectorAll('[data-page="verification"],[data-page="manage"],[data-page="reports"]').forEach(element =>
  element.classList.add("admin-nav-hidden")
);

const dynamicStyle = document.createElement("style");
dynamicStyle.textContent = ".admin-nav-hidden{display:none!important}.text-action{border:0;background:#fff4f1;color:#a2574e;border-radius:5px;padding:6px 8px;font-size:8px}";
document.head.appendChild(dynamicStyle);

const initialPage = location.hash.slice(1);
go(["dashboard","activities","my-hours","certificates","verification","manage","reports"].includes(initialPage)
  ? initialPage
  : "dashboard");