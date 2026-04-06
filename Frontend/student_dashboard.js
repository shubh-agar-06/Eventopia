const API = "/api";
const UPLOADS = "/uploads/posters";

window.onload = function () {
    const student_id = sessionStorage.getItem("student_id");
    const college_id = sessionStorage.getItem("college_id");
    const role = sessionStorage.getItem("role");
    const isAuthenticated = sessionStorage.getItem("isAuthenticated");

    if (isAuthenticated !== "true" || !student_id || role !== "student") {
        alert("Unauthorized");
        window.location.href = "login.html";
        return;
    }

    const reg_no = sessionStorage.getItem("reg_no") || "";
    document.getElementById("studentRegNo").textContent = reg_no ? "Reg No: " + reg_no : "";

    let allEvents = [];
    let registerModalEvent = null;
    let pendingPaymentRegistration = null;
    const currentFilters = {
        searchText: "",
        date: "",
        fee: "all",
        participation: "all"
    };

    function escapeHtml(str) {
        if (str == null) return "";
        const div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }

    function toAmount(value) {
        const num = Number(value);
        return Number.isFinite(num) ? num : 0;
    }

    function formatMoney(value) {
        const amount = toAmount(value);
        return amount > 0 ? `Rs. ${amount.toFixed(2)}` : "Free";
    }

    function isPaidEvent(event) {
        return toAmount(event.registration_fee) > 0;
    }

    function normalizeDate(value) {
        return value ? String(value).split("T")[0] : "";
    }

    function parseTeamSizeMax(teamSize) {
        if (teamSize == null || teamSize === "") return 1;
        const s = String(teamSize).trim();
        const rangeMatch = s.match(/^(\d+)-(\d+)$/);
        if (rangeMatch) {
            return Math.max(parseInt(rangeMatch[1], 10), parseInt(rangeMatch[2], 10));
        }
        const n = parseInt(s, 10);
        return Number.isInteger(n) && n >= 1 ? n : 1;
    }

    function isIndividualEvent(event) {
        return parseTeamSizeMax(event.team_size) <= 1;
    }

    function paymentStatusBadge(status) {
        const safeStatus = status || "pending";
        return `<span class="payment-status payment-status--${escapeHtml(safeStatus)}">${escapeHtml(safeStatus.replace("_", " "))}</span>`;
    }

    function toggleRegisterPaymentFields() {
        if (!registerModalEvent || !isPaidEvent(registerModalEvent)) {
            document.getElementById("paymentChoiceSection").style.display = "none";
            return;
        }
        const isCreate = document.querySelector('.register-tab[data-tab="create"]').classList.contains("active");
        document.getElementById("paymentChoiceSection").style.display = isCreate ? "block" : "none";
        const wantsToPayNow = document.querySelector('input[name="paymentChoice"]:checked').value === "now";
        document.getElementById("paymentNowFields").classList.toggle("show", isCreate && wantsToPayNow);
    }

    function startRazorpayPayment(registration) {
        if (!window.Razorpay) {
            alert("Razorpay checkout could not be loaded.");
            return;
        }

        fetch(`${API}/create-razorpay-order`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reg_id: registration.reg_id })
        })
            .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
            .then(({ ok, data }) => {
                if (!ok) {
                    alert(data.message || "Could not start Razorpay payment.");
                    return;
                }

                const options = {
                    key: data.key,
                    amount: data.amount,
                    currency: data.currency,
                    name: "Eventopia",
                    description: `${data.event_name} registration`,
                    order_id: data.order_id,
                    handler: function (response) {
                        fetch(`${API}/verify-razorpay-payment`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                reg_id: data.reg_id,
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature
                            })
                        })
                            .then((verifyRes) => verifyRes.json().then((verifyData) => ({ ok: verifyRes.ok, verifyData })))
                            .then(({ ok: verifyOk, verifyData }) => {
                                alert(verifyData.message || (verifyOk ? "Payment completed successfully." : "Payment verification failed."));
                                if (!verifyOk) return;
                                loadMyRegistrations();
                            })
                            .catch(() => alert("Payment verification failed."));
                    },
                    prefill: {
                        name: reg_no,
                        email: "",
                        contact: ""
                    },
                    theme: {
                        color: "#4f46e5"
                    },
                    modal: {
                        ondismiss: function () {
                            loadMyRegistrations();
                        }
                    }
                };

                const rzp = new Razorpay(options);
                rzp.on("payment.failed", function () {
                    alert("Payment was not completed. Your registration is still pending.");
                    loadMyRegistrations();
                });
                rzp.open();
            })
            .catch(() => alert("Could not start Razorpay payment."));
    }

    function renderCards(events) {
        const grid = document.getElementById("eventsGrid");
        grid.innerHTML = "";
        if (!events.length) {
            grid.innerHTML = `<div class="empty-state">No active events found.</div>`;
            return;
        }

        events.forEach((event) => {
            const dateStr = event.event_date ? event.event_date.split("T")[0] : "";
            const timeStr = event.event_time ? String(event.event_time).substring(0, 5) : "";
            const card = document.createElement("div");
            card.className = "event-card";
            card.innerHTML = `
                <div class="event-card-title">${escapeHtml(event.event_name)}</div>
                <div class="event-card-meta">${escapeHtml(event.club_name)}</div>
                <div class="event-card-meta">${escapeHtml(dateStr)} | ${escapeHtml(timeStr)}</div>
                <div class="event-card-venue">${escapeHtml(event.venue)}</div>
                <div class="event-card-fee">${escapeHtml(formatMoney(event.registration_fee))}</div>
                <div class="event-card-actions">
                    <button type="button" class="btn-view">View</button>
                    <button type="button" class="btn-register">${isPaidEvent(event) ? "Register & Pay" : "Register"}</button>
                </div>
            `;
            card.querySelector(".btn-view").onclick = () => showEventDetail(event);
            card.querySelector(".btn-register").onclick = () => register(event.event_id);
            grid.appendChild(card);
        });
    }

    function applyEventFilters() {
        const filtered = allEvents.filter((event) => {
            const searchMatches =
                !currentFilters.searchText ||
                (event.event_name && event.event_name.toLowerCase().includes(currentFilters.searchText)) ||
                (event.club_name && event.club_name.toLowerCase().includes(currentFilters.searchText));

            const eventDate = normalizeDate(event.event_date);
            const dateMatches = !currentFilters.date || eventDate === currentFilters.date;

            const feeMatches =
                currentFilters.fee === "all" ||
                (currentFilters.fee === "paid" && isPaidEvent(event)) ||
                (currentFilters.fee === "free" && !isPaidEvent(event));

            const participationMatches =
                currentFilters.participation === "all" ||
                (currentFilters.participation === "individual" && isIndividualEvent(event)) ||
                (currentFilters.participation === "team" && !isIndividualEvent(event));

            return searchMatches && dateMatches && feeMatches && participationMatches;
        });

        renderCards(filtered);
    }

    function showEventDetail(event) {
        const dateStr = event.event_date ? event.event_date.split("T")[0] : "";
        const timeStr = event.event_time ? String(event.event_time).substring(0, 5) : "";
        const posterHtml = event.poster
            ? `<div class="event-detail-poster"><img src="${UPLOADS}/${escapeHtml(event.poster)}" alt="Poster" /></div>`
            : "";

        const body = document.getElementById("eventModalBody");
        body.innerHTML = `
            ${posterHtml}
            <div class="event-detail-info">
                <h3>${escapeHtml(event.event_name)}</h3>
                <p><strong>Club:</strong> ${escapeHtml(event.club_name)}</p>
                <p><strong>Date & Time:</strong> ${escapeHtml(dateStr)} ${escapeHtml(timeStr)}</p>
                <p><strong>Venue:</strong> ${escapeHtml(event.venue)}</p>
                <p><strong>Category:</strong> ${escapeHtml(event.event_category || "-")}</p>
                ${event.description ? `<p><strong>Description:</strong> ${escapeHtml(event.description)}</p>` : ""}
                <p><strong>Team size:</strong> ${escapeHtml(event.team_size)} | <strong>Max teams:</strong> ${escapeHtml(event.max_teams)}</p>
                <p><strong>Registration fee:</strong> ${escapeHtml(formatMoney(event.registration_fee))} | <strong>Winning amount:</strong> ${escapeHtml(String(event.winning_amount || 0))}</p>
                ${event.student_coordinator_name ? `<p><strong>Student coordinator:</strong> ${escapeHtml(event.student_coordinator_name)} ${event.student_coordinator_contact ? " | " + escapeHtml(event.student_coordinator_contact) : ""}</p>` : ""}
                ${event.faculty_coordinator_name ? `<p><strong>Faculty coordinator:</strong> ${escapeHtml(event.faculty_coordinator_name)}</p>` : ""}
                <button type="button" class="btn-register-in-modal">${isPaidEvent(event) ? "Register & choose payment" : "Register for this event"}</button>
            </div>
        `;

        body.querySelector(".btn-register-in-modal").onclick = () => {
            document.getElementById("eventModal").classList.remove("show");
            register(event.event_id);
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
                allEvents = data.filter((event) => Number(event.is_completed) !== 1);
                applyEventFilters();
            });
    }

    document.getElementById("search").addEventListener("input", function () {
        currentFilters.searchText = this.value.toLowerCase().trim();
        applyEventFilters();
    });

    window.showToday = function () {
        const today = new Date().toISOString().split("T")[0];
        currentFilters.date = today;
        document.getElementById("filterDate").value = today;
        applyEventFilters();
    };

    document.getElementById("filterTodayBtn").addEventListener("click", window.showToday);

    document.getElementById("filterDate").addEventListener("change", function () {
        currentFilters.date = this.value || "";
        applyEventFilters();
    });

    document.getElementById("filterFee").addEventListener("change", function () {
        currentFilters.fee = this.value;
        applyEventFilters();
    });

    document.getElementById("filterParticipation").addEventListener("change", function () {
        currentFilters.participation = this.value;
        applyEventFilters();
    });

    document.getElementById("clearFiltersBtn").addEventListener("click", function () {
        currentFilters.searchText = "";
        currentFilters.date = "";
        currentFilters.fee = "all";
        currentFilters.participation = "all";

        document.getElementById("search").value = "";
        document.getElementById("filterDate").value = "";
        document.getElementById("filterFee").value = "all";
        document.getElementById("filterParticipation").value = "all";

        applyEventFilters();
    });

    window.register = function (event_id) {
        registerModalEvent = allEvents.find((event) => Number(event.event_id) === Number(event_id));
        if (!registerModalEvent) {
            alert("Event details could not be loaded.");
            return;
        }

        document.getElementById("registerTeamNameCreate").value = "";
        document.getElementById("registerTeamNameJoin").value = "";
        document.querySelector(".register-tab.active").classList.remove("active");
        document.getElementById("registerCreate").style.display = "block";
        document.getElementById("registerJoin").style.display = "none";
        document.querySelector('.register-tab[data-tab="create"]').classList.add("active");
        document.querySelector('input[name="paymentChoice"][value="later"]').checked = true;
        document.getElementById("registerFeeSummary").textContent = `Event fee: ${formatMoney(registerModalEvent.registration_fee)}.`;
        toggleRegisterPaymentFields();
        document.getElementById("registerModal").classList.add("show");
    };

    document.querySelectorAll('input[name="paymentChoice"]').forEach((radio) => {
        radio.addEventListener("change", toggleRegisterPaymentFields);
    });

    document.querySelectorAll(".register-tab").forEach((tab) => {
        tab.addEventListener("click", function () {
            document.querySelectorAll(".register-tab").forEach((item) => item.classList.remove("active"));
            this.classList.add("active");
            const isCreate = this.getAttribute("data-tab") === "create";
            document.getElementById("registerCreate").style.display = isCreate ? "block" : "none";
            document.getElementById("registerJoin").style.display = isCreate ? "none" : "block";
            toggleRegisterPaymentFields();
        });
    });

    document.getElementById("registerSubmitBtn").addEventListener("click", function () {
        if (!registerModalEvent) return;

        const isCreate = document.querySelector('.register-tab[data-tab="create"]').classList.contains("active");
        const teamName = (isCreate ? document.getElementById("registerTeamNameCreate") : document.getElementById("registerTeamNameJoin")).value.trim();
        if (!teamName) {
            alert("Please enter a team name.");
            return;
        }

        const paidEvent = isPaidEvent(registerModalEvent);
        const payNow = paidEvent && isCreate && document.querySelector('input[name="paymentChoice"]:checked').value === "now";

        fetch(`${API}/register-event`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                event_id: registerModalEvent.event_id,
                student_id,
                team_name: teamName,
                is_leader: isCreate ? 1 : 0,
                pay_now: payNow
            }),
        })
            .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
            .then(({ ok, data }) => {
                alert(data.message);
                if (!ok) return;
                document.getElementById("registerModal").classList.remove("show");

                const shouldOpenRazorpay = payNow && data.requires_payment && data.reg_id;
                const paymentRegistration = shouldOpenRazorpay
                    ? {
                        reg_id: data.reg_id,
                        event_name: registerModalEvent.event_name,
                        registration_fee: registerModalEvent.registration_fee
                    }
                    : null;

                registerModalEvent = null;
                loadMyRegistrations();

                if (paymentRegistration) {
                    startRazorpayPayment(paymentRegistration);
                }
            })
            .catch(() => alert("Registration failed"));
    });

    document.getElementById("registerModalClose").onclick = () => {
        document.getElementById("registerModal").classList.remove("show");
        registerModalEvent = null;
    };
    document.getElementById("registerModal").onclick = function (e) {
        if (e.target === this) {
            this.classList.remove("show");
            registerModalEvent = null;
        }
    };

    function showTeamMembers(event_id, team_name) {
        const modal = document.getElementById("teamMembersModal");
        document.getElementById("teamMembersModalTitle").textContent = "Team: " + (team_name || "(Individual)");
        document.getElementById("teamMembersModalBody").innerHTML = "<p>Loading...</p>";
        modal.classList.add("show");

        fetch(`${API}/event-registrations/${event_id}/teamwise`)
            .then((res) => res.json())
            .then((data) => {
                const teams = data.teams || [];
                const team = teams.find((item) => (item.team_name || "") === (team_name || ""));
                const body = document.getElementById("teamMembersModalBody");
                if (!team || !team.members || !team.members.length) {
                    body.innerHTML = "<p>No members found.</p>";
                    return;
                }
                let html = "<table class=\"team-members-detail-table\"><thead><tr><th>Reg No</th><th>Name</th><th>Email</th><th>Role</th></tr></thead><tbody>";
                team.members.forEach((member) => {
                    html += `<tr><td>${escapeHtml(member.reg_no)}</td><td>${escapeHtml(member.name)}</td><td>${escapeHtml(member.email || "")}</td><td>${member.is_leader ? "<span class=\"badge-leader\">Leader</span>" : ""}</td></tr>`;
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

    function openPaymentModal(registration) {
        pendingPaymentRegistration = registration;
        document.getElementById("paymentModalSummary").textContent = `${registration.event_name} - ${formatMoney(registration.registration_fee)}`;
        document.getElementById("paymentModal").classList.add("show");
    }

    function loadMyRegistrations() {
        fetch(`${API}/my-registrations/${student_id}`)
            .then((res) => res.json())
            .then((data) => {
                const activeBody = document.querySelector("#myEvents tbody");
                const pastBody = document.querySelector("#pastMyEvents tbody");
                activeBody.innerHTML = "";
                pastBody.innerHTML = "";

                const activeRegistrations = data.filter((item) => Number(item.is_completed) !== 1);
                const pastRegistrations = data.filter((item) => Number(item.is_completed) === 1);

                activeRegistrations.forEach((registration, index) => {
                    const dateStr = registration.event_date ? registration.event_date.split("T")[0] : "";
                    const timeStr = registration.event_time ? String(registration.event_time).substring(0, 5) : "";
                    const teamCell = registration.team_name
                        ? `<button type="button" class="btn-team-name" data-event-id="${escapeHtml(String(registration.event_id))}" data-team-name="${escapeHtml(registration.team_name)}">${escapeHtml(registration.team_name)}${registration.is_leader ? " (Leader)" : ""}</button>`
                        : "-";
                    const paymentAction = registration.payment_status === "pending" && registration.is_leader
                        ? `<button type="button" class="btn-pay-now" data-reg-id="${escapeHtml(String(registration.reg_id))}">Pay now</button>`
                        : "-";

                    activeBody.innerHTML += `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${escapeHtml(registration.event_name)}</td>
                            <td>${escapeHtml(registration.club_name)}</td>
                            <td>${escapeHtml(dateStr)}</td>
                            <td>${escapeHtml(timeStr)}</td>
                            <td>${escapeHtml(registration.venue)}</td>
                            <td>${teamCell}</td>
                            <td>${escapeHtml(formatMoney(registration.registration_fee))}</td>
                            <td>${paymentStatusBadge(registration.payment_status)}</td>
                            <td>${paymentAction}</td>
                        </tr>`;
                });

                pastRegistrations.forEach((registration, index) => {
                    const dateStr = registration.event_date ? registration.event_date.split("T")[0] : "";
                    const timeStr = registration.event_time ? String(registration.event_time).substring(0, 5) : "";
                    const teamCell = registration.team_name
                        ? `<button type="button" class="btn-team-name" data-event-id="${escapeHtml(String(registration.event_id))}" data-team-name="${escapeHtml(registration.team_name)}">${escapeHtml(registration.team_name)}${registration.is_leader ? " (Leader)" : ""}</button>`
                        : "-";

                    pastBody.innerHTML += `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${escapeHtml(registration.event_name)}</td>
                            <td>${escapeHtml(registration.club_name)}</td>
                            <td>${escapeHtml(dateStr)}</td>
                            <td>${escapeHtml(timeStr)}</td>
                            <td>${escapeHtml(registration.venue)}</td>
                            <td>${teamCell}</td>
                            <td>${escapeHtml(formatMoney(registration.registration_fee))}</td>
                            <td>${paymentStatusBadge(registration.payment_status)}</td>
                            <td>${escapeHtml(registration.completion_note || "-")}</td>
                        </tr>`;
                });

                document.querySelectorAll("#myEvents .btn-team-name, #pastMyEvents .btn-team-name").forEach((btn) => {
                    btn.addEventListener("click", function () {
                        showTeamMembers(this.getAttribute("data-event-id"), this.getAttribute("data-team-name"));
                    });
                });

                document.querySelectorAll("#myEvents .btn-pay-now").forEach((btn) => {
                    btn.addEventListener("click", function () {
                        const regId = this.getAttribute("data-reg-id");
                        const registration = activeRegistrations.find((item) => String(item.reg_id) === String(regId));
                        if (registration) openPaymentModal(registration);
                    });
                });
            });
    }

    document.getElementById("paymentSubmitBtn").addEventListener("click", function () {
        if (!pendingPaymentRegistration) return;
        document.getElementById("paymentModal").classList.remove("show");
        startRazorpayPayment(pendingPaymentRegistration);
        pendingPaymentRegistration = null;
    });

    document.getElementById("paymentModalClose").onclick = () => {
        document.getElementById("paymentModal").classList.remove("show");
        pendingPaymentRegistration = null;
    };
    document.getElementById("paymentModal").onclick = function (e) {
        if (e.target === this) {
            this.classList.remove("show");
            pendingPaymentRegistration = null;
        }
    };

    loadEvents();
    loadMyRegistrations();
};
