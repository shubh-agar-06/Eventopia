const AUTH_KEYS = ["isAuthenticated", "role", "username", "college_id", "club_id", "student_id", "reg_no"];
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("message");
const roleSelect = document.getElementById("role");
const collegeSelect = document.getElementById("collegeSelect");
const registerCollegeBtn = document.getElementById("openCollegeRegister");
const registerCollegeModal = document.getElementById("collegeRegisterModal");
const closeCollegeRegisterBtn = document.getElementById("closeCollegeRegister");
const collegeRegisterForm = document.getElementById("collegeRegisterForm");
const collegeRegisterMessage = document.getElementById("collegeRegisterMessage");
let collegesLoaded = false;

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
        if (data.college_id != null) {
            sessionStorage.setItem("college_id", data.college_id);
        }
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

function renderCollegeOptions(colleges) {
    collegeSelect.innerHTML = '<option value="">Select College</option>';
    colleges.forEach((college) => {
        const option = document.createElement("option");
        option.value = college.college_id;
        option.textContent = college.college_name;
        collegeSelect.appendChild(option);
    });
}

function loadColleges() {
    if (collegesLoaded) return Promise.resolve();

    return fetch("/api/colleges")
        .then((res) => res.json())
        .then((data) => {
            renderCollegeOptions(Array.isArray(data) ? data : []);
            collegesLoaded = true;
        })
        .catch((err) => {
            console.error(err);
            collegesLoaded = false;
            setMessage(loginMessage, "Could not load colleges", "red");
        });
}

function updateLoginFields() {
    const role = roleSelect.value;
    const requiresCollege = role === "club" || role === "student";

    collegeSelect.style.display = requiresCollege ? "block" : "none";
    collegeSelect.required = requiresCollege;
    if (!requiresCollege) {
        collegeSelect.value = "";
    } else {
        loadColleges();
    }
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

roleSelect.addEventListener("change", updateLoginFields);
updateLoginFields();
window.addEventListener("load", updateLoginFields);
window.addEventListener("pageshow", updateLoginFields);
setTimeout(updateLoginFields, 0);

loginForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const role = roleSelect.value;
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    const college_id = collegeSelect.value;

    if ((role === "club" || role === "student") && !college_id) {
        setMessage(loginMessage, "Please select a college", "red");
        return;
    }

    fetch("/api/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            role: role,
            username: username,
            password: password,
            college_id: college_id || null
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

    fetch("/api/register-college", {
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
            collegesLoaded = false;
            roleSelect.value = "college";
            updateLoginFields();
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
