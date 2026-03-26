import { Router } from 'express';
import { leadController } from './lead.controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createLeadSchema, updateLeadSchema, convertLeadSchema } from './lead.schema';

const router = Router();

router.use(authenticate);

router.post('/', validate(createLeadSchema), (req, res, next) =>
    leadController.create(req, res, next)
);
router.get('/', (req, res, next) => leadController.findAll(req, res, next));
router.get('/:id', (req, res, next) => leadController.findById(req, res, next));
router.put('/:id', validate(updateLeadSchema), (req, res, next) =>
    leadController.update(req, res, next)
);
router.delete('/:id', (req, res, next) => leadController.delete(req, res, next));
router.post('/:id/convert', validate(convertLeadSchema), (req, res, next) =>
    leadController.convert(req, res, next)
);

export default router;
