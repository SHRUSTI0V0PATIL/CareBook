from datetime import timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel
from datetime import date, time, datetime
from passlib.context import CryptContext
from uuid import uuid4

from database import engine, Base, get_db
import models

app = FastAPI(title="CareBook API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


# Request models
class UserInput(BaseModel):
    name: str
    email: str
    password: str


class LoginInput(BaseModel):
    email: str
    password: str


class BookingInput(BaseModel):
    user_id: int
    doctor_id: int
    appointment_date: date
    appointment_time: time


# Add sample doctors if database is empty
@app.on_event("startup")
def seed_doctors():
    db = next(get_db())
    try:
        if db.query(models.Doctor).count() == 0:
            doctors = [
                models.Doctor(name="Dr. Ananya Rao", specialization="Cardiologist", experience=10),
                models.Doctor(name="Dr. Rahul Sharma", specialization="Dermatologist", experience=8),
                models.Doctor(name="Dr. Meera Nair", specialization="Neurologist", experience=12),
                models.Doctor(name="Dr. Arjun Kumar", specialization="Pediatrician", experience=7),
                models.Doctor(name="Dr. Priya Shetty", specialization="Orthopedic", experience=9),
            ]
            db.add_all(doctors)
            db.commit()
    finally:
        db.close()


scheduler = BackgroundScheduler()


def send_appointment_reminders():
    db = next(get_db())

    try:
        now = datetime.now()
        reminder_time = now + timedelta(hours=5)

        appointments = db.query(models.Appointment).filter(
            models.Appointment.status == "Confirmed"
        ).all()

        for appointment in appointments:
            appointment_datetime = datetime.combine(
                appointment.appointment_date,
                appointment.appointment_time
            )

            # Send reminder when the appointment is approximately
            # five hours away.
            seconds_until_reminder = (
                appointment_datetime - timedelta(hours=5) - now
            ).total_seconds()

            if 0 <= seconds_until_reminder <= 65:
                existing = db.query(models.Notification).filter(
                    models.Notification.appointment_id == appointment.id,
                    models.Notification.message.like("Reminder:%")
                ).first()

                if not existing:
                    doctor = db.query(models.Doctor).filter(
                        models.Doctor.id == appointment.doctor_id
                    ).first()

                    notification = models.Notification(
                        user_id=appointment.user_id,
                        appointment_id=appointment.id,
                        message=(
                            f"Reminder: Your appointment with "
                            f"{doctor.name if doctor else 'your doctor'} "
                            f"is in 5 hours. Booking ID: {appointment.booking_id}"
                        ),
                        is_read=False
                    )

                    db.add(notification)

        db.commit()

    except Exception as error:
        db.rollback()
        print("Reminder error:", error)

    finally:
        db.close()


@app.on_event("startup")
def start_reminder_scheduler():
    if not scheduler.running:
        scheduler.add_job(
            send_appointment_reminders,
            "interval",
            seconds=30,
            id="appointment_reminders",
            replace_existing=True
        )
        scheduler.start()


@app.on_event("shutdown")
def stop_reminder_scheduler():
    if scheduler.running:
        scheduler.shutdown()


@app.get("/")
def home():
    return {"message": "CareBook API is running!"}


# Patient registration
@app.post("/register")
def register(data: UserInput, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == data.email).first():
        raise HTTPException(400, "Email already registered")

    user = models.User(
        name=data.name,
        email=data.email,
        password=pwd_context.hash(data.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {"message": "Registration successful", "user_id": user.id}


# Patient login
@app.post("/login")
def login(data: LoginInput, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(
        models.User.email == data.email
    ).first()

    if not user or not pwd_context.verify(data.password, user.password):
        raise HTTPException(401, "Invalid email or password")

    return {
        "message": "Login successful",
        "user_id": user.id,
        "name": user.name
    }


# List and search doctors
@app.get("/doctors")
def get_doctors(
    search: str = "",
    specialization: str = "",
    db: Session = Depends(get_db)
):
    query = db.query(models.Doctor).filter(
        models.Doctor.available == True
    )

    if search:
        query = query.filter(models.Doctor.name.ilike(f"%{search}%"))

    if specialization:
        query = query.filter(
            models.Doctor.specialization.ilike(f"%{specialization}%")
        )

    return query.all()


# Get available time slots
@app.get("/slots/{doctor_id}/{appointment_date}")
def get_slots(
    doctor_id: int,
    appointment_date: date,
    db: Session = Depends(get_db)
):
    doctor = db.query(models.Doctor).filter(
        models.Doctor.id == doctor_id,
        models.Doctor.available == True
    ).first()

    if not doctor:
        raise HTTPException(404, "Doctor not available")

    if appointment_date < date.today():
        raise HTTPException(400, "Cannot select a past date")

    booked = db.query(models.Appointment.appointment_time).filter(
        models.Appointment.doctor_id == doctor_id,
        models.Appointment.appointment_date == appointment_date,
        models.Appointment.status == "Confirmed"
    ).all()

    booked_times = [item[0] for item in booked]

    slots = []
    for hour in range(9, 17):
        for minute in [0, 30]:
            slot = time(hour, minute)
            if slot not in booked_times:
                if appointment_date != date.today() or slot > datetime.now().time():
                    slots.append(slot.strftime("%H:%M"))

    return {"available_slots": slots}


# Book appointment
@app.post("/appointments")
def book_appointment(data: BookingInput, db: Session = Depends(get_db)):
    if data.appointment_date < date.today():
        raise HTTPException(400, "Cannot book a past date")

    if data.appointment_date == date.today() and data.appointment_time <= datetime.now().time():
        raise HTTPException(400, "Please select a future time")

    user = db.query(models.User).filter(
        models.User.id == data.user_id
    ).first()

    doctor = db.query(models.Doctor).filter(
        models.Doctor.id == data.doctor_id,
        models.Doctor.available == True
    ).first()

    if not user:
        raise HTTPException(404, "Patient not found")

    if not doctor:
        raise HTTPException(404, "Doctor not available")

    booking = models.Appointment(
        booking_id="CB-" + uuid4().hex[:8].upper(),
        user_id=data.user_id,
        doctor_id=data.doctor_id,
        appointment_date=data.appointment_date,
        appointment_time=data.appointment_time,
        status="Confirmed"
    )

    db.add(booking)

    try:
        db.commit()
        db.refresh(booking)
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "This appointment slot is already booked")

    return {
        "message": "Appointment booked successfully",
        "booking_id": booking.booking_id,
        "status": booking.status
    }


# Patient appointments: upcoming and history
@app.get("/appointments/{user_id}")
def my_appointments(user_id: int, db: Session = Depends(get_db)):
    appointments = db.query(
        models.Appointment, models.Doctor
    ).join(
        models.Doctor,
        models.Appointment.doctor_id == models.Doctor.id
    ).filter(
        models.Appointment.user_id == user_id
    ).order_by(
        models.Appointment.appointment_date,
        models.Appointment.appointment_time
    ).all()

    result = []
    for appointment, doctor in appointments:
        result.append({
            "booking_id": appointment.booking_id,
            "doctor": doctor.name,
            "specialization": doctor.specialization,
            "date": str(appointment.appointment_date),
            "time": appointment.appointment_time.strftime("%H:%M"),
            "status": appointment.status
        })

    return result


# Cancel appointment
@app.patch("/appointments/cancel/{booking_id}")
def cancel_appointment(
    booking_id: str,
    user_id: int,
    db: Session = Depends(get_db)
):
    appointment = db.query(models.Appointment).filter(
        models.Appointment.booking_id == booking_id,
        models.Appointment.user_id == user_id
    ).first()

    if not appointment:
        raise HTTPException(404, "Appointment not found")

    if appointment.status != "Confirmed":
        raise HTTPException(400, "Appointment cannot be cancelled")

    appointment.status = "Cancelled"
    db.commit()

    return {"message": "Appointment cancelled. Slot is available again."}


@app.get("/notifications/{user_id}")
def get_notifications(user_id: int, db: Session = Depends(get_db)):
    notifications = db.query(models.Notification).filter(
        models.Notification.user_id == user_id
    ).order_by(models.Notification.id.desc()).all()

    return [
        {
            "id": n.id,
            "message": n.message,
            "is_read": n.is_read
        }
        for n in notifications
    ]
