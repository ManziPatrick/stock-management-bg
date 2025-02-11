import { Router } from 'express';
import userRoutes from '../modules/user/user.routes';
import productRoute from '../modules/product/product.routes';
import saleRoutes from '../modules/sale/sale.routes';
import categoryRoutes from '../modules/category/category.routes';
import brandRoutes from '../modules/brand/brand.routes';
import sellerRoutes from '../modules/seller/seller.routes';
import purchaseRoutes from '../modules/purchase/purchase.routes';
import expenseRouter from '../modules/expenses/expenseRoutes';
import { debitRoutes } from '../modules/debits/debits.routes';
import Proforma from '../modules/Proforma/proforma.route';
import {creditRoutes} from '../modules/credit/credit.routes'

const rootRouter = Router();

rootRouter.use('/users', userRoutes);
rootRouter.use('/products', productRoute);
rootRouter.use('/sales', saleRoutes);
rootRouter.use('/categories', categoryRoutes);
rootRouter.use('/brands', brandRoutes);
rootRouter.use('/sellers', sellerRoutes);
rootRouter.use('/expenses',expenseRouter);
rootRouter.use('/proforma',Proforma);
rootRouter.use('/debits', debitRoutes);
rootRouter.use('/purchases', purchaseRoutes);
rootRouter.use('/credits', creditRoutes);
export default rootRouter;
