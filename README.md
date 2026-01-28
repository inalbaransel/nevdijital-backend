# 🎓 NevDijital Backend

NevDijital backend projesi, üniversite öğrencileri için tasarlanmış sosyal platformun sunucu tarafını oluşturur. Bu proje; gerçek zamanlı mesajlaşma, dosya paylaşımı, ders programı yönetimi ve kullanıcı senkronizasyonu gibi özellikleri barındırır.

## 🚀 Teknolojiler

Bu projede kullanılan temel teknolojiler şunlardır:

- **Runtime & Dil:** [Node.js](https://nodejs.org/) ve [TypeScript](https://www.typescriptlang.org/)
- **Framework:** [Express.js](https://expressjs.com/)
- **Veritabanı:** [PostgreSQL](https://www.postgresql.org/)
- **ORM (Veritabanı Yönetimi):** [Prisma](https://www.prisma.io/)
- **Gerçek Zamanlı İletişim:** [Socket.io](https://socket.io/) (Redis Adapter ile)
- **Dosya Depolama:** AWS SDK (Cloudflare R2 uyumlu)
- **Kimlik Doğrulama:** Firebase Admin SDK
- **Validasyon:** Zod

## 🛠️ Kurulum

Projeyi yerel ortamınızda çalıştırmak için aşağıdaki adımları izleyin.

### 1. Projeyi Klonlayın

```bash
git clone https://github.com/inalbaransel/nevdijital-backend.git
cd nevdijital-backend
```

### 2. Bağımlılıkları Yükleyin

```bash
npm install
```

### 3. Çevresel Değişkenleri Ayarlayın (.env)

Kök dizinde `.env` dosyasını oluşturun ve gerekli değişkenleri tanımlayın (Örnek için `.env.example` dosyasına bakabilirsiniz).

Genel olarak ihtiyaç duyulan değişkenler:

- `DATABASE_URL`: PostgreSQL bağlantı adresi
- `PORT`: Sunucu portu (örn: 3001)
- Firebase ve AWS/R2 kimlik bilgileri

### 4. Veritabanını Hazırlayın (Prisma)

Veritabanı şemasını oluşturmak ve senkronize etmek için:

```bash
# Migration'ları uygula
npm run prisma:migrate

# Prisma Client'ı oluştur
npm run prisma:generate
```

## ▶️ Çalıştırma

### Geliştirme Modu (Development)

Değişiklikleri anlık izleyen (watch mode) sunucuyu başlatır:

```bash
npm run dev
```

### Üretim Modu (Production)

Projeyi derleyip çalıştırmak için:

```bash
npm run build
npm start
```

### Veritabanı Yönetimi (Prisma Studio)

Veritabanı kayıtlarını görsel arayüzden yönetmek için:

```bash
npm run prisma:studio
```

## � Proje Yapısı

- `src/`: Tüm kaynak kodlar buradadır.
  - `server.ts`: Uygulamanın giriş noktası.
  - `controllers/`: İstekleri karşılayan fonksiyonlar.
  - `services/`: İş mantığının bulunduğu katman.
  - `routes/`: API rot tanımları.
  - `utils/`: Yardımcı fonksiyonlar.
- `prisma/`: Veritabanı şeması (`schema.prisma`) ve migration dosyaları.
- `dist/`: Derlenmiş (build alınmış) JavaScript dosyaları.

## ✨ Özellikler

- **Kullanıcı Yönetimi:** Firebase Auth entegrasyonu ile güvenli giriş ve kullanıcı verisi senkronizasyonu.
- **Gruplar:** Bölüm ve sınıf bazlı otomatik grup oluşturma ve yönetim.
- **Chat:** Socket.io ile grup içi anlık mesajlaşma.
- **Dosya Paylaşımı:** Ders notları, müzik ve resim gibi dosyaların yüklenmesi ve paylaşılması (S3/R2).
- **Ders Programı:** Öğrencilerin haftalık ders programını ekleyip yönetebilmesi.
- **Durum Paylaşımları (Status):** 24 saat sonra kaybolan anlık durum güncellemeleri.
