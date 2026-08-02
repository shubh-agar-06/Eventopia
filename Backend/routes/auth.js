const express = require("express");
const router = express.Router();
const db = require("../db");
const multer = require("multer");
const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const Razorpay = require("razorpay");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

const postersDir = path.join(__dirname, "../uploads/posters");
if (!fs.existsSync(postersDir)) fs.mkdirSync(postersDir, { recursive: true });
const posterUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, postersDir),
        filename: (req, file, cb) => {
            const name = (file.originalname || "poster").replace(/\s+/g, "_");
            const ext = /\.(png|jpe?g)$/i.test(name) ? name.match(/\.(png|jpe?g)$/i)[1].toLowerCase() : "jpg";
            const base = name.replace(/\.[^.]+$/, "") || "poster";
            cb(null, Date.now() + "_" + base + "." + (ext === "jpeg" ? "jpg" : ext));
        }
    }),
    limits: { fileSize: 1 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const ok = /\.(png|jpe?g)$/i.test(file.originalname) || (file.mimetype && (file.mimetype === "image/png" || file.mimetype.startsWith("image/jpeg")));
        if (ok) cb(null, true); else cb(new Error("Only PNG, JPEG and JPG images allowed"), false);
    }
});

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";
const razorpay = isRazorpayConfigured()
    ? new Razorpay({
        key_id: RAZORPAY_KEY_ID,
        key_secret: RAZORPAY_KEY_SECRET
    })
    : null;

function isRazorpayConfigured() {
    return !!RAZORPAY_KEY_ID && !!RAZORPAY_KEY_SECRET;
}



