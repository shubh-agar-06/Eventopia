const college_id = sessionStorage.getItem("college_id");
const role = sessionStorage.getItem("role");
const isAuthenticated = sessionStorage.getItem("isAuthenticated");
const API = "/api";

if (isAuthenticated !== "true" || !college_id || role !== "college") {
    alert("Unauthorized access");
    window.location.href = "login.html";
}

// Refs
const clubForm = document.getElementById("clubForm");
const clubName = document.getElementById("clubName");
const clubEmail = document.getElementById("clubEmail");
const clubPassword = document.getElementById("clubPassword");
const clubMsg = document.getElementById("clubMsg");
const studentForm = document.getElementById("studentForm");
const regNo = document.getElementById("regNo");
const studentName = document.getElementById("studentName");
const studentEmail = document.getElementById("studentEmail");
const yearOfGrad = document.getElementById("yearOfGrad");
const studentPassword = document.getElementById("studentPassword");
const studentMsg = document.getElementById("studentMsg");

// Pagination & search
const DEFAULT_PAGE_SIZE = 5;
let clubLimit = DEFAULT_PAGE_SIZE;
let studentLimit = DEFAULT_PAGE_SIZE;
let clubSearch = "";
let studentSearch = "";
let clubTotal = 0;
let studentTotal = 0;

/* ---------- ADD CLUB ---------- */
clubForm.addEventListener("submit", e => {
    e.preventDefault();
    fetch(`${API}/add-club`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            college_id,
            club_name: clubName.value,
            password: clubPassword.value,
            club_email: clubEmail.value
        })
    })
        .then(res => res.json())
        .then(data => {
            clubMsg.innerText = data.message;
            clubForm.reset();
            loadClubs();
        });
});

/* ---------- ADD STUDENT ---------- */
studentForm.addEventListener("submit", e => {
    e.preventDefault();
    fetch(`${API}/add-student`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            college_id,
            reg_no: regNo.value,
            name: studentName.value,
            email: studentEmail.value,
            year_of_grad: yearOfGrad.value,
            password: studentPassword.value
        })
    })
        .then(res => res.json())
        .then(data => {
            studentMsg.innerText = data.message;
            studentForm.reset();
            loadStudents();
        });
});

/* ---------- IMPORT: Format modal ---------- */
const formatModal = document.getElementById("formatModal");
const formatModalTitle = document.getElementById("formatModalTitle");
const formatModalBody = document.getElementById("formatModalBody");
const formatModalConfirm = document.getElementById("formatModalConfirm");
const modalClose = formatModal.querySelector(".modal-close");

const CLUB_FORMAT_HTML = `
  <p><strong>First row must be header with these exact column names (any order):</strong></p>
  <ul>
    <li><code>Club Name</code></li>
    <li><code>Club Email</code></li>
    <li><code>Password</code></li>
  </ul>
  <p>Duplicate clubs (same email) will be skipped.</p>
`;

const STUDENT_FORMAT_HTML = `
  <p><strong>First row must be header with these exact column names (any order):</strong></p>
  <ul>
    <li><code>Registration Number</code></li>
    <li><code>Student Name</code> or <code>Name</code></li>
    <li><code>Email</code></li>
    <li><code>Year of Graduation</code> or <code>Year of Grad</code></li>
    <li><code>Password</code></li>
  </ul>
  <p>Duplicate students (same registration number) will be skipped.</p>
`;

function openFormatModal(type) {
    if (type === "club") {
        formatModalTitle.textContent = "Expected Excel format – Clubs";
        formatModalBody.innerHTML = CLUB_FORMAT_HTML;
        formatModalConfirm.textContent = "I understand, choose file";
        formatModalConfirm.onclick = () => {
            formatModal.classList.remove("show");
            document.getElementById("clubFileInput").click();
        };
    } else {
        formatModalTitle.textContent = "Expected Excel format – Students";
        formatModalBody.innerHTML = STUDENT_FORMAT_HTML;
        formatModalConfirm.textContent = "I understand, choose file";
        formatModalConfirm.onclick = () => {
            formatModal.classList.remove("show");
            document.getElementById("studentFileInput").click();
        };
    }
    formatModal.classList.add("show");
}

modalClose.onclick = () => formatModal.classList.remove("show");
formatModal.onclick = e => { if (e.target === formatModal) formatModal.classList.remove("show"); };

document.getElementById("importClubBtn").addEventListener("click", () => openFormatModal("club"));
document.getElementById("importStudentBtn").addEventListener("click", () => openFormatModal("student"));

/* ---------- Import file handlers ---------- */
document.getElementById("clubFileInput").addEventListener("change", function () {
    const file = this.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("college_id", college_id);
    clubMsg.textContent = "Importing...";
    fetch(`${API}/import-clubs`, { method: "POST", body: formData })
        .then(res => res.json())
        .then(data => {
            clubMsg.textContent = data.message + (data.added != null ? ` Added: ${data.added}, Skipped (duplicates): ${data.skipped}.` : "");
            this.value = "";
            loadClubs();
        })
        .catch(() => {
            clubMsg.textContent = "Import failed.";
            this.value = "";
        });
});

