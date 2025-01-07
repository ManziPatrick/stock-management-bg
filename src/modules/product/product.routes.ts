import { Router } from 'express';
import validateRequest from '../../middlewares/validateRequest';
import productValidator from './product.validator';
import productControllers from './product.controllers';
import {authorizeRoles,verifyAuth} from '../../middlewares/verifyAuth';

const productRoute = Router();
productRoute.get('/', productControllers.readAllPublic);

productRoute.use(verifyAuth);
productRoute.get('/total', productControllers.getTotalProduct);
productRoute.post('/bulk-delete', productControllers.bulkDelete);
productRoute.post('/',authorizeRoles('KEEPER', 'ADMIN'), validateRequest(productValidator.createSchema), productControllers.create);
// productRoute.get('/', productControllers.readAll);
productRoute.patch('/:id/add',authorizeRoles('KEEPER', 'ADMIN'), validateRequest(productValidator.addStockSchema), productControllers.addStock);
productRoute.patch('/:id',authorizeRoles('KEEPER', 'ADMIN'), validateRequest(productValidator.updateSchema), productControllers.update);
productRoute.get('/:id', productControllers.readSingle);
productRoute.delete('/:id',authorizeRoles('ADMIN'), productControllers.delete);

export default productRoute;
