import json
import asyncio
import random
import uuid
from typing import List, Optional
from datetime import datetime, date
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Boolean, Float, Date, DateTime, func
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from pydantic import BaseModel, EmailStr
import bcrypt
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from dotenv import load_dotenv
import os

load_dotenv()

# --- 1. DATABASE SETUP (SQLite) ---
SQLALCHEMY_DATABASE_URL = "sqlite:///./turfpro.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def hash_password(password: str) -> str:
    # bcrypt requires bytes, so encode. Returns bytes, so decode to store as string
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    pwd_bytes = plain_password.encode('utf-8')
    hash_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(pwd_bytes, hash_bytes)

# --- EMAIL CONFIGURATION ---
conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"),
    MAIL_FROM=os.getenv("MAIL_FROM"),
    MAIL_PORT=int(os.getenv("MAIL_PORT", 587)),
    MAIL_SERVER=os.getenv("MAIL_SERVER"),
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True,
    MAIL_FROM_NAME=os.getenv("MAIL_FROM_NAME", "TurfPro Support")
)

fm = FastMail(conf)

# Canonical booking slots used across the app.
DEFAULT_SLOT_PRICES = [
    ("10:00 AM", 600),
    ("11:00 AM", 600),
    ("12:00 PM", 600),
    ("1:00 PM", 600),
    ("2:00 PM", 600),
    ("3:00 PM", 600),
    ("4:00 PM", 600),
    ("5:00 PM", 600),
    ("6:00 PM", 800),
    ("7:00 PM", 1000),
    ("8:00 PM", 1200),
    ("9:00 PM", 1200),
    ("10:00 PM", 1000),
    ("11:00 PM", 800),
    ("12:00 AM", 600),
]

# --- 2. DATABASE MODELS ---
class Turf(Base):
    __tablename__ = "turfs"
    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    location = Column(String)
    image = Column(String)
    rating = Column(Float)
    price_start = Column(Integer)
    slot_prices = Column(String, nullable=True)  # JSON object: {"5:00 PM": 600, ...}
    sports = Column(String)  # JSON string
    distance = Column(String)

class Booking(Base):
    __tablename__ = "bookings"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    turf_id = Column(String)
    turf_name = Column(String)
    slot_time = Column(String)  # e.g., "5:00 PM"
    booking_date = Column(Date)
    customer_name = Column(String)
    customer_email = Column(String)  # Changed from customer_mobile
    court_type = Column(String)  # "5v5" or "7v7"
    price = Column(Integer)
    status = Column(String, default="Confirmed")  # Confirmed, Pending, Cancelled
    created_at = Column(DateTime, default=datetime.utcnow)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    name = Column(String)
    otp = Column(String)  # For email verification
    is_email_verified = Column(Boolean, default=False)
    role = Column(String, default="player")  # admin, staff, player
    managed_turf_id = Column(String, nullable=True)  # Links staff to a turf
    created_at = Column(DateTime, default=datetime.utcnow)

# Create tables
Base.metadata.create_all(bind=engine)

# --- 3. PYDANTIC SCHEMAS ---
class TurfResponse(BaseModel):
    id: str
    name: str
    location: str
    image: str
    rating: float
    priceStart: int
    slotPrices: dict[str, int]
    sports: List[str]
    distance: str

class SlotResponse(BaseModel):
    id: str
    time: str
    isBooked: bool
    price: int

class BookingRequest(BaseModel):
    turf_id: str
    turf_name: str
    slot_time: str
    booking_date: str  # ISO format
    customer_name: str
    customer_email: str  # Changed from customer_mobile
    court_type: str
    price: int

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str

class VerifyEmailRequest(BaseModel):
    email: EmailStr
    otp: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class CreateTurfRequest(BaseModel):
    name: str
    location: str
    image: str
    price_start: int
    sports: list[str]
    slot_prices: Optional[dict[str, int]] = None

class CreateStaffRequest(BaseModel):
    email: EmailStr
    name: str
    password: str
    managed_turf_id: str

class AdminStatsResponse(BaseModel):
    total_revenue: int
    total_bookings: int
    active_users: int

def ensure_turfs_slot_prices_column():
    """Add slot_prices column for older SQLite databases if missing."""
    with engine.begin() as connection:
        columns = {row[1] for row in connection.exec_driver_sql("PRAGMA table_info(turfs)").fetchall()}
        if "slot_prices" not in columns:
            connection.exec_driver_sql("ALTER TABLE turfs ADD COLUMN slot_prices TEXT")
            print("Added missing turfs.slot_prices column")

