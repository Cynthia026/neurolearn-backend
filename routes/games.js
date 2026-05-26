// routes/games.js
import express from 'express';
import { saveGameScore, getGameHistory } from '../controllers/gameController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.post('/score', saveGameScore);
router.get('/history', getGameHistory);

export default router;
