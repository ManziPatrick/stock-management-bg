import { Router } from 'express';
import {authorizeRoles, verifyAuth} from '../../middlewares/verifyAuth';
import validateRequest from '../../middlewares/validateRequest';
import brandValidator from './brand.validator';
import brandController from './brand.controllers';

const brandRoutes = Router();

brandRoutes.use(verifyAuth);

brandRoutes.post('/',authorizeRoles('KEEPER', 'ADMIN'), validateRequest(brandValidator.createSchema), brandController.create);
brandRoutes.get('/', brandController.getAll);
brandRoutes.delete('/:id',authorizeRoles('KEEPER', 'ADMIN'),  brandController.delete);
brandRoutes.patch('/:id',authorizeRoles('KEEPER', 'ADMIN'), validateRequest(brandValidator.updateSchema), brandController.create);

export default brandRoutes;