def normalize_slot_prices(slot_prices: Optional[dict[str, int]], default_price: Optional[int] = None) -> dict[str, int]:
    """Return a full slot->price map with safe integer values for all canonical slots."""
    try:
        normalized_default_price = int(default_price) if default_price is not None else None
    except (TypeError, ValueError):
        normalized_default_price = None

    normalized: dict[str, int] = {}
    for slot_time, fallback_price in DEFAULT_SLOT_PRICES:
        raw = slot_prices.get(slot_time) if isinstance(slot_prices, dict) else None
        effective_fallback = normalized_default_price if normalized_default_price is not None else fallback_price
        try:
            parsed_price = int(raw) if raw is not None else effective_fallback
        except (TypeError, ValueError):
            parsed_price = effective_fallback
        normalized[slot_time] = max(parsed_price, 0)
    return normalized

def build_uniform_slot_prices(price: Optional[int]) -> dict[str, int]:
    """Use one fixed price for all canonical slots."""
    try:
        fixed_price = int(price) if price is not None else 0
    except (TypeError, ValueError):
        fixed_price = 0
    fixed_price = max(fixed_price, 0)
    return {slot_time: fixed_price for slot_time, _ in DEFAULT_SLOT_PRICES}

def get_turf_slot_prices(turf: Turf) -> dict[str, int]:
    if turf.slot_prices:
        try:
            parsed = json.loads(turf.slot_prices)
            if isinstance(parsed, dict):
                return normalize_slot_prices(parsed, turf.price_start)
        except (TypeError, ValueError, json.JSONDecodeError):
            pass

    # Backward compatibility: old turfs had only price_start.
    if turf.price_start is not None and turf.price_start > 0:
        return normalize_slot_prices(build_uniform_slot_prices(turf.price_start), turf.price_start)

    return normalize_slot_prices(None)

def backfill_turf_slot_prices(db: Session):
    """Populate/normalize slot_prices for all turfs based on current canonical slots."""
    updated_count = 0
    turfs = db.query(Turf).all()
    for turf in turfs:
        current_map = None
        if turf.slot_prices:
            try:
                parsed = json.loads(turf.slot_prices)
                if isinstance(parsed, dict):
                    current_map = parsed
            except (TypeError, ValueError, json.JSONDecodeError):
                current_map = None

        normalized_map = get_turf_slot_prices(turf)
        if current_map != normalized_map:
            turf.slot_prices = json.dumps(normalized_map)
            updated_count += 1
    if updated_count:
        db.commit()
        print(f"Normalized slot_prices for {updated_count} turf(s)")

# --- 4. REAL-TIME WEBSOCKET MANAGER ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"Client connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        print(f"Client disconnected. Total connections: {len(self.active_connections)}")

    async def broadcast(self, message: str):
        """Send message to ALL connected clients"""
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                print(f"Error broadcasting to client: {e}")

manager = ConnectionManager()

# --- 5. FASTAPI APP SETUP ---
app = FastAPI(title="TurfPro API", version="1.0.0")

# CORS - Allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- 6. SEED DATA (Run once) ---
def seed_data(db: Session):
    """Populate database with initial turfs if empty"""
    # Seed Super Admin
    if not db.query(User).filter(User.email == "admin@turfpro.com").first():
        admin = User(
            email="admin@turfpro.com",
            password_hash=hash_password("admin123"),
            name="Super Admin",
            role="admin",
            is_email_verified=True
        )
        db.add(admin)
        db.commit()
        print("✅ Seeded Admin: admin@turfpro.com / admin123")

# Seed on startup
@app.on_event("startup")
def startup_event():
    ensure_turfs_slot_prices_column()
    db = SessionLocal()
    seed_data(db)
    backfill_turf_slot_prices(db)
    db.close()

# --- 7. API ENDPOINTS ---

@app.get("/")
def root():
    return {"message": "TurfPro API is running!", "version": "1.0.0"}

@app.get("/api/turfs", response_model=List[TurfResponse])
def get_turfs(db: Session = Depends(get_db)):
    """Get all available turfs"""
    turfs = db.query(Turf).all()
    result: list[TurfResponse] = []
    for turf in turfs:
        result.append(serialize_turf(turf))
    return result

def serialize_turf(turf: Turf) -> TurfResponse:
    slot_prices = get_turf_slot_prices(turf)
    default_price_start = min(slot_prices.values()) if slot_prices else 0
    return TurfResponse(
        id=turf.id,
        name=turf.name,
        location=turf.location,
        image=turf.image,
        rating=turf.rating,
        priceStart=turf.price_start if turf.price_start is not None else default_price_start,
        slotPrices=slot_prices,
        sports=json.loads(turf.sports),
        distance=turf.distance
    )

