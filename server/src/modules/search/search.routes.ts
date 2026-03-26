import { Router } from 'express';
import { searchController } from './search.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.get('/', authenticate, (req, res, next) => searchController.globalSearch(req, res, next));

export default router;