document.getElementById("studentFileInput").addEventListener("change", function () {
    const file = this.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("college_id", college_id);
    studentMsg.textContent = "Importing...";
    fetch(`${API}/import-students`, { method: "POST", body: formData })
        .then(res => res.json())
        .then(data => {
            studentMsg.textContent = data.message + (data.added != null ? ` Added: ${data.added}, Skipped (duplicates): ${data.skipped}.` : "");
            this.value = "";
            loadStudents();
        })
        .catch(() => {
            studentMsg.textContent = "Import failed.";
            this.value = "";
        });
});

/* ---------- Search ---------- */
let clubSearchTimeout, studentSearchTimeout;
document.getElementById("clubSearch").addEventListener("input", function () {
    clearTimeout(clubSearchTimeout);
    clubSearchTimeout = setTimeout(() => {
        clubSearch = this.value.trim();
        clubLimit = DEFAULT_PAGE_SIZE;
        loadClubs();
        loadClubCount();
    }, 300);
});
document.getElementById("studentSearch").addEventListener("input", function () {
    clearTimeout(studentSearchTimeout);
    studentSearchTimeout = setTimeout(() => {
        studentSearch = this.value.trim();
        studentLimit = DEFAULT_PAGE_SIZE;
        loadStudents();
        loadStudentCount();
    }, 300);
});

/* ---------- Load clubs (with limit, offset, search) ---------- */
function loadClubCount() {
    const q = new URLSearchParams();
    if (clubSearch) q.set("search", clubSearch);
    fetch(`${API}/clubs/${college_id}/count?${q}`)
        .then(res => res.json())
        .then(data => {
            clubTotal = data.total || 0;
            updateSeeMoreButton("club");
        });
}

function loadClubs() {
    const q = new URLSearchParams();
    q.set("limit", clubLimit);
    q.set("offset", 0);
    if (clubSearch) q.set("search", clubSearch);
    fetch(`${API}/clubs/${college_id}?${q}`)
        .then(res => res.json())
        .then(data => {
            const tbody = document.querySelector("#clubTable tbody");
            tbody.innerHTML = "";
            data.forEach((c, index) => {
                tbody.innerHTML += `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${escapeHtml(c.club_name)}</td>
                        <td><button onclick="deleteClub(${c.club_id})">Delete</button></td>
                    </tr>
                `;
            });
            loadClubCount();
        });
}

function updateSeeMoreButton(type) {
    if (type === "club") {
        const btn = document.getElementById("clubSeeMore");
        const showing = Math.min(clubLimit, clubTotal);
        btn.style.display = clubTotal <= DEFAULT_PAGE_SIZE || showing >= clubTotal ? "none" : "block";
        btn.textContent = showing >= clubTotal ? "See more" : `See more (${showing} of ${clubTotal})`;
    } else {
        const btn = document.getElementById("studentSeeMore");
        const showing = Math.min(studentLimit, studentTotal);
        btn.style.display = studentTotal <= DEFAULT_PAGE_SIZE || showing >= studentTotal ? "none" : "block";
        btn.textContent = showing >= studentTotal ? "See more" : `See more (${showing} of ${studentTotal})`;
    }
}

document.getElementById("clubSeeMore").addEventListener("click", () => {
    clubLimit += DEFAULT_PAGE_SIZE;
    loadClubs();
});

/* ---------- Load students ---------- */
function loadStudentCount() {
    const q = new URLSearchParams();
    if (studentSearch) q.set("search", studentSearch);
    fetch(`${API}/students/${college_id}/count?${q}`)
        .then(res => res.json())
        .then(data => {
            studentTotal = data.total || 0;
            updateSeeMoreButton("student");
        });
}

function loadStudents() {
    const q = new URLSearchParams();
    q.set("limit", studentLimit);
    q.set("offset", 0);
    if (studentSearch) q.set("search", studentSearch);
    fetch(`${API}/students/${college_id}?${q}`)
        .then(res => res.json())
        .then(data => {
            const tbody = document.querySelector("#studentTable tbody");
            tbody.innerHTML = "";
            data.forEach((s, index) => {
                tbody.innerHTML += `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${escapeHtml(s.reg_no)}</td>
                        <td>${escapeHtml(s.name)}</td>
                        <td><button onclick="deleteStudent(${s.student_id})">Delete</button></td>
                    </tr>
                `;
            });
            loadStudentCount();
        });
}

document.getElementById("studentSeeMore").addEventListener("click", () => {
    studentLimit += DEFAULT_PAGE_SIZE;
    loadStudents();
});

function escapeHtml(str) {
    if (str == null) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

/* ---------- DELETE CLUB ---------- */
function deleteClub(id) {
    fetch(`${API}/delete-club/${id}`, { method: "DELETE" })
        .then(() => loadClubs());
}

/* ---------- DELETE STUDENT ---------- */
function deleteStudent(id) {
    fetch(`${API}/delete-student/${id}`, { method: "DELETE" })
        .then(() => loadStudents());
}

/* ---------- INITIAL LOAD ---------- */
loadClubs();
loadStudents();
