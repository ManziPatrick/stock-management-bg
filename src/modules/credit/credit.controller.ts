import { Request, Response } from 'express';
import { CreditService, CreateCreditDto, UpdateCreditDto } from './credit.service';

class CreditController {
    private creditService: CreditService;

    constructor() {
        this.creditService = new CreditService();
    }

    findAll(req: Request, res: Response): void {
        const credits = this.creditService.findAll();
        res.status(200).json(credits);
    }

    findOne(req: Request, res: Response): void {
        const { id } = req.params;
        const credit = this.creditService.findOne(id);
        if (credit) {
            res.status(200).json(credit);
        } else {
            res.status(404).json({ message: 'Credit not found' });
        }
    }

    create(req: Request, res: Response): void {
        const createCreditDto: CreateCreditDto = req.body;
        const newCredit = this.creditService.create(createCreditDto);
        res.status(201).json(newCredit);
    }

    update(req: Request, res: Response): void {
        const { id } = req.params;
        const updateCreditDto: UpdateCreditDto = req.body;
        const updatedCredit = this.creditService.update(id, updateCreditDto);
        if (updatedCredit) {
            res.status(200).json(updatedCredit);
        } else {
            res.status(404).json({ message: 'Credit not found' });
        }
    }

    remove(req: Request, res: Response): void {
        const { id } = req.params;
        this.creditService.remove(id);
        res.status(204).send();
    }
}

export { CreditController };