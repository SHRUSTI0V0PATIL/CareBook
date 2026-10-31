
import React, { useEffect, useState } from "react";
import "./App.css";

const API = "http://127.0.0.1:8000";

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().split("T")[0];
}

export default function App() {
  const [user, setUser] = useState(null);
  const [register, setRegister] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [search, setSearch] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [selected, setSelected] = useState(null);
  const [date, setDate] = useState(tomorrow());
  const [slots, setSlots] = useState([]);
  const [slot, setSlot] = useState("");
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState("doctors");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
  if (!user) return;

  const interval = setInterval(async () => {
    try {
      const data = await api(`/notifications/${user.id}`);
      setNotifications(data);
    } catch (error) {
      console.error("Notification refresh failed:", error);
    }
  }, 30000);

  return () => clearInterval(interval);
}, [user]);

  async function api(url, options = {}) {
    const response = await fetch(API + url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Request failed");
    return data;
  }

  async function loadData(id) {
  const [d, a, n] = await Promise.all([
    api("/doctors"),
    api(`/appointments/${id}`),
    api(`/notifications/${id}`)
  ]);

  setDoctors(d);
  setAppointments(a);
  setNotifications(n);
}

  async function submitAuth(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api(register ? "/register" : "/login", {
        method: "POST",
        body: JSON.stringify(form)
      });

      if (register) {
        setMessage("Registration successful! Please log in.");
        setRegister(false);
        setForm({ name: "", email: form.email, password: "" });
      } else {
        setUser(data);
        await loadData(data.user_id);
        setMessage("Welcome to CareBook!");
      }
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!selected) return;
    setSlots([]);
    setSlot("");
    api(`/slots/${selected.id}/${date}`)
      .then(data => setSlots(data.available_slots))
      .catch(err => setMessage(err.message));
  }, [selected, date]);

  async function bookAppointment() {
    if (!slot) return;
    try {
      const data = await api("/appointments", {
        method: "POST",
        body: JSON.stringify({
          user_id: user.user_id,
          doctor_id: selected.id,
          appointment_date: date,
          appointment_time: slot
        })
      });
      setMessage("Appointment confirmed! Booking ID: " + data.booking_id);
      setSelected(null);
      setSlot("");
      await loadData(user.user_id);
      setTab("appointments");
    } catch (err) {
      setMessage(err.message);
      if (selected) {
        api(`/slots/${selected.id}/${date}`)
          .then(data => setSlots(data.available_slots));
      }
    }
  }

  async function cancelAppointment(id) {
    try {
      const data = await api(
        `/appointments/cancel/${id}?user_id=${user.user_id}`,
        { method: "PATCH" }
      );
      setMessage(data.message);
      await loadData(user.user_id);
    } catch (err) {
      setMessage(err.message);
    }
  }

  const filteredDoctors = doctors.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) &&
    (!specialization || d.specialization === specialization)
  );

  const today = new Date().toLocaleDateString("en-CA");

  const upcoming = appointments.filter(a =>
    a.status === "Confirmed" && a.date >= today
  );

  const history = appointments.filter(a => !upcoming.includes(a));

  if (!user) {
    return (
      <div className="auth-page">
        <form className="auth-card" onSubmit={submitAuth}>
          <div className="logo">✚ CareBook</div>
          <h2>{register ? "Create Account" : "Welcome Back"}</h2>
          <p>Your healthcare, organized in one place.</p>

          {register && (
            <input
              placeholder="Full name"
              required
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
          )}

          <input
            type="email"
            placeholder="Email address"
            required
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
          />

          <input
            type="password"
            placeholder="Password"
            required
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
          />

          <button className="primary full" disabled={loading}>
            {loading ? "Please wait..." : register ? "Register" : "Login"}
          </button>

          <p className="switch" onClick={() => {
            setRegister(!register);
            setMessage("");
          }}>
            {register ? "Already have an account? Login" : "New patient? Create an account"}
          </p>

          {message && <p className="message">{message}</p>}
        </form>
      </div>
    );
  }

  return (
    <div className="app">
      <header>
        <div className="logo">✚ CareBook</div>
        <div className="user-area">
          <span>Welcome, {user.name}</span>
          <button className="outline" onClick={() => {
            setUser(null);
            setSelected(null);
            setMessage("");
          }}>Logout</button>
        </div>
      </header>

      <section className="hero">
        <h1>Your Health, Our Priority.</h1>
        <p>Find doctors, book visits and manage your care journey.</p>
      </section>

      <nav>
        <button className={tab === "doctors" ? "active" : ""}
          onClick={() => { setTab("doctors"); setSelected(null); }}>
          Find Doctors
        </button>
        <button className={tab === "appointments" ? "active" : ""}
          onClick={() => { setTab("appointments"); setSelected(null); }}>
          My Appointments
        </button>
        <button className={tab === "journey" ? "active" : ""}
          onClick={() => { setTab("journey"); setSelected(null); }}>
          Care Journey
        </button>
      </nav>

      <main>
        {notifications.length > 0 && (
  <div className="reminder-box">
    <h3>🔔 Appointment Reminders</h3>
    {notifications.map(n => (
      <p key={n.id}>{n.message}</p>
    ))}
  </div>
)}
        {message && (
          <div className="message">
            {message}
            <button onClick={() => setMessage("")}>×</button>
          </div>
        )}

        {tab === "doctors" && (
          <>
            <h2>Find Your Doctor</h2>
            <p className="muted">Choose a specialist for your healthcare needs.</p>

            <div className="filters">
              <input
                placeholder="Search doctor by name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <select value={specialization}
                onChange={e => setSpecialization(e.target.value)}>
                <option value="">All Specializations</option>
                {[...new Set(doctors.map(d => d.specialization))].map(s =>
                  <option key={s} value={s}>{s}</option>
                )}
              </select>
            </div>

            <div className="doctor-grid">
              {filteredDoctors.map(d => (
                <div className="card doctor-card" key={d.id}>
                  <div className="doctor-icon">✚</div>
                  <h3>{d.name}</h3>
                  <p className="speciality">{d.specialization}</p>
                  <p>{d.experience} years of experience</p>
                  <button className="primary full"
                    onClick={() => setSelected(d)}>
                    Book Appointment
                  </button>
                </div>
              ))}
              {filteredDoctors.length === 0 && <p>No doctors found.</p>}
            </div>

            {selected && (
              <div className="card booking">
                <h2>Book an Appointment</h2>
                <h3>{selected.name}</h3>
                <p>{selected.specialization}</p>

                <label>Select appointment date</label>
                <input type="date" min={tomorrow()} value={date}
                  onChange={e => setDate(e.target.value)} />

                <h3>Available Slots</h3>
                <div className="slots">
                  {slots.map(s => (
                    <button key={s}
                      className={slot === s ? "chosen" : ""}
                      onClick={() => setSlot(s)}>{s}</button>
                  ))}
                  {slots.length === 0 && <p>No available slots for this date.</p>}
                </div>

                <button className="primary" disabled={!slot}
                  onClick={bookAppointment}>Confirm Booking</button>
                <button className="outline"
                  onClick={() => setSelected(null)}>Close</button>
              </div>
            )}
          </>
        )}

        {tab === "appointments" && (
          <>
            <h2>My Appointments</h2>
            <h3>Upcoming Visits</h3>
            {upcoming.length === 0 && <p>No upcoming appointments.</p>}

            {upcoming.map(a => (
              <div className="card appointment" key={a.booking_id}>
                <div>
                  <h3>{a.doctor}</h3>
                  <p>{a.specialization}</p>
                  <p>{a.date} · {a.time}</p>
                  <p>Booking ID: <b>{a.booking_id}</b></p>
                  <span className="status confirmed">{a.status}</span>
                </div>
                <button className="danger"
                  onClick={() => cancelAppointment(a.booking_id)}>
                  Cancel
                </button>
              </div>
            ))}

            <h3>Appointment History</h3>
            {history.length === 0 && <p>No past or cancelled visits.</p>}
            {history.map(a => (
              <div className="card appointment" key={a.booking_id}>
                <div>
                  <h3>{a.doctor}</h3>
                  <p>{a.specialization}</p>
                  <p>{a.date} · {a.time}</p>
                  <p>Booking ID: <b>{a.booking_id}</b></p>
                  <span className="status">{a.status}</span>
                </div>
              </div>
            ))}
          </>
        )}

        {tab === "journey" && (
          <>
            <h2>Your Care Journey</h2>
            <p className="muted">A timeline of your appointments and visits.</p>

            <div className="timeline">
              {[...appointments].sort((a, b) =>
                (b.date + b.time).localeCompare(a.date + a.time)
              ).map(a => (
                <div className="timeline-item" key={a.booking_id}>
                  <div className="dot"></div>
                  <div className="card">
                    <span className="status">{a.status}</span>
                    <h3>{a.doctor}</h3>
                    <p>{a.specialization}</p>
                    <p>{a.date} at {a.time}</p>
                    <p>Booking ID: <b>{a.booking_id}</b></p>
                  </div>
                </div>
              ))}
              {appointments.length === 0 &&
                <p>Your care journey starts with your first appointment.</p>}
            </div>
          </>
        )}
      </main>

      <footer>CareBook © 2026 · Your health, organized.</footer>
    </div>
  );
}
