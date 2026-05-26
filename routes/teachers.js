// routes/teachers.js
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const router = express.Router();
router.use(authenticate);

// GET /api/teachers - perfil del docente autenticado
router.get('/profile', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { teacherProfile: true }
    });

    if (!user?.teacherProfile) {
      return res.status(403).json({ success: false, message: 'Solo disponible para docentes' });
    }

    res.json({ success: true, data: { user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName }, teacher: user.teacherProfile } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error', error: error.message });
  }
});

router.get('/', async (req, res) => {
  res.json({ success: true, message: 'Teachers endpoint OK' });
});

export default router;
