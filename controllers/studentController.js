// controllers/studentController.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Obtener perfil completo del estudiante
 * GET /api/students/profile
 */
export const getStudentProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        studentProfile: {
          include: {
            gameScores: {
              orderBy: { createdAt: 'desc' },
              take: 10 // Últimas 10 partidas
            },
            achievements: {
              orderBy: { unlockedAt: 'desc' }
            },
            progress: true
          }
        }
      }
    });

    if (!user || user.role !== 'STUDENT' || !user.studentProfile) {
      return res.status(403).json({ 
        success: false, 
        message: 'Usuario no es estudiante' 
      });
    }

    // Calcular estadísticas
    const totalGames = await prisma.gameScore.count({
      where: { studentId: user.studentProfile.id }
    });

    const avgScore = await prisma.gameScore.aggregate({
      where: { studentId: user.studentProfile.id },
      _avg: {
        score: true,
        accuracy: true
      }
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        },
        studentProfile: {
          id: user.studentProfile.id,
          grade: user.studentProfile.grade,
          points: user.studentProfile.points,
          level: user.studentProfile.level,
          streak: user.studentProfile.streak,
          lastActivityDate: user.studentProfile.lastActivityDate
        },
        stats: {
          totalGames,
          avgScore: avgScore._avg.score || 0,
          avgAccuracy: avgScore._avg.accuracy || 0
        },
        recentGames: user.studentProfile.gameScores,
        achievements: user.studentProfile.achievements,
        progress: user.studentProfile.progress
      }
    });

  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener perfil',
      error: error.message 
    });
  }
};

/**
 * Obtener todos los estudiantes (para profesores)
 * GET /api/students/all
 */
export const getAllStudents = async (req, res) => {
  try {
    const userId = req.user.id;

    // Verificar que sea profesor
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || user.role !== 'TEACHER') {
      return res.status(403).json({ 
        success: false, 
        message: 'Solo los profesores pueden ver esta información' 
      });
    }

    // Obtener todos los estudiantes con sus perfiles
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      include: {
        studentProfile: {
          include: {
            gameScores: {
              orderBy: { createdAt: 'desc' },
              take: 5
            },
            achievements: true
          }
        }
      }
    });

    // Calcular estadísticas por estudiante
    const studentsWithStats = await Promise.all(
      students.map(async (student) => {
        if (!student.studentProfile) return null;

        const totalGames = await prisma.gameScore.count({
          where: { studentId: student.studentProfile.id }
        });

        const avgScore = await prisma.gameScore.aggregate({
          where: { studentId: student.studentProfile.id },
          _avg: {
            score: true,
            accuracy: true
          }
        });

        // Determinar nivel de riesgo
        let riskLevel = 'bajo';
        const accuracy = avgScore._avg.accuracy || 0;
        const gamesThisWeek = await prisma.gameScore.count({
          where: {
            studentId: student.studentProfile.id,
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          }
        });

        if (accuracy < 60 || gamesThisWeek < 2) {
          riskLevel = 'alto';
        } else if (accuracy < 75 || gamesThisWeek < 4) {
          riskLevel = 'medio';
        }

        return {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email,
          grade: student.studentProfile.grade,
          points: student.studentProfile.points,
          level: student.studentProfile.level,
          streak: student.studentProfile.streak,
          totalGames,
          avgScore: Math.round(avgScore._avg.score || 0),
          avgAccuracy: Math.round(avgScore._avg.accuracy || 0),
          riskLevel,
          recentActivity: student.studentProfile.lastActivityDate,
          achievements: student.studentProfile.achievements.length
        };
      })
    );

    // Filtrar nulls
    const validStudents = studentsWithStats.filter(s => s !== null);

    res.json({
      success: true,
      data: {
        students: validStudents,
        totalStudents: validStudents.length
      }
    });

  } catch (error) {
    console.error('Error obteniendo estudiantes:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener estudiantes',
      error: error.message 
    });
  }
};

/**
 * Obtener estudiante por ID (para profesores)
 * GET /api/students/:id
 */
export const getStudentById = async (req, res) => {
  try {
    const userId = req.user.id;
    const studentUserId = parseInt(req.params.id);

    // Verificar que sea profesor
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || user.role !== 'TEACHER') {
      return res.status(403).json({ 
        success: false, 
        message: 'Solo los profesores pueden ver esta información' 
      });
    }

    const student = await prisma.user.findUnique({
      where: { id: studentUserId },
      include: {
        studentProfile: {
          include: {
            gameScores: {
              orderBy: { createdAt: 'desc' },
              take: 20
            },
            achievements: {
              orderBy: { unlockedAt: 'desc' }
            },
            progress: true
          }
        }
      }
    });

    if (!student || student.role !== 'STUDENT' || !student.studentProfile) {
      return res.status(404).json({ 
        success: false, 
        message: 'Estudiante no encontrado' 
      });
    }

    const totalGames = await prisma.gameScore.count({
      where: { studentId: student.studentProfile.id }
    });

    const avgScore = await prisma.gameScore.aggregate({
      where: { studentId: student.studentProfile.id },
      _avg: {
        score: true,
        accuracy: true
      }
    });

    res.json({
      success: true,
      data: {
        student: {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email,
          grade: student.studentProfile.grade,
          points: student.studentProfile.points,
          level: student.studentProfile.level,
          streak: student.studentProfile.streak,
          lastActivityDate: student.studentProfile.lastActivityDate
        },
        stats: {
          totalGames,
          avgScore: avgScore._avg.score || 0,
          avgAccuracy: avgScore._avg.accuracy || 0
        },
        gameScores: student.studentProfile.gameScores,
        achievements: student.studentProfile.achievements,
        progress: student.studentProfile.progress
      }
    });

  } catch (error) {
    console.error('Error obteniendo estudiante:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener estudiante',
      error: error.message 
    });
  }
};
