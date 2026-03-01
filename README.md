# TurfSync - Real-Time Turf Booking System

A full-stack turf booking application with **real-time WebSocket synchronization**. Built with React (TypeScript) + Python FastAPI.

## 🚀 Features

- ✅ **Real-Time Slot Sync** - Instant updates across all devices via WebSockets
- ✅ **OTP Authentication** - Secure login with mobile OTP verification
- ✅ **Multi-Turf Support** - Browse and book from multiple venues
- ✅ **Admin Dashboard** - Live stats, bookings, and AI-powered insights
- ✅ **Cross-Platform** - Works on web and mobile browsers
- ✅ **Premium UI** - Dark theme with glassmorphism and smooth animations

## 📁 Project Structure

```
SouthSideTrufbooking-App/
├── backend/
│   ├── main.py              # FastAPI server with WebSocket
│   ├── requirements.txt     # Python dependencies
│   └── turfpro.db          # SQLite database (auto-created)
└── frontend/
    ├── components/
    │   ├── MobileBooking.tsx
    │   └── AdminDashboard.tsx
    ├── services/
    │   ├── api.ts           # API client
    │   ├── websocket.ts     # WebSocket service
    │   └── geminiService.ts # AI insights
    ├── .env.local           # Environment variables
    └── package.json
```

## 🛠️ Setup Instructions

### Prerequisites

- **Python 3.8+**
- **Node.js 18+**
- **npm** or **yarn**

### 1. Backend Setup

```bash
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Start the server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will be available at `http://localhost:8000`

**API Endpoints:**
- `GET /api/turfs` - List all turfs
- `GET /api/slots/:turfId` - Get available slots
- `POST /api/book` - Book a slot
- `POST /api/auth/otp` - Send OTP
- `POST /api/auth/verify` - Verify OTP
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/bookings` - Recent bookings
- `WS /ws` - WebSocket connection

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev -- --host
```

The frontend will be available at `http://localhost:3000`

### 3. Environment Configuration

Update `frontend/.env.local`:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws
GEMINI_API_KEY=your_gemini_api_key_here
```

## 📱 Mobile Testing

To test on your mobile device:

### 1. Find Your Laptop IP

**Windows:**
```bash
ipconfig
```
Look for `IPv4 Address` (e.g., `192.168.1.10`)

**Mac/Linux:**
```bash
ifconfig
```

### 2. Update Environment Variables

Edit `frontend/.env.local`:
```env
VITE_API_BASE_URL=http://192.168.1.10:8000
VITE_WS_URL=ws://192.168.1.10:8000/ws
```

### 3. Start Both Servers

```bash
# Terminal 1 - Backend
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 - Frontend
cd frontend
npm run dev -- --host
```

### 4. Access on Mobile

- Connect your phone to the **same WiFi** as your laptop
- Open browser and go to: `http://192.168.1.10:3000`

## 🎯 Demo Flow

### The Real-Time Sync Demo

1. **Laptop**: Open `http://localhost:3000` → Login as Admin
2. **Phone**: Open `http://192.168.1.10:3000` → Login as Player
3. **Action**: Book a slot on your phone
4. **Magic**: Watch the slot turn RED on your laptop **instantly** without refreshing!

This demonstrates zero double-booking with WebSocket technology.

## 🔑 Default OTP (Demo Mode)

The backend returns the OTP in the API response for demo purposes:
- Any 4-digit code will work
- Check browser console for the generated OTP
- In production, integrate with SMS gateway

## 🏗️ Tech Stack

### Frontend
- **React 19** with TypeScript
- **Tailwind CSS** for styling
- **Vite** for build tooling
- **Axios** for HTTP requests
- **WebSocket API** for real-time updates
- **Recharts** for data visualization
- **Lucide React** for icons
- **Google Gemini AI** for insights

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - ORM for database
- **SQLite** - Lightweight database
- **WebSockets** - Real-time communication
- **Pydantic** - Data validation

## 📊 Database Schema

### Turfs
- id, name, location, image, rating, price_start, sports, distance

### Bookings
- id, turf_id, slot_time, booking_date, customer_name, customer_mobile, court_type, price, status

### Users
- id, mobile, name, email, otp, is_verified

## 🎨 Features Breakdown

### Player App
- OTP-based authentication
- Browse turfs with search/filter
- View available slots by date
- Multi-slot booking
- Real-time slot availability
- Booking history
- Profile management

### Admin Dashboard
- Live booking statistics
- Revenue tracking
- Recent bookings table
- AI-powered insights (Gemini)
- Real-time updates via WebSocket

## 🚧 Production Considerations

Before deploying to production:

1. **Security**
   - Remove OTP from API responses
   - Integrate real SMS gateway
   - Add JWT authentication
   - Implement rate limiting
   - Use HTTPS/WSS

2. **Database**
   - Migrate from SQLite to PostgreSQL
   - Add database migrations
   - Implement backup strategy

3. **Scaling**
   - Use Redis for WebSocket pub/sub
   - Add load balancer
   - Implement caching
   - CDN for static assets

4. **Monitoring**
   - Add logging (e.g., Sentry)
   - Performance monitoring
   - Error tracking

## 📝 License

MIT License - Feel free to use for your college project!

## 🤝 Contributing

This is a college MVP project. Feel free to fork and enhance!

---

**Built with ❤️ for college presentation**
