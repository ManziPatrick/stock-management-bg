import { Router } from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { verifyAuth, authorizeRoles } from '../../middlewares/verifyAuth';
import saleValidator from './sale.validator';
import saleControllers from './sale.controllers';

const saleRoutes = Router();

saleRoutes.use(verifyAuth);

// Statistics routes
saleRoutes.get('/days', saleControllers.readAllDaily);
saleRoutes.get('/years', saleControllers.readAllYearly);
saleRoutes.get('/months', saleControllers.readAllMonthly);
saleRoutes.get('/weeks', saleControllers.readAllWeekly);
saleRoutes.get('/credit', saleControllers.getTotalCredit);

// CRUD routes
saleRoutes.post('/', validateRequest(saleValidator.createSchema), saleControllers.create);
saleRoutes.get('/', authorizeRoles('ADMIN', 'ACCOUNTANT','SUPER_ADMIN','KEEPER','USER'),saleControllers.readAll);
saleRoutes.get('/collection', authorizeRoles('ADMIN', 'ACCOUNTANT','SUPER_ADMIN','KEEPER','USER'),saleControllers.readAllInventoryStatus);


// Status and collection management routes
saleRoutes.patch('/:id/status', authorizeRoles('ACCOUNTANT','SUPER_ADMIN'), saleControllers.updateStatus);
saleRoutes.patch('/:id/collection', authorizeRoles('ADMIN', 'KEEPER','ACCOUNTANT','SUPER_ADMIN'), saleControllers.markProductsCollected);

// Individual sale operations
saleRoutes.get('/:id', authorizeRoles('ADMIN', 'ACCOUNTANT','SUPER_ADMIN','KEEPER','USER'), saleControllers.readSingle);
saleRoutes.patch('/:id', authorizeRoles('ADMIN', 'ACCOUNTANT','KEEPER','SUPER_ADMIN'), validateRequest(saleValidator.updateSchema), saleControllers.update);
saleRoutes.delete('/:id', authorizeRoles('ADMIN', 'ACCOUNTANT','SUPER_ADMIN'), saleControllers.delete);

export default saleRoutes;