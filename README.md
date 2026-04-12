# Eventopia - Campus Event Management System

Eventopia is a full-stack campus event management platform that helps colleges, clubs, and students manage the complete event lifecycle from one place. Colleges can onboard clubs and students, clubs can publish and manage events, and students can explore, register, and pay for events through a unified web app.

## Features

### College
- Login with college email and password
- Self-register a new college account from the login page
- Add clubs manually
- Add students manually
- Import clubs from Excel
- Import students from Excel
- Search clubs by name or email
- Search students by name or registration number
- Paginated club and student lists with "See more"
- Delete clubs and students
- Duplicate handling during imports

### Club
- Login with club name and college selection
- Create events with poster upload
- Set team size, maximum teams, category, fee, prize amount, and coordinator details
- Edit event details
- View registrations in team-wise format
- Track payment status of registered teams
- Mark events as completed
- Add or edit completion notes for past events
- Delete past events and remove poster files from storage
- Automatic separation of active and past events

### Student
- Login with registration number and college selection
- Browse active events for their college
- Filter events by search, date, fee type, and participation type
- View detailed event information with poster preview
- Register by creating or joining a team
- Register for free or paid events
- Pay later or continue to Razorpay checkout for paid registrations
- View active registrations and past registrations separately
- View team members for registered events
- Complete pending payments later if the student is the team leader

### Platform
- Progressive Web App support with manifest and service worker
- Static frontend served directly by Express
- Poster files served from backend uploads
- Automatic event completion for events older than 3 days

## Tech Stack

| Layer | Stack |
| --- | --- |
| Frontend | HTML, CSS, JavaScript (vanilla) |
| Backend | Node.js, Express |
| Database | MySQL |
| Payments | Razorpay |
| Other | Multer, SheetJS/xlsx, service worker + web app manifest |

## Project Structure

```text
Event Management/
|-- Frontend/
|   |-- login.html, login.css, login.js
|   |-- clg_dashboard.html, clg_dashboard.css, clg_dashboard.js
|   |-- club_dashboard.html, club_dashboard.css, club_dashboard.js
|   |-- student_dashboard.html, student_dashboard.css, student_dashboard.js
|   |-- manifest.json
|   |-- pwa.js
|   |-- sw.js
|   `-- icons/
|-- Backend/
|   |-- server.js
|   |-- db.js
|   |-- loadEnv.js
|   |-- package.json
|   |-- routes/
|   |   `-- auth.js
|   `-- uploads/
|       `-- posters/
`-- README.md
```

## Prerequisites

- Node.js 14 or later
- MySQL 8 or later
- A MySQL database named `campus_event_db2`, or update [`Backend/db.js`](/d:/Event%20Management/Backend/db.js:1)

## Database Notes

The backend expects tables such as:

- `college`
- `club`
- `student`
- `event`
- `event_registration`
- `payment`

Important implementation notes:

- `event_registration` should include team and payment tracking fields used by the app, such as `team_name`, `is_leader`, and `payment_status`.
- `payment` should store one row per registration payment and include fields such as `reg_id`, `amount`, `payment_mode`, `transaction_id`, `payment_status`, `payment_date`, and `remarks`.
- The backend automatically ensures the `event` table has `is_completed` and `completion_note` columns when the server starts.

## Configuration

### 1. Database connection

Update the MySQL credentials in [`Backend/db.js`](/d:/Event%20Management/Backend/db.js:1):

```js
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "YOUR_PASSWORD",
    database: "campus_event_db2",
    timezone: "local",
    dateStrings: true
});
```

### 2. Optional environment variables

The backend loads `Backend/.env` automatically through [`Backend/loadEnv.js`](/d:/Event%20Management/Backend/loadEnv.js:1).

For Razorpay payments, add:

```env
RAZORPAY_KEY_ID=your_test_key_id
RAZORPAY_KEY_SECRET=your_test_key_secret
```

If these keys are missing or left as placeholders, paid-event checkout will not proceed.

## Setup

### 1. Install dependencies

```bash
cd Backend
npm install
```

### 2. Start the app

```bash
cd Backend
node server.js
```

The server runs at `http://localhost:3000`.

## Running the Project

Open `http://localhost:3000` in your browser.

Notes:

- You do not need a separate frontend server now, because Express serves the frontend files directly.
- Uploaded event posters are available under `/uploads/posters/...`.
- The PWA manifest and service worker are loaded from the same app origin.

## API Overview

All routes are available under `/api`.

### Authentication and onboarding

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/register-college` | Create a new college account |
| GET | `/api/colleges` | List colleges for login dropdown |
| POST | `/api/login` | Login for college, club, or student |

### College management

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/add-club` | Add a club |
| POST | `/api/add-student` | Add a student |
| GET | `/api/clubs/:college_id` | List clubs with search, limit, and offset |
| GET | `/api/clubs/:college_id/count` | Total club count for pagination |
| GET | `/api/students/:college_id` | List students with search, limit, and offset |
| GET | `/api/students/:college_id/count` | Total student count for pagination |
| POST | `/api/import-clubs` | Import clubs from Excel |
| POST | `/api/import-students` | Import students from Excel |
| DELETE | `/api/delete-club/:id` | Delete a club |
| DELETE | `/api/delete-student/:id` | Delete a student |

### Club event management

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/add-event` | Create an event with optional poster upload |
| GET | `/api/events/:club_id` | List club events |
| PUT | `/api/update-event/:id` | Update event details |
| PUT | `/api/complete-event/:id` | Mark an event as completed |
| PUT | `/api/event-note/:id` | Update completion note for a completed event |
| DELETE | `/api/delete-event/:id` | Delete an event |
| GET | `/api/event-registrations/:event_id` | Flat registration list |
| GET | `/api/event-registrations/:event_id/teamwise` | Registrations grouped by team with payment state |

### Student registration and payments

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/student-events/:college_id` | List active student-visible events |
| POST | `/api/register-event` | Register for an event by creating or joining a team |
| PUT | `/api/pay-registration/:reg_id` | Mark a registration as paid |
| POST | `/api/create-razorpay-order` | Create a Razorpay order for a registration |
| POST | `/api/verify-razorpay-payment` | Verify Razorpay payment and update payment status |
| GET | `/api/my-registrations/:student_id` | List student registrations with payment and completion info |

## Current Behavior Notes

- Club and student login require a selected college.
- Event team size supports either a fixed number like `3` or a range like `3-5`.
- Event date and time must be in the future when creating or editing an event.
- Team leaders handle payment for paid team registrations.
- If an event fee changes, registration payment statuses are synchronized automatically where possible.
- Completed events are hidden from the student event browser and moved to past sections in dashboards.

## License

ISC
