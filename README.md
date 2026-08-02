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

**Backend:**

- Node.js with Express.js
- MySQL2 (Database)
- Razorpay (Payment Gateway)
- Multer (File Upload Handling)
- CORS & Body-Parser (Middleware)
- XLSX (Excel Import)

**Frontend:**

- Vanilla JavaScript
- HTML5 & CSS3
- Progressive Web App (PWA) Support
- Service Workers for Offline Capability

## Prerequisites

- **Node.js** (v14 or higher)
- **MySQL** (v5.7 or higher)
- **npm** (comes with Node.js)
- **Razorpay Account** (for payment processing)

## Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/yourusername/eventopia.git
   cd eventopia
   ```

2. **Setup Backend:**

   ```bash
   cd Backend
   npm install
   ```

3. **Setup Environment Variables:**
   Create a `.env` file in the `Backend` directory with the following variables:

   ```env
   DB_HOST=localhost
   DB_USER=your_mysql_user
   DB_PASSWORD=your_mysql_password
   DB_NAME=eventopia_db
   RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_key_secret
   ```

4. **Setup Database:**
   - Create a MySQL database named `eventopia_db`
   - Import the database schema (if available in the project)
   - Or run migrations if setup in the project

## Running the Project

1. **Start the Backend Server:**

   ```bash
   cd Backend
   npm start
   ```

   The server will start on `http://localhost:3000`

2. **Access the Application:**
   - Open your browser and navigate to `http://localhost:3000`
   - Login credentials depend on your user role (College, Club, or Student)

## Project Structure

```
eventopia/
├── Backend/
│   ├── routes/
│   │   └── auth.js           # Authentication routes
│   ├── uploads/
│   │   └── posters/          # Event poster storage
│   ├── db.js                 # Database connection
│   ├── server.js             # Express server setup
│   ├── loadEnv.js            # Environment variables loader
│   ├── package.json          # Backend dependencies
│   └── .env                  # Environment variables (not in git)
├── Frontend/
│   ├── login.html            # Login page
│   ├── login.js
│   ├── login.css
│   ├── college_dashboard.html    # College dashboard
│   ├── college_dashboard.js
│   ├── college_dashboard.css
│   ├── club_dashboard.html       # Club dashboard
│   ├── club_dashboard.js
│   ├── club_dashboard.css
│   ├── student_dashboard.html    # Student dashboard
│   ├── student_dashboard.js
│   ├── student_dashboard.css
│   ├── manifest.json         # PWA manifest
│   ├── pwa.js                # PWA setup
│   ├── sw.js                 # Service worker
│   └── icons/                # App icons
└── README.md
```

## API Endpoints

All API endpoints are prefixed with `/api/`. Check `Backend/routes/auth.js` for authentication and user management endpoints.

## Features in Detail

### User Roles

1. **College Admin**
   - Manage clubs and students
   - Import data via Excel
   - Monitor event activities

2. **Club Coordinator**
   - Create and manage events
   - Track registrations and payments
   - View completion history

3. **Student**
   - Browse and register for events
   - Manage team memberships
   - Track registrations and payments

## Payment Integration

The platform uses **Razorpay** for processing event registration fees. Ensure your Razorpay API keys are correctly configured in the `.env` file.

## PWA Features

The application supports PWA capabilities:

- Installable on mobile devices
- Offline support via Service Worker
- App icon and manifest configuration

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License - see the LICENSE file for details.

## Support

For issues, questions, or suggestions, please open an issue on GitHub or contact the development team.

## Troubleshooting

**Database Connection Issues:**

- Verify MySQL is running
- Check `.env` credentials match your MySQL setup
- Ensure database name is correct
- If you're using a hosted Free Aiven database, it may be powered off; contact the developer to restart or provision the database

**Port Already in Use:**

- The server uses port 3000 by default
- Change the port in `Backend/server.js` if needed

**File Upload Issues:**

- Ensure `Backend/uploads/posters/` directory exists and has write permissions
- Check multer configuration in server setup

| Layer    | Stack                                                   |
| -------- | ------------------------------------------------------- |
| Frontend | HTML, CSS, JavaScript (vanilla)                         |
| Backend  | Node.js, Express                                        |
| Database | MySQL                                                   |
| Payments | Razorpay                                                |
| Other    | Multer, SheetJS/xlsx, service worker + web app manifest |

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
  dateStrings: true,
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

| Method | Endpoint                | Description                         |
| ------ | ----------------------- | ----------------------------------- |
| POST   | `/api/register-college` | Create a new college account        |
| GET    | `/api/colleges`         | List colleges for login dropdown    |
| POST   | `/api/login`            | Login for college, club, or student |

### College management

| Method | Endpoint                          | Description                                  |
| ------ | --------------------------------- | -------------------------------------------- |
| POST   | `/api/add-club`                   | Add a club                                   |
| POST   | `/api/add-student`                | Add a student                                |
| GET    | `/api/clubs/:college_id`          | List clubs with search, limit, and offset    |
| GET    | `/api/clubs/:college_id/count`    | Total club count for pagination              |
| GET    | `/api/students/:college_id`       | List students with search, limit, and offset |
| GET    | `/api/students/:college_id/count` | Total student count for pagination           |
| POST   | `/api/import-clubs`               | Import clubs from Excel                      |
| POST   | `/api/import-students`            | Import students from Excel                   |
| DELETE | `/api/delete-club/:id`            | Delete a club                                |
| DELETE | `/api/delete-student/:id`         | Delete a student                             |

### Club event management

| Method | Endpoint                                      | Description                                      |
| ------ | --------------------------------------------- | ------------------------------------------------ |
| POST   | `/api/add-event`                              | Create an event with optional poster upload      |
| GET    | `/api/events/:club_id`                        | List club events                                 |
| PUT    | `/api/update-event/:id`                       | Update event details                             |
| PUT    | `/api/complete-event/:id`                     | Mark an event as completed                       |
| PUT    | `/api/event-note/:id`                         | Update completion note for a completed event     |
| DELETE | `/api/delete-event/:id`                       | Delete an event                                  |
| GET    | `/api/event-registrations/:event_id`          | Flat registration list                           |
| GET    | `/api/event-registrations/:event_id/teamwise` | Registrations grouped by team with payment state |

### Student registration and payments

| Method | Endpoint                            | Description                                                 |
| ------ | ----------------------------------- | ----------------------------------------------------------- |
| GET    | `/api/student-events/:college_id`   | List active student-visible events                          |
| POST   | `/api/register-event`               | Register for an event by creating or joining a team         |
| PUT    | `/api/pay-registration/:reg_id`     | Mark a registration as paid                                 |
| POST   | `/api/create-razorpay-order`        | Create a Razorpay order for a registration                  |
| POST   | `/api/verify-razorpay-payment`      | Verify Razorpay payment and update payment status           |
| GET    | `/api/my-registrations/:student_id` | List student registrations with payment and completion info |

## Current Behavior Notes

- Club and student login require a selected college.
- Event team size supports either a fixed number like `3` or a range like `3-5`.
- Event date and time must be in the future when creating or editing an event.
- Team leaders handle payment for paid team registrations.
- If an event fee changes, registration payment statuses are synchronized automatically where possible.
- Completed events are hidden from the student event browser and moved to past sections in dashboards.

## License

ISC
