import { Router } from 'express';
import validateRequest from '../../middlewares/validateRequest';
import {verifyAuth,authorizeRoles} from '../../middlewares/verifyAuth';
import sellerValidator from './seller.validator';
import sellerControllers from './seller.controllers';

const sellerRoutes = Router();

sellerRoutes.use(verifyAuth);

sellerRoutes.post('/',authorizeRoles('ADMIN','ACCOUNTANT'), validateRequest(sellerValidator.createSchema), sellerControllers.create);
sellerRoutes.get('/',authorizeRoles('ADMIN','ACCOUNTANT'),sellerControllers.readAll);
sellerRoutes.patch('/:id',authorizeRoles('ADMIN','ACCOUNTANT'), validateRequest(sellerValidator.updateSchema), sellerControllers.update);
sellerRoutes.get('/:id', sellerControllers.readSingle);
sellerRoutes.delete('/:id',authorizeRoles('ADMIN','ACCOUNTANT'), sellerControllers.delete);

export default sellerRoutes;
