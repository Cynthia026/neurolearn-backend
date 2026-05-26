// controllers/evaluationsController.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════
// MAESTRO — Gestión de evaluaciones
// ═══════════════════════════════════════════════════════════

/**
 * POST /api/evaluations
 * Crear evaluación con preguntas incluidas
 * Body: { title, description, subject, grade, timeLimit?, passingScore?,
 *         dueDate?, questions: [{ text, type, points, options? }] }
 */
export const createEvaluation = async (req, res) => {
  try {
    const {
      title, description, subject, grade,
      timeLimit, maxScore, passingScore, dueDate, questions = []
    } = req.body;

    const teacher = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { teacherProfile: true }
    });

    if (!teacher?.teacherProfile) {
      return res.status(403).json({ success: false, message: 'Solo los maestros pueden crear evaluaciones' });
    }

    if (!title || !subject || !grade) {
      return res.status(400).json({ success: false, message: 'Título, materia y grado son requeridos' });
    }

    // Crear evaluación con preguntas y opciones en una sola transacción
    const evaluation = await prisma.evaluation.create({
      data: {
        teacherId:    teacher.teacherProfile.id,
        title,
        description:  description || '',
        subject,
        grade:        parseInt(grade),
        timeLimit:    timeLimit ? parseInt(timeLimit) : null,
        maxScore:     maxScore ? parseInt(maxScore) : 100,
        passingScore: passingScore ? parseInt(passingScore) : 60,
        dueDate:      dueDate ? new Date(dueDate) : null,
        questions: {
          create: questions.map((q, idx) => ({
            text:    q.text,
            type:    q.type,       // MULTIPLE_CHOICE | TRUE_FALSE | SHORT_ANSWER
            points:  q.points || 10,
            order:   idx,
            imageUrl: q.imageUrl || null,
            options: q.options ? {
              create: q.options.map((opt, oidx) => ({
                text:      opt.text,
                isCorrect: opt.isCorrect || false,
                order:     oidx
              }))
            } : undefined
          }))
        }
      },
      include: {
        questions: { include: { options: true }, orderBy: { order: 'asc' } }
      }
    });

    res.status(201).json({
      success: true,
      message: `✅ Evaluación "${title}" creada con ${questions.length} preguntas`,
      data: evaluation
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al crear evaluación', error: error.message });
  }
};

/**
 * GET /api/evaluations/my-evaluations
 * Maestro ve todas sus evaluaciones con estadísticas
 */
export const getMyEvaluations = async (req, res) => {
  try {
    const teacher = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { teacherProfile: true }
    });

    if (!teacher?.teacherProfile) {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }

    const evaluations = await prisma.evaluation.findMany({
      where: { teacherId: teacher.teacherProfile.id },
      include: {
        questions: { select: { id: true, points: true } },
        assignments: {
          include: {
            student: {
              include: { user: { select: { firstName: true, lastName: true } } }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const result = evaluations.map(ev => {
      const completed  = ev.assignments.filter(a => a.status === 'COMPLETED');
      const avgScore   = completed.length > 0
        ? Math.round(completed.reduce((s, a) => s + (a.score || 0), 0) / completed.length)
        : null;
      const passRate   = completed.length > 0
        ? Math.round((completed.filter(a => a.passed).length / completed.length) * 100)
        : null;

      return {
        id:           ev.id,
        title:        ev.title,
        subject:      ev.subject,
        grade:        ev.grade,
        timeLimit:    ev.timeLimit,
        maxScore:     ev.maxScore,
        passingScore: ev.passingScore,
        isPublished:  ev.isPublished,
        dueDate:      ev.dueDate,
        createdAt:    ev.createdAt,
        questionCount: ev.questions.length,
        totalPoints:   ev.questions.reduce((s, q) => s + q.points, 0),
        assignedCount: ev.assignments.length,
        completedCount: completed.length,
        pendingCount:  ev.assignments.filter(a => a.status === 'PENDING').length,
        avgScore,
        passRate
      };
    });

    res.json({ success: true, data: result });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener evaluaciones', error: error.message });
  }
};

/**
 * GET /api/evaluations/:id
 * Detalle de evaluación (con preguntas — sin marcar respuestas correctas para alumnos)
 */
export const getEvaluationById = async (req, res) => {
  try {
    const evalId = parseInt(req.params.id);
    const user   = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { teacherProfile: true, studentProfile: true }
    });

    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evalId },
      include: {
        questions: {
          include: { options: { orderBy: { order: 'asc' } } },
          orderBy: { order: 'asc' }
        },
        teacher: { include: { user: { select: { firstName: true, lastName: true } } } }
      }
    });

    if (!evaluation) {
      return res.status(404).json({ success: false, message: 'Evaluación no encontrada' });
    }

    // Alumnos no ven cuál opción es correcta
    const isStudent = user?.role === 'STUDENT';
    const data = {
      ...evaluation,
      questions: evaluation.questions.map(q => ({
        ...q,
        options: q.options.map(opt => ({
          id:    opt.id,
          text:  opt.text,
          order: opt.order,
          // Solo el maestro ve cuál es correcta
          ...(isStudent ? {} : { isCorrect: opt.isCorrect })
        }))
      }))
    };

    res.json({ success: true, data });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener evaluación', error: error.message });
  }
};

