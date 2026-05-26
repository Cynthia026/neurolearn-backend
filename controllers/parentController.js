// controllers/parentController.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * GET /api/parents/children
 * Padre ve sus hijos vinculados con stats completas
 */
export const getMyChildren = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        parentProfile: {
          include: {
            children: {
              include: {
                student: {
                  include: {
                    user: { select: { firstName: true, lastName: true, email: true } },
                    gameScores: { orderBy: { createdAt: 'desc' }, take: 5 },
                    achievements: true,
                    assignedContent: {
                      where: { completed: false },
                      include: { content: true }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!user?.parentProfile) {
      return res.status(403).json({ success: false, message: 'Solo disponible para padres' });
    }

    const children = await Promise.all(
      user.parentProfile.children.map(async ({ student }) => {
        const stats = await prisma.gameScore.aggregate({
          where: { studentId: student.id },
          _avg: { score: true, accuracy: true },
          _count: true
        });

        const gamesThisWeek = await prisma.gameScore.count({
          where: {
            studentId: student.id,
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          }
        });

        return {
          studentId: student.id,
          userId: student.userId,
          firstName: student.user.firstName,
          lastName: student.user.lastName,
          email: student.user.email,
          grade: student.grade,
          points: student.points,
          level: student.level,
          streak: student.streak,
          lastActivity: student.lastActivityDate,
          totalGames: stats._count,
          avgScore: Math.round(stats._avg.score || 0),
          avgAccuracy: Math.round(stats._avg.accuracy || 0),
          gamesThisWeek,
          recentGames: student.gameScores,
          achievements: student.achievements,
          pendingContent: student.assignedContent.map(a => ({
            id: a.id,
            title: a.content.title,
            subject: a.content.subject,
            type: a.content.type,
            dueDate: a.dueDate
          }))
        };
      })
    );

    res.json({ success: true, data: { children, total: children.length } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener hijos', error: error.message });
  }
};

/**
 * POST /api/parents/link-child
 * Padre vincula un hijo usando su email o código
 * Body: { studentEmail }
 */
export const linkChild = async (req, res) => {
  try {
    const { studentEmail } = req.body;

    if (!studentEmail) {
      return res.status(400).json({ success: false, message: 'Se requiere el email del estudiante' });
    }

    // Obtener perfil del padre
    const parentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { parentProfile: true }
    });

    if (!parentUser?.parentProfile) {
      return res.status(403).json({ success: false, message: 'Solo disponible para padres' });
    }

    // Buscar al estudiante por email
    const studentUser = await prisma.user.findUnique({
      where: { email: studentEmail.toLowerCase().trim() },
      include: { studentProfile: true }
    });

    if (!studentUser || studentUser.role !== 'STUDENT' || !studentUser.studentProfile) {
      return res.status(404).json({ success: false, message: 'No se encontró ningún estudiante con ese email' });
    }

    // Verificar que no esté ya vinculado
    const existing = await prisma.parentChild.findUnique({
      where: {
        parentId_studentId: {
          parentId: parentUser.parentProfile.id,
          studentId: studentUser.studentProfile.id
        }
      }
    });

    if (existing) {
      return res.status(409).json({ success: false, message: 'Este estudiante ya está vinculado a tu cuenta' });
    }

    // Crear vínculo
    await prisma.parentChild.create({
      data: {
        parentId: parentUser.parentProfile.id,
        studentId: studentUser.studentProfile.id
      }
    });

    res.json({
      success: true,
      message: `✅ ${studentUser.firstName} ${studentUser.lastName} vinculado correctamente`,
      data: {
        studentId: studentUser.studentProfile.id,
        firstName: studentUser.firstName,
        lastName: studentUser.lastName,
        grade: studentUser.studentProfile.grade
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al vincular hijo', error: error.message });
  }
};

/**
 * DELETE /api/parents/unlink-child/:studentId
 * Padre desvincula un hijo
 */
export const unlinkChild = async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);

    const parentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { parentProfile: true }
    });

    if (!parentUser?.parentProfile) {
      return res.status(403).json({ success: false, message: 'Solo disponible para padres' });
    }

    await prisma.parentChild.delete({
      where: {
        parentId_studentId: {
          parentId: parentUser.parentProfile.id,
          studentId
        }
      }
    });

    res.json({ success: true, message: 'Hijo desvinculado correctamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al desvincular', error: error.message });
  }
};
