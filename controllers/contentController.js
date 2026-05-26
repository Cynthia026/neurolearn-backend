// controllers/contentController.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function getTeacherProfile(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { teacherProfile: true } });
  if (!user?.teacherProfile) throw { status: 403, message: 'Solo disponible para docentes' };
  return user.teacherProfile;
}
async function getStudentProfile(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { studentProfile: true } });
  if (!user?.studentProfile) throw { status: 403, message: 'Solo disponible para estudiantes' };
  return user.studentProfile;
}

// ── MAESTRO: ALUMNOS ──────────────────────────────────────

export const getMyStudents = async (req, res) => {
  try {
    const teacher = await getTeacherProfile(req.user.id);
    const relations = await prisma.teacherStudent.findMany({
      where: { teacherId: teacher.id },
      include: { student: { include: { user: { select: { firstName:true, lastName:true, email:true } }, gameScores: { orderBy:{ createdAt:'desc' }, take:3 } } } }
    });
    const students = await Promise.all(relations.map(async ({ student }) => {
      const stats = await prisma.gameScore.aggregate({ where:{ studentId: student.id }, _avg:{ accuracy:true, score:true }, _count:true });
      const gamesThisWeek = await prisma.gameScore.count({ where:{ studentId: student.id, createdAt:{ gte: new Date(Date.now()-7*24*60*60*1000) } } });
      const acc = stats._avg.accuracy||0;
      return { studentId:student.id, userId:student.userId, firstName:student.user.firstName, lastName:student.user.lastName, email:student.user.email, grade:student.grade, points:student.points, level:student.level, streak:student.streak, totalGames:stats._count, avgAccuracy:Math.round(acc), avgScore:Math.round(stats._avg.score||0), gamesThisWeek, riskLevel: acc<60||gamesThisWeek<2?'alto':acc<75||gamesThisWeek<4?'medio':'bajo', lastActivity:student.lastActivityDate };
    }));
    res.json({ success:true, data:{ students, total:students.length } });
  } catch(e) { res.status(e.status||500).json({ success:false, message:e.message }); }
};

export const assignStudent = async (req, res) => {
  try {
    const { studentEmail } = req.body;
    if (!studentEmail) return res.status(400).json({ success:false, message:'Se requiere email del estudiante' });
    const teacher = await getTeacherProfile(req.user.id);
    const studentUser = await prisma.user.findUnique({ where:{ email: studentEmail.toLowerCase().trim() }, include:{ studentProfile:true } });
    if (!studentUser||studentUser.role!=='STUDENT'||!studentUser.studentProfile) return res.status(404).json({ success:false, message:'No se encontró ningún estudiante con ese email' });
    const existing = await prisma.teacherStudent.findUnique({ where:{ teacherId_studentId:{ teacherId:teacher.id, studentId:studentUser.studentProfile.id } } });
    if (existing) return res.status(409).json({ success:false, message:'El alumno ya está en tu lista' });
    await prisma.teacherStudent.create({ data:{ teacherId:teacher.id, studentId:studentUser.studentProfile.id } });
    res.json({ success:true, message:`✅ ${studentUser.firstName} ${studentUser.lastName} asignado a tu grupo`, data:{ studentId:studentUser.studentProfile.id, firstName:studentUser.firstName, lastName:studentUser.lastName } });
  } catch(e) { res.status(e.status||500).json({ success:false, message:e.message }); }
};

export const removeStudent = async (req, res) => {
  try {
    const teacher = await getTeacherProfile(req.user.id);
    await prisma.teacherStudent.delete({ where:{ teacherId_studentId:{ teacherId:teacher.id, studentId:parseInt(req.params.studentId) } } });
    res.json({ success:true, message:'Alumno removido' });
  } catch(e) { res.status(e.status||500).json({ success:false, message:e.message }); }
};

// ── MAESTRO: CONTENIDO ───────────────────────────────────

