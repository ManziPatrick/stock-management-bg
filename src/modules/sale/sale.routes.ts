import { Router } from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { verifyAuth, authorizeRoles } from '../../middlewares/verifyAuth';
import saleValidator from './sale.validator';
import saleControllers from './sale.controllers';

const saleRoutes = Router();

saleRoutes.use(verifyAuth);

saleRoutes.get('/days', saleControllers.readAllDaily);
saleRoutes.get('/years', saleControllers.readAllYearly);
saleRoutes.get('/months', saleControllers.readAllMonthly);
saleRoutes.get('/weeks', saleControllers.readAllWeekly);
saleRoutes.get('/credit', saleControllers.getTotalCredit);
saleRoutes.post('/', saleControllers.create);
saleRoutes.get('/', saleControllers.readAll);
saleRoutes.patch('/:id', authorizeRoles('ADMIN','ACCOUNTANT'), validateRequest(saleValidator.updateSchema), saleControllers.update);
saleRoutes.patch('/:id/status', authorizeRoles('ACCOUNTANT'), saleControllers.updateStatus);
saleRoutes.get('/:id', authorizeRoles('ADMIN','ACCOUNTANT'), saleControllers.readSingle);
saleRoutes.delete('/:id', authorizeRoles('ADMIN','ACCOUNTANT'), saleControllers.delete);

export default saleRoutes;