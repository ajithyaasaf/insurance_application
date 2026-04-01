import { Router } from 'express';
import { policyController } from './policy.controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createPolicySchema, updatePolicySchema } from './policy.schema';

const router = Router();
router.use(authenticate);

router.post('/', validate(createPolicySchema), (req, res, next) => policyController.create(req, res, next));
router.get('/', (req, res, next) => policyController.findAll(req, res, next));
router.get('/:id', (req, res, next) => policyController.findById(req, res, next));
router.get('/:id/pre-delete-check', (req, res, next) => policyController.preDeleteCheck(req, res, next));
router.put('/:id', validate(updatePolicySchema), (req, res, next) => policyController.update(req, res, next));
router.delete('/:id', (req, res, next) => policyController.delete(req, res, next));
router.post('/:id/renew', validate(updatePolicySchema), (req, res, next) => policyController.renew(req, res, next));


export default router;
