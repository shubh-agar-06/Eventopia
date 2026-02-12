document.getElementById("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();

    const role = document.getElementById("role").value;
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const msg = document.getElementById("message");

    fetch("http://localhost:3000/api/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            role: role,
            username: username,
            password: password
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            msg.style.color = "green";
            msg.innerText = "Login Successful";

            // store login context
            localStorage.setItem("role", data.role);

            if (data.role === "college") {
            localStorage.setItem("role", "college");
            localStorage.setItem("college_id", data.college_id);
            window.location.href = "clg_dashboard.html";
            }
            else if (data.role === "club") {
            localStorage.setItem("role", "club");
            localStorage.setItem("club_id", data.club_id);
            window.location.href = "club_dashboard.html";
            }
            else if (data.role === "student") {
            localStorage.setItem("role", "student");
            localStorage.setItem("student_id", data.student_id);
            localStorage.setItem("college_id", data.college_id);
            window.location.href = "student_dashboard.html";
}


        } else {
            msg.style.color = "red";
            msg.innerText = data.message || "Invalid credentials";
        }
    })
    .catch(err => {
        console.error(err);
        msg.style.color = "red";
        msg.innerText = "Server error";
    });
});
