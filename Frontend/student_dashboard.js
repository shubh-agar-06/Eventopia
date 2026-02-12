window.onload = function () {

    const student_id = localStorage.getItem("student_id");
    const college_id = localStorage.getItem("college_id");
    const role = localStorage.getItem("role");

    if (!student_id || role !== "student") {
        alert("Unauthorized");
        window.location.href = "login.html";
        return;
    }

    let allEvents = [];

    /* LOAD EVENTS */
    function loadEvents() {
        fetch(`http://localhost:3000/api/student-events/${college_id}`)
            .then(res => res.json())
            .then(data => {
                allEvents = data;
                renderTable(data);
            });
    }

    function renderTable(events) {
        const tbody = document.querySelector("#eventTable tbody");
        tbody.innerHTML = "";

        events.forEach((e, index) => {
            tbody.innerHTML += `
            <tr>
              <td>${index+1}</td>
              <td>${e.event_name}</td>
              <td>${e.club_name}</td>
              <td>${e.event_date.split('T')[0]}</td>
              <td>${e.venue}</td>
              <td>
                <button onclick="register(${e.event_id})">
                  Register
                </button>
              </td>
            </tr>`;
        });
    }

    /* SEARCH */
    document.getElementById("search").addEventListener("keyup", function () {
        const text = this.value.toLowerCase();

        const filtered = allEvents.filter(e =>
            e.event_name.toLowerCase().includes(text) ||
            e.club_name.toLowerCase().includes(text)
        );

        renderTable(filtered);
    });

    /* TODAY EVENTS */
    window.showToday = function () {
        const today = new Date().toISOString().split("T")[0];

        const todayEvents = allEvents.filter(e =>
            e.event_date.split('T')[0] === today
        );

        renderTable(todayEvents);
    }

    /* REGISTER */
    window.register = function (event_id) {
        fetch("http://localhost:3000/api/register-event", {
            method: "POST",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify({
                event_id,
                student_id
            })
        })
        .then(res => res.json())
        .then(data => alert(data.message));
    }

    loadEvents();
};
