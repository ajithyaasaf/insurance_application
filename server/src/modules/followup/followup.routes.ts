import { Router } from 'express';
import { followUpController } from './followup.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();
router.use(authenticate);

router.post('/', (req, res, next) => followUpController.create(req, res, next));
router.get('/', (req, res, next) => followUpController.findAll(req, res, next));
router.get('/:id', (req, res, next) => followUpController.findById(req, res, next));
router.put('/:id', (req, res, next) => followUpController.update(req, res, next));
router.delete('/:id', (req, res, next) => followUpController.delete(req, res, next));

export default router;
