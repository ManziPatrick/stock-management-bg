import { Router, Request, Response } from 'express';
import validateRequest from '../../middlewares/validateRequest';
import productValidator from './product.validator';
import productControllers from './product.controllers';
import {authorizeRoles,verifyAuth} from '../../middlewares/verifyAuth';
import {upload, uploadToCloudinary } from '../image/cloudinaryConfig';

const productRoute = Router();
productRoute.get('/', productControllers.readAllPublic);

 //the file path where you had written this functions in earlier

productRoute.post("/upload", upload.array('images', 5),  uploadToCloudinary, async (req: Request & { body: { cloudinaryUrls: string[] } }, res: Response) => {
    try {
        const cloudinaryUrls = req.body.cloudinaryUrls;
        if (cloudinaryUrls.length === 0) {
            console.error('No Cloudinary URLs found.');
            return res.status(500).send('Internal Server Error');
        }
       const images = cloudinaryUrls;
       return res.send(images)

    } catch (error) {
        return res.status(500).json({ error});
    }
});
productRoute.use(verifyAuth);
productRoute.get('/total', productControllers.getTotalProduct);
productRoute.post('/bulk-delete', productControllers.bulkDelete);
productRoute.post(
    '/',
    authorizeRoles('KEEPER', 'ADMIN','ACCOUNTANT','SUPER_ADMIN'), productControllers.create
  );
  
  productRoute.get(
    '/updated', 
    verifyAuth,
    authorizeRoles('ADMIN', 'KEEPER','ACCOUNTANT','SUPER_ADMIN'),
    productControllers.getCollectionDiscrepancies
  );
  productRoute.patch(
    '/:id/price',
    authorizeRoles('ADMIN','SUPER_ADMIN'), 
    productControllers.updatePrice
);
// productRoute.get('/', productControllers.readAll);
productRoute.patch('/:id/add',authorizeRoles('KEEPER', 'ADMIN','ACCOUNTANT','SUPER_ADMIN'), validateRequest(productValidator.addStockSchema), productControllers.addStock);
productRoute.patch('/:id',authorizeRoles('KEEPER', 'ADMIN','ACCOUNTANT','SUPER_ADMIN'), validateRequest(productValidator.updateSchema), productControllers.updateProduct);
productRoute.get('/:id', productControllers.readSingle);
productRoute.delete('/:id',authorizeRoles('ADMIN','SUPER_ADMIN'), productControllers.delete);

export default productRoute;
