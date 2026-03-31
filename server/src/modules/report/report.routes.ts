import { Router } from 'express';
import { reportController } from './report.controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { reportGenerateSchema, reportExportSchema } from './report.schema';

const router = Router();
router.use(authenticate);

router.post('/generate',  validate(reportGenerateSchema), (req, res, next) => reportController.generate(req, res, next));
router.get('/dashboard',  (req, res, next) => reportController.dashboard(req, res, next));
router.post('/export',    validate(reportExportSchema),   (req, res, next) => reportController.exportReport(req, res, next));

export default router;
