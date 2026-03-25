const AUTH_KEYS = ["isAuthenticated", "role", "username", "college_id", "club_id", "student_id", "reg_no"];

function clearAuthStorage() {
    AUTH_KEYS.forEach((key) => {
        sessionStorage.removeItem(key);
        localStorage.removeItem(key);
    });
}

function saveSession(data, username) {
    clearAuthStorage();
    sessionStorage.setItem("isAuthenticated", "true");
    sessionStorage.setItem("role", data.role);
    sessionStorage.setItem("username", username);

    if (data.role === "college") {
        sessionStorage.setItem("college_id", data.college_id);
    } else if (data.role === "club") {
        sessionStorage.setItem("club_id", data.club_id);
    } else if (data.role === "student") {
        sessionStorage.setItem("student_id", data.student_id);
        sessionStorage.setItem("college_id", data.college_id);
        if (data.reg_no != null) {
            sessionStorage.setItem("reg_no", data.reg_no);
        }
    }
}

clearAuthStorage();

document.getElementById("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();

    const role = document.getElementById("role").value;
    const username = document.getElementById("username").value.trim();
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

                saveSession(data, username);

                if (data.role === "college") {
                    window.location.href = "clg_dashboard.html";
                } else if (data.role === "club") {
                    window.location.href = "club_dashboard.html";
                } else if (data.role === "student") {
                    window.location.href = "student_dashboard.html";
                }
            } else {
                clearAuthStorage();
                msg.style.color = "red";
                msg.innerText = data.message || "Invalid credentials";
            }
        })
        .catch(err => {
            console.error(err);
            clearAuthStorage();
            msg.style.color = "red";
            msg.innerText = "Server error";
        });
});