@app.get("/api/turfs/{turf_id}", response_model=TurfResponse)
def get_turf_details(turf_id: str, db: Session = Depends(get_db)):
    turf = db.query(Turf).filter(Turf.id == turf_id).first()
    if not turf:
        raise HTTPException(status_code=404, detail="Turf not found")
    return serialize_turf(turf)

@app.get("/api/turfs/{turf_id}/bookings")
def get_turf_bookings(turf_id: str, db: Session = Depends(get_db)):
    turf = db.query(Turf).filter(Turf.id == turf_id).first()
    if not turf:
        raise HTTPException(status_code=404, detail="Turf not found")

    bookings = db.query(Booking).filter(
        Booking.turf_id == turf_id
    ).order_by(
        Booking.created_at.desc()
    ).all()

    return [
        {
            "id": f"B{str(b.id).zfill(3)}",
            "customerName": b.customer_name,
            "customerEmail": b.customer_email,
            "time": b.slot_time,
            "date": b.booking_date.isoformat(),
            "status": b.status,
            "price": b.price
        }
        for b in bookings
    ]

@app.get("/api/slots/{turf_id}")
def get_slots(turf_id: str, booking_date: str, db: Session = Depends(get_db)):
    """Get available slots for a turf on a specific date"""
    # Parse date
    try:
        target_date = datetime.fromisoformat(booking_date).date()
    except:
        raise HTTPException(status_code=400, detail="Invalid date format")
    
    turf = db.query(Turf).filter(Turf.id == turf_id).first()
    if not turf:
        raise HTTPException(status_code=404, detail="Turf not found")

    slot_prices = get_turf_slot_prices(turf)
    time_slots = [
        {"id": str(index), "time": slot_time, "price": slot_prices[slot_time]}
        for index, (slot_time, _) in enumerate(DEFAULT_SLOT_PRICES, start=1)
    ]
    
    # Check which slots are booked
    booked_slots = db.query(Booking.slot_time).filter(
        Booking.turf_id == turf_id,
        Booking.booking_date == target_date,
        Booking.status == "Confirmed"
    ).all()
    
    booked_times = {slot[0] for slot in booked_slots}
    
    return [
        SlotResponse(
            id=slot["id"],
            time=slot["time"],
            isBooked=slot["time"] in booked_times,
            price=slot["price"]
        )
        for slot in time_slots
    ]

@app.post("/api/book")
async def book_slot(request: BookingRequest, db: Session = Depends(get_db)):
    """Book a slot and broadcast to all connected clients"""
    
    # Parse date
    try:
        target_date = datetime.fromisoformat(request.booking_date).date()
    except:
        raise HTTPException(status_code=400, detail="Invalid date format")
    
    turf = db.query(Turf).filter(Turf.id == request.turf_id).first()
    if not turf:
        raise HTTPException(status_code=404, detail="Turf not found")

    slot_prices = get_turf_slot_prices(turf)
    if request.slot_time not in slot_prices:
        raise HTTPException(status_code=400, detail="Invalid slot time")

    booking_price = slot_prices[request.slot_time]

    # Check if slot already booked
    existing = db.query(Booking).filter(
        Booking.turf_id == request.turf_id,
        Booking.slot_time == request.slot_time,
        Booking.booking_date == target_date,
        Booking.status == "Confirmed"
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Slot already booked")
    
    # Create booking
    new_booking = Booking(
        turf_id=request.turf_id,
        turf_name=turf.name,
        slot_time=request.slot_time,
        booking_date=target_date,
        customer_name=request.customer_name,
        customer_email=request.customer_email,  # Changed from customer_mobile
        court_type=request.court_type,
        price=booking_price,
        status="Confirmed"
    )
    
    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)
    
    # BROADCAST REAL-TIME UPDATE
    update_msg = json.dumps({
        "type": "SLOT_BOOKED",
        "turf_id": request.turf_id,
        "slot_time": request.slot_time,
        "booking_date": request.booking_date,
        "booking_id": new_booking.id,
        "customer_name": request.customer_name
    })
    await manager.broadcast(update_msg)
    
    return {
        "status": "success",
        "message": "Booking confirmed!",
        "booking_id": new_booking.id,
        "charged_price": booking_price
    }

