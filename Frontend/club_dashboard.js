const club_id = sessionStorage.getItem("club_id");
const role = sessionStorage.getItem("role");
const isAuthenticated = sessionStorage.getItem("isAuthenticated");

if (isAuthenticated !== "true" || !club_id || role !== "club") {
    alert("Unauthorized access");
    window.location.href = "login.html";
}

/* ADD EVENT – poster as file upload (JPEG), rest as FormData */
const eventForm = document.getElementById("eventForm");
const eventName = document.getElementById("eventName");
const description = document.getElementById("description");
const posterFile = document.getElementById("posterFile");
const eventDate = document.getElementById("eventDate");
const eventTime = document.getElementById("eventTime");
const venue = document.getElementById("venue");
const teamSize = document.getElementById("teamSize");
const maxTeams = document.getElementById("maxTeams");
const eventCategory = document.getElementById("eventCategory");
const registrationFee = document.getElementById("registrationFee");
const winningAmount = document.getElementById("winningAmount");
const studentCoordinatorName = document.getElementById("studentCoordinatorName");
const studentCoordinatorContact = document.getElementById("studentCoordinatorContact");
const facultyCoordinatorName = document.getElementById("facultyCoordinatorName");
const msg = document.getElementById("msg");

/* Set event date min to today (and update when date changes so time min can be set if date is today) */
function setDateMin() {
    const today = new Date().toISOString().slice(0, 10);
    eventDate.setAttribute("min", today);
}
setDateMin();

function isTeamSizeValid(val) {
    const v = (val || "").trim();
    if (!v) return false;
    const rangeMatch = v.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
        const a = parseInt(rangeMatch[1], 10);
        const b = parseInt(rangeMatch[2], 10);
        return a >= 1 && b >= 1 && a <= b;
    }
    const num = parseInt(v, 10);
    return Number.isInteger(num) && num >= 1;
}

function isCoordinatorContactValid(val) {
    const v = (val || "").trim();
    return v === "" || /^\d{10}$/.test(v);
}

function isEventDateTimeFuture(dateStr, timeStr) {
    if (!dateStr || !timeStr) return false;
    const [y, m, d] = dateStr.split("-").map(Number);
    const [hr, min] = timeStr.split(":").map(Number);
    const eventDt = new Date(y, m - 1, d, hr, min, 0);
    return eventDt > new Date();
}

eventForm.addEventListener("submit", e => {
    e.preventDefault();
    msg.style.color = "";

    const coordContact = studentCoordinatorContact.value.trim();
    if (!isCoordinatorContactValid(coordContact)) {
        msg.innerText = "Student coordinator number must be empty or exactly 10 digits.";
        msg.style.color = "crimson";
        return;
    }
    if (!isTeamSizeValid(teamSize.value)) {
        msg.innerText = "Members per team must be a number (e.g. 3) or a range (e.g. 3-5).";
        msg.style.color = "crimson";
        return;
    }
    if (!isEventDateTimeFuture(eventDate.value, eventTime.value)) {
        msg.innerText = "Event date and time must be after the current date and time.";
        msg.style.color = "crimson";
        return;
    }

    const formData = new FormData();
    formData.append("club_id", club_id);
    formData.append("event_name", eventName.value.trim());
    formData.append("description", description.value);
    formData.append("event_date", eventDate.value);
    formData.append("event_time", eventTime.value);
    formData.append("venue", venue.value.trim());
    formData.append("team_size", teamSize.value.trim());
    formData.append("max_teams", maxTeams.value || "0");
    formData.append("event_category", eventCategory.value);
    formData.append("registration_fee", registrationFee.value || "0");
    formData.append("winning_amount", winningAmount.value || "0");
    formData.append("student_coordinator_name", studentCoordinatorName.value);
    formData.append("student_coordinator_contact", coordContact);
    formData.append("faculty_coordinator_name", facultyCoordinatorName.value);
    if (posterFile.files.length > 0) formData.append("poster", posterFile.files[0]);

    fetch("/api/add-event", {
        method: "POST",
        body: formData
    })
        .then(res => res.json().then(data => ({ ok: res.ok, data })))
        .then(({ ok, data }) => {
            msg.innerText = data.message || (ok ? "Event created." : "Error creating event");
            msg.style.color = ok ? "" : "crimson";
            if (ok) {
                eventForm.reset();
                eventCategory.value = "Others";
                setDateMin();
                loadEvents();
            }
        })
        .catch(() => { msg.innerText = "Network error or server not reachable."; msg.style.color = "crimson"; });
});

