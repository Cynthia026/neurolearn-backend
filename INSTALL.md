# 🚀 INSTALACIÓN RÁPIDA - NEUROLEARN BACKEND

## 📋 PASOS DE INSTALACIÓN:

### 1️⃣ CONFIGURAR BASE DE DATOS

Edita el archivo `.env` y cambia la contraseña de MySQL:

```env
DATABASE_URL="mysql://root:TU_PASSWORD_AQUI@localhost:3306/neurolearn"
```

Reemplaza `TU_PASSWORD_AQUI` con tu contraseña real de MySQL.

---

### 2️⃣ INSTALAR DEPENDENCIAS

Abre la terminal en esta carpeta y ejecuta:

```bash
npm install
```

Esto instalará todas las dependencias necesarias (~2-3 minutos).

---

### 3️⃣ CONFIGURAR PRISMA

Genera el cliente de Prisma y crea la base de datos:

```bash
npx prisma generate
npx prisma db push
```

Esto creará todas las tablas en MySQL.

---

### 4️⃣ VERIFICAR PRISMA STUDIO (OPCIONAL)

Para ver la base de datos visualmente:

```bash
npx prisma studio
```

Abre http://localhost:5555 en tu navegador.

---

### 5️⃣ INICIAR EL SERVIDOR

```bash
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

Abre tu navegador en: http://localhost:3000/health

Deberías ver:
```json
{
  "status": "OK",
  "timestamp": "2026-05-05T...",
  "environment": "development"
}
```

---

## 🎯 SIGUIENTE PASO:

Una vez que el backend funcione, abre tu frontend (login-register.html) y:

1. Registra un usuario
2. Haz login
3. El token se guardará automáticamente
4. Los dashboards cargarán datos reales

---

## 🔴 SI TIENES PROBLEMAS:

### Error: "Cannot connect to database"
- Verifica que MySQL esté corriendo
- Verifica la contraseña en `.env`
- Verifica que la base de datos `neurolearn` exista

### Error: "Module not found"
- Ejecuta `npm install` de nuevo

### Error: "Prisma Client not found"
- Ejecuta `npx prisma generate`

---

## 📞 COMANDOS ÚTILES:

```bash
# Iniciar servidor en desarrollo
npm run dev

# Iniciar servidor en producción
npm start

# Ver base de datos visualmente
npx prisma studio

# Regenerar cliente Prisma
npx prisma generate

# Actualizar base de datos
npx prisma db push
```

---

**¡Listo para usar!** 🚀
