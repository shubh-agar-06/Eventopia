const express = require("express");
const router = express.Router();
const db = require("../db");
const multer = require("multer");
const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");

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
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const ok = /\.(png|jpe?g)$/i.test(file.originalname) || (file.mimetype && (file.mimetype === "image/png" || file.mimetype.startsWith("image/jpeg")));
        if (ok) cb(null, true); else cb(new Error("Only PNG, JPEG and JPG images allowed"), false);
    }
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

/* LOGIN */
router.post("/login", (req, res) => {
    const { role, username, password } = req.body;

    let query = "";
    let params = [];

    if (role === "college") {
        query = "SELECT * FROM college WHERE clg_email = ? AND password = ?";
        params = [username, password];
    }
    else if (role === "club") {
        query = "SELECT * FROM club WHERE club_name = ? AND password = ?";
        params = [username, password];
    }
    else if (role === "student") {
        query = "SELECT * FROM student WHERE reg_no = ? AND password = ?";
        params = [username, password];
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
        if (err) return res.json({ message: "Error adding club" });
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
        if (err) return res.json({ message: "Error adding student" });
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

/* CLG delete club*/
router.delete("/delete-club/:id", (req, res) => {
    db.query(
        "DELETE FROM club WHERE club_id = ?",
        [req.params.id],
        err => {
            if (err) return res.json({ message: "Delete failed" });
            res.json({ message: "Club deleted" });
        }
    );
});

/*CLG delete student*/
router.delete("/delete-student/:id", (req, res) => {
    db.query(
        "DELETE FROM student WHERE student_id = ?",
        [req.params.id],
        err => {
            if (err) return res.json({ message: "Delete failed" });
            res.json({ message: "Student deleted" });
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
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, '')
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

    db.query(
        "SELECT * FROM event WHERE club_id = ? ORDER BY is_completed, event_date, event_time",
        [club_id],
        (err, results) => {
            if (err) return res.json([]);
            res.json(results);
        }
    );
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
    const completion_note = (req.body.completion_note || "").trim();

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
    const completion_note = (req.body.completion_note || "").trim();

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
router.put("/update-event/:id", (req, res) => {
    const event_id = req.params.id;
    const {
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

    const sql = `
        UPDATE event
        SET event_name=?, description=?, event_date=?, event_time=?, venue=?,
            max_teams=?, event_category=?, registration_fee=?, winning_amount=?,
            student_coordinator_name=?, student_coordinator_contact=?, faculty_coordinator_name=?
        WHERE event_id=?
    `;
    db.query(sql, [
        event_name || "",
        description || "",
        event_date,
        event_time || "",
        venue,
        max_teams != null && max_teams !== "" ? max_teams : 0,
        event_category || "Others",
        registration_fee != null && registration_fee !== "" ? registration_fee : 0,
        winning_amount != null && winning_amount !== "" ? winning_amount : 0,
        student_coordinator_name || "",
        student_coordinator_contact || "",
        faculty_coordinator_name || "",
        event_id
    ], (err) => {
        if (err) return res.json({ message: "Update failed" });
        res.json({ message: "Event updated successfully" });
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
        SELECT s.reg_no, s.name, s.email, er.team_name, er.is_leader
        FROM event_registration er
        JOIN student s ON er.student_id = s.student_id
        WHERE er.event_id = ?
        ORDER BY er.team_name, er.is_leader DESC
    `;
    db.query(sql, [event_id], (err, results) => {
        if (err) return res.json({ teams: [] });
        const byTeam = {};
        (results || []).forEach((r) => {
            const key = r.team_name || "(Individual)";
            if (!byTeam[key]) byTeam[key] = { team_name: key, members: [] };
            byTeam[key].members.push({
                reg_no: r.reg_no,
                name: r.name,
                email: r.email || "",
                is_leader: !!r.is_leader
            });
        });
        const teams = Object.values(byTeam);
        res.json({ teams });
    });
});

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

    db.query(sql, [college_id], (err, results) => {
        if (err) return res.json([]);
        res.json(results);
    });
});

/*STUDENT REGISTER EVENT – create team (is_leader=1 + team_name) or join team (is_leader=0 + team_name) */
router.post("/register-event", (req, res) => {
    const { event_id, student_id, team_name, is_leader } = req.body;
    const createTeam = !!is_leader;
    const name = (team_name || "").trim();

    if (!name) {
        return res.status(400).json({ message: "Team name is required (create or join a team)." });
    }

    const checkRegistered = `
        SELECT * FROM event_registration WHERE event_id=? AND student_id=?
    `;
    db.query(checkRegistered, [event_id, student_id], (err, already) => {
        if (err) return res.status(500).json({ message: "Registration failed" });
        if (already.length > 0) {
            return res.json({ message: "Already registered for this event" });
        }

        const getEvent = `SELECT max_teams, team_size, is_completed FROM event WHERE event_id = ?`;
        db.query(getEvent, [event_id], (err, eventRows) => {
            if (err || !eventRows.length) {
                return res.status(400).json({ message: "Event not found" });
            }
            if (Number(eventRows[0].is_completed) === 1) {
                return res.status(400).json({ message: "This event is already completed." });
            }
            const max_teams = parseInt(eventRows[0].max_teams, 10) || 999;
            const team_size_max = parseTeamSizeMax(eventRows[0].team_size);

            if (createTeam) {
                const countTeams = `SELECT COUNT(DISTINCT team_name) AS cnt FROM event_registration WHERE event_id = ? AND team_name IS NOT NULL AND team_name != ''`;
                db.query(countTeams, [event_id], (err, countRows) => {
                    if (err) return res.status(500).json({ message: "Registration failed" });
                    const currentTeams = countRows[0].cnt || 0;
                    if (currentTeams >= max_teams) {
                        return res.json({ message: "Maximum number of teams reached for this event." });
                    }
                    const insertSql = `
                        INSERT INTO event_registration (event_id, student_id, team_name, is_leader)
                        VALUES (?, ?, ?, 1)
                    `;
                    db.query(insertSql, [event_id, student_id, name], (err) => {
                        if (err) return res.json({ message: "Registration failed" });
                        res.json({ message: "Team created and registered successfully!" });
                    });
                });
            } else {
                const countInTeam = `SELECT COUNT(*) AS cnt FROM event_registration WHERE event_id = ? AND team_name = ?`;
                db.query(countInTeam, [event_id, name], (err, countRows) => {
                    if (err) return res.status(500).json({ message: "Registration failed" });
                    const inTeam = countRows[0].cnt || 0;
                    if (inTeam === 0) {
                        return res.json({ message: "No team with this name found for this event." });
                    }
                    if (inTeam >= team_size_max) {
                        return res.json({ message: "This team is full." });
                    }
                    const insertSql = `
                        INSERT INTO event_registration (event_id, student_id, team_name, is_leader)
                        VALUES (?, ?, ?, 0)
                    `;
                    db.query(insertSql, [event_id, student_id, name], (err) => {
                        if (err) return res.json({ message: "Registration failed" });
                        res.json({ message: "Joined team and registered successfully!" });
                    });
                });
            }
        });
    });
});
/* Student View Registered events (include team_name, is_leader) */
router.get("/my-registrations/:student_id", (req, res) => {
    const student_id = req.params.student_id;
    const sql = `
        SELECT er.event_id, e.event_name, e.event_date, e.event_time, e.venue, c.club_name,
               er.team_name, er.is_leader, e.is_completed, e.completion_note
        FROM event_registration er
        JOIN event e ON er.event_id = e.event_id
        JOIN club c ON e.club_id = c.club_id
        WHERE er.student_id = ?
        ORDER BY COALESCE(e.is_completed, 0), e.event_date, e.event_time
    `;
    db.query(sql, [student_id], (err, results) => {
        if (err) return res.json([]);
        res.json(results);
    });
});

module.exports = router;