export const getMyContent = async (req, res) => {
  try {
    const teacher = await getTeacherProfile(req.user.id);
    const content = await prisma.content.findMany({ where:{ teacherId:teacher.id }, include:{ assignments:{ include:{ student:{ include:{ user:{ select:{ firstName:true, lastName:true } } } } } } }, orderBy:{ createdAt:'desc' } });
    res.json({ success:true, data:content });
  } catch(e) { res.status(e.status||500).json({ success:false, message:e.message }); }
};

export const createContent = async (req, res) => {
  try {
    const teacher = await getTeacherProfile(req.user.id);
    const { title, description, subject, grade, type, url, body, isPublished } = req.body;
    if (!title||!subject||!grade||!type) return res.status(400).json({ success:false, message:'Faltan: title, subject, grade, type' });
    const content = await prisma.content.create({ data:{ teacherId:teacher.id, title, description:description||'', subject, grade:parseInt(grade), type, url:url||null, body:body||null, isPublished:isPublished??false } });
    res.status(201).json({ success:true, message:'Contenido creado', data:content });
  } catch(e) { res.status(e.status||500).json({ success:false, message:e.message }); }
};

export const updateContent = async (req, res) => {
  try {
    const teacher = await getTeacherProfile(req.user.id);
    const contentId = parseInt(req.params.id);
    const existing = await prisma.content.findFirst({ where:{ id:contentId, teacherId:teacher.id } });
    if (!existing) return res.status(404).json({ success:false, message:'Contenido no encontrado' });
    const { title, description, subject, grade, type, url, body, isPublished } = req.body;
    const updated = await prisma.content.update({ where:{ id:contentId }, data:{ title, description, subject, grade:grade?parseInt(grade):undefined, type, url, body, isPublished } });
    res.json({ success:true, message:'Actualizado', data:updated });
  } catch(e) { res.status(e.status||500).json({ success:false, message:e.message }); }
};

export const deleteContent = async (req, res) => {
  try {
    const teacher = await getTeacherProfile(req.user.id);
    const contentId = parseInt(req.params.id);
    const existing = await prisma.content.findFirst({ where:{ id:contentId, teacherId:teacher.id } });
    if (!existing) return res.status(404).json({ success:false, message:'Contenido no encontrado' });
    await prisma.content.delete({ where:{ id:contentId } });
    res.json({ success:true, message:'Eliminado' });
  } catch(e) { res.status(e.status||500).json({ success:false, message:e.message }); }
};

export const assignContent = async (req, res) => {
  try {
    const teacher = await getTeacherProfile(req.user.id);
    const contentId = parseInt(req.params.id);
    const { studentIds, dueDate } = req.body;
    if (!studentIds?.length) return res.status(400).json({ success:false, message:'Se requiere al menos un studentId' });
    const content = await prisma.content.findFirst({ where:{ id:contentId, teacherId:teacher.id } });
    if (!content) return res.status(404).json({ success:false, message:'Contenido no encontrado' });
    const results = await Promise.all(studentIds.map(studentId =>
      prisma.contentAssignment.upsert({ where:{ contentId_studentId:{ contentId, studentId } }, create:{ contentId, studentId, dueDate:dueDate?new Date(dueDate):null }, update:{ dueDate:dueDate?new Date(dueDate):null } })
    ));
    res.json({ success:true, message:`Asignado a ${results.length} alumno(s)`, data:results });
  } catch(e) { res.status(e.status||500).json({ success:false, message:e.message }); }
};

// ── MAESTRO: ACTIVIDADES ─────────────────────────────────

export const getMyActivities = async (req, res) => {
  try {
    const teacher = await getTeacherProfile(req.user.id);
    const activities = await prisma.activity.findMany({ where:{ teacherId:teacher.id }, orderBy:{ createdAt:'desc' } });
    res.json({ success:true, data:activities });
  } catch(e) { res.status(e.status||500).json({ success:false, message:e.message }); }
};

