import { Router } from 'express';
import {authorizeRoles,verifyAuth} from '../../middlewares/verifyAuth';
import validateRequest from '../../middlewares/validateRequest';
import purchaseController from './purchase.controller';
import purchaseValidator from './purchase.validator';

const purchaseRoutes = Router();

purchaseRoutes.use(verifyAuth);

purchaseRoutes.post('/',authorizeRoles('KEEPER', 'ADMIN'),  validateRequest(purchaseValidator.createSchema), purchaseController.create);
purchaseRoutes.get('/',authorizeRoles('KEEPER', 'ADMIN'), purchaseController.getAll);
purchaseRoutes.delete('/:id',authorizeRoles('ADMIN'), purchaseController.delete);
purchaseRoutes.patch('/:id',authorizeRoles('ADMIN'), validateRequest(purchaseValidator.updateSchema), purchaseController.create);

export default purchaseRoutes;
