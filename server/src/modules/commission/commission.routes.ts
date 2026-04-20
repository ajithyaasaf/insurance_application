import { Router } from 'express';
import { commissionController } from './commission.controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { commissionPreviewSchema, commissionCreateSchema, commissionUpdateSchema, commissionBulkUpdateSchema } from './commission.schema';

const router = Router();
router.use(authenticate);

// Preview commission (no save)
router.post('/preview', validate(commissionPreviewSchema), (req, res, next) => commissionController.preview(req, res, next));

// Pending (Unprocessed) overview
router.get('/pending', (req, res, next) => commissionController.getPending(req, res, next));
router.get('/stats', (req, res, next) => commissionController.getStats(req, res, next));

// CRUD
router.get('/', (req, res, next) => commissionController.findAll(req, res, next));
router.post('/export', (req, res, next) => commissionController.exportExcel(req, res, next));
router.post('/', validate(commissionCreateSchema), (req, res, next) => commissionController.create(req, res, next));
router.put('/bulk-status', validate(commissionBulkUpdateSchema), (req, res, next) => commissionController.bulkUpdateStatus(req, res, next));
router.get('/:id', (req, res, next) => commissionController.findById(req, res, next));
router.put('/:id', validate(commissionUpdateSchema), (req, res, next) => commissionController.update(req, res, next));
router.delete('/:id', (req, res, next) => commissionController.delete(req, res, next));

export default router;