/**
 * PUT /api/evaluations/:id
 * Editar evaluación (solo si no hay alumnos que ya la respondieron)
 */
export const updateEvaluation = async (req, res) => {
  try {
    const evalId  = parseInt(req.params.id);
    const { title, description, subject, grade, timeLimit, passingScore, dueDate, isPublished } = req.body;

    const teacher = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { teacherProfile: true }
    });

    const evaluation = await prisma.evaluation.findFirst({
      where: { id: evalId, teacherId: teacher?.teacherProfile?.id }
    });

    if (!evaluation) {
      return res.status(404).json({ success: false, message: 'Evaluación no encontrada' });
    }

    // No permitir editar si ya hay alumnos que la completaron
    const completedCount = await prisma.evaluationAssignment.count({
      where: { evaluationId: evalId, status: 'COMPLETED' }
    });

    if (completedCount > 0 && (title || subject)) {
      return res.status(400).json({
        success: false,
        message: `No se puede editar: ${completedCount} alumno(s) ya la completaron. Solo puedes cambiar fecha límite o publicación.`
      });
    }

    const updated = await prisma.evaluation.update({
      where: { id: evalId },
      data: {
        title:        title        ?? evaluation.title,
        description:  description  ?? evaluation.description,
        subject:      subject      ?? evaluation.subject,
        grade:        grade        ? parseInt(grade) : evaluation.grade,
        timeLimit:    timeLimit    !== undefined ? parseInt(timeLimit) : evaluation.timeLimit,
        passingScore: passingScore ? parseInt(passingScore) : evaluation.passingScore,
        dueDate:      dueDate      ? new Date(dueDate) : evaluation.dueDate,
        isPublished:  isPublished  ?? evaluation.isPublished
      }
    });

    res.json({ success: true, message: 'Evaluación actualizada', data: updated });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar', error: error.message });
  }
};

/**
 * DELETE /api/evaluations/:id
 */
export const deleteEvaluation = async (req, res) => {
  try {
    const evalId  = parseInt(req.params.id);
    const teacher = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { teacherProfile: true }
    });

    const evaluation = await prisma.evaluation.findFirst({
      where: { id: evalId, teacherId: teacher?.teacherProfile?.id }
    });

    if (!evaluation) {
      return res.status(404).json({ success: false, message: 'Evaluación no encontrada' });
    }

    await prisma.evaluation.delete({ where: { id: evalId } });
    res.json({ success: true, message: 'Evaluación eliminada' });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al eliminar', error: error.message });
  }
};

/**
 * POST /api/evaluations/:id/assign
 * Asignar evaluación a uno o varios alumnos del grupo
 * Body: { studentIds: [1, 2, 3] }
 */
