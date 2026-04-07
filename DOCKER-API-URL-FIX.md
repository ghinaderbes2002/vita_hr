# 🔧 حل مشكلة API URL في Docker

## 🐛 المشكلة

عند تشغيل التطبيق في Docker، التطبيق يطلب `http://localhost:8000` بدلاً من `http://159.198.37.52:8000`

## 🔍 السبب

في Next.js، المتغيرات التي تبدأ بـ `NEXT_PUBLIC_` تُدمج في الكود في **وقت البناء (Build Time)**، وليس في وقت التشغيل (Runtime).

```
Build Time (npm run build)  ← هنا يتم تحديد NEXT_PUBLIC_API_URL
     ↓
Production Bundle (.next folder)  ← URL مدمج في الملفات
     ↓
Runtime (Docker Container)  ← لا يمكن تغيير URL بعد البناء
```

## ✅ الحل

### الخطوة 1️⃣: تحديث Dockerfile

تم إضافة `ARG` و `ENV` في Dockerfile لتمرير المتغير في وقت البناء:

```dockerfile
# Build arguments for environment variables
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build the Next.js application
RUN npm run build
```

### الخطوة 2️⃣: تحديث docker-compose.yml

تم إضافة `args` في قسم `build` لتمرير URL في وقت البناء:

```yaml
frontend:
  build:
    context: .
    dockerfile: Dockerfile
    args:
      # ⬅️ مهم: يُمرر للـ build process
      NEXT_PUBLIC_API_URL: http://159.198.37.52:8000/api/v1
  environment:
    # ⬅️ للتشغيل (احتياطي)
    - NEXT_PUBLIC_API_URL=http://159.198.37.52:8000/api/v1
```

---

## 🚀 على السيرفر - انقل الملفات المحدثة

### الطريقة 1️⃣: SCP (من جهازك المحلي)

```bash
cd /path/to/local/project

# انقل الملفات المحدثة فقط
scp Dockerfile root@159.198.37.52:/root/vita-hr/vita_hr/
scp docker-compose.yml root@159.198.37.52:/root/vita-hr/vita_hr/
scp .dockerignore root@159.198.37.52:/root/vita-hr/vita_hr/
```

### الطريقة 2️⃣: Git (إذا كنت تستخدم Git)

```bash
# على جهازك المحلي
git add Dockerfile docker-compose.yml .dockerignore
git commit -m "Fix API URL in Docker build"
git push

# على السيرفر
cd ~/vita-hr/vita_hr
git pull
```

### الطريقة 3️⃣: تعديل مباشر على السيرفر

```bash
# على السيرفر
cd ~/vita-hr/vita_hr

# 1. عدل Dockerfile
nano Dockerfile
# أضف هالسطرين قبل RUN npm run build:
#   ARG NEXT_PUBLIC_API_URL
#   ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# 2. عدل docker-compose.yml
nano docker-compose.yml
# أضف تحت build:
#   args:
#     NEXT_PUBLIC_API_URL: http://159.198.37.52:8000/api/v1
```

---

## 🔨 إعادة البناء على السيرفر

بعد تحديث الملفات:

```bash
cd ~/vita-hr/vita_hr

# 1. أوقف الكونتينرات
docker-compose down

# 2. احذف الـ image القديم (مهم!)
docker rmi vita_hr_frontend

# 3. أعد البناء من الصفر
docker-compose build --no-cache

# 4. شغل الكونتينرات
docker-compose up -d

# 5. تابع اللوجات
docker-compose logs -f frontend
```

---

## ✅ التحقق من الإصلاح

### 1. تحقق من اللوجات

```bash
docker-compose logs frontend | grep -i api
```

يجب أن ترى: `NEXT_PUBLIC_API_URL=http://159.198.37.52:8000`

### 2. في المتصفح

افتح: `http://159.198.37.52:3012`

اضغط F12 → Network → جرب تسجيل الدخول

يجب أن ترى الطلبات تروح لـ: `http://159.198.37.52:8000/api/v1/...`

### 3. تحقق من المتغيرات داخل الكونتينر

```bash
docker exec vita-hr-frontend env | grep API
```

---

## 📋 ملخص التغييرات

### الملفات المعدلة:

1. ✅ [Dockerfile](Dockerfile)
   - إضافة `ARG NEXT_PUBLIC_API_URL`
   - إضافة `ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL`

2. ✅ [docker-compose.yml](docker-compose.yml)
   - إضافة `build.args.NEXT_PUBLIC_API_URL`

3. ✅ [.dockerignore](.dockerignore)
   - إزالة `package-lock.json` من القائمة (كان يمنع البناء)

4. ✅ [QUICK-START.md](QUICK-START.md)
   - تحديث التعليمات

---

## ⚠️ ملاحظات مهمة

### 1. لازم إعادة البناء دائماً

إذا غيرت API URL، لازم تعيد البناء:

```bash
docker-compose down
docker-compose up -d --build
```

### 2. تغيير URL لسيرفر مختلف

في `docker-compose.yml`:

```yaml
build:
  args:
    NEXT_PUBLIC_API_URL: http://NEW_IP:8000/api/v1
environment:
  - NEXT_PUBLIC_API_URL=http://NEW_IP:8000/api/v1
```

ثم أعد البناء.

### 3. استخدام Domain بدلاً من IP

```yaml
build:
  args:
    NEXT_PUBLIC_API_URL: https://api.yourcompany.com/api/v1
```

---

## 🆘 حل المشاكل

### المشكلة: لا يزال يطلب localhost

```bash
# تأكد أن البناء تم بالمتغيرات الصحيحة
docker-compose build --no-cache --progress=plain | grep NEXT_PUBLIC

# احذف كل الـ images والـ containers القديمة
docker-compose down -v
docker system prune -a
docker-compose up -d --build
```

### المشكلة: Build يفشل

```bash
# تحقق من وجود package-lock.json
ls -la package-lock.json

# تحقق من .dockerignore
cat .dockerignore | grep package-lock
# يجب أن يكون: # package-lock.json (مع # في البداية)
```

---

## 🎯 النتيجة النهائية

بعد هذه التعديلات:

✅ التطبيق يُبنى مع URL الصحيح
✅ الطلبات تروح لـ `http://159.198.37.52:8000/api/v1`
✅ لا داعي لملف `.env` منفصل
✅ كل شي موجود في `docker-compose.yml`

🎉 **مبروك! التطبيق الآن يعمل بشكل صحيح**
