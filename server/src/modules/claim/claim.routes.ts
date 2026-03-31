import { Router } from 'express';
import { claimController } from './claim.controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createClaimSchema, updateClaimSchema } from './claim.schema';

const router = Router();
router.use(authenticate);

router.post('/', validate(createClaimSchema), (req, res, next) => claimController.create(req, res, next));
router.get('/', (req, res, next) => claimController.findAll(req, res, next));
router.get('/:id', (req, res, next) => claimController.findById(req, res, next));
router.put('/:id', validate(updateClaimSchema), (req, res, next) => claimController.update(req, res, next));
router.delete('/:id', (req, res, next) => claimController.delete(req, res, next));

export default router;