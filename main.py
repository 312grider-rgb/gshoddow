"""
SkillStream Backend — FastAPI
Handles: AI lessons, AI chat, user auth, sessions, WebSocket real-time
"""

import os, json, uuid, hashlib, hmac, time
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

# ─── CONFIG ──────────────────────────────────────────────────────────────────
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
SECRET_KEY        = os.environ.get("SECRET_KEY", "skillstream-secret-2026")
ANTHROPIC_URL     = "https://api.anthropic.com/v1/messages"
MODEL             = "claude-sonnet-4-6"

users    = {}
sessions = {}
rooms    = {}

# ─── APP ─────────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 SkillStream backend starting...")
    yield

app = FastAPI(title="SkillStream API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# ─── HELPERS ─────────────────────────────────────────────────────────────────
def hash_password(password: str) -> str:
    return hashlib.sha256((password + SECRET_KEY).encode()).hexdigest()

def make_token(user_id: str) -> str:
    payload = f"{user_id}:{int(time.time())}"
    sig = hmac.new(SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}:{sig}"

def verify_token(token: str) -> Optional[str]:
    try:
        parts = token.split(":")
        user_id, ts, sig = parts[0], parts[1], parts[2]
        expected = hmac.new(SECRET_KEY.encode(), f"{user_id}:{ts}".encode(), hashlib.sha256).hexdigest()
        if hmac.compare_digest(sig, expected):
            return user_id
    except Exception:
        pass
    return None

def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    token = authorization.split(" ", 1)[1]
    user_id = verify_token(token)
    if not user_id or user_id not in users:
        raise HTTPException(status_code=401, detail="Invalid token")
    return users[user_id]

async def call_anthropic(system: str, messages: list, max_tokens: int = 1000) -> str:
    if not ANTHROPIC_API_KEY:
        raise HTTPException(status_code=500, detail="API key not configured on server")
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            ANTHROPIC_URL,
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={"model": MODEL, "max_tokens": max_tokens, "system": system, "messages": messages}
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"AI error: {resp.text}")
        data = resp.json()
        return "".join(b.get("text", "") for b in data.get("content", []))

# ─── WEBSOCKET MANAGER ───────────────────────────────────────────────────────
class RoomManager:
    def __init__(self, room_code: str):
        self.room_code = room_code
        self.connections: dict = {}
        self.user_names: dict = {}

    async def connect(self, ws: WebSocket, user_id: str, name: str):
        await ws.accept()
        self.connections[user_id] = ws
        self.user_names[user_id] = name
        await self.broadcast({"type": "user_joined", "user_id": user_id, "name": name, "count": len(self.connections)}, exclude=user_id)

    def disconnect(self, user_id: str):
        self.connections.pop(user_id, None)
        return self.user_names.pop(user_id, "Someone")

    async def broadcast(self, data: dict, exclude: str = None):
        dead = []
        for uid, ws in self.connections.items():
            if uid == exclude:
                continue
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(uid)
        for uid in dead:
            self.connections.pop(uid, None)

    async def send_to(self, user_id: str, data: dict):
        ws = self.connections.get(user_id)
        if ws:
            try:
                await ws.send_json(data)
            except Exception:
                pass

    def get_participants(self):
        return [{"user_id": uid, "name": name} for uid, name in self.user_names.items()]

def get_room(room_code: str) -> RoomManager:
    if room_code not in rooms:
        rooms[room_code] = RoomManager(room_code)
    return rooms[room_code]

