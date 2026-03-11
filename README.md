# Eventopia – Campus Event Management System

A full-stack web application for managing campus events. **Colleges** manage clubs and students, **clubs** create and manage events, and **students** discover and register for events (solo or in teams).

## Features

### College
- **Login** with college email and password
- **Add / import clubs** – Add clubs manually or bulk-import from Excel (with expected-format popup)
- **Add / import students** – Add students manually or bulk-import from Excel
- **Search** clubs by name and students by name or registration number
- **Pagination** – Default view of 5 clubs / 5 students with “See more”
- **Delete** clubs and students; handle duplicate records

### Club
- **Login** with club name and password
- **Create events** – Name, description, date, venue, poster upload (image)
- **Manage events** – Edit and delete events
- **View registrations** – Per event, with optional team-wise view

### Student
- **Login** with registration number and password
- **Browse events** – View events from clubs at their college
- **Register for events** – Solo or as part of a team (create/join by team name)
- **My registrations** – View and manage registered events

## Tech Stack

| Layer   | Stack        |
|--------|---------------|
| Frontend | HTML, CSS, JavaScript (vanilla) |
| Backend  | Node.js, Express |
| Database | MySQL |
| Other    | Multer (file upload), SheetJS/xlsx (Excel import) |

## Project Structure

```
Event Management/
├── Frontend/
│   ├── login.html, login.js, login.css
│   ├── clg_dashboard.html, clg_dashboard.js, clg_dashboard.css   # College
│   ├── club_dashboard.html, club_dashboard.js, club_dashboard.css # Club
│   └── student_dashboard.html, student_dashboard.js, student_dashboard.css # Student
├── Backend/
│   ├── server.js
│   ├── db.js
│   ├── routes/
│   │   └── auth.js    # All API routes (auth, clubs, students, events, registrations)
│   ├── uploads/
│   │   └── posters/   # Event poster images
│   └── migrations/
│       └── add_team_to_event_registration.sql
└── README.md
```

## Prerequisites

- **Node.js** (v14 or later)
- **MySQL** (e.g. MySQL 8)
- A MySQL database named `campus_event_db2` (or update `Backend/db.js`)

## Setup

### 1. Database

1. Create a MySQL database, e.g.:
   ```sql
   CREATE DATABASE campus_event_db2;
   ```
2. Create the required tables (`college`, `club`, `student`, `event`, `event_registration`, etc.). If you have schema SQL files, run them.
3. Apply the team-registration migration if needed:
   ```bash
   mysql -u root -p campus_event_db2 < Backend/migrations/add_team_to_event_registration.sql
   ```

### 2. Backend

```bash
cd Backend
npm install
```

Edit `Backend/db.js` and set your MySQL credentials:

```js
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "YOUR_PASSWORD",
  database: "campus_event_db2",
  timezone: 'local',
  dateStrings: true
});
```

Start the server:

```bash
node server.js
```

Server runs at **http://localhost:3000**.

### 3. Frontend

Serve the `Frontend` folder over HTTP (required for login and API calls). For example:

- **VS Code**: Use the “Live Server” extension and open `Frontend/login.html`.
- **Python**:
  ```bash
  cd Frontend
  python -m http.server 8080
  ```
  Then open **http://localhost:8080/login.html**.

Ensure the frontend is configured to call the API at `http://localhost:3000` (see `login.js` and dashboard scripts for `fetch` base URL).

## API Overview

All API routes are under `/api` (e.g. `http://localhost:3000/api/...`).

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | `/api/login` | Login (college / club / student) |
| POST   | `/api/add-club` | College: add club |
| POST   | `/api/add-student` | College: add student |
| GET    | `/api/clubs/:college_id` | College: list clubs (search, limit, offset) |
| GET    | `/api/students/:college_id` | College: list students (search, limit, offset) |
| POST   | `/api/import-clubs` | College: import clubs from Excel |
| POST   | `/api/import-students` | College: import students from Excel |
| DELETE | `/api/delete-club/:id` | College: delete club |
| DELETE | `/api/delete-student/:id` | College: delete student |
| POST   | `/api/add-event` | Club: create event (with poster upload) |
| GET    | `/api/events/:club_id` | Club: list events |
| PUT    | `/api/update-event/:id` | Club: update event |
| DELETE | `/api/delete-event/:id` | Club: delete event |
| GET    | `/api/event-registrations/:event_id` | Club: list registrations |
| GET    | `/api/event-registrations/:event_id/teamwise` | Club: registrations by team |
| GET    | `/api/student-events/:college_id` | Student: events at college |
| POST   | `/api/register-event` | Student: register (solo or team) |
| GET    | `/api/my-registrations/:student_id` | Student: my registrations |

## License

ISC (or your preferred license).
