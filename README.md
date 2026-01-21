# 📱 Mobile TopUp Store (QA Sandbox)

A full-stack simulation of a Telco Top-up application designed for **QA Automation Practice**.
This project mimics real-world scenarios including Payment Gateway simulation, Network latency, and Transaction history.

**Live Demo:** [https://mobile-topup-store.onrender.com/]
**API Docs:** [https://mobile-topup-store.onrender.com/]/api-docs

## 🚀 Key Features for Testing
- **Authentication:** Login/Register with JWT-like flow.
- **Mock OTP:** Simulate OTP verification logic (OTP: `1234`).
- **Payment Simulation:**
  - `099-xxx-xxxx` triggers HTTP 500 (Gateway Error).
  - `088-xxx-xxxx` triggers 5s Timeout.
- **Thai Timezone:** Transaction timestamps are strictly formatted in `Asia/Bangkok`.
- **Database:** Persistent storage using PostgreSQL (Neon).

## 🛠 Tech Stack
- **Frontend:** HTML5, TailwindCSS, Vanilla JS (SPA Architecture).
- **Backend:** Node.js (Express).
- **Database:** PostgreSQL (via `pg`).

## ⚙️ How to Run Locally
1. Clone the repo
2. `npm install`
3. Create `.env` and add `DATABASE_URL=your_connection_string`
4. `node server.js`