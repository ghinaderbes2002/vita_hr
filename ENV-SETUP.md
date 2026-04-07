# 🔧 إعداد متغيرات البيئة (Environment Variables)

## 📋 ملفات البيئة المطلوبة

### للإنتاج (Production):

إنشاء ملف `.env` في المجلد الرئيسي للمشروع مع المحتوى التالي:

```bash
# Node Environment
NODE_ENV=production

# Backend API URL - عدل هذا حسب IP السيرفر تبعك
NEXT_PUBLIC_API_URL=http://159.198.37.52:8000/api/v1

# Frontend Port
PORT=3012

# Disable Next.js telemetry
NEXT_TELEMETRY_DISABLED=1
```

---

## 🚀 طريقة الاستخدام على السيرفر

### الطريقة 1️⃣: إنشاء ملف `.env` مباشرة

```bash
# على السيرفر، انتقل لمجلد المشروع
cd /path/to/vita-hr

# إنشاء ملف .env
nano .env

# إضافة المتغيرات (انسخ المحتوى من الأعلى)
# اضغط Ctrl+X ثم Y ثم Enter للحفظ
```

### الطريقة 2️⃣: استخدام `.env.production` الموجود

```bash
# نسخ الملف الموجود
cp .env.production .env

# أو تعديله مباشرة إذا لزم الأمر
nano .env
```

### الطريقة 3️⃣: مع Docker Compose (موصى بها)

**لا تحتاج ملف `.env` منفصل!**

المتغيرات موجودة في `docker-compose.yml`:

```yaml
environment:
  - NODE_ENV=production
  - NEXT_PUBLIC_API_URL=http://159.198.37.52:8000/api/v1
```

إذا أردت تغيير URL الباك اند:
```bash
# عدل docker-compose.yml
nano docker-compose.yml

# ابحث عن NEXT_PUBLIC_API_URL وغير الـ IP
```

---

## 📝 شرح المتغيرات

| المتغير | الوصف | مثال |
|---------|-------|------|
| `NODE_ENV` | بيئة التشغيل | `production` أو `development` |
| `NEXT_PUBLIC_API_URL` | عنوان API الباك اند | `http://159.198.37.52:8000/api/v1` |
| `PORT` | بورت الفرونت اند | `3012` |
| `NEXT_TELEMETRY_DISABLED` | تعطيل telemetry من Next.js | `1` (نعم) |

---

## ⚠️ ملاحظات مهمة

### 1. تغيير URL الباك اند

إذا كان الباك اند على سيرفر مختلف، غير الـ IP:
```bash
NEXT_PUBLIC_API_URL=http://YOUR_NEW_IP:8000/api/v1
```

### 2. استخدام Domain بدلاً من IP

```bash
NEXT_PUBLIC_API_URL=https://api.yourcompany.com/api/v1
```

### 3. HTTPS

إذا كنت تستخدم SSL:
```bash
NEXT_PUBLIC_API_URL=https://159.198.37.52:8443/api/v1
```

---

## 🔄 إعادة التشغيل بعد التعديل

### مع Docker:
```bash
# إعادة بناء وتشغيل
docker-compose down
docker-compose up -d --build
```

### بدون Docker:
```bash
# إعادة بناء المشروع
npm run build

# إعادة تشغيل
pm2 restart vita-hr
# أو
npm run start
```

---

## ✅ التحقق من الإعدادات

بعد التشغيل، افتح المتصفح:
```
http://YOUR_SERVER_IP:3012
```

في Console المتصفح (F12)، تحقق من URL المستخدم:
- يجب أن ترى طلبات للـ API على `http://159.198.37.52:8000/api/v1`
- إذا كانت الطلبات للـ `http://localhost:8000`، معناها المتغيرات ما اشتغلت

---

## 🆘 حل المشاكل

### المشكلة: Frontend لا يتصل بالـ Backend

1. تحقق من ملف `.env`:
```bash
cat .env
```

2. تحقق من docker-compose.yml:
```bash
cat docker-compose.yml | grep NEXT_PUBLIC_API_URL
```

3. تحقق من الباك اند يعمل:
```bash
curl http://159.198.37.52:8000/api/v1/health
```

### المشكلة: Changes لا تظهر بعد التعديل

```bash
# احذف كل شي وأعد البناء
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```