@app.post("/api/auth/register")
async def register_user(request: RegisterRequest, db: Session = Depends(get_db)):
    """Register new user with email and password"""
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Validate password length
    if len(request.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    
    # Generate 6-digit OTP for email verification
    otp = str(random.randint(100000, 999999))
    
    # Hash password
    password_hash = hash_password(request.password)
    
    # Create user
    new_user = User(
        email=request.email,
        password_hash=password_hash,
        name=request.name,
        otp=otp,
        is_email_verified=False
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # In production, send email here
    # Send real email
    message = MessageSchema(
        subject="Verify your TurfSync account",
        recipients=[request.email],
        body=f"""
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h1 style="color: #10b981;">Welcome to TurfSync!</h1>
            <p>Hi {request.name},</p>
            <p>Your verification code is:</p>
            <h2 style="background: #f3f4f6; padding: 10px 20px; display: inline-block; border-radius: 8px; letter-spacing: 5px;">{otp}</h2>
            <p>This code will expire in 10 minutes.</p>
        </div>
        """,
        subtype=MessageType.html
    )

    try:
        await fm.send_message(message)
    except Exception as e:
        print(f"❌ Failed to send email: {e}")
        # rollback user creation if email fails? No, for now let them retry or use demo mode fallback
    
    return {
        "status": "success",
        "message": "Registration successful. Please verify your email.",
        # "otp": otp  # REMOVED: No more OTP in response for security!
    }

@app.post("/api/auth/verify-email")
def verify_email(request: VerifyEmailRequest, db: Session = Depends(get_db)):
    """Verify email with OTP"""
    user = db.query(User).filter(User.email == request.email).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.is_email_verified:
        raise HTTPException(status_code=400, detail="Email already verified")
    
    if user.otp != request.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    user.is_email_verified = True
    user.otp = None  # Clear OTP after verification
    db.commit()
    
    return {
        "status": "success",
        "message": "Email verified successfully",
        "user": {
            "email": user.email,
            "name": user.name
        }
    }

@app.post("/api/auth/login")
def login_user(request: LoginRequest, db: Session = Depends(get_db)):
    """Login with email and password"""
    user = db.query(User).filter(User.email == request.email).first()
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not user.is_email_verified:
        raise HTTPException(status_code=403, detail="Please verify your email first")
    
    if not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    return {
        "status": "success",
        "message": "Login successful",
        "user": {
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "managedTurfId": user.managed_turf_id
        }
    }

# --- Admin Endpoints ---

@app.post("/api/turfs")
def create_turf(request: CreateTurfRequest, db: Session = Depends(get_db)):
    print(f"Creating turf: {request}") # Debug log
    turf_id = str(uuid.uuid4())
    slot_prices = normalize_slot_prices(request.slot_prices)
    min_slot_price = min(slot_prices.values()) if slot_prices else 0
    price_start = request.price_start if request.price_start > 0 else min_slot_price
    new_turf = Turf(
        id=turf_id,
        name=request.name.strip(), # Clean input
        location=request.location.strip(),
        image=request.image.strip(),
        rating=0.0,  # Default rating
        price_start=price_start,
        slot_prices=json.dumps(slot_prices),
        sports=json.dumps([s.strip() for s in request.sports if s.strip()]),
        distance="0 km" # Default distance
    )
    try:
        db.add(new_turf)
        db.commit()
        db.refresh(new_turf)
        print(f"Turf created: {turf_id}")
        return {"status": "success", "message": "Turf created successfully", "turf_id": turf_id}
    except Exception as e:
        print(f"Error creating turf: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create turf: {str(e)}")

@app.delete("/api/turfs/{turf_id}")
def delete_turf(turf_id: str, db: Session = Depends(get_db)):
    # Check if turf exists
    turf = db.query(Turf).filter(Turf.id == turf_id).first()
    if not turf:
        raise HTTPException(status_code=404, detail="Turf not found")
    
    # Delete associated bookings (optional, but cleaner)
    db.query(Booking).filter(Booking.turf_id == turf_id).delete()
    
    # Delete turf
    db.delete(turf)
    db.commit()
    
    return {"status": "success", "message": "Turf deleted successfully"}

@app.get("/api/users")
def get_users(role: str = None, db: Session = Depends(get_db)):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    users = query.all()
    return [
        {
            "id": u.id,
            "name": u.name, 
            "email": u.email, 
            "role": u.role, 
            "managedTurfId": u.managed_turf_id
        } 
        for u in users
    ]

@app.post("/api/admin/staff")
def create_staff(request: CreateStaffRequest, db: Session = Depends(get_db)):
    # Check if user exists
    if db.query(User).filter(User.email == request.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password
    password_hash = hash_password(request.password)
    
    new_staff = User(
        email=request.email,
        password_hash=password_hash,
        name=request.name,
        role="staff",
        managed_turf_id=request.managed_turf_id,
        is_email_verified=True # Auto-verify staff created by admin
    )
    
    db.add(new_staff)
    db.commit()
    
    return {"status": "success", "message": "Staff account created"}

@app.delete("/api/admin/staff/{staff_id}")
def delete_staff(staff_id: int, db: Session = Depends(get_db)):
    """Delete a staff account"""
    staff = db.query(User).filter(User.id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")

    if staff.role != "staff":
        raise HTTPException(status_code=400, detail="Only staff accounts can be deleted here")

    db.delete(staff)
    db.commit()

    return {"status": "success", "message": "Staff deleted successfully"}

@app.get("/api/admin/stats", response_model=AdminStatsResponse)
def get_admin_stats(db: Session = Depends(get_db)):
    """Get dashboard statistics"""
    total_revenue = db.query(
        func.coalesce(func.sum(Booking.price), 0)
    ).filter(
        Booking.status == "Confirmed"
    ).scalar()
    total_bookings = db.query(Booking).count()
    active_users = db.query(User).filter(User.is_email_verified == True).count()
    
    return AdminStatsResponse(
        total_revenue=int(total_revenue or 0),
        total_bookings=total_bookings,
        active_users=active_users
    )

@app.get("/api/admin/bookings")
def get_recent_bookings(limit: int = 10, db: Session = Depends(get_db)):
    """Get recent bookings for admin dashboard"""
    bookings = db.query(Booking).order_by(Booking.created_at.desc()).limit(limit).all()
    
    return [
        {
            "id": f"B{str(b.id).zfill(3)}",
            "customerName": b.customer_name,
            "time": b.slot_time,
            "court": b.turf_name,
            "status": b.status,
            "price": b.price,
            "date": b.booking_date.isoformat()
        }
        for b in bookings
    ]

@app.get("/api/bookings")
def get_user_bookings(email: str, db: Session = Depends(get_db)):
    """Get bookings for a specific user"""
    bookings = db.query(Booking).filter(Booking.customer_email == email).order_by(Booking.booking_date.desc()).all()
    
    return [
        {
            "id": f"B{str(b.id).zfill(3)}",
            "turfName": b.turf_name, # Changed from court for clarity in frontend
            "time": b.slot_time,
            "date": b.booking_date.isoformat(),
            "price": b.price,
            "status": b.status,
            "turfId": b.turf_id
        }
        for b in bookings
    ]


@app.post("/api/bookings/{booking_id}/cancel")
async def cancel_booking(booking_id: str, db: Session = Depends(get_db)):
    """Cancel a booking"""
    # booking_id comes as "B001", need to strip 'B' and convert to int
    try:
        b_id = int(booking_id.replace("B", ""))
    except:
         raise HTTPException(status_code=400, detail="Invalid booking ID format")

    booking = db.query(Booking).filter(Booking.id == b_id).first()
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking.status == "Cancelled":
        raise HTTPException(status_code=400, detail="Booking is already cancelled")

    booking.status = "Cancelled"
    db.commit()
    
    # Broadcast update to free up the slot immediately
    update_msg = json.dumps({
        "type": "SLOT_BOOKED", 
        "turf_id": booking.turf_id,
        "booking_id": booking.id
    })
    await manager.broadcast(update_msg)
    
    return {"status": "success", "message": "Booking cancelled successfully"}

@app.post("/api/reset")
async def reset_database(db: Session = Depends(get_db)):
    """Reset all bookings (for demo purposes)"""
    db.query(Booking).delete()
    db.commit()
    
    await manager.broadcast(json.dumps({"type": "RESET"}))
    
    return {"status": "success", "message": "Database reset"}

class UpdateProfileRequest(BaseModel):
    name: str
    password: Optional[str] = None
    email: Optional[str] = None # Optional, normally not allowed to change easily

@app.put("/api/users/me")
def update_profile(request: UpdateProfileRequest, db: Session = Depends(get_db)):
    # In a real app, we'd get the current user from the token/session
    # For now, we'll rely on the email passed in the request to identify the user
    # (Secure implementation would use a dependency like get_current_user)
    
    if not request.email:
         raise HTTPException(status_code=400, detail="Email is required to identify user")

    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.name = request.name
    
    if request.password and len(request.password) >= 8:
        user.password_hash = hash_password(request.password)
    elif request.password:
         raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    db.commit()
    db.refresh(user)
    
    return {
        "status": "success",
        "message": "Profile updated successfully",
        "user": {
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "managedTurfId": user.managed_turf_id
        }
    }

# --- 8. WEBSOCKET ENDPOINT ---
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive and listen for messages
            data = await websocket.receive_text()
            # Echo back or handle client messages if needed
    except WebSocketDisconnect:
        manager.disconnect(websocket)
