import { Router } from 'express';
import { companyController } from './company.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();
router.use(authenticate);

router.post('/', (req, res, next) => companyController.create(req, res, next));
router.get('/', (req, res, next) => companyController.findAll(req, res, next));
router.get('/:id', (req, res, next) => companyController.findById(req, res, next));
router.put('/:id', (req, res, next) => companyController.update(req, res, next));
router.delete('/:id', (req, res, next) => companyController.delete(req, res, next));

export default router;
