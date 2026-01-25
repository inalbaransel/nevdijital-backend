# 🎉 NevDijital Backend - API Documentation

Backend sistemi tamamlandı! İşte tüm API endpoints ve kullanımları:

## 🌐 Base URL

```
http://localhost:4000
```

---

## 📋 API Endpoints

### 1. **Health Check**

**GET** `/health`

Server durumunu kontrol eder.

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2026-01-25T19:47:54.694Z",
  "uptime": 35.46
}
```

---

### 2. **Groups (Gruplar)**

#### GET `/api/groups`

Tüm grupları listeler.

**Response:**

```json
[
  {
    "id": "uuid",
    "department": "Bilgisayar Mühendisliği",
    "classLevel": 1,
    "createdAt": "...",
    "updatedAt": "...",
    "_count": {
      "members": 5,
      "messages": 142
    }
  }
]
```

#### GET `/api/groups/:id`

Belirli bir grubu detaylı olarak getirir.

#### POST `/api/groups`

Yeni grup oluşturur.

**Body:**

```json
{
  "department": "Bilgisayar Mühendisliği",
  "classLevel": 1
}
```

---

### 3. **Users (Kullanıcılar)**

#### POST `/api/users`

Firebase Authentication ile kullanıcı sync eder. Kullanıcı yoksa oluşturur, varsa günceller.

**Body:**

```json
{
  "uid": "firebase-uid-123",
  "email": "user@example.com",
  "name": "Kullanıcı Adı",
  "photoURL": "https://...",
  "department": "Bilgisayar Mühendisliği",
  "classLevel": 1,
  "studentNo": "20210001"
}
```

**Response:**

```json
{
  "user": { ... },
  "group": { ... }
}
```

#### GET `/api/users/:uid`

Firebase UID ile kullanıcı bilgilerini getirir.

---

### 4. **Messages (Mesajlar)**

#### GET `/api/messages/:groupId`

Bir grubun mesajlarını getirir (pagination desteği).

**Query Parameters:**

- `limit` (default: 50)
- `offset` (default: 0)

**Response:**

```json
{
  "messages": [
    {
      "id": "uuid",
      "text": "Merhaba!",
      "userId": "...",
      "groupId": "...",
      "createdAt": "...",
      "user": {
        "id": "...",
        "uid": "...",
        "name": "...",
        "photoURL": "..."
      }
    }
  ],
  "total": 142,
  "limit": 50,
  "offset": 0
}
```

#### POST `/api/messages`

REST API ile mesaj gönderir (Socket.io tercih edilir).

**Body:**

```json
{
  "text": "Merhaba dünya!",
  "userId": "user-id",
  "groupId": "group-id"
}
```

---

### 5. **Files (Dosyalar)**

#### GET `/api/files/:groupId`

Bir grubun dosyalarını listeler.

**Query Parameters:**

- `fileType` - Filtre (MUSIC, NOTE, IMAGE, DOCUMENT)
- `limit` (default: 50)
- `offset` (default: 0)
- `sortBy` - recent veya likes (default: recent)

**Response:**

```json
{
  "files": [
    {
      "id": "uuid",
      "fileName": "...",
      "fileType": "MUSIC",
      "fileUrl": "https://...",
      "fileSize": 1024000,
      "likes": 15,
      "musicTitle": "Spotify Song Name",
      "musicUrl": "https://spotify.com/...",
      "user": { ... },
      "createdAt": "..."
    }
  ],
  "total": 45,
  "limit": 50,
  "offset": 0
}
```

#### POST `/api/files/:fileId/like`

Dosyayı beğenir (like sayısını 1 artırır).

#### DELETE `/api/files/:fileId`

Dosyayı siler (sadece dosya sahibi silebilir).

**Body:**

```json
{
  "userId": "user-id"
}
```

---

### 6. **Upload (Dosya Yükleme)**

#### POST `/api/upload`

Cloudflare R2'ye dosya yükler ve metadata'yı database'e kaydeder.

**Content-Type:** `multipart/form-data`

**Form Fields:**

- `file` - Dosya (max 50MB)
- `userId` - Yükleyen kullanıcı ID
- `groupId` - Grup ID
- `musicTitle` - (Opsiyonel) Müzik başlığı
- `musicUrl` - (Opsiyonel) Spotify/YouTube linki

**Response:**

```json
{
  "id": "uuid",
  "fileName": "music/uuid.mp3",
  "fileType": "MUSIC",
  "fileUrl": "https://your-bucket.r2.dev/music/uuid.mp3",
  "fileSize": 5242880,
  "mimeType": "audio/mpeg",
  "musicTitle": "Song Name",
  "musicUrl": "https://spotify.com/...",
  "likes": 0,
  "userId": "...",
  "groupId": "...",
  "createdAt": "...",
  "user": { ... }
}
```

---

## 🔌 Socket.io Events

### Client → Server

#### `join_group`

Bir gruba katılır.

**Emit:**

```javascript
socket.emit("join_group", groupId);
```

**Response:**

```javascript
socket.on("joined_group", (data) => {
  // data: { groupId, department, classLevel }
});
```

#### `send_message`

Mesaj gönderir.

**Emit:**

```javascript
socket.emit("send_message", {
  text: "Merhaba!",
  userId: "user-id",
  groupId: "group-id",
});
```

### Server → Client

#### `new_message`

Yeni mesaj broadcast edilir (tüm grup üyeleri alır).

**Listen:**

```javascript
socket.on("new_message", (message) => {
  // message: { id, text, userId, groupId, createdAt, user: {...} }
});
```

#### `error`

Hata mesajı.

**Listen:**

```javascript
socket.on("error", (error) => {
  // error: { message: '...' }
});
```

---

## 🔐 Environment Variables

`.env` dosyasında şunlar olmalı:

```env
# Server
PORT=4000
NODE_ENV=development

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/nevdijital?schema=public"

