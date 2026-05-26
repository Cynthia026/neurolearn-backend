// controllers/familyController.js
// Maneja: padre registra hijos, maestro vincula alumnos
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// ══════════════════════════════════════════════════════
// PADRE — registrar/vincular hijo
// ══════════════════════════════════════════════════════

/**
 * POST /api/family/add-child
 * El padre busca y vincula a su hijo por email o código
 * Body: { studentEmail }
 */
export const addChild = async (req, res) => {
  try {
    const { studentEmail } = req.body;

    // Verificar que sea padre
    const parent = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { parentProfile: true }
    });

    if (!parent?.parentProfile) {
      return res.status(403).json({ success: false, message: 'Solo los padres pueden vincular hijos' });
    }

    // Buscar al estudiante por email
    const studentUser = await prisma.user.findUnique({
      where: { email: studentEmail },
      include: { studentProfile: true }
    });

    if (!studentUser || studentUser.role !== 'STUDENT' || !studentUser.studentProfile) {
      return res.status(404).json({ success: false, message: 'No se encontró ningún alumno con ese email' });
    }

    // Verificar que no esté ya vinculado
    const existing = await prisma.parentChild.findUnique({
      where: { parentId_studentId: { parentId: parent.parentProfile.id, studentId: studentUser.studentProfile.id } }
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'Este alumno ya está vinculado a tu cuenta' });
    }

    // Crear vínculo
    await prisma.parentChild.create({
      data: { parentId: parent.parentProfile.id, studentId: studentUser.studentProfile.id }
    });

    res.json({
      success: true,
      message: `✅ ${studentUser.firstName} ${studentUser.lastName} vinculado correctamente`,
      data: {
        id: studentUser.id,
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
 * GET /api/family/my-children
 * El padre obtiene la lista de sus hijos con estadísticas
 */
export const getMyChildren = async (req, res) => {
  try {
    const parent = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        parentProfile: {
          include: {
            children: {
              include: {
                student: {
                  include: {
                    user: { select: { id: true, firstName: true, lastName: true, email: true } },
                    gameScores: { orderBy: { createdAt: 'desc' }, take: 5 },
                    achievements: true,
                    assignedContent: { include: { content: true } }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!parent?.parentProfile) {
      return res.status(403).json({ success: false, message: 'Perfil de padre no encontrado' });
    }

    const children = await Promise.all(
      parent.parentProfile.children.map(async ({ student }) => {
        const stats = await prisma.gameScore.aggregate({
          where: { studentId: student.id },
          _avg: { score: true, accuracy: true },
          _count: true
        });

        const pendingContent = student.assignedContent.filter(a => !a.completed).length;

        return {
          id: student.user.id,
          studentId: student.id,
          firstName: student.user.firstName,
          lastName: student.user.lastName,
          email: student.user.email,
          grade: student.grade,
          points: student.points,
          level: student.level,
          streak: student.streak,
          lastActivity: student.lastActivityDate,
          totalGames: stats._count,
          avgAccuracy: Math.round(stats._avg.accuracy || 0),
          avgScore: Math.round(stats._avg.score || 0),
          achievements: student.achievements.length,
          pendingContent,
          recentGames: student.gameScores
        };
      })
    );

    res.json({ success: true, data: { children, total: children.length } });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener hijos', error: error.message });
  }
};

/**
 * DELETE /api/family/remove-child/:studentId
 * El padre desvincula a un hijo
 */
export const removeChild = async (req, res) => {
  try {
    const studentUserId = parseInt(req.params.studentId);

    const parent = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { parentProfile: true }
    });

    const student = await prisma.user.findUnique({
      where: { id: studentUserId },
      include: { studentProfile: true }
    });

    if (!parent?.parentProfile || !student?.studentProfile) {
      return res.status(404).json({ success: false, message: 'No encontrado' });
    }

    await prisma.parentChild.delete({
      where: { parentId_studentId: { parentId: parent.parentProfile.id, studentId: student.studentProfile.id } }
    });

    res.json({ success: true, message: 'Hijo desvinculado correctamente' });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al desvincular', error: error.message });
  }
};

// ══════════════════════════════════════════════════════
// MAESTRO — vincular alumnos
// ══════════════════════════════════════════════════════

/**
 * POST /api/family/add-student
 * El maestro vincula un alumno a su grupo por email
 * Body: { studentEmail }
 */
export const addStudentToTeacher = async (req, res) => {
  try {
    const { studentEmail } = req.body;

    const teacher = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { teacherProfile: true }
    });

    if (!teacher?.teacherProfile) {
      return res.status(403).json({ success: false, message: 'Solo los maestros pueden agregar alumnos' });
    }

    const studentUser = await prisma.user.findUnique({
      where: { email: studentEmail },
      include: { studentProfile: true }
    });

    if (!studentUser || studentUser.role !== 'STUDENT' || !studentUser.studentProfile) {
      return res.status(404).json({ success: false, message: 'Alumno no encontrado con ese email' });
    }

    const existing = await prisma.teacherStudent.findUnique({
      where: { teacherId_studentId: { teacherId: teacher.teacherProfile.id, studentId: studentUser.studentProfile.id } }
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'Este alumno ya está en tu grupo' });
    }

    await prisma.teacherStudent.create({
      data: { teacherId: teacher.teacherProfile.id, studentId: studentUser.studentProfile.id }
    });

    res.json({
      success: true,
      message: `✅ ${studentUser.firstName} ${studentUser.lastName} agregado a tu grupo`,
      data: {
        id: studentUser.id,
        firstName: studentUser.firstName,
        lastName: studentUser.lastName,
        grade: studentUser.studentProfile.grade
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al agregar alumno', error: error.message });
  }
};

/**
 * GET /api/family/my-students
 * El maestro obtiene sus alumnos vinculados
 */
export const getMyStudents = async (req, res) => {
  try {
    const teacher = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        teacherProfile: {
          include: {
            students: {
              include: {
                student: {
                  include: {
                    user: { select: { id: true, firstName: true, lastName: true, email: true } },
                    gameScores: { orderBy: { createdAt: 'desc' }, take: 5 },
                    achievements: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!teacher?.teacherProfile) {
      return res.status(403).json({ success: false, message: 'Perfil de maestro no encontrado' });
    }

    const students = await Promise.all(
      teacher.teacherProfile.students.map(async ({ student }) => {
        const stats = await prisma.gameScore.aggregate({
          where: { studentId: student.id },
          _avg: { score: true, accuracy: true },
          _count: true
        });

        let riskLevel = 'bajo';
        const acc = stats._avg.accuracy || 0;
        const gamesThisWeek = await prisma.gameScore.count({
          where: {
            studentId: student.id,
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          }
        });

        if (acc < 60 || gamesThisWeek < 2) riskLevel = 'alto';
        else if (acc < 75 || gamesThisWeek < 4) riskLevel = 'medio';

        return {
          id: student.user.id,
          studentId: student.id,
          firstName: student.user.firstName,
          lastName: student.user.lastName,
          email: student.user.email,
          grade: student.grade,
          points: student.points,
          level: student.level,
          streak: student.streak,
          lastActivity: student.lastActivityDate,
          totalGames: stats._count,
          avgAccuracy: Math.round(acc),
          avgScore: Math.round(stats._avg.score || 0),
          riskLevel,
          recentGames: student.gameScores
        };
      })
    );

    res.json({ success: true, data: { students, total: students.length } });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener alumnos', error: error.message });
  }
};

/**
 * DELETE /api/family/remove-student/:studentId
 */
export const removeStudentFromTeacher = async (req, res) => {
  try {
    const studentUserId = parseInt(req.params.studentId);

    const teacher = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { teacherProfile: true }
    });
    const student = await prisma.user.findUnique({
      where: { id: studentUserId },
      include: { studentProfile: true }
    });

    if (!teacher?.teacherProfile || !student?.studentProfile) {
      return res.status(404).json({ success: false, message: 'No encontrado' });
    }

    await prisma.teacherStudent.delete({
      where: { teacherId_studentId: { teacherId: teacher.teacherProfile.id, studentId: student.studentProfile.id } }
    });

    res.json({ success: true, message: 'Alumno removido del grupo' });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al remover alumno', error: error.message });
  }
};
