# PostgreSQL Kurulumu için 2 seçenek:

## SEÇENEK 1: Docker ile PostgreSQL (En kolay - Önerilen)

```powershell
# PostgreSQL container'ı başlat
docker run --name nevdijital-postgres `
  -e POSTGRES_PASSWORD=password123 `
  -e POSTGRES_DB=nevdijital `
  -p 5432:5432 `
  -d postgres:15-alpine

# Container'ın çalışıp çalışmadığını kontrol et
docker ps
```

Container'ı durdurmak için:

```powershell
docker stop nevdijital-postgres
```

Container'ı tekrar başlatmak için:

```powershell
docker start nevdijital-postgres
```

## SEÇENEK 2: PostgreSQL Manuel Kurulum

Windows için PostgreSQL indir: https://www.postgresql.org/download/windows/

Kurulum sonrası:

- Database adı: `nevdijital`
- User: `postgres`
- Password: seçtiğiniz şifre
- Port: `5432`

`.env` dosyasındaki `DATABASE_URL`'i güncelleyin:

```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/nevdijital?schema=public"
```

## Migration Komutu (PostgreSQL hazır olduktan sonra):

```powershell
npm run prisma:migrate
```

veya

```powershell
npx prisma migrate dev --name init
```
