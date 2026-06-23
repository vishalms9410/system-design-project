# 🚀 SysDesignAI - Interactive System Design Simulator

An interactive system design playground that allows users to visually build distributed systems, simulate traffic, analyze architecture decisions, and receive AI-powered feedback.

## 🌐 Live Demo

**Try it here:**
https://system-design-simulator-beryl.vercel.app/

---

## 📸 Preview

SysDesignAI provides a drag-and-drop canvas where users can design scalable architectures using common system design components such as:

* Client
* Load Balancer
* App Server
* Database
* Redis Cache
* Message Queue
* CDN
* Microservices

Users can connect components, run load tests, visualize system metrics, and get AI-generated architecture reviews.

---

## ✨ Features

### 🎨 Interactive Architecture Canvas

* Drag-and-drop system components
* Visual architecture design
* Connect services to model request flow
* Build real-world distributed systems

### ⚡ Load Testing Simulator

* Simulate traffic spikes
* Configure peak user load
* Stress test architectures
* Analyze scalability behavior

### 📊 Real-Time Metrics

Monitor:

* Latency
* Throughput
* Error Rate
* Active Users

Metrics update live during simulations.

### 🤖 AI Architecture Review

Get intelligent feedback on:

* Scalability
* Performance bottlenecks
* Single points of failure
* Architectural improvements
* System design best practices

### 💾 Save & Load Designs

* Save architecture diagrams
* Revisit previous designs
* Compare different architectures

### 🏗️ Prebuilt Scenarios

Quick-start templates:

* Twitter Clone
* Uber-like App
* Video Streaming Platform
* E-Commerce Platform
* Custom System Design

### 🔥 Redis-Powered Simulation Queue

Uses Redis and BullMQ for:

* Load test scheduling
* Background processing
* Simulation execution

### 📡 Real-Time Communication

Socket.IO powers:

* Live metric updates
* Real-time simulation events
* Interactive dashboard updates

---

## 🛠️ Tech Stack

### Frontend

* React 19
* Vite
* Tailwind CSS
* Recharts
* Socket.IO Client
* Lucide React

### Backend

* Node.js
* Express.js
* Socket.IO
* BullMQ
* Redis
* PostgreSQL

### Infrastructure

* Docker
* Docker Compose

---

## 📂 Project Structure

```text
system-design-project/
│
├── backend/
│   ├── db/
│   ├── routes/
│   ├── services/
│   ├── workers/
│   ├── server.js
│   └── docker-compose.yml
│
└── vite-project/
    ├── src/
    ├── public/
    └── vite.config.js
```

---

## ⚙️ Local Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd system-design-project
```

### 2. Start Redis & PostgreSQL

```bash
cd backend
docker compose up -d
```

This starts:

* Redis → Port 6379
* PostgreSQL → Port 5432

---

### 3. Run Backend

```bash
cd backend
npm install
npm run dev
```

---

### 4. Run Worker

```bash
cd backend
npm run worker
```

---

### 5. Run Frontend

```bash
cd vite-project
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

---

## 🎯 Example Architecture

Twitter Clone:

```text
Client
   │
Load Balancer
   │
App Server
   │
Redis Cache
   │
Database
```

Run a load test and observe:

* Cache effectiveness
* Database pressure
* Latency changes
* Throughput scaling

---

## 🧠 Learning Objectives

This project helps developers:

* Learn system design visually
* Understand scalability trade-offs
* Practice interview-style architecture design
* Explore caching strategies
* Analyze bottlenecks
* Understand distributed systems concepts

---

## 🔮 Future Enhancements

* Chaos Engineering Simulations
* API Gateway Component
* Kafka Integration
* Multi-region Deployments
* Auto Scaling Simulation
* Architecture Recommendations
* Design Sharing
* Collaboration Mode
* Cost Estimation Dashboard

---

## 🤝 Contributing

Contributions are welcome.

Feel free to:

* Open issues
* Submit pull requests
* Suggest new components
* Improve simulations

---

## 📜 License

MIT License

---

## ⭐ Why SysDesignAI?

Traditional system design tools help you draw architectures.

**SysDesignAI helps you build, simulate, analyze, and improve them.**
