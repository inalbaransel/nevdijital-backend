# Nevada Dijital Backend

Okul/Üniversite sosyal platform backend'i

## 🚀 Kurulum

### 1. Environment Variables

`.env.example` dosyasını `.env` olarak kopyalayın ve değerleri doldurun:

```bash
cp .env.example .env
```

### 2. PostgreSQL Database

PostgreSQL kurulu olmalı. Veritabanını oluşturun:

```sql
CREATE DATABASE nevdijital;
```

### 3. Prisma Migration

Veritabanı şemasını oluşturun:

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 4. Redis (Opsiyonel - Production için)

Redis kurulu olmalı (Socket.io scaling için):

```bash
# Windows için Redis alternatif: Memurai
# veya Docker kullanın
```

## 📦 Development

```bash
npm run dev
```

Server: `http://localhost:4000`

## 🧪 Test

Health check:

```bash
curl http://localhost:4000/health
```

## 📚 API Endpoints

- `GET /health` - Server health check

## 🔌 Socket.io Events

### Client → Server

- `join_group` - Bir gruba katıl

  ```js
  socket.emit("join_group", groupId);
  ```

- `send_message` - Mesaj gönder
  ```js
  socket.emit("send_message", { text, userId, groupId });
  ```

### Server → Client

- `joined_group` - Gruba katılma başarılı
- `new_message` - Yeni mesaj alındı
- `error` - Hata mesajı

## 📂 Klasör Yapısı

```
nevdijital-backend/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── server.ts
│   ├── routes/
│   ├── services/
│   ├── middleware/
│   ├── types/
│   ├── utils/
│   └── socket/
├── .env
├── .env.example
├── package.json
└── tsconfig.json
```

## 🛠️ Tech Stack

- **Node.js** + **Express**
- **Socket.io** (realtime chat)
- **PostgreSQL** + **Prisma ORM**
- **Redis** (Socket.io adapter - scaling)
- **Cloudflare R2** (file storage)
- **TypeScript**
