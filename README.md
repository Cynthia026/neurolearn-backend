# 🚀 NEUROLEARN BACKEND - INSTALACIÓN COMPLETA

## 📋 CONTENIDO DE ESTA CARPETA:

```
backend-complete/
├── controllers/
│   ├── authController.js      ✅ Registro y login
│   ├── gameController.js      ✅ Guardar puntuaciones
│   └── studentController.js   ✅ Perfiles y estadísticas
├── middleware/
│   └── auth.js                ✅ Autenticación JWT
├── routes/
│   ├── auth.js                ✅ Rutas de autenticación
│   ├── games.js               ✅ Rutas de juegos
│   ├── students.js            ✅ Rutas de estudiantes
│   ├── users.js               📝 Stub (implementar después)
│   ├── teachers.js            📝 Stub
│   ├── content.js             📝 Stub
│   ├── progress.js            📝 Stub
│   ├── achievements.js        📝 Stub
│   ├── evaluations.js         📝 Stub
│   └── messages.js            📝 Stub
├── utils/
│   ├── jwt.js                 ✅ Generación de tokens
│   └── password.js            ✅ Hash de contraseñas
├── .env.example               ✅ Variables de entorno
├── server.js                  ✅ Servidor principal
└── README.md                  📖 Este archivo
```

---

## 🎯 INSTALACIÓN PASO A PASO:

### PASO 1: Copiar archivos

Copia TODO el contenido de esta carpeta a tu carpeta `neurolearn-backend/`:

```bash
# Desde la carpeta backend-complete/
# Copiar a tu carpeta neurolearn-backend/

# Copiar controladores
cp -r controllers/* /ruta/a/neurolearn-backend/controllers/

# Copiar middleware
cp -r middleware/* /ruta/a/neurolearn-backend/middleware/

# Copiar rutas
cp -r routes/* /ruta/a/neurolearn-backend/routes/

# Copiar utils
cp -r utils/* /ruta/a/neurolearn-backend/utils/

# Copiar server.js
cp server.js /ruta/a/neurolearn-backend/

# IMPORTANTE: NO copies el .env.example directamente
# Usa el .env que ya tienes o crea uno nuevo
```

---

### PASO 2: Verificar .env

Abre tu archivo `.env` en `neurolearn-backend/` y verifica que tenga:

```env
DATABASE_URL="mysql://root:TU_PASSWORD@localhost:3306/neurolearn"
JWT_SECRET="algun-secreto-largo-y-aleatorio-123456789"
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS="http://localhost:5500,http://127.0.0.1:5500,http://127.0.0.1:5501,http://localhost:5501,http://127.0.0.1:5502,http://localhost:5502"
```

**IMPORTANTE:** Cambia `TU_PASSWORD` por tu contraseña real de MySQL.

---

### PASO 3: Verificar dependencias

Abre `neurolearn-backend/package.json` y verifica que tenga:

```json
{
  "type": "module",
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "dotenv": "^16.3.1",
    "cookie-parser": "^1.4.6",
    "express-rate-limit": "^7.1.5",
    "@prisma/client": "^5.8.0",
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2"
  },
  "devDependencies": {
    "prisma": "^5.8.0",
    "nodemon": "^3.0.2"
  }
}
```

Si falta algo:

```bash
cd neurolearn-backend
npm install
```

---

### PASO 4: Verificar Prisma Schema

Tu `prisma/schema.prisma` debe tener las tablas:
- User
- Student
- Teacher
- Parent
- GameScore
- Achievement
- Progress
- (y las demás que ya tienes)

Si modificaste algo:

```bash
npx prisma generate
npx prisma db push
```

---

### PASO 5: Iniciar el servidor

```bash
cd neurolearn-backend
npm run dev
```

Deberías ver:

```
╔═══════════════════════════════════════════╗
║   🚀 NeuroLearn Kids API Server          ║
║                                           ║
║   🌐 URL: http://localhost:3000          ║
║   📝 Environment: development            ║
║   ✅ Server is running!                   ║
╚═══════════════════════════════════════════╝
```

---

## ✅ PROBAR QUE FUNCIONA:

### Test 1: Health Check

Abre en el navegador: http://localhost:3000/health

Deberías ver:
```json
{
  "status": "OK",
  "timestamp": "2026-05-05T...",
  "environment": "development"
}
```

### Test 2: Registro

En la consola del navegador (con login-register.html abierto):

```javascript
fetch('http://localhost:3000/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@test.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'User',
    role: 'STUDENT',
    grade: 3
  })
})
.then(r => r.json())
.then(d => console.log('✅ REGISTRO:', d));
```

### Test 3: Obtener perfil

```javascript
fetch('http://localhost:3000/api/students/profile', {
  headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
})
.then(r => r.json())
.then(d => console.log('✅ PERFIL:', d));
```

### Test 4: Guardar puntuación

```javascript
fetch('http://localhost:3000/api/games/score', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token'),
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    gameType: 'MATH_GAME',
    score: 1000,
    timeSpent: 120,
    accuracy: 90,
    level: 1
  })
})
.then(r => r.json())
.then(d => console.log('✅ PUNTUACIÓN:', d));
```

---

## 📊 ENDPOINTS DISPONIBLES:

### Autenticación:
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/me` - Obtener usuario actual

### Estudiantes:
- `GET /api/students/profile` - Perfil del estudiante (STUDENT)
- `GET /api/students/all` - Listar estudiantes (TEACHER)
- `GET /api/students/:id` - Ver estudiante (TEACHER)

### Juegos:
- `POST /api/games/score` - Guardar puntuación (STUDENT)
- `GET /api/games/history` - Historial de juegos (STUDENT)

---

## 🔴 PROBLEMAS COMUNES:

### Error: "Module not found"
**Solución:** Verifica que hayas copiado todos los archivos correctamente

### Error: "JWT_SECRET is not defined"
**Solución:** Verifica tu archivo `.env`

### Error: "Prisma Client could not connect"
**Solución:** 
1. Verifica que MySQL esté corriendo
2. Verifica el `DATABASE_URL` en `.env`
3. Ejecuta `npx prisma generate`

### Error: "export 'default' not found"
**Solución:** Verifica que `package.json` tenga `"type": "module"`

---

## 🎯 SIGUIENTE PASO:

Una vez que el backend funcione, actualiza el frontend para:
1. Cargar datos reales en student dashboard
2. Conectar juegos para guardar puntuaciones
3. Mostrar estudiantes reales en teacher dashboard

---

**¡Listo para usar!** 🚀
