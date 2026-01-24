# 📱 Mobile Internet Service Sandbox (QA Sandbox)

A full-stack simulation of a **Mobile Internet Package Subscription** application designed for **QA Automation Practice**.

This project mimics real-world scenarios including Payment Gateway simulation, Network latency, and Transaction history.

- 🌐 **Live Demo:** [https://mobile-internet-service-sandbox.onrender.com](https://mobile-internet-service-sandbox.onrender.com)
- 📄 **API Docs:** [Swagger UI](https://mobile-internet-service-sandbox.onrender.com/api-docs)

---

## 🚀 Key Features for Testing

### 1. Authentication & Security

- **Flow:** Login/Register with JWT-like authentication.
- **Mock OTP:** Simulates 2FA verification logic.
  - **Secret Code:** `1234` (Use this for all OTP requests).

### 2. Payment Gateway Simulation (Test Scenarios)

Use specific phone numbers to trigger different server responses:

| Phone Number Prefix | Behavior                              | HTTP Status              |
|:--------------------|:--------------------------------------|:-------------------------|
| `099-xxx-xxxx`      | **Payment Failed** (Gateway Error)    | `500 Internal Server Error` |
| `088-xxx-xxxx`      | **Network Timeout** (Simulates lag)   | `200 OK` (after 5s delay) |
| `Other numbers`     | **Success**                           | `200 OK`                 |

### 3. Localization & Data

- **Timezone:** Transaction timestamps are strictly formatted in `Asia/Bangkok`.
- **Database:** Persistent storage using PostgreSQL (Neon).

---

## 🛠 Tech Stack

- **Frontend:** HTML5, TailwindCSS, Vanilla JS (SPA Architecture)
- **Backend:** Node.js (Express)
- **Database:** PostgreSQL (via `pg`)

---

## ⚙️ How to Run Locally

### 1. Clone the repository
```bash
git clone https://github.com/FolkFizz/mobile-internet-service-sandbox.git
cd mobile-internet-service-sandbox
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Setup

- Create a `.env` file in the root directory.
- Add your PostgreSQL connection string:
```env
DATABASE_URL=your_postgres_connection_string
```

### 4. Start the server
```bash
node server.js
```

The application will be available at `http://localhost:3000` (or the port specified in your environment).

---

## 📚 Additional Resources

- **Repository:** [GitHub](https://github.com/FolkFizz/mobile-internet-service-sandbox)
- **Issues & Bug Reports:** [GitHub Issues](https://github.com/FolkFizz/mobile-internet-service-sandbox/issues)

---

## 📝 License

This project is open-source and available for QA automation practice and learning purposes.