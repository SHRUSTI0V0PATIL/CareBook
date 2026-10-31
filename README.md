# 🏥 CareBook – Clinic Appointment Booking System

CareBook is a full-stack clinic appointment booking and patient management application designed to simplify the process of finding doctors, booking appointments, and managing patient visits.

The application provides a user-friendly interface where patients can register, log in, explore doctors, check available appointment slots, and manage their appointments.

## ✨ Features

- **Patient Registration & Login:** Create an account and securely log in.
- **Doctor Directory:** Browse doctors along with their specializations and experience.
- **Doctor Search:** Search doctors by name.
- **Specialization Filter:** Find doctors based on their medical specialization.
- **Appointment Booking:** Select a doctor, date, and available time slot.
- **Unique Booking ID:** Every appointment receives a unique booking reference.
- **Slot Availability:** Prevents multiple patients from booking the same doctor and time slot.
- **Appointment Cancellation:** Cancel confirmed appointments and release the booked slot.
- **Appointment History:** View upcoming and previous appointments.
- **Care Journey:** View appointments through a visual timeline.
- **Appointment Reminders:** Generate in-app reminders five hours before scheduled appointments.
- **Notification Updates:** Automatically refresh notifications while the patient dashboard is open.

## 🛠️ Technology Stack

| Component | Technology |
|---|---|
| Frontend | React.js |
| Backend | Python, FastAPI |
| Database | PostgreSQL |
| ORM | SQLAlchemy |
| API Testing | Swagger UI |
| Frontend Development | Vite |
| Version Control | Git & GitHub |

## 📁 Project Structure

```text
CareBook/
│
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   └── README.md
│
├── .gitignore
└── README.md
```

## ⚙️ Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/SHRUSTI0V0PATIL/CareBook.git
cd CareBook
```

### 2. Backend Setup

Create and activate a Python virtual environment:

```bash
python -m venv venv
venv\Scripts\activate
```

Install dependencies:

```bash
cd backend
pip install -r requirements.txt
```

Configure your PostgreSQL database connection in `database.py` using your local database credentials. Do not upload passwords or other secrets to GitHub.

Start the FastAPI server:

```bash
uvicorn main:app --reload
```

Backend API:

`http://127.0.0.1:8000`

Swagger API documentation:

`http://127.0.0.1:8000/docs`

### 3. Frontend Setup

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend application:

`http://localhost:5173`

## 🗄️ Database

CareBook uses PostgreSQL to store:

- Patient information
- Doctor information
- Appointment details
- Notification records

SQLAlchemy is used for database operations and ORM-based interaction.

## 🔮 Future Enhancements

- Email and SMS appointment notifications.
- Doctor dashboard for appointment management.
- Online appointment payments.
- Patient profile management.
- Medical report and prescription management.
- Role-based authentication for patients and doctors.

## 👩‍💻 Developer

**Shrusti V. Patil**

Computer Science and Engineering Student

GitHub: [SHRUSTI0V0PATIL](https://github.com/SHRUSTI0V0PATIL)

---

*CareBook – Making healthcare appointments simpler and more accessible.*