# API Test Komutları

Bu dosya API endpoints'lerini test etmek için PowerShell komutları içerir.

## 1. Grup Oluşturma

```powershell
$body = @{
    department = "Bilgisayar Mühendisliği"
    classLevel = 1
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:4000/api/groups" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
```

## 2. Tüm Grupları Listele

```powershell
Invoke-WebRequest -Uri "http://localhost:4000/api/groups" -Method GET -UseBasicParsing | Select-Object -ExpandProperty Content
```

## 3. User Sync (Firebase Auth)

```powershell
$body = @{
    uid = "firebase-test-uid-123"
    email = "test@nevdijital.com"
    name = "Test Kullanıcı"
    photoURL = "https://example.com/photo.jpg"
    department = "Bilgisayar Mühendisliği"
    classLevel = 1
    studentNo = "20210001"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:4000/api/users" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
```

## 4. User Bilgilerini Getir

```powershell
Invoke-WebRequest -Uri "http://localhost:4000/api/users/firebase-test-uid-123" -Method GET -UseBasicParsing | Select-Object -ExpandProperty Content
```

## 5. Mesaj Gönder (REST API)

```powershell
# Önce groupId'yi bir önceki adımlardan al
$body = @{
    text = "Merhaba, ilk mesaj!"
    userId = "USER_ID_HERE"
    groupId = "GROUP_ID_HERE"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:4000/api/messages" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
```

## 6. Mesajları Getir

```powershell
Invoke-WebRequest -Uri "http://localhost:4000/api/messages/GROUP_ID_HERE?limit=50&offset=0" -Method GET -UseBasicParsing | Select-Object -ExpandProperty Content
```

## 7. Dosya Beğen

```powershell
Invoke-WebRequest -Uri "http://localhost:4000/api/files/FILE_ID_HERE/like" -Method POST -UseBasicParsing
```

## cURL Alternatifleri (Git Bash veya Linux)

```bash
# Grup oluştur
curl -X POST http://localhost:4000/api/groups \
  -H "Content-Type: application/json" \
  -d '{"department":"Bilgisayar Mühendisliği","classLevel":1}'

# Grupları listele
curl http://localhost:4000/api/groups

# User sync
curl -X POST http://localhost:4000/api/users \
  -H "Content-Type: application/json" \
  -d '{"uid":"firebase-test-uid-123","email":"test@nevdijital.com","name":"Test Kullanıcı","photoURL":"https://example.com/photo.jpg","department":"Bilgisayar Mühendisliği","classLevel":1,"studentNo":"20210001"}'
```