export const assignEvaluation = async (req, res) => {
  try {
    const evalId      = parseInt(req.params.id);
    const { studentIds } = req.body;

    const teacher = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { teacherProfile: true }
    });

    const evaluation = await prisma.evaluation.findFirst({
      where: { id: evalId, teacherId: teacher?.teacherProfile?.id }
    });

    if (!evaluation) {
      return res.status(404).json({ success: false, message: 'Evaluación no encontrada' });
    }

    let assigned = 0;
    for (const userId of studentIds) {
      const studentUser = await prisma.user.findUnique({
        where: { id: userId },
        include: { studentProfile: true }
      });
      if (!studentUser?.studentProfile) continue;

      try {
        await prisma.evaluationAssignment.create({
          data: { evaluationId: evalId, studentId: studentUser.studentProfile.id }
        });
        assigned++;
      } catch (e) { /* ignorar duplicados */ }
    }

    res.json({
      success: true,
      message: `Evaluación asignada a ${assigned} alumno(s)`,
      data: { assigned }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al asignar', error: error.message });
  }
};

/**
 * GET /api/evaluations/:id/results
 * Maestro ve los resultados de todos los alumnos
 */
export const getEvaluationResults = async (req, res) => {
  try {
    const evalId  = parseInt(req.params.id);
    const teacher = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { teacherProfile: true }
    });

    const evaluation = await prisma.evaluation.findFirst({
      where: { id: evalId, teacherId: teacher?.teacherProfile?.id },
      include: { questions: { select: { id: true, text: true, points: true, type: true } } }
    });

    if (!evaluation) {
      return res.status(404).json({ success: false, message: 'Evaluación no encontrada' });
    }

    const assignments = await prisma.evaluationAssignment.findMany({
      where: { evaluationId: evalId },
      include: {
        student: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
        answers: {
          include: {
            question: { select: { text: true, type: true, points: true } }
          }
        }
      },
      orderBy: { submittedAt: 'desc' }
    });

    const results = assignments.map(a => ({
      studentId:   a.student.user.email,
      firstName:   a.student.user.firstName,
      lastName:    a.student.user.lastName,
      status:      a.status,
      score:       a.score,
      maxScore:    evaluation.maxScore,
      passed:      a.passed,
      timeSpent:   a.timeSpent,
      startedAt:   a.startedAt,
      submittedAt: a.submittedAt,
      percentage:  a.score !== null ? Math.round((a.score / evaluation.maxScore) * 100) : null,
      answers:     a.answers.map(ans => ({
        question:    ans.question.text,
        isCorrect:   ans.isCorrect,
        pointsEarned: ans.pointsEarned,
        maxPoints:   ans.question.points
      }))
    }));

    // Estadísticas generales
    const completed  = results.filter(r => r.status === 'COMPLETED');
    const stats = {
      total:     results.length,
      completed: completed.length,
      pending:   results.filter(r => r.status === 'PENDING').length,
      passed:    completed.filter(r => r.passed).length,
      failed:    completed.filter(r => !r.passed).length,
      avgScore:  completed.length > 0
        ? Math.round(completed.reduce((s, r) => s + (r.score || 0), 0) / completed.length)
        : null,
      passRate: completed.length > 0
        ? Math.round((completed.filter(r => r.passed).length / completed.length) * 100)
        : null
    };

    res.json({ success: true, data: { evaluation: { id: evaluation.id, title: evaluation.title, passingScore: evaluation.passingScore, maxScore: evaluation.maxScore }, stats, results } });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener resultados', error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════
// ALUMNO — Presentar evaluaciones
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/evaluations/my-evaluations
 * Alumno ve sus evaluaciones asignadas
 */
