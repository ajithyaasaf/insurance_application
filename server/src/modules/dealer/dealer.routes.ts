import { Router } from 'express';
import { dealerController } from './dealer.controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createDealerSchema, updateDealerSchema } from './dealer.schema';

const router = Router();
router.use(authenticate);

router.post('/', validate(createDealerSchema), (req, res, next) => dealerController.create(req, res, next));
router.get('/', (req, res, next) => dealerController.findAll(req, res, next));
router.get('/:id', (req, res, next) => dealerController.findById(req, res, next));
router.put('/:id', validate(updateDealerSchema), (req, res, next) => dealerController.update(req, res, next));
router.delete('/:id', (req, res, next) => dealerController.delete(req, res, next));

export default router;
