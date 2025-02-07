import { Router } from 'express';
import { CreditService } from './credit.service';
import { CustomerDetails } from './credit.interface';
export interface CreateCreditDto {
    productId: string;
    totalAmount: number;
    downPayment: number;
    creditAmount: number;
    customerDetails: CustomerDetails;
    interestRate: number;
    paymentDueDate: string;
    status: string;
}

export interface UpdateCreditDto {
    totalAmount?: number;
    downPayment?: number;
    creditAmount?: number;
    customerDetails?: CustomerDetails;
    paymentDueDate?: string;
    status?: 'PENDING' | 'APPROVED' | 'REJECTED';
}

const router = Router();
const creditService = new CreditService();

router.get('/', (req, res) => {
    const credits = creditService.findAll();
    res.json(credits);
});

router.get('/:id', (req, res) => {
    const credit = creditService.findOne(req.params.id);
    if (credit) {
        res.json(credit);
    } else {
        res.status(404).send('Credit not found');
    }
});

router.post('/', (req, res) => {
    const createCreditDto: CreateCreditDto = req.body;
    const newCredit = creditService.create(createCreditDto);
    res.status(201).json(newCredit);
});

router.put('/:id', (req, res) => {
    const updateCreditDto: UpdateCreditDto = req.body;
    const updatedCredit = creditService.update(req.params.id, updateCreditDto);
    if (updatedCredit) {
        res.json(updatedCredit);
    } else {
        res.status(404).send('Credit not found');
    }
});

router.delete('/:id', (req, res) => {
    creditService.remove(req.params.id);
    res.status(204).send();
});

export default router;