export const getMyAssignedEvaluations = async (req, res) => {
  try {
    const student = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { studentProfile: true }
    });

    if (!student?.studentProfile) {
      return res.status(403).json({ success: false, message: 'Solo para estudiantes' });
    }

    const assignments = await prisma.evaluationAssignment.findMany({
      where: { studentId: student.studentProfile.id },
      include: {
        evaluation: {
          include: {
            questions: { select: { id: true, points: true } },
            teacher: { include: { user: { select: { firstName: true, lastName: true } } } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const result = assignments.map(a => ({
      assignmentId:  a.id,
      status:        a.status,
      score:         a.score,
      passed:        a.passed,
      timeSpent:     a.timeSpent,
      startedAt:     a.startedAt,
      submittedAt:   a.submittedAt,
      evaluation: {
        id:           a.evaluation.id,
        title:        a.evaluation.title,
        subject:      a.evaluation.subject,
        timeLimit:    a.evaluation.timeLimit,
        maxScore:     a.evaluation.maxScore,
        passingScore: a.evaluation.passingScore,
        dueDate:      a.evaluation.dueDate,
        questionCount: a.evaluation.questions.length,
        totalPoints:   a.evaluation.questions.reduce((s, q) => s + q.points, 0),
        teacher:      `${a.evaluation.teacher.user.firstName} ${a.evaluation.teacher.user.lastName}`
      }
    }));

    res.json({ success: true, data: result });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener evaluaciones', error: error.message });
  }
};

/**
 * POST /api/evaluations/:id/start
 * Alumno inicia una evaluación
 */
export const startEvaluation = async (req, res) => {
  try {
    const evalId  = parseInt(req.params.id);
    const student = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { studentProfile: true }
    });

    if (!student?.studentProfile) {
      return res.status(403).json({ success: false, message: 'Solo para estudiantes' });
    }

    const assignment = await prisma.evaluationAssignment.findUnique({
      where: { evaluationId_studentId: { evaluationId: evalId, studentId: student.studentProfile.id } },
      include: {
        evaluation: {
          include: {
            questions: {
              include: { options: { orderBy: { order: 'asc' } } },
              orderBy: { order: 'asc' }
            }
          }
        }
      }
    });

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'No tienes esta evaluación asignada' });
    }

    if (assignment.status === 'COMPLETED') {
      return res.status(400).json({ success: false, message: 'Ya completaste esta evaluación' });
    }

    // Marcar como iniciada
    await prisma.evaluationAssignment.update({
      where: { id: assignment.id },
      data: { status: 'IN_PROGRESS', startedAt: new Date() }
    });

    // Enviar preguntas SIN indicar cuál opción es correcta
    const questions = assignment.evaluation.questions.map(q => ({
      id:      q.id,
      text:    q.text,
      type:    q.type,
      points:  q.points,
      order:   q.order,
      imageUrl: q.imageUrl,
      options: q.options.map(opt => ({ id: opt.id, text: opt.text, order: opt.order }))
    }));

    res.json({
      success: true,
      data: {
        assignmentId: assignment.id,
        timeLimit:    assignment.evaluation.timeLimit,
        maxScore:     assignment.evaluation.maxScore,
        startedAt:    new Date(),
        questions
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al iniciar evaluación', error: error.message });
  }
};

/**
 * POST /api/evaluations/submit/:assignmentId
 * Alumno envía sus respuestas — el backend califica automáticamente
 * Body: { answers: [{ questionId, selectedOptionId?, textAnswer? }] }
 */
export const submitEvaluation = async (req, res) => {
  try {
    const assignmentId = parseInt(req.params.assignmentId);
    const { answers = [] } = req.body;

    const student = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { studentProfile: true }
    });

    const assignment = await prisma.evaluationAssignment.findFirst({
      where: { id: assignmentId, studentId: student?.studentProfile?.id },
      include: {
        evaluation: {
          include: {
            questions: { include: { options: true } }
          }
        }
      }
    });

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Asignación no encontrada' });
    }

    if (assignment.status === 'COMPLETED') {
      return res.status(400).json({ success: false, message: 'Ya enviaste esta evaluación' });
    }

    // Calcular tiempo transcurrido
    const timeSpent = assignment.startedAt
      ? Math.round((Date.now() - new Date(assignment.startedAt).getTime()) / 1000)
      : 0;

    // Verificar límite de tiempo
    if (assignment.evaluation.timeLimit) {
      const maxSeconds = assignment.evaluation.timeLimit * 60;
      if (timeSpent > maxSeconds + 30) { // 30 seg de tolerancia
        return res.status(400).json({ success: false, message: 'Tiempo límite superado' });
      }
    }

    // Calificar respuestas
    let totalEarned = 0;
    const questionMap = new Map(assignment.evaluation.questions.map(q => [q.id, q]));

    for (const ans of answers) {
      const question = questionMap.get(ans.questionId);
      if (!question) continue;

      let isCorrect    = false;
      let pointsEarned = 0;

      if (question.type === 'MULTIPLE_CHOICE' || question.type === 'TRUE_FALSE') {
        if (ans.selectedOptionId) {
          const correctOption = question.options.find(o => o.isCorrect);
          isCorrect    = correctOption?.id === ans.selectedOptionId;
          pointsEarned = isCorrect ? question.points : 0;
        }
      } else if (question.type === 'SHORT_ANSWER') {
        // Respuesta corta: el maestro calificará manualmente
        // Por ahora se guarda como pendiente de revisión
        isCorrect    = null;
        pointsEarned = 0;
      }

      totalEarned += pointsEarned;

      // Guardar respuesta (upsert por si ya existía)
      await prisma.studentAnswer.upsert({
        where: { assignmentId_questionId: { assignmentId, questionId: ans.questionId } },
        update: { selectedOptionId: ans.selectedOptionId || null, textAnswer: ans.textAnswer || null, isCorrect, pointsEarned },
        create: { assignmentId, questionId: ans.questionId, selectedOptionId: ans.selectedOptionId || null, textAnswer: ans.textAnswer || null, isCorrect, pointsEarned }
      });
    }

    // Calcular score final (sobre 100)
    const totalPossible = assignment.evaluation.questions.reduce((s, q) => s + q.points, 0);
    const scoreOn100    = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;
    const passed        = scoreOn100 >= assignment.evaluation.passingScore;

    // Actualizar asignación
    await prisma.evaluationAssignment.update({
      where: { id: assignmentId },
      data: { status: 'COMPLETED', submittedAt: new Date(), score: scoreOn100, passed, timeSpent }
    });

    // Dar puntos al alumno si aprobó
    if (passed && student?.studentProfile) {
      const bonus = passed ? Math.round(scoreOn100 / 2) : 0;
      await prisma.student.update({
        where: { id: student.studentProfile.id },
        data: { points: { increment: bonus } }
      });
    }

    res.json({
      success: true,
      message: passed ? '🎉 ¡Aprobaste!' : '📚 No aprobaste esta vez, sigue practicando',
      data: {
        score:        scoreOn100,
        passed,
        pointsEarned: totalEarned,
        maxPoints:    totalPossible,
        timeSpent,
        passingScore: assignment.evaluation.passingScore
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al enviar evaluación', error: error.message });
  }
};

/**
 * GET /api/evaluations/result/:assignmentId
 * Alumno ve sus resultados detallados después de entregar
 */
export const getMyResult = async (req, res) => {
  try {
    const assignmentId = parseInt(req.params.assignmentId);
    const student = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { studentProfile: true }
    });

    const assignment = await prisma.evaluationAssignment.findFirst({
      where: { id: assignmentId, studentId: student?.studentProfile?.id, status: 'COMPLETED' },
      include: {
        evaluation: { include: { questions: { include: { options: true }, orderBy: { order: 'asc' } } } },
        answers: true
      }
    });

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Resultado no encontrado' });
    }

    const answerMap = new Map(assignment.answers.map(a => [a.questionId, a]));

    const reviewQuestions = assignment.evaluation.questions.map(q => {
      const ans = answerMap.get(q.id);
      const correctOption = q.options.find(o => o.isCorrect);
      return {
        text:            q.text,
        type:            q.type,
        points:          q.points,
        pointsEarned:    ans?.pointsEarned || 0,
        isCorrect:       ans?.isCorrect,
        selectedOptionId: ans?.selectedOptionId,
        correctOptionId:  correctOption?.id,
        options:         q.options.map(o => ({
          id:        o.id,
          text:      o.text,
          isCorrect: o.isCorrect
        }))
      };
    });

    res.json({
      success: true,
      data: {
        score:        assignment.score,
        passed:       assignment.passed,
        timeSpent:    assignment.timeSpent,
        submittedAt:  assignment.submittedAt,
        passingScore: assignment.evaluation.passingScore,
        maxScore:     assignment.evaluation.maxScore,
        questions:    reviewQuestions
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener resultado', error: error.message });
  }
};
