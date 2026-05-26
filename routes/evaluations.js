// routes/evaluations.js
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  createEvaluation,
  getMyEvaluations,
  getEvaluationById,
  updateEvaluation,
  deleteEvaluation,
  assignEvaluation,
  getEvaluationResults,
  getMyAssignedEvaluations,
  startEvaluation,
  submitEvaluation,
  getMyResult
} from '../controllers/evaluationsController.js';

const router = express.Router();
router.use(authenticate);

// ── MAESTRO ─────────────────────────────────────────────
router.post('/',                        createEvaluation);
router.get('/my-evaluations',           getMyEvaluations);
router.put('/:id',                      updateEvaluation);
router.delete('/:id',                   deleteEvaluation);
router.post('/:id/assign',              assignEvaluation);
router.get('/:id/results',              getEvaluationResults);

// ── ALUMNO ───────────────────────────────────────────────
router.get('/assigned',                 getMyAssignedEvaluations);
router.post('/:id/start',              startEvaluation);
router.post('/submit/:assignmentId',   submitEvaluation);
router.get('/result/:assignmentId',    getMyResult);

// ── COMPARTIDO (detalle de evaluación) ──────────────────
router.get('/:id',                      getEvaluationById);

export default router;
