import { Router } from 'express';
import {authorizeRoles, verifyAuth} from '../../middlewares/verifyAuth';
import validateRequest from '../../middlewares/validateRequest';
import categoryValidator from './category.validator';
import categoryController from './category.controllers';

const categoryRoutes = Router();

categoryRoutes.use(verifyAuth);

categoryRoutes.post('/',authorizeRoles('KEEPER', 'ADMIN'), validateRequest(categoryValidator.createSchema), categoryController.create);
categoryRoutes.get('/', categoryController.getAll);
categoryRoutes.delete('/:id',authorizeRoles('KEEPER', 'ADMIN'), categoryController.delete);
categoryRoutes.patch('/:id',authorizeRoles('KEEPER', 'ADMIN'), validateRequest(categoryValidator.updateSchema), categoryController.create);

export default categoryRoutes;
