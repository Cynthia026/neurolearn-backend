// routes/achievements.js
import express from 'express';
import { getMyAchievements } from '../controllers/achievementsController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/', getMyAchievements);

export default router;
