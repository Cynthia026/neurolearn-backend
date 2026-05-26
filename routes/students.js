// routes/students.js
import express from 'express';
import { getStudentProfile, getAllStudents, getStudentById } from '../controllers/studentController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/profile', getStudentProfile);
router.get('/all', getAllStudents);
router.get('/:id', getStudentById);

export default router;
