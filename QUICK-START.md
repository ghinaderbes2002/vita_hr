# ⚡ Quick Start Guide

## 🚀 رفع المشروع بسرعة على السيرفر

### الخطوة 1️⃣: نقل الملفات للسيرفر
```bash
# على جهازك المحلي
scp -r . user@your-server:/path/to/vita-hr
```

أو استخدم Git:
```bash
# على السيرفر
git clone <repository-url>
cd vita-hr
```

### الخطوة 2️⃣: تشغيل Docker
```bash
# بناء وتشغيل الكونتينر
docker-compose up -d --build

# أو استخدم السكريبت الجاهز
chmod +x deploy.sh
./deploy.sh
```

### الخطوة 3️⃣: التحقق من التشغيل
```bash
# عرض اللوجات
docker-compose logs -f frontend

# التحقق من الكونتينر
docker ps
```

افتح المتصفح: `http://YOUR_SERVER_IP:3012`

---

## 📝 التعديلات المهمة

### تغيير API URL
عدل ملف `docker-compose.yml`:
```yaml
environment:
  - NEXT_PUBLIC_API_URL=http://YOUR_BACKEND_IP:8000/api/v1
```

### تغيير البورت
عدل ملف `docker-compose.yml`:
```yaml
ports:
  - "YOUR_PORT:3012"
```

---

## 🔧 أوامر مفيدة

```bash
# إيقاف التطبيق
docker-compose down

# إعادة تشغيل
docker-compose restart

# عرض اللوجات
docker-compose logs -f

# حذف كل شيء وإعادة البناء
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d

# الدخول للكونتينر
docker-compose exec frontend sh
```

---

## ⚠️ Troubleshooting

### المشكلة: الكونتينر لا يعمل
```bash
docker-compose logs frontend
```

### المشكلة: لا يتصل بالباك اند
تحقق من:
1. الباك اند يعمل على port 8000 ✅
2. Firewall يسمح بالاتصال ✅
3. IP الباك اند صحيح في `docker-compose.yml` ✅

### المشكلة: Port مستخدم
```bash
# تغيير Port في docker-compose.yml
ports:
  - "3013:3012"  # استخدم port آخر
```

---

## 🎯 البورتات المستخدمة

| Service | Port |
|---------|------|
| Frontend | 3012 |
| Backend | 8000 |

---

## 📞 Support

إذا واجهتك مشكلة، شوف الـ logs:
```bash
docker-compose logs -f frontend
```
