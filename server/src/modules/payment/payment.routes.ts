import { Router } from 'express';
import { paymentController } from './payment.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();
router.use(authenticate);

router.post('/', (req, res, next) => paymentController.create(req, res, next));
router.get('/', (req, res, next) => paymentController.findAll(req, res, next));
router.post('/detect-overdue', (req, res, next) => paymentController.detectOverdue(req, res, next));
router.get('/:id', (req, res, next) => paymentController.findById(req, res, next));
router.put('/:id', (req, res, next) => paymentController.update(req, res, next));
router.delete('/:id', (req, res, next) => paymentController.delete(req, res, next));

export default router;
