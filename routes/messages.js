// routes/messages.js
import express from 'express';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/', (req, res) => {
  res.json({ success: true, message: 'Messages endpoint OK', data: [] });
});

export default router;
