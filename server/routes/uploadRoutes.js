import { Router } from 'express';
import { serveFile } from '../controllers/uploadController.js';

const router = Router();

router.get('/:id', serveFile);

export default router;
