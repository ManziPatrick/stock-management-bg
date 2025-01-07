import { Router } from 'express';
import validateRequest from '../../middlewares/validateRequest';
import {verifyAuth ,authorizeRoles } from '../../middlewares/verifyAuth';
import saleValidator from './sale.validator';
import saleControllers from './sale.controllers';

const saleRoutes = Router();

saleRoutes.use(verifyAuth);

saleRoutes.get('/days', saleControllers.readAllDaily);
saleRoutes.get('/years', saleControllers.readAllYearly);
saleRoutes.get('/months', saleControllers.readAllMonthly);
saleRoutes.get('/weeks', saleControllers.readAllWeekly);
saleRoutes.post('/', validateRequest(saleValidator.createSchema), saleControllers.create);
saleRoutes.get('/', saleControllers.readAll);
saleRoutes.patch('/:id',authorizeRoles('ADMIN'), validateRequest(saleValidator.updateSchema), saleControllers.update);
saleRoutes.get('/:id', saleControllers.readSingle);
saleRoutes.delete('/:id',authorizeRoles('ADMIN'), saleControllers.delete);

export default saleRoutes;
