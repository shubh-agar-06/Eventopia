const express = require("express");
const router = express.Router();
const db = require("../db");

/* LOGIN */
router.post("/login", (req, res) => {
    const { role, username, password } = req.body;

    let query = "";
    let params = [];

    if (role === "college") {
        query = "SELECT * FROM college WHERE email = ? AND password = ?";
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
    const { college_id, club_name, password } = req.body;

    const sql = "INSERT INTO club (college_id, club_name, password) VALUES (?, ?, ?)";

    db.query(sql, [college_id, club_name, password], (err) => {
        if (err) return res.json({ message: "Error adding club" });
        res.json({ message: "Club added successfully" });
    });
});

/* CLG ADD STUDENT */
router.post("/add-student", (req, res) => {
    const { college_id, reg_no, name, password } = req.body;

    const sql = "INSERT INTO student (college_id, reg_no, name, password) VALUES (?, ?, ?, ?)";

    db.query(sql, [college_id, reg_no, name, password], (err) => {
        if (err) return res.json({ message: "Error adding student" });
        res.json({ message: "Student added successfully" });
    });
});
/*CLG view club*/
router.get("/clubs/:college_id", (req, res) => {
    const college_id = req.params.college_id;

    db.query(
        "SELECT club_id, club_name FROM club WHERE college_id = ?",
        [college_id],
        (err, results) => {
            if (err) return res.json([]);
            res.json(results);
        }
    );
});
/*CLG view student*/
router.get("/students/:college_id", (req, res) => {
    const college_id = req.params.college_id;

    db.query(
        "SELECT student_id, reg_no, name FROM student WHERE college_id = ?",
        [college_id],
        (err, results) => {
            if (err) return res.json([]);
            res.json(results);
        }
    );
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
/*CLUB ADD EVENT*/
router.post("/add-event", (req, res) => {
    const {
        club_id,
        event_name,
        description,
        poster,
        event_date,
        event_time,
        venue,
        team_size,
        max_teams,
        event_category,
        registration_fee,
        winning_amount,
        student_coordinator,
        faculty_coordinator
    } = req.body;

    const sql = `
        INSERT INTO event 
        (club_id, event_name, description, poster, event_date, event_time, venue,
         team_size, max_teams, event_category, registration_fee, winning_amount,
         student_coordinator, faculty_coordinator)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(sql, [
        club_id, event_name, description, poster, event_date, event_time, venue,
        team_size, max_teams, event_category, registration_fee, winning_amount,
        student_coordinator, faculty_coordinator
    ], err => {
        if (err) {
            console.log(err);
            return res.json({ message: "Error adding event" });
        }
        res.json({ message: "Event created successfully" });
    });
});
/*CLUB VIEW EVENTS*/
router.get("/events/:club_id", (req, res) => {
    const club_id = req.params.club_id;

    db.query(
        "SELECT * FROM event WHERE club_id = ? ORDER BY event_date",
        [club_id],
        (err, results) => {
            if (err) return res.json([]);
            res.json(results);
        }
    );
});
/*CLUB DELETE EVENT*/
router.delete("/delete-event/:id", (req, res) => {
    const event_id = req.params.id;

    db.query("DELETE FROM event WHERE event_id = ?", [event_id], (err) => {
        if (err) return res.json({ message: "Error deleting event" });
        res.json({ message: "Event deleted successfully" });
    });
});

/*club update event*/
router.put("/update-event/:id", (req, res) => {
    const event_id = req.params.id;

    const {
        event_name,
        event_date,
        venue,
        event_category,
        registration_fee,
        winning_amount
    } = req.body;

    const sql = `
        UPDATE event
        SET event_name=?, event_date=?, venue=?,
            event_category=?, registration_fee=?, winning_amount=?
        WHERE event_id=?
    `;

    db.query(sql, [
        event_name,
        event_date,
        venue,
        event_category,
        registration_fee,
        winning_amount,
        event_id
    ], (err) => {
        if (err) return res.json({ message: "Update failed" });
        res.json({ message: "Event updated successfully" });
    });
});
/* CLUB SEE STUDENT REGISTERED*/
router.get("/event-registrations/:event_id", (req, res) => {
    const event_id = req.params.event_id;

    const sql = `
        SELECT s.name, s.reg_no
        FROM event_registration er
        JOIN student s ON er.student_id = s.student_id
        WHERE er.event_id = ?
    `;

    db.query(sql, [event_id], (err, results) => {
        if (err) return res.json([]);
        res.json(results);
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
        ORDER BY e.event_date
    `;

    db.query(sql, [college_id], (err, results) => {
        if (err) return res.json([]);
        res.json(results);
    });
});

/*STUDENT REGISTER EVENT*/
router.post("/register-event", (req, res) => {
    const { event_id, student_id } = req.body;

    const checkSql = `
        SELECT * FROM event_registration
        WHERE event_id=? AND student_id=?
    `;

    db.query(checkSql, [event_id, student_id], (err, result) => {
        if (result.length > 0) {
            return res.json({ message: "Already registered for this event" });
        }

        const insertSql = `
            INSERT INTO event_registration (event_id, student_id)
            VALUES (?, ?)
        `;

        db.query(insertSql, [event_id, student_id], (err) => {
            if (err) return res.json({ message: "Registration failed" });
            res.json({ message: "Registered successfully!" });
        });
    });
});
/* Student View Registered events*/
router.get("/my-registrations/:student_id", (req, res) => {
    const student_id = req.params.student_id;

    const sql = `
        SELECT e.event_name, e.event_date, e.event_time, e.venue, c.club_name
        FROM event_registration er
        JOIN event e ON er.event_id = e.event_id
        JOIN club c ON e.club_id = c.club_id
        WHERE er.student_id = ?
    `;

    db.query(sql, [student_id], (err, results) => {
        if (err) return res.json([]);
        res.json(results);
    });
});

module.exports = router;
