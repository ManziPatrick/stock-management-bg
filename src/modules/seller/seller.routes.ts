import { Router } from 'express';
import validateRequest from '../../middlewares/validateRequest';
import {verifyAuth,authorizeRoles} from '../../middlewares/verifyAuth';
import sellerValidator from './seller.validator';
import sellerControllers from './seller.controllers';

const sellerRoutes = Router();

sellerRoutes.use(verifyAuth);

sellerRoutes.post('/',authorizeRoles('ADMIN','ACCOUNTANT','SUPER_ADMIN','KEEPER'),validateRequest(sellerValidator.createSchema), sellerControllers.create);
sellerRoutes.get('/',authorizeRoles('ADMIN','ACCOUNTANT','SUPER_ADMIN','KEEPER'),sellerControllers.readAll);
sellerRoutes.patch('/:id',authorizeRoles('ADMIN','ACCOUNTANT','SUPER_ADMIN'), validateRequest(sellerValidator.updateSchema), sellerControllers.update);
sellerRoutes.get('/:id', sellerControllers.readSingle);
sellerRoutes.delete('/:id',authorizeRoles('ADMIN','ACCOUNTANT','SUPER_ADMIN'), sellerControllers.delete);

export default sellerRoutes;
