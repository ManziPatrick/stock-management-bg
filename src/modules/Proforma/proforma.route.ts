import { Router } from 'express';
import { ProformaController } from './proforma.controller';

const router = Router();
const controller = new ProformaController();

router.post('/', controller.create);
router.patch('/:id/status', controller.updateStatus);
router.get('/:id', controller.getById);
router.get('/', controller.getAll);

export default router;