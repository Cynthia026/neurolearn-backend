// routes/teacher.js
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getMyStudents, assignStudent, removeStudent,
  getMyContent, createContent, updateContent, deleteContent, assignContent,
  getMyActivities, createActivity, deleteActivity
} from '../controllers/contentController.js';

const router = express.Router();
router.use(authenticate);

// Alumnos
router.get('/students',                    getMyStudents);
router.post('/assign-student',             assignStudent);
router.delete('/remove-student/:studentId', removeStudent);

// Contenido
router.get('/content',             getMyContent);
router.post('/content',            createContent);
router.put('/content/:id',         updateContent);
router.delete('/content/:id',      deleteContent);
router.post('/content/:id/assign', assignContent);

// Actividades
router.get('/activities',       getMyActivities);
router.post('/activities',      createActivity);
router.delete('/activities/:id', deleteActivity);

export default router;
