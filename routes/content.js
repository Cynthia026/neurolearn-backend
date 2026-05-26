// routes/content.js
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  createContent, getMyContent, assignContent,
  updateContent, deleteContent,
  getMyAssignments, completeAssignment
} from '../controllers/contentController.js';

const router = express.Router();
router.use(authenticate);

// MAESTRO
router.post('/',           createContent);
router.get('/my-content',  getMyContent);
router.post('/assign',     assignContent);
router.put('/:id',         updateContent);
router.delete('/:id',      deleteContent);

// ALUMNO
router.get('/my-assignments',          getMyAssignments);
router.post('/complete/:assignmentId', completeAssignment);

export default router;
