// controllers/gameController.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Guardar puntuación de un juego
 * POST /api/games/score
 */
export const saveGameScore = async (req, res) => {
  try {
    const userId = req.user.id; // Del middleware de auth
    const { gameType, score, timeSpent, accuracy, level } = req.body;

    // Validar que el usuario sea STUDENT
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { studentProfile: true }
    });

    if (!user || user.role !== 'STUDENT' || !user.studentProfile) {
      return res.status(403).json({ 
        success: false, 
        message: 'Solo los estudiantes pueden guardar puntuaciones' 
      });
    }

    // Guardar puntuación en GameScore
    const gameScore = await prisma.gameScore.create({
      data: {
        studentId: user.studentProfile.id,
        gameType,
        score,
        timeSpent,
        accuracy,
        level: level || 1
      }
    });

    // Actualizar puntos del estudiante
    const pointsToAdd = Math.floor(score / 10); // 10 puntos del juego = 1 punto general
    
    const updatedStudent = await prisma.student.update({
      where: { id: user.studentProfile.id },
      data: {
        points: {
          increment: pointsToAdd
        }
      }
    });

    // Actualizar racha si jugó hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lastActivity = user.studentProfile.lastActivityDate 
      ? new Date(user.studentProfile.lastActivityDate) 
      : null;

    if (lastActivity) {
      lastActivity.setHours(0, 0, 0, 0);
    }

    let newStreak = user.studentProfile.streak || 0;

    if (!lastActivity) {
      // Primera vez que juega
      newStreak = 1;
    } else {
      const diffDays = Math.floor((today - lastActivity) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        // Ya jugó hoy, mantener racha
        newStreak = user.studentProfile.streak;
      } else if (diffDays === 1) {
        // Jugó ayer, incrementar racha
        newStreak = user.studentProfile.streak + 1;
      } else {
        // Se rompió la racha
        newStreak = 1;
      }
    }

    // Actualizar racha y última actividad
    await prisma.student.update({
      where: { id: user.studentProfile.id },
      data: {
        streak: newStreak,
        lastActivityDate: new Date()
      }
    });

    // Verificar y desbloquear logros
    await checkAndUnlockAchievements(user.studentProfile.id, updatedStudent.points + pointsToAdd, newStreak);

    res.json({
      success: true,
      message: 'Puntuación guardada exitosamente',
      data: {
        gameScore,
        pointsAdded: pointsToAdd,
        totalPoints: updatedStudent.points + pointsToAdd,
        streak: newStreak
      }
    });

  } catch (error) {
    console.error('Error guardando puntuación:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al guardar puntuación',
      error: error.message 
    });
  }
};

/**
 * Obtener historial de juegos del estudiante
 * GET /api/games/history
 */
export const getGameHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { studentProfile: true }
    });

    if (!user || user.role !== 'STUDENT' || !user.studentProfile) {
      return res.status(403).json({ 
        success: false, 
        message: 'Solo los estudiantes pueden ver su historial' 
      });
    }

    const history = await prisma.gameScore.findMany({
      where: { studentId: user.studentProfile.id },
      orderBy: { createdAt: 'desc' },
      take: 50 // Últimas 50 partidas
    });

    res.json({
      success: true,
      data: history
    });

  } catch (error) {
    console.error('Error obteniendo historial:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener historial',
      error: error.message 
    });
  }
};

/**
 * Función auxiliar para verificar y desbloquear logros
 */
async function checkAndUnlockAchievements(studentId, totalPoints, streak) {
  try {
    const achievements = [];

    // Logro por puntos
    if (totalPoints >= 100 && totalPoints < 200) {
      achievements.push({ name: 'Primeros 100 puntos', type: 'POINTS', requirement: 100 });
    } else if (totalPoints >= 500) {
      achievements.push({ name: '500 puntos', type: 'POINTS', requirement: 500 });
    } else if (totalPoints >= 1000) {
      achievements.push({ name: '1000 puntos', type: 'POINTS', requirement: 1000 });
    }

    // Logro por racha
    if (streak >= 3) {
      achievements.push({ name: 'Racha de 3 días', type: 'STREAK', requirement: 3 });
    }
    if (streak >= 7) {
      achievements.push({ name: 'Racha de 7 días', type: 'STREAK', requirement: 7 });
    }

    // Crear logros si no existen
    for (const achievement of achievements) {
      const existing = await prisma.achievement.findFirst({
        where: {
          studentId,
          name: achievement.name
        }
      });

      if (!existing) {
        await prisma.achievement.create({
          data: {
            studentId,
            name: achievement.name,
            description: `Has alcanzado ${achievement.requirement} ${achievement.type === 'POINTS' ? 'puntos' : 'días de racha'}`,
            icon: achievement.type === 'POINTS' ? '⭐' : '🔥',
            unlockedAt: new Date()
          }
        });
      }
    }

  } catch (error) {
    console.error('Error verificando logros:', error);
  }
}
