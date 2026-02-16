const API = "http://localhost:3000/api";
const UPLOADS = "http://localhost:3000/uploads/posters";

window.onload = function () {
    const student_id = localStorage.getItem("student_id");
    const college_id = localStorage.getItem("college_id");
    const role = localStorage.getItem("role");

    if (!student_id || role !== "student") {
        alert("Unauthorized");
        window.location.href = "login.html";
        return;
    }

    const reg_no = localStorage.getItem("reg_no") || "";
    document.getElementById("studentRegNo").textContent = reg_no ? "Reg No: " + reg_no : "";

    let allEvents = [];

    function escapeHtml(str) {
        if (str == null) return "";
        const div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }

    function renderCards(events) {
        const grid = document.getElementById("eventsGrid");
        grid.innerHTML = "";
        events.forEach((e) => {
            const dateStr = e.event_date ? e.event_date.split("T")[0] : "";
            const timeStr = e.event_time ? String(e.event_time).substring(0, 5) : "";
            const card = document.createElement("div");
            card.className = "event-card";
            card.innerHTML = `
                <div class="event-card-title">${escapeHtml(e.event_name)}</div>
                <div class="event-card-meta">${escapeHtml(e.club_name)}</div>
                <div class="event-card-meta">${escapeHtml(dateStr)} · ${escapeHtml(timeStr)}</div>
                <div class="event-card-venue">${escapeHtml(e.venue)}</div>
                <div class="event-card-actions">
                    <button type="button" class="btn-view">View</button>
                    <button type="button" class="btn-register">Register</button>
                </div>
            `;
            card.querySelector(".btn-view").onclick = () => showEventDetail(e);
            card.querySelector(".btn-register").onclick = () => register(e.event_id);
            grid.appendChild(card);
        });
    }

    function showEventDetail(e) {
        const dateStr = e.event_date ? e.event_date.split("T")[0] : "";
        const timeStr = e.event_time ? String(e.event_time).substring(0, 5) : "";
        const posterHtml = e.poster
            ? `<div class="event-detail-poster"><img src="${UPLOADS}/${escapeHtml(e.poster)}" alt="Poster" /></div>`
            : "";
        const body = document.getElementById("eventModalBody");
        body.innerHTML = `
            ${posterHtml}
            <div class="event-detail-info">
                <h3>${escapeHtml(e.event_name)}</h3>
                <p><strong>Club:</strong> ${escapeHtml(e.club_name)}</p>
                <p><strong>Date & Time:</strong> ${escapeHtml(dateStr)} ${escapeHtml(timeStr)}</p>
                <p><strong>Venue:</strong> ${escapeHtml(e.venue)}</p>
                <p><strong>Category:</strong> ${escapeHtml(e.event_category || "-")}</p>
                ${e.description ? `<p><strong>Description:</strong> ${escapeHtml(e.description)}</p>` : ""}
                <p><strong>Team size:</strong> ${escapeHtml(e.team_size)} · <strong>Max teams:</strong> ${escapeHtml(e.max_teams)}</p>
                <p><strong>Registration fee:</strong> ${escapeHtml(e.registration_fee)} · <strong>Winning amount:</strong> ${escapeHtml(e.winning_amount)}</p>
                ${e.student_coordinator_name ? `<p><strong>Student coordinator:</strong> ${escapeHtml(e.student_coordinator_name)} ${e.student_coordinator_contact ? " · " + escapeHtml(e.student_coordinator_contact) : ""}</p>` : ""}
                ${e.faculty_coordinator_name ? `<p><strong>Faculty coordinator:</strong> ${escapeHtml(e.faculty_coordinator_name)}</p>` : ""}
                <button type="button" class="btn-register-in-modal">Register for this event</button>
            </div>
        `;
        body.querySelector(".btn-register-in-modal").onclick = () => {
            document.getElementById("eventModal").classList.remove("show");
            register(e.event_id);
        };
        document.getElementById("eventModal").classList.add("show");
    }

    document.getElementById("eventModal").querySelector(".modal-close").onclick = () => {
        document.getElementById("eventModal").classList.remove("show");
    };
    document.getElementById("eventModal").onclick = function (ev) {
        if (ev.target === this) this.classList.remove("show");
    };

    function loadEvents() {
        fetch(`${API}/student-events/${college_id}`)
            .then((res) => res.json())
            .then((data) => {
                allEvents = data;
                renderCards(data);
            });
    }

    document.getElementById("search").addEventListener("keyup", function () {
        const text = this.value.toLowerCase().trim();
        const filtered = allEvents.filter(
            (e) =>
                (e.event_name && e.event_name.toLowerCase().includes(text)) ||
                (e.club_name && e.club_name.toLowerCase().includes(text))
        );
        renderCards(filtered);
    });

    window.showToday = function () {
        const today = new Date().toISOString().split("T")[0];
        const todayEvents = allEvents.filter((e) => e.event_date && e.event_date.split("T")[0] === today);
        renderCards(todayEvents);
    };

    let registerModalEventId = null;

    window.register = function (event_id) {
        registerModalEventId = event_id;
        document.getElementById("registerTeamNameCreate").value = "";
        document.getElementById("registerTeamNameJoin").value = "";
        document.querySelector(".register-tab.active").classList.remove("active");
        document.getElementById("registerCreate").style.display = "block";
        document.getElementById("registerJoin").style.display = "none";
        document.querySelector('.register-tab[data-tab="create"]').classList.add("active");
        document.getElementById("registerModal").classList.add("show");
    };

    document.querySelectorAll(".register-tab").forEach((tab) => {
        tab.addEventListener("click", function () {
            document.querySelectorAll(".register-tab").forEach((t) => t.classList.remove("active"));
            this.classList.add("active");
            const isCreate = this.getAttribute("data-tab") === "create";
            document.getElementById("registerCreate").style.display = isCreate ? "block" : "none";
            document.getElementById("registerJoin").style.display = isCreate ? "none" : "block";
        });
    });

    document.getElementById("registerSubmitBtn").addEventListener("click", function () {
        if (!registerModalEventId) return;
        const isCreate = document.querySelector('.register-tab[data-tab="create"]').classList.contains("active");
        const teamName = (isCreate ? document.getElementById("registerTeamNameCreate") : document.getElementById("registerTeamNameJoin")).value.trim();
        if (!teamName) {
            alert("Please enter a team name.");
            return;
        }
        fetch(`${API}/register-event`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                event_id: registerModalEventId,
                student_id,
                team_name: teamName,
                is_leader: isCreate ? 1 : 0,
            }),
        })
            .then((res) => res.json())
            .then((data) => {
                alert(data.message);
                document.getElementById("registerModal").classList.remove("show");
                loadMyRegistrations();
            })
            .catch(() => alert("Registration failed"));
    });

    document.getElementById("registerModalClose").onclick = () => document.getElementById("registerModal").classList.remove("show");
    document.getElementById("registerModal").onclick = function (e) {
        if (e.target === this) this.classList.remove("show");
    };

    function showTeamMembers(event_id, team_name, event_name) {
        const modal = document.getElementById("teamMembersModal");
        document.getElementById("teamMembersModalTitle").textContent = "Team: " + (team_name || "(Individual)");
        document.getElementById("teamMembersModalBody").innerHTML = "<p>Loading...</p>";
        modal.classList.add("show");
        fetch(`${API}/event-registrations/${event_id}/teamwise`)
            .then((res) => res.json())
            .then((data) => {
                const teams = data.teams || [];
                const team = teams.find((t) => (t.team_name || "") === (team_name || ""));
                const body = document.getElementById("teamMembersModalBody");
                if (!team || !team.members || !team.members.length) {
                    body.innerHTML = "<p>No members found.</p>";
                    return;
                }
                let html = "<table class=\"team-members-detail-table\"><thead><tr><th>Reg No</th><th>Name</th><th>Email</th><th>Role</th></tr></thead><tbody>";
                team.members.forEach((m) => {
                    html += `<tr><td>${escapeHtml(m.reg_no)}</td><td>${escapeHtml(m.name)}</td><td>${escapeHtml(m.email || "")}</td><td>${m.is_leader ? "<span class=\"badge-leader\">Leader</span>" : ""}</td></tr>`;
                });
                html += "</tbody></table>";
                body.innerHTML = html;
            })
            .catch(() => {
                document.getElementById("teamMembersModalBody").innerHTML = "<p>Could not load team details.</p>";
            });
    }

    document.getElementById("teamMembersModalClose").onclick = () => document.getElementById("teamMembersModal").classList.remove("show");
    document.getElementById("teamMembersModal").onclick = function (e) {
        if (e.target === this) this.classList.remove("show");
    };

    function loadMyRegistrations() {
        fetch(`${API}/my-registrations/${student_id}`)
            .then((res) => res.json())
            .then((data) => {
                const tbody = document.querySelector("#myEvents tbody");
                tbody.innerHTML = "";
                data.forEach((e, index) => {
                    const dateStr = e.event_date ? e.event_date.split("T")[0] : "";
                    const timeStr = e.event_time ? String(e.event_time).substring(0, 5) : "";
                    let teamCell;
                    if (e.team_name) {
                        teamCell = `<button type="button" class="btn-team-name" data-event-id="${escapeHtml(String(e.event_id))}" data-team-name="${escapeHtml(e.team_name)}" data-event-name="${escapeHtml(e.event_name)}">${escapeHtml(e.team_name)}${e.is_leader ? " (Leader)" : ""}</button>`;
                    } else {
                        teamCell = "-";
                    }
                    tbody.innerHTML += `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${escapeHtml(e.event_name)}</td>
                            <td>${escapeHtml(e.club_name)}</td>
                            <td>${escapeHtml(dateStr)}</td>
                            <td>${escapeHtml(timeStr)}</td>
                            <td>${escapeHtml(e.venue)}</td>
                            <td>${teamCell}</td>
                        </tr>`;
                });
                tbody.querySelectorAll(".btn-team-name").forEach((btn) => {
                    btn.addEventListener("click", function () {
                        showTeamMembers(this.getAttribute("data-event-id"), this.getAttribute("data-team-name"), this.getAttribute("data-event-name"));
                    });
                });
            });
    }

    loadEvents();
    loadMyRegistrations();
};
