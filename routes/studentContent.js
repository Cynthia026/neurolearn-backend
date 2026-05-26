// routes/studentContent.js
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getAssignedContent, markContentComplete, getStudentActivities } from '../controllers/contentController.js';

const router = express.Router();
router.use(authenticate);

router.get('/assigned-content',                          getAssignedContent);
router.patch('/assigned-content/:assignmentId/complete', markContentComplete);
router.get('/activities',                                getStudentActivities);

export default router;
