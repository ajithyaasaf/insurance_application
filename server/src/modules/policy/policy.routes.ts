import { Router } from 'express';
import { policyController } from './policy.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();
router.use(authenticate);

router.post('/', (req, res, next) => policyController.create(req, res, next));
router.get('/', (req, res, next) => policyController.findAll(req, res, next));
router.get('/:id', (req, res, next) => policyController.findById(req, res, next));
router.put('/:id', (req, res, next) => policyController.update(req, res, next));
router.delete('/:id', (req, res, next) => policyController.delete(req, res, next));
router.post('/:id/renew', (req, res, next) => policyController.renew(req, res, next));

export default router;