# Redis (opsiyonel - production için)
REDIS_URL="redis://localhost:6379"

# Cloudflare R2
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=nevdijital-files
R2_PUBLIC_URL=https://your-bucket.r2.dev

# CORS
FRONTEND_URL=http://localhost:3000
```

---

## 🚀 Kullanım

### Development Mode

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Production

```bash
npm start
```

### Database Migration

```bash
npm run prisma:migrate
```

### Prisma Studio (Database GUI)

```bash
npm run prisma:studio
```

---

## 📦 Database Schema

### User

- id, uid (Firebase), email, name, photoURL
- department, classLevel, studentNo
- groupId (foreign key)

### Group

- id, department, classLevel
- Unique: (department + classLevel)

### Message

- id, text, userId, groupId
- createdAt
- Index: (groupId + createdAt DESC)

### File

- id, fileName, fileType, fileUrl, fileSize, mimeType
- musicTitle, musicUrl (opsiyonel)
- likes, userId, groupId
- Index: (groupId + fileType + createdAt), (groupId + likes DESC)

---

## 🎯 Frontend Integration

### Next.js Örnek (Socket.io)

```typescript
import io from "socket.io-client";

const socket = io("http://localhost:4000");

// Gruba katıl
socket.emit("join_group", groupId);

// Mesaj gönder
socket.emit("send_message", {
  text: "Merhaba!",
  userId: user.id,
  groupId: group.id,
});

// Yeni mesajları dinle
socket.on("new_message", (message) => {
  console.log("Yeni mesaj:", message);
});
```

### Dosya Yükleme

```typescript
const formData = new FormData();
formData.append("file", file);
formData.append("userId", user.id);
formData.append("groupId", group.id);

const response = await fetch("http://localhost:4000/api/upload", {
  method: "POST",
  body: formData,
});

const uploadedFile = await response.json();
```

---

## ✅ Tamamlandı!

Backend sistemi hazır! Tüm API endpoints çalışıyor, Socket.io hazır, Cloudflare R2 entegrasyonu yapıldı.

**Sıradaki adım:** Cloudflare R2 credentials alıp `.env` dosyasını güncellemek.