/* REGISTER COLLEGE */
router.post("/register-college", (req, res) => {
    const {
        college_name,
        clg_email,
        password,
        address,
        city,
        state
    } = req.body;

    const name = String(college_name || "").trim();
    const email = String(clg_email || "").trim().toLowerCase();
    const rawPassword = String(password || "");
    const addr = String(address || "").trim();
    const cityName = String(city || "").trim();
    const stateName = String(state || "").trim();

    if (!name || !email || !rawPassword) {
        return res.status(400).json({ message: "College name, email, and password are required" });
    }

    db.query("SELECT college_id FROM college WHERE clg_email = ?", [email], (checkErr, existing) => {
        if (checkErr) {
            return res.status(500).json({ message: "Database error" });
        }

        if (existing.length > 0) {
            return res.status(409).json({ message: "A college with this email already exists" });
        }

        const sql = `
            INSERT INTO college (college_name, clg_email, password, address, city, state)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        db.query(sql, [name, email, rawPassword, addr || null, cityName || null, stateName || null], (insertErr, result) => {
            if (insertErr) {
                return res.status(500).json({ message: "Could not register college" });
            }

            res.status(201).json({
                message: "College registered successfully",
                college_id: result.insertId
            });
        });
    });
});

/* LIST COLLEGES FOR LOGIN */
router.get("/colleges", (req, res) => {
    db.query(
        "SELECT college_id, college_name FROM college ORDER BY college_name",
        (err, results) => {
            if (err) {
                return res.status(500).json({ message: "Could not load colleges" });
            }
            res.json(results);
        }
    );
});

/* LOGIN */
router.post("/login", (req, res) => {
    const { role, username, password, college_id } = req.body;

    let query = "";
    let params = [];

    if (role === "college") {
        query = "SELECT * FROM college WHERE clg_email = ? AND password = ?";
        params = [username, password];
    }
    else if (role === "club") {
        if (!college_id) {
            return res.status(400).json({ message: "College is required for club login" });
        }
        query = "SELECT * FROM club WHERE college_id = ? AND (club_email = ? OR club_name = ?) AND password = ?";
        params = [college_id, username, username, password];
    }
    else if (role === "student") {
        if (!college_id) {
            return res.status(400).json({ message: "College is required for student login" });
        }
        query = "SELECT * FROM student WHERE college_id = ? AND (reg_no = ? OR email = ?) AND password = ?";
        params = [college_id, username, username, password];
    }
    else {
        return res.status(400).json({ message: "Invalid role" });
    }

    db.query(query, params, (err, results) => {
        if (err) {
            return res.status(500).json({ message: "Database error" });
        }

        if (results.length > 0) {

            let response = {
                success: true,
                role: role,
                college_id: results[0].college_id || null
            };

            if (role === "club") {
                response.club_id = results[0].club_id;
            }

            if (role === "student") {
                response.student_id = results[0].student_id;
                response.reg_no = results[0].reg_no || "";
            }

            res.json(response);

        } else {
            res.json({
                success: false,
                message: "Invalid credentials"
            });
        }
    });
});

/* CLG ADD CLUB */
router.post("/add-club", (req, res) => {
    const { college_id, club_name, password, club_email } = req.body;

    const sql = `
        INSERT INTO club (college_id, club_name, password, club_email)
        VALUES (?, ?, ?, ?)
    `;

    db.query(sql, [college_id, club_name, password, club_email], (err) => {
        if (err) {
            return res.status(400).json({ message: err.message || "Error adding club" });
        }
        res.json({ message: "Club added successfully" });
    });
});


/* CLG ADD STUDENT */
router.post("/add-student", (req, res) => {
    const { college_id, reg_no, name, email, year_of_grad, password } = req.body;

    const sql = `
        INSERT INTO student (college_id, reg_no, name, email, year_of_grad, password)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(sql, [college_id, reg_no, name, email, year_of_grad, password], (err) => {
        if (err) {
            return res.status(400).json({ message: err.message || "Error adding student" });
        }
        res.json({ message: "Student added successfully" });
    });
});

/*CLG view club - supports search (name), limit, offset */
router.get("/clubs/:college_id", (req, res) => {
    const college_id = req.params.college_id;
    const search = (req.query.search || "").trim();
    const limit = Math.min(parseInt(req.query.limit, 10) || 5, 500);
    const offset = parseInt(req.query.offset, 10) || 0;

    let sql = "SELECT club_id, club_name FROM club WHERE college_id = ?";
    const params = [college_id];
    if (search) {
        sql += " AND (club_name LIKE ? OR club_email LIKE ?)";
        params.push("%" + search + "%", "%" + search + "%");
    }
    sql += " ORDER BY club_name LIMIT ? OFFSET ?";
    params.push(limit, offset);

    db.query(sql, params, (err, results) => {
        if (err) return res.json([]);
        res.json(results);
    });
});

/*CLG total clubs count (for see more) */
router.get("/clubs/:college_id/count", (req, res) => {
    const college_id = req.params.college_id;
    const search = (req.query.search || "").trim();
    let sql = "SELECT COUNT(*) AS total FROM club WHERE college_id = ?";
    const params = [college_id];
    if (search) {
        sql += " AND (club_name LIKE ? OR club_email LIKE ?)";
        params.push("%" + search + "%", "%" + search + "%");
    }
    db.query(sql, params, (err, results) => {
        if (err) return res.json({ total: 0 });
        res.json({ total: results[0].total });
    });
});

/*CLG view student - supports search (name, reg_no), limit, offset */
router.get("/students/:college_id", (req, res) => {
    const college_id = req.params.college_id;
    const search = (req.query.search || "").trim();
    const limit = Math.min(parseInt(req.query.limit, 10) || 5, 500);
    const offset = parseInt(req.query.offset, 10) || 0;

    let sql = "SELECT student_id, reg_no, name FROM student WHERE college_id = ?";
    const params = [college_id];
    if (search) {
        sql += " AND (name LIKE ? OR reg_no LIKE ?)";
        params.push("%" + search + "%", "%" + search + "%");
    }
    sql += " ORDER BY name LIMIT ? OFFSET ?";
    params.push(limit, offset);

    db.query(sql, params, (err, results) => {
        if (err) return res.json([]);
        res.json(results);
    });
});

/*CLG total students count (for see more) */
router.get("/students/:college_id/count", (req, res) => {
    const college_id = req.params.college_id;
    const search = (req.query.search || "").trim();
    let sql = "SELECT COUNT(*) AS total FROM student WHERE college_id = ?";
    const params = [college_id];
    if (search) {
        sql += " AND (name LIKE ? OR reg_no LIKE ?)";
        params.push("%" + search + "%", "%" + search + "%");
    }
    db.query(sql, params, (err, results) => {
        if (err) return res.json({ total: 0 });
        res.json({ total: results[0].total });
    });
});

/*CLG import clubs from Excel - duplicate = same club_email for college → skip */
router.post("/import-clubs", upload.single("file"), (req, res) => {
    const college_id = req.body.college_id;
    if (!college_id || !req.file || !req.file.buffer) {
        return res.status(400).json({ message: "Missing file or college_id" });
    }
    let workbook;
    try {
        workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    } catch (e) {
        return res.status(400).json({ message: "Invalid Excel file" });
    }
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    if (!rows.length) {
        return res.json({ message: "No data in sheet", added: 0, skipped: 0 });
    }
    const header = rows[0].map(h => String(h || "").trim().toLowerCase());
    const nameIdx = header.findIndex(h => h === "club name" || h === "clubname");
    const emailIdx = header.findIndex(h => h === "club email" || h === "clubemail" || h === "email");
    const passIdx = header.findIndex(h => h === "password");
    if (nameIdx < 0 || emailIdx < 0 || passIdx < 0) {
        return res.status(400).json({
            message: "Expected columns: Club Name, Club Email, Password (first row as header)"
        });
    }
    let added = 0, skipped = 0;
    const process = (i) => {
        if (i >= rows.length) {
            return res.json({ message: "Import complete", added, skipped });
        }
        const row = rows[i];
        const club_name = String(row[nameIdx] || "").trim();
        const club_email = String(row[emailIdx] || "").trim();
        const password = String(row[passIdx] || "").trim();
        if (!club_name || !club_email || !password) {
            process(i + 1);
            return;
        }
        db.query(
            "SELECT club_id FROM club WHERE college_id = ? AND club_email = ?",
            [college_id, club_email],
            (err, existing) => {
                if (err) {
                    process(i + 1);
                    return;
                }
                if (existing.length > 0) {
                    skipped++;
                    process(i + 1);
                    return;
                }
                db.query(
                    "INSERT INTO club (college_id, club_name, password, club_email) VALUES (?, ?, ?, ?)",
                    [college_id, club_name, password, club_email],
                    (err) => {
                        if (!err) added++;
                        process(i + 1);
                    }
                );
            }
        );
    };
    process(1);
});

/*CLG import students from Excel - duplicate = same reg_no for college → skip */
router.post("/import-students", upload.single("file"), (req, res) => {
    const college_id = req.body.college_id;
    if (!college_id || !req.file || !req.file.buffer) {
        return res.status(400).json({ message: "Missing file or college_id" });
    }
    let workbook;
    try {
        workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    } catch (e) {
        return res.status(400).json({ message: "Invalid Excel file" });
    }
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    if (!rows.length) {
        return res.json({ message: "No data in sheet", added: 0, skipped: 0 });
    }
    const header = rows[0].map(h => String(h || "").trim().toLowerCase());
    const regIdx = header.findIndex(h => h === "registration number" || h === "reg_no" || h === "reg no");
    const nameIdx = header.findIndex(h => h === "student name" || h === "name");
    const emailIdx = header.findIndex(h => h === "email");
    const yearIdx = header.findIndex(h => h === "year of graduation" || h === "year_of_grad" || h === "year");
    const passIdx = header.findIndex(h => h === "password");
    if (regIdx < 0 || nameIdx < 0 || emailIdx < 0 || yearIdx < 0 || passIdx < 0) {
        return res.status(400).json({
            message: "Expected columns: Registration Number, Student Name, Email, Year of Graduation, Password (first row as header)"
        });
    }
    let added = 0, skipped = 0;
    const process = (i) => {
        if (i >= rows.length) {
            return res.json({ message: "Import complete", added, skipped });
        }
        const row = rows[i];
        const reg_no = String(row[regIdx] != null ? row[regIdx] : "").trim();
        const name = String(row[nameIdx] || "").trim();
        const email = String(row[emailIdx] || "").trim();
        const year_of_grad = String(row[yearIdx] != null ? row[yearIdx] : "").trim();
        const password = String(row[passIdx] || "").trim();
        if (!reg_no || !name || !email || !year_of_grad || !password) {
            process(i + 1);
            return;
        }
        db.query(
            "SELECT student_id FROM student WHERE college_id = ? AND reg_no = ?",
            [college_id, reg_no],
            (err, existing) => {
                if (err) {
                    process(i + 1);
                    return;
                }
                if (existing.length > 0) {
                    skipped++;
                    process(i + 1);
                    return;
                }
                db.query(
                    "INSERT INTO student (college_id, reg_no, name, email, year_of_grad, password) VALUES (?, ?, ?, ?, ?, ?)",
                    [college_id, reg_no, name, email, year_of_grad, password],
                    (err) => {
                        if (!err) added++;
                        process(i + 1);
                    }
                );
            }
        );
    };
    process(1);
});

/* CLG delete club */
router.delete("/delete-club/:id", (req, res) => {
    const clubId = req.params.id;

    db.query(
        "SELECT club_email, club_name FROM club WHERE club_id = ?",
        [clubId],
        (err, result) => {
            if (err) {
                return res.status(500).json({ message: "Database error" });
            }

            if (result.length === 0) {
                return res.status(404).json({ message: "Club not found" });
            }

            const club = result[0];
            const clubEmail = String(club.club_email || "").trim().toLowerCase();
            const clubName = String(club.club_name || "").trim().toLowerCase();

            if (
                clubEmail === "democlub@gmail.com" ||
                clubName === "democlub"
            ) {
                return res.status(403).json({
                    message: "Demo club cannot be deleted."
                });
            }

            db.query(
                "DELETE FROM club WHERE club_id = ?",
                [clubId],
                (err) => {
                    if (err) {
                        return res.status(500).json({ message: "Delete failed" });
                    }

                    res.json({ message: "Club deleted" });
                }
            );
        }
    );
});

/* CLG delete student */
router.delete("/delete-student/:id", (req, res) => {
    const studentId = req.params.id;

    db.query(
        "SELECT reg_no, email FROM student WHERE student_id = ?",
        [studentId],
        (err, result) => {
            if (err) {
                return res.status(500).json({ message: "Database error" });
            }

            if (result.length === 0) {
                return res.status(404).json({ message: "Student not found" });
            }

            const student = result[0];
            const studentRegNo = String(student.reg_no || "").trim().toLowerCase();
            const studentEmail = String(student.email || "").trim().toLowerCase();

            if (
                studentRegNo === "24bce1000" ||
                studentEmail === "demostud1@gmail.com" ||
                studentEmail === "demostud1"
            ) {
                return res.status(403).json({
                    message: "Demo student cannot be deleted."
                });
            }

            db.query(
                "DELETE FROM student WHERE student_id = ?",
                [studentId],
                (err) => {
                    if (err) {
                        return res.status(500).json({ message: "Delete failed" });
                    }

                    res.json({ message: "Student deleted" });
                }
            );
        }
    );
});

/*CLUB ADD EVENT – poster uploaded as PNG/JPEG/JPG, saved in uploads/posters, filename stored in DB */
router.post("/add-event", (req, res, next) => {
    posterUpload.single("poster")(req, res, (err) => {
        if (err) return res.status(400).json({ message: err.message || "Invalid poster file" });
        const {
            club_id,
            event_name,
            description,
            event_date,
            event_time,
            venue,
            team_size,
            max_teams,
            event_category,
            registration_fee,
            winning_amount,
            student_coordinator_name,
            student_coordinator_contact,
            faculty_coordinator_name
        } = req.body;
        const poster = (req.file && req.file.filename) ? req.file.filename : "";

        const sql = `
            INSERT INTO event 
            (club_id, event_name, description, poster, event_date, event_time, venue,
             team_size, max_teams, event_category, registration_fee, winning_amount,
             student_coordinator_name, student_coordinator_contact, faculty_coordinator_name,
             is_completed, completion_note)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL)
        `;
        const teamSizeStr = String(team_size || "").trim();
        db.query(sql, [
            club_id, event_name, description || "", poster, event_date, event_time, venue,
            teamSizeStr, max_teams, event_category, registration_fee || 0, winning_amount || 0,
            student_coordinator_name || "", student_coordinator_contact || "", faculty_coordinator_name || ""
        ], (err) => {
            if (err) {
                console.error("Add event DB error:", err.message);
                return res.status(500).json({ message: "Error adding event: " + err.message });
            }
            res.json({ message: "Event created successfully" });
        });
    });
});

/*CLUB VIEW EVENTS*/
router.get("/events/:club_id", (req, res) => {
    const club_id = req.params.club_id;

    autoCompleteElapsedEvents((autoErr) => {
        if (autoErr) {
            console.error("Auto-complete failed for /events/:club_id:", autoErr.message);
        }

        db.query(
            "SELECT * FROM event WHERE club_id = ? ORDER BY COALESCE(is_completed, 0), event_date, event_time",
            [club_id],
            (err, results) => {
                if (err) return res.json([]);
                res.json(results);
            }
        );
    });
});
/*CLUB DELETE EVENT – also remove poster file if present */
router.delete("/delete-event/:id", (req, res) => {
    const event_id = req.params.id;
    db.query("SELECT poster FROM event WHERE event_id = ?", [event_id], (err, rows) => {
        if (!err && rows.length > 0 && rows[0].poster) {
            const filePath = path.join(postersDir, rows[0].poster);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        db.query("DELETE FROM event WHERE event_id = ?", [event_id], (err) => {
            if (err) return res.json({ message: "Error deleting event" });
            res.json({ message: "Event deleted successfully" });
        });
    });
});

router.put("/complete-event/:id", (req, res) => {
    const event_id = req.params.id;
    const completion_note = String(req.body.completion_note || "").trim() || null;

    db.query(
        "UPDATE event SET is_completed = 1, completion_note = ? WHERE event_id = ?",
        [completion_note, event_id],
        (err) => {
            if (err) return res.status(500).json({ message: "Could not mark event as completed" });
            res.json({ message: "Event marked as completed" });
        }
    );
});

router.put("/event-note/:id", (req, res) => {
    const event_id = req.params.id;
    const completion_note = String(req.body.completion_note || "").trim() || null;

    db.query(
        "UPDATE event SET completion_note = ? WHERE event_id = ? AND is_completed = 1",
        [completion_note, event_id],
        (err, result) => {
            if (err) return res.status(500).json({ message: "Could not update note" });
            if (!result.affectedRows) return res.status(400).json({ message: "Only completed events can have notes updated" });
            res.json({ message: "Past event note updated" });
        }
    );
});

/*club update event – all fields except team_size (members per team) */
router.put("/update-event/:id", (req, res, next) => {
    posterUpload.single("poster")(req, res, (err) => {
        if (err) return res.status(400).json({ message: err.message || "Invalid poster file" });

        const event_id = req.params.id;
        const {
            club_id,
            event_name,
            description,
            event_date,
            event_time,
            venue,
            max_teams,
            event_category,
            registration_fee,
            winning_amount,
            student_coordinator_name,
            student_coordinator_contact,
            faculty_coordinator_name
        } = req.body;

        if (!club_id) {
            return res.status(400).json({ message: "Club id is required" });
        }
        if (!event_date || !event_time) {
            return res.status(400).json({ message: "Event date and time are required" });
        }

        const [year, month, day] = String(event_date).split("-").map(Number);
        const [hour, minute] = String(event_time).split(":").map(Number);
        const editedEventDateTime = new Date(year, (month || 1) - 1, day || 1, hour || 0, minute || 0, 0);
        if (!Number.isFinite(editedEventDateTime.getTime()) || editedEventDateTime <= new Date()) {
            return res.status(400).json({ message: "Event date and time must be after the current date and time." });
        }

        const nextRegistrationFee = registration_fee != null && registration_fee !== "" ? registration_fee : 0;
        const nextPoster = req.file && req.file.filename ? req.file.filename : null;

        db.query("SELECT registration_fee, poster FROM event WHERE event_id = ? AND club_id = ?", [event_id, club_id], (readErr, existingRows) => {
            if (readErr) return res.status(500).json({ message: "Update failed" });
            if (!existingRows.length) return res.status(403).json({ message: "You can only edit your own club events" });

            const previousRegistrationFee = existingRows[0].registration_fee;
            const previousPoster = existingRows[0].poster;

            const runUpdate = (posterValue, callback) => {
                const sql = posterValue == null
                    ? `
                        UPDATE event
                        SET event_name=?, description=?, event_date=?, event_time=?, venue=?,
                            max_teams=?, event_category=?, registration_fee=?, winning_amount=?,
                            student_coordinator_name=?, student_coordinator_contact=?, faculty_coordinator_name=?
                        WHERE event_id=? AND club_id=?
                    `
                    : `
                        UPDATE event
                        SET event_name=?, description=?, event_date=?, event_time=?, venue=?,
                            max_teams=?, event_category=?, registration_fee=?, winning_amount=?,
                            student_coordinator_name=?, student_coordinator_contact=?, faculty_coordinator_name=?, poster=?
                        WHERE event_id=? AND club_id=?
                    `;

                const values = posterValue == null
                    ? [
                        event_name || "",
                        description || "",
                        event_date,
                        event_time || "",
                        venue,
                        max_teams != null && max_teams !== "" ? max_teams : 0,
                        event_category || "Others",
                        nextRegistrationFee,
                        winning_amount != null && winning_amount !== "" ? winning_amount : 0,
                        student_coordinator_name || "",
                        student_coordinator_contact || "",
                        faculty_coordinator_name || "",
                        event_id,
                        club_id
                    ]
                    : [
                        event_name || "",
                        description || "",
                        event_date,
                        event_time || "",
                        venue,
                        max_teams != null && max_teams !== "" ? max_teams : 0,
                        event_category || "Others",
                        nextRegistrationFee,
                        winning_amount != null && winning_amount !== "" ? winning_amount : 0,
                        student_coordinator_name || "",
                        student_coordinator_contact || "",
                        faculty_coordinator_name || "",
                        posterValue,
                        event_id,
                        club_id
                    ];

                db.query(sql, values, callback);
            };

            const finalize = () => {
                syncRegistrationStatusesForFeeChange(event_id, previousRegistrationFee, nextRegistrationFee, (syncErr) => {
                    if (syncErr) {
                        return res.status(500).json({ message: "Event updated, but registration payment statuses could not be synchronized" });
                    }
                    res.json({ message: "Event updated successfully" });
                });
            };

            if (nextPoster) {
                const oldPosterPath = previousPoster ? path.join(postersDir, previousPoster) : null;
                if (oldPosterPath && fs.existsSync(oldPosterPath)) {
                    fs.unlinkSync(oldPosterPath);
                }
                runUpdate(nextPoster, (err) => {
                    if (err) return res.json({ message: "Update failed" });
                    finalize();
                });
            } else {
                runUpdate(null, (err) => {
                    if (err) return res.json({ message: "Update failed" });
                    finalize();
                });
            }
        });
    });
});
/* Parse team_size string to max members (e.g. "3" -> 3, "3-5" -> 5) */
function parseTeamSizeMax(teamSizeStr) {
    if (teamSizeStr == null || teamSizeStr === "") return 1;
    const s = String(teamSizeStr).trim();
    const rangeMatch = s.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) return Math.max(parseInt(rangeMatch[1], 10), parseInt(rangeMatch[2], 10));
    const n = parseInt(s, 10);
    return Number.isInteger(n) && n >= 1 ? n : 1;
}

function generateTransactionId(regId) {
    return `TXN-${regId}-${Date.now()}`;
}

function syncRegistrationStatusesForFeeChange(event_id, previousFee, nextFee, callback) {
    const oldFee = parseFloat(previousFee) || 0;
    const newFee = parseFloat(nextFee) || 0;

    if (oldFee <= 0 && newFee > 0) {
        db.query(
            "UPDATE event_registration SET payment_status = 'pending' WHERE event_id = ? AND payment_status = 'not_required'",
            [event_id],
            callback
        );
        return;
    }

    if (oldFee > 0 && newFee <= 0) {
        db.query(
            "UPDATE event_registration SET payment_status = 'not_required' WHERE event_id = ? AND payment_status <> 'paid'",
            [event_id],
            callback
        );
        return;
    }

    callback(null);
}

function upsertPaymentRecord({ reg_id, amount, payment_mode, transaction_id, payment_status, remarks }, callback) {
    db.query("SELECT payment_id FROM payment WHERE reg_id = ?", [reg_id], (checkErr, rows) => {
        if (checkErr) return callback(checkErr);

        if (rows.length > 0) {
            db.query(
                `UPDATE payment
                 SET amount = ?, payment_mode = ?, transaction_id = ?, payment_status = ?, payment_date = CURRENT_TIMESTAMP, remarks = ?
                 WHERE reg_id = ?`,
                [amount, payment_mode || null, transaction_id || null, payment_status, remarks || null, reg_id],
                callback
            );
            return;
        }

        db.query(
            `INSERT INTO payment (reg_id, amount, payment_mode, transaction_id, payment_status, remarks)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [reg_id, amount, payment_mode || null, transaction_id || null, payment_status, remarks || null],
            callback
        );
    });
}

function applyTeamPaymentStatus(event_id, team_name, payment_status, callback) {
    if (!team_name) {
        return callback(null);
    }
    db.query(
        "UPDATE event_registration SET payment_status = ? WHERE event_id = ? AND team_name = ?",
        [payment_status, event_id, team_name],
        callback
    );
}

/* CLUB SEE STUDENT REGISTERED – flat list (reg_no, name, email, team_name, is_leader) */
router.get("/event-registrations/:event_id", (req, res) => {
    const event_id = req.params.event_id;
    const sql = `
        SELECT s.reg_no, s.name, s.email, er.team_name, er.is_leader
        FROM event_registration er
        JOIN student s ON er.student_id = s.student_id
        WHERE er.event_id = ?
    `;
    db.query(sql, [event_id], (err, results) => {
        if (err) return res.json([]);
        res.json(results);
    });
});

/* CLUB SEE REGISTRATIONS TEAMWISE – groups by team_name */
router.get("/event-registrations/:event_id/teamwise", (req, res) => {
    const event_id = req.params.event_id;
    const sql = `
        SELECT s.reg_no, s.name, s.email, er.team_name, er.is_leader,
               CASE
                   WHEN COALESCE(e.registration_fee, 0) <= 0 THEN CASE WHEN er.payment_status = 'paid' THEN 'paid' ELSE 'not_required' END
                   WHEN er.payment_status = 'not_required' THEN 'pending'
                   ELSE er.payment_status
               END AS payment_status
        FROM event_registration er
        JOIN event e ON er.event_id = e.event_id
        JOIN student s ON er.student_id = s.student_id
        WHERE er.event_id = ?
        ORDER BY er.team_name, er.is_leader DESC
    `;
    db.query(sql, [event_id], (err, results) => {
        if (err) return res.json({ teams: [] });
        const byTeam = {};
        (results || []).forEach((r) => {
            const key = r.team_name || "(Individual)";
            if (!byTeam[key]) byTeam[key] = { team_name: key, team_payment_status: r.payment_status || "pending", members: [] };
            if (r.payment_status === "paid") {
                byTeam[key].team_payment_status = "paid";
            } else if (byTeam[key].team_payment_status !== "paid") {
                byTeam[key].team_payment_status = r.payment_status || "pending";
            }
            byTeam[key].members.push({
                reg_no: r.reg_no,
                name: r.name,
                email: r.email || "",
                is_leader: !!r.is_leader,
                payment_status: r.payment_status || "pending"
            });
        });
        const teams = Object.values(byTeam);
        res.json({ teams });
    });
});

function ensureEventCompletionColumns() {
    const additions = [
        {
            name: "is_completed",
            sql: "ALTER TABLE event ADD COLUMN is_completed TINYINT(1) DEFAULT 0"
        },
        {
            name: "completion_note",
            sql: "ALTER TABLE event ADD COLUMN completion_note TEXT NULL"
        }
    ];

    additions.forEach(({ name, sql }) => {
        db.query("SHOW COLUMNS FROM event LIKE ?", [name], (checkErr, rows) => {
            if (checkErr) {
                console.error(`Could not inspect event.${name}:`, checkErr.message);
                return;
            }
            if (rows && rows.length) return;
            db.query(sql, (alterErr) => {
                if (alterErr) {
                    console.error(`Could not add event.${name}:`, alterErr.message);
                }
            });
        });
    });
}

ensureEventCompletionColumns();

function autoCompleteElapsedEvents(callback) {
    const sql = `
        UPDATE event
        SET is_completed = 1
        WHERE COALESCE(is_completed, 0) = 0
          AND event_date IS NOT NULL
          AND event_date <= DATE_SUB(CURDATE(), INTERVAL 3 DAY)
    `;

    db.query(sql, callback);
}

/*STUDENT SEE EVENT*/
router.get("/student-events/:college_id", (req, res) => {
    const college_id = req.params.college_id;

    const sql = `
        SELECT e.*, c.club_name 
        FROM event e
        JOIN club c ON e.club_id = c.club_id
        WHERE c.college_id = ?
          AND COALESCE(e.is_completed, 0) = 0
        ORDER BY e.event_date
    `;

    autoCompleteElapsedEvents((autoErr) => {
        if (autoErr) {
            console.error("Auto-complete failed for /student-events/:college_id:", autoErr.message);
        }

        db.query(sql, [college_id], (err, results) => {
            if (err) return res.json([]);
            res.json(results);
        });
    });
});

/*STUDENT REGISTER EVENT – create team (is_leader=1 + team_name) or join team (is_leader=0 + team_name) */
router.post("/register-event", (req, res) => {
    const { event_id, student_id, team_name, is_leader, pay_now, payment_mode, transaction_id } = req.body;
    const createTeam = !!is_leader;
    const name = (team_name || "").trim();
    const wantsToPayNow = !!pay_now;
    const mode = String(payment_mode || "").trim();
    const transactionRef = String(transaction_id || "").trim();

    autoCompleteElapsedEvents((autoErr) => {
        if (autoErr) {
            console.error("Auto-complete failed for /register-event:", autoErr.message);
        }

        const checkRegistered = `
            SELECT * FROM event_registration WHERE event_id=? AND student_id=?
        `;
        db.query(checkRegistered, [event_id, student_id], (err, already) => {
            if (err) return res.status(500).json({ message: "Registration failed" });
            if (already.length > 0) {
                return res.json({ message: "Already registered for this event" });
            }

            const getEvent = `
                SELECT max_teams, team_size, is_completed, registration_fee, event_date
                FROM event
                WHERE event_id = ?
            `;
            db.query(getEvent, [event_id], (err, eventRows) => {
                if (err || !eventRows.length) {
                    return res.status(400).json({ message: "Event not found" });
                }
                const eventDate = eventRows[0].event_date ? new Date(eventRows[0].event_date) : null;
                const cutoff = new Date();
                cutoff.setHours(0, 0, 0, 0);
                cutoff.setDate(cutoff.getDate() - 3);
                const autoPast = eventDate && eventDate <= cutoff;
                if (Number(eventRows[0].is_completed) === 1 || autoPast) {
                    return res.status(400).json({ message: "This event is already completed." });
                }
                const max_teams = parseInt(eventRows[0].max_teams, 10) || 999;
                const team_size_max = parseTeamSizeMax(eventRows[0].team_size);
                const fee = parseFloat(eventRows[0].registration_fee) || 0;
                const isIndividualEvent = team_size_max <= 1;

                if (!isIndividualEvent && !name) {
                    return res.status(400).json({ message: "Team name is required to create or join a team." });
                }

                function createRegistration(registrationPaymentStatus) {
                    const isPaymentOwner = isIndividualEvent || createTeam;
                    const insertSql = `
                        INSERT INTO event_registration (event_id, student_id, team_name, is_leader, payment_status)
                        VALUES (?, ?, ?, ?, ?)
                    `;
                    db.query(insertSql, [event_id, student_id, isIndividualEvent ? null : name, isPaymentOwner ? 1 : 0, registrationPaymentStatus], (insertErr, result) => {
                        if (insertErr) return res.json({ message: "Registration failed" });

                        const reg_id = result.insertId;
                        if (fee <= 0) {
                            return res.json({
                                message: "Registered successfully. This is a free event.",
                                payment_status: registrationPaymentStatus,
                                requires_payment: false,
                                reg_id
                            });
                        }

                        if (!isPaymentOwner) {
                            return res.json({
                                message: registrationPaymentStatus === "paid"
                                    ? "Registered successfully. This team is already marked as paid."
                                    : "Registered successfully. Team payment is pending with the leader.",
                                payment_status: registrationPaymentStatus,
                                requires_payment: false,
                                reg_id
                            });
                        }

                        upsertPaymentRecord({
                            reg_id,
                            amount: fee,
                            payment_mode: "Razorpay",
                            transaction_id: null,
                            payment_status: "pending",
                            remarks: wantsToPayNow ? "Ready for Razorpay checkout" : "Student chose pay later"
                        }, (paymentErr) => {
                            if (paymentErr) {
                                return res.status(500).json({ message: "Registered, but payment record could not be created" });
                            }

                            return res.json({
                                message: wantsToPayNow
                                    ? "Registration created. Continue to Razorpay payment."
                                    : "Registered successfully. Payment is pending and can be completed later.",
                                payment_status: registrationPaymentStatus,
                                requires_payment: registrationPaymentStatus === "pending",
                                reg_id
                            });
                        });
                    });
                }

                if (isIndividualEvent) {
                    const registrationPaymentStatus = fee > 0 ? "pending" : "not_required";
                    createRegistration(registrationPaymentStatus);
                    return;
                }

                if (createTeam) {
                    const checkTeamName = `
                        SELECT COUNT(*) AS cnt
                        FROM event_registration
                        WHERE event_id = ? AND team_name = ?
                    `;
                    db.query(checkTeamName, [event_id, name], (err, nameRows) => {
                        if (err) return res.status(500).json({ message: "Registration failed" });
                        if ((nameRows[0].cnt || 0) > 0) {
                            return res.status(409).json({
                                message: "This team name already exists. Please choose another team name or join the existing team."
                            });
                        }

                        const countTeams = `SELECT COUNT(DISTINCT team_name) AS cnt FROM event_registration WHERE event_id = ? AND team_name IS NOT NULL AND team_name != ''`;
                        db.query(countTeams, [event_id], (err, countRows) => {
                            if (err) return res.status(500).json({ message: "Registration failed" });
                            const currentTeams = countRows[0].cnt || 0;
                            if (currentTeams >= max_teams) {
                                return res.json({ message: "Maximum number of teams reached for this event." });
                            }
                            const registrationPaymentStatus = fee > 0 ? "pending" : "not_required";
                            createRegistration(registrationPaymentStatus);
                        });
                    });
                } else {
                    const countInTeam = `
                        SELECT COUNT(*) AS cnt,
                               MAX(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) AS team_paid
                        FROM event_registration
                        WHERE event_id = ? AND team_name = ?
                    `;
                    db.query(countInTeam, [event_id, name], (err, countRows) => {
                        if (err) return res.status(500).json({ message: "Registration failed" });
                        const inTeam = countRows[0].cnt || 0;
                        if (inTeam === 0) {
                            return res.json({ message: "No team with this name found for this event." });
                        }
                        if (inTeam >= team_size_max) {
                            return res.json({ message: "This team is full." });
                        }
                        const teamPaid = Number(countRows[0].team_paid) === 1;
                        const registrationPaymentStatus = fee <= 0 ? "not_required" : (teamPaid ? "paid" : "pending");
                        createRegistration(registrationPaymentStatus);
                    });
                }
            });
        });
    });
});

router.put("/pay-registration/:reg_id", (req, res) => {
    const reg_id = req.params.reg_id;
    const payment_mode = String(req.body.payment_mode || "").trim() || "online";
    const transactionRef = String(req.body.transaction_id || "").trim();

    const sql = `
        SELECT er.reg_id, er.event_id, er.team_name, er.is_leader, er.payment_status, e.registration_fee
        FROM event_registration er
        JOIN event e ON er.event_id = e.event_id
        WHERE er.reg_id = ?
    `;

    db.query(sql, [reg_id], (err, rows) => {
        if (err || !rows.length) {
            return res.status(404).json({ message: "Registration not found" });
        }

        const row = rows[0];
        const fee = parseFloat(row.registration_fee) || 0;

        if (fee <= 0) {
            return res.status(400).json({ message: "This registration does not require payment" });
        }

        if (row.payment_status === "paid") {
            return res.json({ message: "Payment is already completed" });
        }

        if (!row.is_leader) {
            return res.status(400).json({ message: "Only the team leader can complete payment for this team" });
        }

        const finalTransactionId = transactionRef || generateTransactionId(reg_id);

        db.query(
            row.team_name
                ? "UPDATE event_registration SET payment_status = 'paid' WHERE event_id = ? AND team_name = ?"
                : "UPDATE event_registration SET payment_status = 'paid' WHERE reg_id = ?",
            row.team_name ? [row.event_id, row.team_name] : [reg_id],
            (updateErr) => {
                if (updateErr) return res.status(500).json({ message: "Could not update registration payment status" });

                upsertPaymentRecord({
                    reg_id,
                    amount: fee,
                    payment_mode,
                    transaction_id: finalTransactionId,
                    payment_status: "paid",
                    remarks: "Payment completed after registration"
                }, (paymentErr) => {
                    if (paymentErr) return res.status(500).json({ message: "Could not save payment details" });
                    res.json({ message: "Payment completed successfully", payment_status: "paid" });
                });
            }
        );
    });
});

router.post("/create-razorpay-order", async (req, res) => {
    const reg_id = req.body.reg_id;

    if (!isRazorpayConfigured()) {
        return res.status(500).json({ message: "Razorpay test keys are placeholders. Add real test keys to proceed." });
    }

    const sql = `
        SELECT er.reg_id, er.event_id, er.team_name, er.is_leader, er.payment_status,
               e.event_name, e.registration_fee
        FROM event_registration er
        JOIN event e ON er.event_id = e.event_id
        WHERE er.reg_id = ?
    `;

    db.query(sql, [reg_id], async (err, rows) => {
        if (err || !rows.length) {
            return res.status(404).json({ message: "Registration not found" });
        }

        const row = rows[0];
        const fee = parseFloat(row.registration_fee) || 0;

        if (fee <= 0) {
            return res.status(400).json({ message: "This registration does not require payment" });
        }

        if (!row.is_leader) {
            return res.status(400).json({ message: "Only the team leader can initiate payment for this team" });
        }

        if (row.payment_status === "paid") {
            return res.status(400).json({ message: "Payment is already completed" });
        }

        try {
            const order = await razorpay.orders.create({
                amount: Math.round(fee * 100),
                currency: "INR",
                receipt: `reg_${reg_id}_${Date.now()}`,
                notes: {
                    reg_id: String(reg_id),
                    event_id: String(row.event_id)
                }
            });

            upsertPaymentRecord({
                reg_id,
                amount: fee,
                payment_mode: "Razorpay",
                transaction_id: null,
                payment_status: "pending",
                remarks: `order_id:${order.id}`
            }, (paymentErr) => {
                if (paymentErr) {
                    return res.status(500).json({ message: "Could not save Razorpay order details" });
                }

                res.json({
                    key: RAZORPAY_KEY_ID,
                    amount: order.amount,
                    currency: order.currency,
                    order_id: order.id,
                    reg_id: row.reg_id,
                    event_name: row.event_name
                });
            });
        } catch (createErr) {
            console.error("Razorpay order error:", createErr.message);
            return res.status(500).json({ message: "Could not create Razorpay order" });
        }
    });
});

router.post("/verify-razorpay-payment", (req, res) => {
    const {
        reg_id,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
    } = req.body;

    if (!isRazorpayConfigured()) {
        return res.status(500).json({ message: "Razorpay test keys are placeholders. Add real test keys to proceed." });
    }

    const expectedSignature = crypto
        .createHmac("sha256", RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

    if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ message: "Payment verification failed" });
    }

    const sql = `
        SELECT er.reg_id, er.event_id, er.team_name, er.is_leader, e.registration_fee
        FROM event_registration er
        JOIN event e ON er.event_id = e.event_id
        WHERE er.reg_id = ?
    `;

    db.query(sql, [reg_id], (err, rows) => {
        if (err || !rows.length) {
            return res.status(404).json({ message: "Registration not found" });
        }

        const row = rows[0];
        const fee = parseFloat(row.registration_fee) || 0;

        if (!row.is_leader) {
            return res.status(400).json({ message: "Only the team leader can complete payment for this team" });
        }

        db.query(
            row.team_name
                ? "UPDATE event_registration SET payment_status = 'paid' WHERE event_id = ? AND team_name = ?"
                : "UPDATE event_registration SET payment_status = 'paid' WHERE reg_id = ?",
            row.team_name ? [row.event_id, row.team_name] : [reg_id],
            (updateErr) => {
                if (updateErr) return res.status(500).json({ message: "Could not update registration payment status" });

                upsertPaymentRecord({
                    reg_id,
                    amount: fee,
                    payment_mode: "Razorpay",
                    transaction_id: razorpay_payment_id,
                    payment_status: "paid",
                    remarks: `order_id:${razorpay_order_id};signature:${razorpay_signature.slice(0, 60)}`
                }, (paymentErr) => {
                    if (paymentErr) return res.status(500).json({ message: "Could not save payment details" });
                    res.json({ message: "Payment verified successfully", payment_status: "paid" });
                });
            }
        );
    });
});
/* Student View Registered events (include team_name, is_leader) */
router.get("/my-registrations/:student_id", (req, res) => {
    const student_id = req.params.student_id;
    const sql = `
        SELECT er.reg_id, er.event_id, e.event_name, e.event_date, e.event_time, e.venue, c.club_name,
               er.team_name, er.is_leader, e.is_completed, e.completion_note,
               CASE
                   WHEN COALESCE(e.registration_fee, 0) <= 0 THEN CASE WHEN er.payment_status = 'paid' THEN 'paid' ELSE 'not_required' END
                   WHEN er.payment_status = 'not_required' THEN 'pending'
                   ELSE er.payment_status
               END AS payment_status,
               e.registration_fee, p.payment_mode, p.transaction_id
        FROM event_registration er
        JOIN event e ON er.event_id = e.event_id
        JOIN club c ON e.club_id = c.club_id
        LEFT JOIN payment p ON er.reg_id = p.reg_id
        WHERE er.student_id = ?
        ORDER BY COALESCE(e.is_completed, 0), e.event_date, e.event_time
    `;
    autoCompleteElapsedEvents((autoErr) => {
        if (autoErr) {
            console.error("Auto-complete failed for /my-registrations/:student_id:", autoErr.message);
        }

        db.query(sql, [student_id], (err, results) => {
            if (err) return res.json([]);
            res.json(results);
        });
    });
});

module.exports = router;
