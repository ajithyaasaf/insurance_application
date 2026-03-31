import { Router } from 'express';
import { customerController } from './customer.controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createCustomerSchema, updateCustomerSchema } from './customer.schema';

const router = Router();
router.use(authenticate);

router.post('/', validate(createCustomerSchema), (req, res, next) => customerController.create(req, res, next));
router.get('/', (req, res, next) => customerController.findAll(req, res, next));
router.get('/:id', (req, res, next) => customerController.findById(req, res, next));
router.put('/:id', validate(updateCustomerSchema), (req, res, next) => customerController.update(req, res, next));
router.delete('/:id', (req, res, next) => customerController.delete(req, res, next));

export default router;
