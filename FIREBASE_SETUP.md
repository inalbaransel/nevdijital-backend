# 🔐 Firebase Admin SDK Kurulum Rehberi

Backend'inizde Firebase Admin SDK authentication çalışıyor! Şimdi Firebase Console'dan credentials almanız gerekiyor.

## 📋 Adım Adım Kurulum

### 1. Firebase Console'a Git

https://console.firebase.google.com/ adresine gidin ve projenizi seçin (`kutuphanerezervasyonapp`).

### 2. Service Account Credentials Al

1. Sol menüden **⚙️ Project Settings** (Proje Ayarları) tıklayın
2. Üstteki tab'lerden **Service Accounts** sekmesine geçin
3. **Generate New Private Key** butonuna tıklayın
4. Açılan popup'ta **Generate Key** butonuna tıklayın
5. Bir JSON dosyası indirilecek (örn: `kutuphanerezervasyonapp-firebase-adminsdk-xxxxx.json`)

### 3. JSON Dosyasından Değerleri Al

İndirilen JSON dosyasını bir text editor ile açın. Şu değerleri bulun:

```json
{
  "type": "service_account",
  "project_id": "kutuphanerezervasyonapp",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@kutuphanerezervasyonapp.iam.gserviceaccount.com",
  ...
}
```

### 4. .env Dosyasını Güncelle

`C:\Users\Baransel\Desktop\nevdijital-backend\.env` dosyasını açın ve şu değerleri doldurun:

```env
# Firebase Admin SDK
FIREBASE_PROJECT_ID=kutuphanerezervasyonapp
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@kutuphanerezervasyonapp.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

**ÖNEMLİ NOTLAR:**

- `FIREBASE_PRIVATE_KEY` değerini **çift tırnak içinde** yazın
- `\n` karakterlerini olduğu gibi bırakın (newline escape sequence)
- Private key'i kopyalarken tüm satırları alın (BEGIN ve END dahil)

### 5. Server'ı Yeniden Başlat

PowerShell'de:

```powershell
# Ctrl+C ile mevcut server'ı durdur
# Sonra tekrar başlat:
npm run dev
```

Başarılı olursa şu mesajı göreceksiniz:

```
✅ Firebase Admin SDK initialized
🚀 Server running on http://localhost:4000
🔌 Socket.io ready for connections
```

---

## 🧪 Test Etme

### 1. Frontend'den Token Al

Next.js uygulamanızda Firebase ile login olduktan sonra:

```typescript
import { getAuth } from "firebase/auth";

const auth = getAuth();
const user = auth.currentUser;

if (user) {
  const token = await user.getIdToken();
  console.log("Token:", token);
}
```

### 2. Backend'e İstek At

Token'ı kopyalayın ve PowerShell'de test edin:

```powershell
$token = "YOUR_FIREBASE_TOKEN_HERE"

$headers = @{
  "Authorization" = "Bearer $token"
}

Invoke-WebRequest -Uri "http://localhost:4000/api/groups" -Headers $headers -UseBasicParsing
```

**Başarılı Response:** 200 OK + gruplar listesi

**Başarısız Response:** 401 Unauthorized (token geçersiz/eksik)

### 3. Socket.io Test

Frontend'de Socket.io bağlantısı:

```typescript
import io from "socket.io-client";
import { getAuth } from "firebase/auth";

const auth = getAuth();
const user = auth.currentUser;

if (user) {
  const token = await user.getIdToken();

  const socket = io("http://localhost:4000", {
    auth: {
      token: token,
    },
  });

  socket.on("connect", () => {
    console.log("✅ Connected to Socket.io");
  });

  socket.on("connect_error", (err) => {
    console.error("❌ Connection error:", err.message);
  });
}
```

---

## 🔒 Güvenlik Özellikleri

### ✅ Eklenen Güvenlik Katmanları

1. **Firebase Admin SDK Authentication**
   - Tüm `/api/*` route'ları korunuyor
   - Token verification her istekte yapılıyor
   - Socket.io bağlantıları da token gerektiriyor

2. **Rate Limiting**
   - API: 100 request / dakika
   - Upload: 10 dosya / 15 dakika
   - IP bazlı limit

3. **CORS Protection**
   - Sadece `FRONTEND_URL` kabul ediliyor
   - Credentials: true (cookie desteği)

4. **Error Handling**
   - 404 handler (bilinmeyen route'lar)
   - 500 handler (server hataları)
   - Development'ta stack trace

### 🚫 Korumasız Endpoint'ler

Sadece `/health` endpoint'i korumasız (monitoring için):

```bash
curl http://localhost:4000/health
```

---

## 🐛 Sorun Giderme

### "Missing Firebase Admin SDK credentials"

**Sebep:** `.env` dosyasında Firebase credentials eksik

**Çözüm:** Yukarıdaki adımları takip ederek credentials'ı ekleyin

### "Invalid token" / 401 Unauthorized

**Sebep:** Token geçersiz, süresi dolmuş veya yanlış

**Çözüm:**

- Frontend'de `user.getIdToken(true)` ile fresh token alın
- Token'ın doğru kopyalandığından emin olun

### "Too many requests"

**Sebep:** Rate limit aşıldı

**Çözüm:** 1 dakika bekleyin veya rate limit ayarlarını değiştirin

### Socket.io "Authentication error"

**Sebep:** Token `auth.token` olarak gönderilmemiş

**Çözüm:**

```typescript
const socket = io("http://localhost:4000", {
  auth: {
    token: await user.getIdToken(), // ✅ Doğru
  },
});
```

---

## 📝 Sonraki Adımlar

1. ✅ Firebase credentials'ı `.env`'e ekleyin
2. ✅ Server'ı yeniden başlatın
3. ✅ Frontend'den test edin
4. 🔜 Production'a deploy edin (Cloudflare R2 credentials de gerekecek)

---

## 🎯 Production Checklist

Production'a çıkmadan önce:

- [ ] Firebase credentials production için ayrı service account oluştur
- [ ] `FRONTEND_URL` production domain'e güncelle
- [ ] `NODE_ENV=production` set et
- [ ] Rate limit değerlerini production için ayarla
- [ ] Cloudflare R2 credentials ekle
- [ ] PostgreSQL production database'e bağlan
- [ ] Redis production instance'ı kur (Socket.io scaling için)