export const createActivity = async (req, res) => {
  try {
    const teacher = await getTeacherProfile(req.user.id);
    const { title, description, subject, grade, dueDate, gameType, minScore } = req.body;
    if (!title||!subject||!grade) return res.status(400).json({ success:false, message:'Faltan: title, subject, grade' });
    const activity = await prisma.activity.create({ data:{ teacherId:teacher.id, title, description:description||'', subject, grade:parseInt(grade), dueDate:dueDate?new Date(dueDate):null, gameType:gameType||null, minScore:minScore?parseInt(minScore):null } });
    res.status(201).json({ success:true, message:'Actividad creada', data:activity });
  } catch(e) { res.status(e.status||500).json({ success:false, message:e.message }); }
};

export const deleteActivity = async (req, res) => {
  try {
    const teacher = await getTeacherProfile(req.user.id);
    const actId = parseInt(req.params.id);
    const existing = await prisma.activity.findFirst({ where:{ id:actId, teacherId:teacher.id } });
    if (!existing) return res.status(404).json({ success:false, message:'Actividad no encontrada' });
    await prisma.activity.delete({ where:{ id:actId } });
    res.json({ success:true, message:'Eliminada' });
  } catch(e) { res.status(e.status||500).json({ success:false, message:e.message }); }
};

// ── ESTUDIANTE: VER CONTENIDO Y ACTIVIDADES ──────────────

export const getAssignedContent = async (req, res) => {
  try {
    const student = await getStudentProfile(req.user.id);
    const assignments = await prisma.contentAssignment.findMany({
      where:{ studentId:student.id },
      include:{ content:{ include:{ teacher:{ include:{ user:{ select:{ firstName:true, lastName:true } } } } } } },
      orderBy:{ createdAt:'desc' }
    });
    const data = assignments.map(a => ({ assignmentId:a.id, completed:a.completed, completedAt:a.completedAt, dueDate:a.dueDate, content:{ id:a.content.id, title:a.content.title, description:a.content.description, subject:a.content.subject, type:a.content.type, url:a.content.url, body:a.content.body }, teacher:`${a.content.teacher.user.firstName} ${a.content.teacher.user.lastName}` }));
    res.json({ success:true, data });
  } catch(e) { res.status(e.status||500).json({ success:false, message:e.message }); }
};

export const markContentComplete = async (req, res) => {
  try {
    const student = await getStudentProfile(req.user.id);
    const assignmentId = parseInt(req.params.assignmentId);
    const assignment = await prisma.contentAssignment.findFirst({ where:{ id:assignmentId, studentId:student.id } });
    if (!assignment) return res.status(404).json({ success:false, message:'Asignación no encontrada' });
    const updated = await prisma.contentAssignment.update({ where:{ id:assignmentId }, data:{ completed:true, completedAt:new Date() } });
    res.json({ success:true, message:'Marcado como completado', data:updated });
  } catch(e) { res.status(e.status||500).json({ success:false, message:e.message }); }
};

export const getStudentActivities = async (req, res) => {
  try {
    const student = await getStudentProfile(req.user.id);
    const teacherRelations = await prisma.teacherStudent.findMany({ where:{ studentId:student.id }, select:{ teacherId:true } });
    const teacherIds = teacherRelations.map(r => r.teacherId);
    const activities = await prisma.activity.findMany({
      where:{ OR:[{ teacherId:{ in:teacherIds } },{ grade:student.grade }] },
      include:{ teacher:{ include:{ user:{ select:{ firstName:true, lastName:true } } } } },
      orderBy:{ dueDate:'asc' }
    });
    const data = activities.map(a => ({ id:a.id, title:a.title, description:a.description, subject:a.subject, dueDate:a.dueDate, gameType:a.gameType, minScore:a.minScore, teacher:`${a.teacher.user.firstName} ${a.teacher.user.lastName}` }));
    res.json({ success:true, data });
  } catch(e) { res.status(e.status||500).json({ success:false, message:e.message }); }
};
