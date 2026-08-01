const AUTH_KEYS = ["isAuthenticated", "role", "username", "college_id", "club_id", "student_id", "reg_no"];
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("message");
const roleSelect = document.getElementById("role");
const collegeSelect = document.getElementById("collegeSelect");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const usernameLabel = document.getElementById("usernameLabel");
const guideBtn = document.getElementById("openGuide");
const guideModal = document.getElementById("guideModal");
const closeGuideBtn = document.getElementById("closeGuide");
const guideCloseButton = document.getElementById("guideCloseButton");
const registerCollegeBtn = document.getElementById("openCollegeRegister");
const registerCollegeModal = document.getElementById("collegeRegisterModal");
const closeCollegeRegisterBtn = document.getElementById("closeCollegeRegister");
const collegeRegisterForm = document.getElementById("collegeRegisterForm");
const collegeRegisterMessage = document.getElementById("collegeRegisterMessage");
let collegesLoaded = false;
let lastFocusedElement = null;

const roleConfig = {
    default: {
        label: "Email",
        placeholder: "Enter email",
        username: ""
    },
    college: {
        label: "College Email",
        placeholder: "Enter college email",
        username: "democlg@gmail.com"
    },
    club: {
        label: "Club Email or Club Name",
        placeholder: "Enter club email or club name",
        username: "democlub@gmail.com"
    },
    student: {
        label: "Registration Number or Student Email",
        placeholder: "Enter registration number or student email",
        username: "24BCE1000"
    }
};

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

function selectFirstCollegeForDemo() {
    if (!collegeSelect.value && collegeSelect.options.length > 1) {
        collegeSelect.selectedIndex = 1;
    }
}

function loadColleges() {
    if (collegesLoaded) return Promise.resolve();

    return fetch("/api/colleges")
        .then((res) => res.json())
        .then((data) => {
            renderCollegeOptions(Array.isArray(data) ? data : []);
            collegesLoaded = true;
            selectFirstCollegeForDemo();
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
    const config = roleConfig[role] || roleConfig.default;

    usernameLabel.textContent = config.label;
    usernameInput.placeholder = config.placeholder;

    if (roleConfig[role]) {
        usernameInput.value = config.username;
        passwordInput.value = "demo";
    } else {
        usernameInput.value = "";
        passwordInput.value = "";
    }

    collegeSelect.style.display = requiresCollege ? "block" : "none";
    collegeSelect.required = requiresCollege;
    if (!requiresCollege) {
        collegeSelect.value = "";
    } else {
        loadColleges().then(selectFirstCollegeForDemo);
    }
}

function getFocusableElements(modal) {
    return Array.from(modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )).filter((element) => !element.disabled && element.offsetParent !== null);
}

function openModal(modal, focusTarget) {
    lastFocusedElement = document.activeElement;
    modal.classList.add("show");
    document.body.classList.add("modal-open");
    (focusTarget || getFocusableElements(modal)[0] || modal).focus();
}

function closeModal(modal) {
    modal.classList.remove("show");
    if (!document.querySelector(".modal.show")) {
        document.body.classList.remove("modal-open");
    }
    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
        lastFocusedElement.focus();
    }
}

function openGuideModal() {
    openModal(guideModal, closeGuideBtn);
}

function closeGuideModal() {
    closeModal(guideModal);
}

function openCollegeModal() {
    collegeRegisterForm.reset();
    setMessage(collegeRegisterMessage, "", "");
    openModal(registerCollegeModal, closeCollegeRegisterBtn);
}

function closeCollegeModal() {
    closeModal(registerCollegeModal);
}

function trapModalFocus(e) {
    const openModalEl = document.querySelector(".modal.show");
    if (!openModalEl) return;

    if (e.key === "Escape") {
        if (openModalEl === guideModal) closeGuideModal();
        if (openModalEl === registerCollegeModal) closeCollegeModal();
        return;
    }

    if (e.key !== "Tab") return;

    const focusable = getFocusableElements(openModalEl);
    if (!focusable.length) {
        e.preventDefault();
        return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
    }
}

guideBtn.addEventListener("click", openGuideModal);
closeGuideBtn.addEventListener("click", closeGuideModal);
guideCloseButton.addEventListener("click", closeGuideModal);
guideModal.addEventListener("click", function (e) {
    if (e.target === guideModal) {
        closeGuideModal();
    }
});

registerCollegeBtn.addEventListener("click", openCollegeModal);
closeCollegeRegisterBtn.addEventListener("click", closeCollegeModal);
registerCollegeModal.addEventListener("click", function (e) {
    if (e.target === registerCollegeModal) {
        closeCollegeModal();
    }
});
document.addEventListener("keydown", trapModalFocus);

roleSelect.addEventListener("change", updateLoginFields);
updateLoginFields();
window.addEventListener("load", updateLoginFields);
window.addEventListener("pageshow", updateLoginFields);
setTimeout(updateLoginFields, 0);

loginForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const role = roleSelect.value;
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
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
            usernameInput.value = payload.clg_email;
            passwordInput.value = payload.password;
            setMessage(loginMessage, "College registered. You can log in now.", "green");
            setTimeout(closeCollegeModal, 900);
        })
        .catch((err) => {
            console.error(err);
            setMessage(collegeRegisterMessage, "Server error", "red");
        });
});