var eventsCache = [];

function escapeHtml(str) {
    if (str == null) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

/* LOAD EVENTS */
function loadEvents() {
    fetch(`/api/events/${club_id}`)
        .then(res => res.json())
        .then(data => {
            eventsCache = data;
            const activeBody = document.querySelector("#eventTable tbody");
            const pastBody = document.querySelector("#pastEventTable tbody");
            activeBody.innerHTML = "";
            pastBody.innerHTML = "";

            const activeEvents = data.filter((e) => Number(e.is_completed) !== 1);
            const pastEvents = data.filter((e) => Number(e.is_completed) === 1);

            activeEvents.forEach((e, index) => {
                const dateStr = e.event_date ? e.event_date.split("T")[0] : "";
                const timeStr = e.event_time ? String(e.event_time).substring(0, 5) : "";
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${escapeHtml(e.event_name)}</td>
                    <td>${escapeHtml(dateStr)}</td>
                    <td>${escapeHtml(timeStr)}</td>
                    <td>${escapeHtml(e.venue)}</td>
                    <td>${escapeHtml(e.event_category)}</td>
                    <td>${e.registration_fee != null ? escapeHtml(String(e.registration_fee)) : ""}</td>
                    <td>${e.winning_amount != null ? escapeHtml(String(e.winning_amount)) : ""}</td>
                    <td><button type="button" class="btn-view-students">View Students</button></td>
                    <td><button type="button" class="btn-edit-event">Edit</button></td>
                    <td><button type="button" class="btn-complete-event">Completed</button></td>
                `;
                row.querySelector(".btn-view-students").onclick = () => openViewStudentsModal(e.event_id);
                row.querySelector(".btn-edit-event").onclick = () => openEditEventModal(e);
                row.querySelector(".btn-complete-event").onclick = () => openCompletionModal(e, true);
                activeBody.appendChild(row);
            });

            pastEvents.forEach((e, index) => {
                const dateStr = e.event_date ? e.event_date.split("T")[0] : "";
                const timeStr = e.event_time ? String(e.event_time).substring(0, 5) : "";
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${escapeHtml(e.event_name)}</td>
                    <td>${escapeHtml(dateStr)}</td>
                    <td>${escapeHtml(timeStr)}</td>
                    <td>${escapeHtml(e.venue)}</td>
                    <td class="note-cell">${escapeHtml(e.completion_note || "-")}</td>
                    <td><button type="button" class="btn-edit-note">Edit Note</button></td>
                    <td><button type="button" class="btn-delete-event">Delete</button></td>
                `;
                row.querySelector(".btn-edit-note").onclick = () => openCompletionModal(e, false);
                row.querySelector(".btn-delete-event").onclick = () => deleteEvent(e.event_id);
                pastBody.appendChild(row);
            });
        });
}

/* View Students modal – popup table with search by reg no */
let viewStudentsTeamwiseData = { teams: [] };

function openViewStudentsModal(event_id) {
    const modal = document.getElementById("viewStudentsModal");
    const container = document.getElementById("viewStudentsTeamwise");
    const emptyEl = document.getElementById("viewStudentsEmpty");
    const searchEl = document.getElementById("viewStudentsSearch");
    emptyEl.style.display = "none";
    container.innerHTML = "<p>Loading...</p>";
    modal.classList.add("show");
    searchEl.value = "";
    fetch(`/api/event-registrations/${event_id}/teamwise`)
        .then((res) => res.json())
        .then((data) => {
            viewStudentsTeamwiseData = data.teams ? data : { teams: [] };
            renderViewStudentsTeamwise(viewStudentsTeamwiseData.teams);
            emptyEl.style.display = viewStudentsTeamwiseData.teams.length ? "none" : "block";
        });
}

function renderViewStudentsTeamwise(teams) {
    const container = document.getElementById("viewStudentsTeamwise");
    const q = (document.getElementById("viewStudentsSearch").value || "").trim().toLowerCase();
    let html = "";

    function paymentBadge(status) {
        const normalized = String(status || "pending").toLowerCase();
        const label = normalized === "not_required" ? "Free" : normalized.replace("_", " ");
        return `<span class="payment-badge payment-badge--${escapeHtml(normalized)}">${escapeHtml(label)}</span>`;
    }

    teams.forEach((team) => {
        const members = (team.members || []).filter(
            (m) =>
                !q ||
                (m.reg_no || "").toLowerCase().includes(q) ||
                (m.name || "").toLowerCase().includes(q) ||
                (m.email || "").toLowerCase().includes(q) ||
                (team.team_name || "").toLowerCase().includes(q)
        );
        if (q && members.length === 0) return;
        const teamPaymentStatus = team.team_payment_status || "pending";
        html += `<div class="team-block"><div class="team-name"><span>${escapeHtml(team.team_name || "(Individual)")}</span>${paymentBadge(teamPaymentStatus)}</div><table class="team-members-table"><thead><tr><th>Reg No</th><th>Name</th><th>Email</th><th>Role</th><th>Payment</th></tr></thead><tbody>`;
        members.forEach((m) => {
            const memberPaymentStatus = m.payment_status || teamPaymentStatus || "pending";
            html += `<tr><td>${escapeHtml(m.reg_no)}</td><td>${escapeHtml(m.name)}</td><td>${escapeHtml(m.email || "")}</td><td>${m.is_leader ? "<span class=\"badge-leader\">Leader</span>" : ""}</td><td>${paymentBadge(memberPaymentStatus)}</td></tr>`;
        });
        html += "</tbody></table></div>";
    });
    container.innerHTML = html || "<p>No matching registrations.</p>";
}

document.getElementById("viewStudentsSearch").addEventListener("input", function () {
    renderViewStudentsTeamwise(viewStudentsTeamwiseData.teams);
});

document.getElementById("viewStudentsModalClose").onclick = () =>
    document.getElementById("viewStudentsModal").classList.remove("show");
document.getElementById("viewStudentsModal").onclick = function (e) {
    if (e.target === this) this.classList.remove("show");
};

/* Edit Event modal – form with current details as defaults (members per team read-only) */
function openEditEventModal(event) {
    const modal = document.getElementById("editEventModal");
    document.getElementById("editEventId").value = event.event_id;
    document.getElementById("editEventName").value = event.event_name || "";
    document.getElementById("editDescription").value = event.description || "";
    document.getElementById("editEventDate").value = event.event_date ? event.event_date.split("T")[0] : "";
    const timeVal = event.event_time ? String(event.event_time) : "";
    document.getElementById("editEventTime").value = timeVal.substring(0, 5) || "";
    document.getElementById("editVenue").value = event.venue || "";
    document.getElementById("editTeamSize").value = event.team_size != null ? event.team_size : "";
    document.getElementById("editMaxTeams").value = event.max_teams != null ? event.max_teams : "";
    document.getElementById("editEventCategory").value = event.event_category || "Others";
    document.getElementById("editRegistrationFee").value = event.registration_fee != null ? event.registration_fee : "";
    document.getElementById("editWinningAmount").value = event.winning_amount != null ? event.winning_amount : "";
    document.getElementById("editStudentCoordinatorName").value = event.student_coordinator_name || "";
    document.getElementById("editStudentCoordinatorContact").value = event.student_coordinator_contact || "";
    document.getElementById("editFacultyCoordinatorName").value = event.faculty_coordinator_name || "";
    modal.classList.add("show");
}

document.getElementById("editEventForm").addEventListener("submit", function (e) {
    e.preventDefault();
    const coordContact = document.getElementById("editStudentCoordinatorContact").value.trim();
    if (!isCoordinatorContactValid(coordContact)) {
        alert("Student coordinator number must be empty or exactly 10 digits.");
        return;
    }
    const id = document.getElementById("editEventId").value;
    const payload = {
        event_name: document.getElementById("editEventName").value.trim(),
        description: document.getElementById("editDescription").value,
        event_date: document.getElementById("editEventDate").value,
        event_time: document.getElementById("editEventTime").value,
        venue: document.getElementById("editVenue").value.trim(),
        max_teams: document.getElementById("editMaxTeams").value || 0,
        event_category: document.getElementById("editEventCategory").value,
        registration_fee: document.getElementById("editRegistrationFee").value || 0,
        winning_amount: document.getElementById("editWinningAmount").value || 0,
        student_coordinator_name: document.getElementById("editStudentCoordinatorName").value,
        student_coordinator_contact: coordContact,
        faculty_coordinator_name: document.getElementById("editFacultyCoordinatorName").value
    };
    fetch(`/api/update-event/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
        .then(res => res.json())
        .then(data => {
            alert(data.message);
            document.getElementById("editEventModal").classList.remove("show");
            loadEvents();
        })
        .catch(() => alert("Update failed"));
});

document.getElementById("editEventModalClose").onclick = () =>
    document.getElementById("editEventModal").classList.remove("show");
document.getElementById("editEventModal").onclick = function (e) {
    if (e.target === this) this.classList.remove("show");
};

function openCompletionModal(event, isCompleting) {
    document.getElementById("completionEventId").value = event.event_id;
    document.getElementById("completionNote").value = event.completion_note || "";
    document.getElementById("completionModalTitle").textContent = isCompleting ? "Complete Event" : "Edit Past Event Note";
    document.getElementById("completionSubmitBtn").textContent = isCompleting ? "Mark as completed" : "Update note";
    document.getElementById("completionForm").dataset.mode = isCompleting ? "complete" : "edit-note";
    document.getElementById("completionModal").classList.add("show");
}

document.getElementById("completionForm").addEventListener("submit", function (e) {
    e.preventDefault();
    const eventId = document.getElementById("completionEventId").value;
    const completion_note = document.getElementById("completionNote").value.trim();
    const isCompleting = this.dataset.mode === "complete";
    const endpoint = isCompleting ? "complete-event" : "event-note";

    fetch(`/api/${endpoint}/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completion_note })
    })
        .then(async (res) => {
            const raw = await res.text();
            let data = {};
            try {
                data = raw ? JSON.parse(raw) : {};
            } catch {
                data = { message: raw || "Unexpected server response" };
            }
            return { ok: res.ok, data };
        })
        .then(({ ok, data }) => {
            alert(data.message || (ok ? "Saved" : "Action failed"));
            if (!ok) return;
            document.getElementById("completionModal").classList.remove("show");
            loadEvents();
        })
        .catch(() => alert("Could not reach the server while saving the event note."));
});

document.getElementById("completionModalClose").onclick = () =>
    document.getElementById("completionModal").classList.remove("show");
document.getElementById("completionModal").onclick = function (e) {
    if (e.target === this) this.classList.remove("show");
};

function deleteEvent(id) {
    if (!confirm("Delete this event?")) return;
    fetch(`/api/delete-event/${id}`, { method: "DELETE" })
        .then(res => res.json())
        .then(data => {
            alert(data.message);
            loadEvents();
        });
}

loadEvents();
