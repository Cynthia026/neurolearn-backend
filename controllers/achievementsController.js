// controllers/achievementsController.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * GET /api/achievements
 * Devuelve los logros del estudiante autenticado
 */
export const getMyAchievements = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { studentProfile: { include: { achievements: { orderBy: { unlockedAt: 'desc' } } } } }
    });

    if (!user?.studentProfile) {
      return res.status(403).json({ success: false, message: 'Solo disponible para estudiantes' });
    }

    res.json({ success: true, data: user.studentProfile.achievements });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener logros', error: error.message });
  }
};
