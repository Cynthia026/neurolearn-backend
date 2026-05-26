// routes/family.js
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  addChild, getMyChildren, removeChild,
  addStudentToTeacher, getMyStudents, removeStudentFromTeacher
} from '../controllers/familyController.js';

const router = express.Router();
router.use(authenticate);

// PADRE
router.post('/add-child',          addChild);
router.get('/my-children',         getMyChildren);
router.delete('/remove-child/:studentId', removeChild);

// MAESTRO
router.post('/add-student',        addStudentToTeacher);
router.get('/my-students',         getMyStudents);
router.delete('/remove-student/:studentId', removeStudentFromTeacher);

export default router;
