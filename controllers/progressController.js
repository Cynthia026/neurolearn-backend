// controllers/progressController.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * GET /api/progress
 * Devuelve el progreso del estudiante autenticado
 */
export const getMyProgress = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { studentProfile: { include: { progress: { orderBy: { updatedAt: 'desc' } } } } }
    });

    if (!user?.studentProfile) {
      return res.status(403).json({ success: false, message: 'Solo disponible para estudiantes' });
    }

    res.json({ success: true, data: user.studentProfile.progress });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener progreso', error: error.message });
  }
};

/**
 * POST /api/progress
 * Registrar o actualizar progreso de un tema
 */
export const saveProgress = async (req, res) => {
  try {
    const { subject, topic, completed, score } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { studentProfile: true }
    });

    if (!user?.studentProfile) {
      return res.status(403).json({ success: false, message: 'Solo disponible para estudiantes' });
    }

    // Upsert: actualizar si existe, crear si no
    const existing = await prisma.progress.findFirst({
      where: { studentId: user.studentProfile.id, subject, topic }
    });

    let progress;
    if (existing) {
      progress = await prisma.progress.update({
        where: { id: existing.id },
        data: { completed: completed ?? existing.completed, score: score ?? existing.score }
      });
    } else {
      progress = await prisma.progress.create({
        data: { studentId: user.studentProfile.id, subject, topic, completed: completed ?? false, score }
      });
    }

    res.json({ success: true, data: progress });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al guardar progreso', error: error.message });
  }
};
