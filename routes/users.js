// routes/users.js
import express from 'express';
import { getAllUsers, getMyProfile } from '../controllers/usersController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/', getAllUsers);
router.get('/profile', getMyProfile);

export default router;
