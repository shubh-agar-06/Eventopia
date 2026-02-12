const college_id = localStorage.getItem("college_id");
const role = localStorage.getItem("role");

if (!college_id || role !== "college") {
    alert("Unauthorized access");
    window.location.href = "login.html";
}

/* ---------- ADD CLUB ---------- */
document.getElementById("clubForm").addEventListener("submit", e => {
    e.preventDefault();

    fetch("http://localhost:3000/api/add-club", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            college_id,
            club_name: clubName.value,
            password: clubPassword.value
        })
    })
    .then(res => res.json())
    .then(data => {
        clubMsg.innerText = data.message;
        loadClubs();
        clubForm.reset();
    });
});

/* ---------- ADD STUDENT ---------- */
document.getElementById("studentForm").addEventListener("submit", e => {
    e.preventDefault();

    fetch("http://localhost:3000/api/add-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            college_id,
            reg_no: regNo.value,
            name: studentName.value,
            password: studentPassword.value
        })
    })
    .then(res => res.json())
    .then(data => {
        studentMsg.innerText = data.message;
        loadStudents();
        studentForm.reset();
    });
});

/* ---------- LOAD CLUBS ---------- */
function loadClubs() {
    fetch(`http://localhost:3000/api/clubs/${college_id}`)
        .then(res => res.json())
        .then(data => {
            const tbody = document.querySelector("#clubTable tbody");
            tbody.innerHTML = "";

            data.forEach((c, index) => {
                tbody.innerHTML += `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${c.club_name}</td>
                        <td>
                          <button onclick="deleteClub(${c.club_id})">
                            Delete
                          </button>
                        </td>
                    </tr>
                `;
            });
        });
}

/* ---------- LOAD STUDENTS ---------- */
function loadStudents() {
    fetch(`http://localhost:3000/api/students/${college_id}`)
        .then(res => res.json())
        .then(data => {
            const tbody = document.querySelector("#studentTable tbody");
            tbody.innerHTML = "";

            data.forEach((s, index) => {
                tbody.innerHTML += `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${s.reg_no}</td>
                        <td>${s.name}</td>
                        <td>
                          <button onclick="deleteStudent(${s.student_id})">
                            Delete
                          </button>
                        </td>
                    </tr>
                `;
            });
        });
}


/* ---------- DELETE CLUB ---------- */
function deleteClub(id) {
    fetch(`http://localhost:3000/api/delete-club/${id}`, {
        method: "DELETE"
    })
    .then(() => loadClubs());
}

/* ---------- DELETE STUDENT ---------- */
function deleteStudent(id) {
    fetch(`http://localhost:3000/api/delete-student/${id}`, {
        method: "DELETE"
    })
    .then(() => loadStudents());
}

/* ---------- INITIAL LOAD ---------- */
loadClubs();
loadStudents();
