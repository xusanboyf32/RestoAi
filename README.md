🍽️ RestoAI — AI-Powered Restaurant Management System
A full-stack restaurant management system with AI-driven recommendations, real-time order tracking, and role-based panels for customers, waiters, chefs, and admins.

📌 Overview
RestoAI replaces traditional restaurant workflows with a QR-based ordering system. Customers scan a QR code, chat with an AI assistant, and place orders — no waiter needed. Staff manage everything through role-specific dashboards with real-time WebSocket updates.

✨ Features
👤 Customer

QR code scan → automatic table detection
Browse menu with real-time availability
AI chat: budget-based recommendations, health condition filtering, mood-based suggestions
Real-time order status tracking
Special requests via Telegram to admin

🧑‍🍽️ Waiter

Assigned tables panel
Real-time notifications when orders are ready
Problem report system from customers
Personal statistics and ratings

👨‍🍳 Chef

Live order queue (New / In Progress / Ready)
One-tap food availability control
Delay alerts and order prioritization

👑 Admin

Real-time dashboard: active tables, revenue, orders
Full menu management (add, edit, delete, pricing)
Staff management and table assignment
Daily/weekly/monthly analytics with AI insights


🛠️ Tech Stack
Backend

FastAPI + Python (async/await)
PostgreSQL + SQLAlchemy + Alembic
Redis (caching, sessions)
ChromaDB + HuggingFace Embeddings (RAG)
Groq API — llama-3.3-70b
WebSockets (real-time updates)
JWT Authentication

Frontend

React + Tailwind CSS
High Tech Dark design theme

DevOps

DigitalOcean (Ubuntu droplet)
Nginx + SSL (Let's Encrypt / HTTPS)
Docker


🤖 AI System
Three AI layers:

Personal Recommendation — suggests meals based on order history, time of day, and budget. Calculates exact combinations within user's budget.
Health Filter — filters menu by health conditions (diabetes, hypertension, stomach issues, allergies). Never diagnoses — always recommends consulting a doctor.
Mood & Context — detects who the customer is (family, couple, solo, friends) and adjusts tone and recommendations accordingly.

Stack: ChromaDB (vector search) + HuggingFace embeddings + Groq API (llama-3.3-70b)

👥 Roles
RoleAccessKey FunctionCustomerMenu, AI chat, ordersSelf-service ordering via QRWaiterAssigned tables, deliveryDeliver food, handle issuesChefOrder queue, availabilityCook and signal readinessAdminEverythingFull control and analytics

⚙️ Installation
bash# Clone the repo
git clone https://github.com/yourusername/restoai.git
cd restoai

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Environment variables
cp .env.example .env
# Fill in your values

# Run migrations
alembic upgrade head

# Start server
uvicorn main:app --reload --port 8001
bash# Frontend setup
cd frontend
npm install
npm run dev

🔐 Environment Variables
envDATABASE_URL=postgresql://user:password@localhost/restoai
REDIS_URL=redis://localhost:6379
GROQ_API_KEY=your_groq_api_key
SECRET_KEY=your_jwt_secret
CHROMA_DB_PATH=./chroma_db

📡 API Endpoints
MethodEndpointDescriptionPOST/auth/loginLogin (all roles)GET/menu/Get full menuPOST/orders/Place an orderGET/orders/{id}Order statusPOST/ai/chatAI recommendationWS/ws/ordersReal-time order updates
Full API docs available at /docs (Swagger UI)

🗄️ Database

PostgreSQL with Alembic migrations
Models: User, Table, MenuItem, Order, OrderItem, Conversation, Review


🚢 Deployment

Ubuntu 22.04 on DigitalOcean
Nginx as reverse proxy
SSL via Let's Encrypt (auto-renew with Certbot)
Backend runs on port 8001, frontend on port 5174


👨‍💻 Author
Built by [Your Name] — Python Backend Developer · AI Integration

GitHub: xusanboyf32
Telegram: @Khusanboy_005


📄 License
MIT License


This project was built as a portfolio piece to demonstrate real-world FastAPI, PostgreSQL, WebSocket, and AI integration skills.
