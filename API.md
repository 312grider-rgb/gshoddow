# API Reference

Base URL: `http://localhost:8000` (local) | `https://your-deployment.com` (production)

All requests should include:
```
Content-Type: application/json
Authorization: Bearer <token>  (for authenticated endpoints)
```

---

## Authentication

### POST `/api/auth/signup`
Register a new user.

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "secure_password",
  "role": "student"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "student",
    "created_at": 1234567890
  }
}
```

**Status Codes:**
- `200` — Success
- `400` — Missing or invalid fields
- `409` — User already exists

---

### POST `/api/auth/signin`
Authenticate an existing user.

**Request:**
```json
{
  "contact": "john@example.com",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { ... }
}
```

**Status Codes:**
- `200` — Success
- `401` — Invalid credentials

---

### GET `/api/auth/me`
Get current user profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "student",
  "bio": "I love learning",
  "skills": ["Python", "JavaScript"],
  "created_at": 1234567890
}
```

---

## AI Endpoints

### POST `/api/ai/lesson`
Generate an AI lesson on a topic.

**Request:**
```json
{
  "topic": "Introduction to Python",
  "language": "en"
}
```

**Response:**
```json
{
  "topic": "Introduction to Python",
  "steps": [
    "Step 1: Understanding variables and data types...",
    "Step 2: Control flow with if/else statements...",
    "Step 3: Functions and modularity...",
    "Step 4: Working with lists and dictionaries...",
    "Step 5: File handling and exceptions..."
  ]
}
```

**Status Codes:**
- `200` — Success
- `500` — AI service error

---

### POST `/api/ai/chat`
Chat with the AI tutor.

**Request:**
```json
{
  "message": "How do I write a loop in Python?",
  "history": [
    {"role": "user", "content": "What is Python?"},
    {"role": "assistant", "content": "Python is..."}
  ],
  "lesson_context": "Introduction to Python",
  "language": "en"
}
```

**Response:**
```json
{
  "reply": "A loop in Python allows you to repeat code multiple times. The most common loops are `for` and `while`. Here's an example: `for i in range(5): print(i)`"
}
```

---

## Sessions (Real-time Collaboration)

### POST `/api/sessions`
Create a new learning session.

**Request:**
```json
{
  "title": "Math Study Group",
  "room_code": "ABC123"
}
```

**Response:**
```json
{
  "room_code": "ABC123",
  "title": "Math Study Group",
  "host_id": "uuid",
  "host_name": "John Doe",
  "created_at": 1234567890,
  "participants": []
}
```

---

### GET `/api/sessions/{room_code}`
Get session details including live participants.

**Response:**
```json
{
  "room_code": "ABC123",
  "title": "Math Study Group",
  "host_id": "uuid",
  "participants": [
    {"user_id": "uuid1", "name": "John Doe"},
    {"user_id": "uuid2", "name": "Jane Smith"}
  ],
  "created_at": 1234567890
}
```

---

## WebSocket

### WS `/ws/{room_code}`
Real-time messaging and signals.

**Connect:**
```
ws://localhost:8000/ws/ABC123?user_id=<id>&name=<name>
```

**Message Types:**

#### Chat
```json
{"type": "chat", "text": "Hello everyone!"}
```

#### Reaction
```json
{"type": "reaction", "emoji": "👍"}
```

#### Signal (WebRTC)
```json
{"type": "signal", "signal": {...}, "target": "uuid"}
```

#### Ping/Pong
```json
{"type": "ping"}
{"type": "pong"}
```

**Server Events:**

```json
{"type": "user_joined", "user_id": "uuid", "name": "John", "count": 3}
{"type": "user_left", "user_id": "uuid", "name": "John", "count": 2}
{"type": "chat", "user_id": "uuid", "name": "John", "text": "...", "ts": 1234567890}
{"type": "participants", "participants": [...]}
```

---

## Error Responses

All errors follow this format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

**Common Status Codes:**
- `400` — Bad Request (invalid input)
- `401` — Unauthorized (missing/invalid token)
- `404` — Not Found
- `409` — Conflict (e.g., duplicate user)
- `500` — Internal Server Error
- `502` — Bad Gateway (AI service down)

---

## Rate Limiting

Coming soon. For now:
- No rate limits in development
- Production: 100 requests/minute per IP

---

## Versioning

Current API version: `1.0.0`

Check endpoint: `GET /`

```json
{
  "status": "ok",
  "service": "SkillStream API",
  "version": "1.0.0"
}
```
