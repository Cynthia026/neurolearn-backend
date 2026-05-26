// routes/progress.js
import express from 'express';
import { getMyProgress, saveProgress } from '../controllers/progressController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/', getMyProgress);
router.post('/', saveProgress);

export default router;
