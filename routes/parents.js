// routes/parents.js
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getMyChildren, linkChild, unlinkChild } from '../controllers/parentController.js';

const router = express.Router();
router.use(authenticate);

router.get('/children',              getMyChildren);   // ver hijos vinculados
router.post('/link-child',           linkChild);        // vincular hijo por email
router.delete('/unlink-child/:studentId', unlinkChild); // desvincular hijo

export default router;
