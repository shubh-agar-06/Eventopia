const club_id = localStorage.getItem("club_id");
const role = localStorage.getItem("role");

if (!club_id || role !== "club") {
    alert("Unauthorized access");
    window.location.href = "login.html";
}

/* ADD EVENT */
document.getElementById("eventForm").addEventListener("submit", e => {
    e.preventDefault();

    fetch("http://localhost:3000/api/add-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            club_id,
            event_name: eventName.value,
            description: description.value,
            poster: poster.value,
            event_date: eventDate.value,
            event_time: eventTime.value,
            venue: venue.value,
            team_size: teamSize.value,
            max_teams: maxTeams.value,
            event_category: eventCategory.value,
            registration_fee: registrationFee.value,
            winning_amount: winningAmount.value,
            student_coordinator: studentCoordinator.value,
            faculty_coordinator: facultyCoordinator.value
        })
    })
    .then(res => res.json())
    .then(data => {
        msg.innerText = data.message;
        eventForm.reset();
        loadEvents();
    });
});

/* LOAD EVENTS */
function loadEvents() {
    fetch(`http://localhost:3000/api/events/${club_id}`)
        .then(res => res.json())
        .then(data => {
            const tbody = document.querySelector("#eventTable tbody");
            tbody.innerHTML = "";

            data.forEach((e, index) => {
                tbody.innerHTML += `
                    <tr>
                      <td>${index+1}</td>
                      <td>${e.event_name}</td>
                      <td>${e.event_date.split('T')[0]}</td>
                      <td>${e.event_time.substring(0,5)}</td>
                      <td>${e.venue}</td>
                      <td>${e.event_category}</td>
                      <td>${e.registration_fee}</td>
                      <td>${e.winning_amount}</td>
                      <td>
                        <button onclick="viewRegistrations(${e.event_id})">
                            View Students
                         </button>
                    </td>

                      <td>
                        <button onclick="editEvent(${e.event_id}, '${e.event_name}', '${e.event_date.split('T')[0]}', '${e.venue}', '${e.event_category}', ${e.registration_fee}, ${e.winning_amount})">
                          Edit
                        </button>
                      </td>

                      <td>
                        <button onclick="deleteEvent(${e.event_id})">
                          Delete
                        </button>
                      </td>
                    </tr>
                `;
            });
        });
}
/*REGISTERED STUDENT*/
function viewRegistrations(event_id) {
    fetch(`http://localhost:3000/api/event-registrations/${event_id}`)
        .then(res => res.json())
        .then(data => {

            let text = "Registered Students:\n\n";

            data.forEach(s => {
                text += s.reg_no + " - " + s.name + "\n";
            });

            alert(text || "No registrations yet");
        });
}


/*DELETE EVENTS*/
function deleteEvent(id) {
    if (!confirm("Delete this event?")) return;

    fetch(`http://localhost:3000/api/delete-event/${id}`, {
        method: "DELETE"
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message);
        loadEvents();
    });
}
/*EDIT EVENTS*/
function editEvent(id, name, date, venue, category, fee, prize) {

    const newName = prompt("Event Name:", name);
    const newDate = prompt("Event Date (YYYY-MM-DD):", date);
    const newVenue = prompt("Venue:", venue);
    const newCategory = prompt("Category:", category);
    const newFee = prompt("Registration Fee:", fee);
    const newPrize = prompt("Winning Amount:", prize);

    fetch(`http://localhost:3000/api/update-event/${id}`, {
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            event_name: newName,
            event_date: newDate,
            venue: newVenue,
            event_category: newCategory,
            registration_fee: newFee,
            winning_amount: newPrize
        })
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message);
        loadEvents();
    });
}


loadEvents();
