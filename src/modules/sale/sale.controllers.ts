import saleServices from './sale.services';
import { Request, Response, NextFunction } from 'express';

class SaleControllers {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { user } = req;
      const result = await saleServices.create(req.body, user._id);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async readAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { user } = req;
      const result = await saleServices.readAll(req.query);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async readSingle(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await saleServices.readById(id);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await saleServices.update(id, req.body);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await saleServices.delete(id);
      res.status(200).json({ success: true, message: 'Sale deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  async readAllDaily(req: Request, res: Response, next: NextFunction) {
    try {
      const { user } = req;
      const result = await saleServices.readAllDaily(user._id);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async readAllWeekly(req: Request, res: Response, next: NextFunction) {
    try {
      const { user } = req;
      const result = await saleServices.readAllWeekly(user._id);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async readAllMonthly(req: Request, res: Response, next: NextFunction) {
    try {
      const { user } = req;
      const result = await saleServices.readAllMonthly(user._id);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async readAllYearly(req: Request, res: Response, next: NextFunction) {
    try {
      const { user } = req;
      const result = await saleServices.readAllYearly(user._id);
      res.status(200).json({
        success: true,
        data: result.yearlyData,
        totalRevenue: result.totalRevenue,
      });
    } catch (error) {
      next(error);
    }
  }
  
}

export default new SaleControllers();
