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
    authorizeRoles('KEEPER', 'ADMIN'), productControllers.create
  );
  
// productRoute.get('/', productControllers.readAll);
productRoute.patch('/:id/add',authorizeRoles('KEEPER', 'ADMIN'), validateRequest(productValidator.addStockSchema), productControllers.addStock);
productRoute.patch('/:id',authorizeRoles('KEEPER', 'ADMIN'), validateRequest(productValidator.updateSchema), productControllers.update);
productRoute.get('/:id', productControllers.readSingle);
productRoute.delete('/:id',authorizeRoles('ADMIN'), productControllers.delete);

export default productRoute;
