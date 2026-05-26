import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

// Importar rutas
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import studentRoutes from './routes/students.js';
import teacherRoutes from './routes/teachers.js';
import contentRoutes from './routes/content.js';
import gameRoutes from './routes/games.js';
import progressRoutes from './routes/progress.js';
import achievementRoutes from './routes/achievements.js';
import evaluationRoutes from './routes/evaluations.js';
import messageRoutes from './routes/messages.js';
import familyRoutes from './routes/family.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// CORS MANUAL — va PRIMERO antes de todo
// ============================================
app.use((req, res, next) => {
  const origin = req.headers.origin;
  // Permitir el origen que viene en el request
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Responder inmediatamente a preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// ============================================
// MIDDLEWARES DE SEGURIDAD
// ============================================

// Helmet para headers de seguridad
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || ['http://localhost:5500'];

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin origin (mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    // En desarrollo permitir todo
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    // En producción verificar lista
    if (allowedOrigins.some(allowed => origin.startsWith(allowed.replace(/\/$/, '')))) {
      callback(null, true);
    } else {
      console.log(`CORS bloqueado para: ${origin} | Permitidos: ${allowedOrigins.join(', ')}`);
      callback(null, true); // Temporalmente permitir todos mientras se configura
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Preflight para todas las rutas
app.options('*', cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
});
app.use('/api/', limiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser());

// ============================================
// LOGGING
// ============================================

app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ============================================
// RUTAS
// ============================================

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/family', familyRoutes);

// Root
app.get('/', (req, res) => {
  res.json({ 
    message: 'NeuroLearn Kids API',
    version: '1.0.0',
    documentation: '/api/docs'
  });
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    path: req.path 
  });
});

// Error Handler Global
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================
// INICIAR SERVIDOR
// ============================================

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════╗
║   🚀 NeuroLearn Kids API Server          ║
║                                           ║
║   🌐 URL: http://localhost:${PORT}        ║
║   📝 Environment: ${process.env.NODE_ENV || 'development'}           ║
║   ✅ Server is running!                   ║
╚═══════════════════════════════════════════╝
  `);
});

export default app;