# ─── MODELS ──────────────────────────────────────────────────────────────────
class SignupRequest(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    password: str
    role: str = "student"

class SigninRequest(BaseModel):
    contact: str
    password: str

class LessonRequest(BaseModel):
    topic: str
    language: str = "en"

class ChatRequest(BaseModel):
    message: str
    history: list = []
    lesson_context: str = ""
    language: str = "en"

class SessionCreate(BaseModel):
    title: str
    room_code: Optional[str] = None

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    role: Optional[str] = None
    skills: Optional[list] = None
    country: Optional[str] = None
    timezone: Optional[str] = None

# ─── HEALTH ──────────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {"status": "ok", "service": "SkillStream API", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy", "ai_configured": bool(ANTHROPIC_API_KEY), "users": len(users), "sessions": len(sessions)}

# ─── AUTH ────────────────────────────────────────────────────────────────────
@app.post("/api/auth/signup")
async def signup(req: SignupRequest):
    if not req.email and not req.phone:
        raise HTTPException(400, "Email or phone required")
    if not req.name.strip():
        raise HTTPException(400, "Name required")
    if not req.password or len(req.password) < 4:
        raise HTTPException(400, "Password must be at least 4 characters")
    contact = (req.email or req.phone).lower().strip()
    for u in users.values():
        if u.get("contact") == contact:
            raise HTTPException(409, "Account already exists")
    user_id = str(uuid.uuid4())
    users[user_id] = {
        "id": user_id, "name": req.name.strip(), "email": req.email,
        "phone": req.phone, "contact": contact,
        "password_hash": hash_password(req.password),
        "role": req.role, "skills": [], "bio": "", "country": "",
        "timezone": "", "avatar": None, "sessions": 0, "hours": 0,
        "session_history": [], "created_at": int(time.time()),
    }
    token = make_token(user_id)
    return {"token": token, "user": {k: v for k, v in users[user_id].items() if k != "password_hash"}}

@app.post("/api/auth/signin")
async def signin(req: SigninRequest):
    contact = req.contact.lower().strip()
    ph = hash_password(req.password)
    for u in users.values():
        if u.get("contact") == contact and u.get("password_hash") == ph:
            token = make_token(u["id"])
            return {"token": token, "user": {k: v for k, v in u.items() if k != "password_hash"}}
    raise HTTPException(401, "Invalid credentials")

@app.get("/api/auth/me")
async def me(user=Depends(get_current_user)):
    return {k: v for k, v in user.items() if k != "password_hash"}

@app.patch("/api/auth/profile")
async def update_profile(req: ProfileUpdate, user=Depends(get_current_user)):
    for field, val in req.dict(exclude_none=True).items():
        user[field] = val
    return {k: v for k, v in user.items() if k != "password_hash"}

# ─── SESSIONS ────────────────────────────────────────────────────────────────
@app.get("/api/sessions")
async def list_sessions():
    return {"sessions": list(sessions.values())}

@app.post("/api/sessions")
async def create_session(req: SessionCreate, user=Depends(get_current_user)):
    room_code = req.room_code or str(uuid.uuid4())[:8].upper()
    sessions[room_code] = {
        "room_code": room_code, "title": req.title,
        "host_id": user["id"], "host_name": user["name"],
        "created_at": int(time.time()), "participants": [], "ai_enabled": True,
    }
    return sessions[room_code]

@app.get("/api/sessions/{room_code}")
async def get_session(room_code: str):
    if room_code not in sessions:
        raise HTTPException(404, "Session not found")
    s = sessions[room_code].copy()
    room = rooms.get(room_code)
    s["participants"] = room.get_participants() if room else []
    return s

# ─── AI ──────────────────────────────────────────────────────────────────────
LANG_INSTRUCTIONS = {
    "en": "Respond in English.",
    "ar": "Respond in Arabic (العربية).",
    "fr": "Réponds en français.",
    "es": "Responde en español.",
    "zh": "用中文回答。",
}

@app.post("/api/ai/lesson")
async def generate_lesson(req: LessonRequest):
    lang_instr = LANG_INSTRUCTIONS.get(req.language, LANG_INSTRUCTIONS["en"])
    system = f"""You are an enthusiastic AI teacher in SkillStream.
{lang_instr}
Return ONLY a JSON object, no markdown:
{{"steps":["step1","step2","step3","step4","step5"]}}
Each step: 2-4 sentences, clear and educational."""
    raw = await call_anthropic(system, [{"role": "user", "content": f"Create a 5-step lesson on: {req.topic}"}])
    clean = raw.replace("```json", "").replace("```", "").strip()
    try:
        parsed = json.loads(clean)
        return {"steps": parsed.get("steps", []), "topic": req.topic}
    except json.JSONDecodeError:
        raise HTTPException(502, "AI returned invalid format")

@app.post("/api/ai/chat")
async def ai_chat(req: ChatRequest):
    lang_instr = LANG_INSTRUCTIONS.get(req.language, LANG_INSTRUCTIONS["en"])
    system = f"""You are a friendly AI teacher in SkillStream.
{lang_instr}
{f'Lesson context: {req.lesson_context}' if req.lesson_context else ''}
Answer clearly. Plain text only. Under 150 words."""
    messages = req.history[-10:] + [{"role": "user", "content": req.message}]
    reply = await call_anthropic(system, messages)
    return {"reply": reply.strip()}

# ─── WEBSOCKET ───────────────────────────────────────────────────────────────
@app.websocket("/ws/{room_code}")
async def websocket_endpoint(ws: WebSocket, room_code: str, user_id: str = None, name: str = "Guest"):
    room = get_room(room_code)
    uid = user_id or str(uuid.uuid4())[:8]
    await room.connect(ws, uid, name)
    await ws.send_json({"type": "participants", "participants": room.get_participants()})
    try:
        while True:
            data = await ws.receive_json()
            msg_type = data.get("type")
            if msg_type == "chat":
                await room.broadcast({"type": "chat", "user_id": uid, "name": name, "text": data.get("text", ""), "ts": int(time.time())})
            elif msg_type == "reaction":
                await room.broadcast({"type": "reaction", "emoji": data.get("emoji"), "name": name})
            elif msg_type == "signal":
                target = data.get("target")
                if target:
                    await room.send_to(target, {"type": "signal", "from": uid, "signal": data.get("signal")})
                else:
                    await room.broadcast({"type": "signal", "from": uid, "signal": data.get("signal")}, exclude=uid)
            elif msg_type == "ping":
                await ws.send_json({"type": "pong"})
    except WebSocketDisconnect:
        name_left = room.disconnect(uid)
        await room.broadcast({"type": "user_left", "user_id": uid, "name": name_left, "count": len(room.connections)})
        if not room.connections and room_code in rooms:
            del rooms[room_code]
