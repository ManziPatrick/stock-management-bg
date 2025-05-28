import { Router } from 'express';
import {authorizeRoles, verifyAuth} from '../../middlewares/verifyAuth';
import validateRequest from '../../middlewares/validateRequest';
import brandValidator from './brand.validator';
import brandController from './brand.controllers';

const brandRoutes = Router();

brandRoutes.use(verifyAuth);

brandRoutes.post('/',authorizeRoles('KEEPER','ACCOUNTANT', 'ADMIN','SUPER_ADMIN'), validateRequest(brandValidator.createSchema), brandController.create);
brandRoutes.get('/', brandController.getAll);
brandRoutes.delete('/:id',authorizeRoles('KEEPER','ACCOUNTANT', 'ADMIN','SUPER_ADMIN'),  brandController.delete);
brandRoutes.patch('/:id',authorizeRoles('KEEPER', 'ACCOUNTANT','ADMIN','SUPER_ADMIN'), validateRequest(brandValidator.updateSchema), brandController.create);

export default brandRoutes;
