const AUTH_KEYS = ["isAuthenticated", "role", "username", "college_id", "club_id", "student_id", "reg_no"];
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("message");
const registerCollegeBtn = document.getElementById("openCollegeRegister");
const registerCollegeModal = document.getElementById("collegeRegisterModal");
const closeCollegeRegisterBtn = document.getElementById("closeCollegeRegister");
const collegeRegisterForm = document.getElementById("collegeRegisterForm");
const collegeRegisterMessage = document.getElementById("collegeRegisterMessage");

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

function setMessage(element, text, color) {
    element.innerText = text;
    element.style.color = color;
}

function openCollegeModal() {
    collegeRegisterForm.reset();
    setMessage(collegeRegisterMessage, "", "");
    registerCollegeModal.classList.add("show");
}

function closeCollegeModal() {
    registerCollegeModal.classList.remove("show");
}

registerCollegeBtn.addEventListener("click", openCollegeModal);
closeCollegeRegisterBtn.addEventListener("click", closeCollegeModal);
registerCollegeModal.addEventListener("click", function (e) {
    if (e.target === registerCollegeModal) {
        closeCollegeModal();
    }
});

loginForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const role = document.getElementById("role").value;
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

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
                setMessage(loginMessage, "Login Successful", "green");

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
                setMessage(loginMessage, data.message || "Invalid credentials", "red");
            }
        })
        .catch(err => {
            console.error(err);
            clearAuthStorage();
            setMessage(loginMessage, "Server error", "red");
        });
});

collegeRegisterForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const payload = {
        college_name: document.getElementById("collegeName").value.trim(),
        clg_email: document.getElementById("collegeEmail").value.trim(),
        password: document.getElementById("collegePassword").value,
        address: document.getElementById("collegeAddress").value.trim(),
        city: document.getElementById("collegeCity").value.trim(),
        state: document.getElementById("collegeState").value.trim()
    };

    fetch("http://localhost:3000/api/register-college", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    })
        .then(async (res) => {
            const data = await res.json();
            return { ok: res.ok, data };
        })
        .then(({ ok, data }) => {
            if (!ok) {
                setMessage(collegeRegisterMessage, data.message || "Could not register college", "red");
                return;
            }

            setMessage(collegeRegisterMessage, data.message || "College registered successfully", "green");
            document.getElementById("role").value = "college";
            document.getElementById("username").value = payload.clg_email;
            document.getElementById("password").value = payload.password;
            setMessage(loginMessage, "College registered. You can log in now.", "green");
            setTimeout(closeCollegeModal, 900);
        })
        .catch((err) => {
            console.error(err);
            setMessage(collegeRegisterMessage, "Server error", "red");
        });
});
