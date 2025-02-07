interface CustomerDetails {
    name: string;
    phone: string;
    email: string;
}

interface Credit {
    id: string;
    productId: string;
    totalAmount: number;
    downPayment: number;
    creditAmount: number;
    customerDetails: CustomerDetails;
    paymentDueDate: string;
    status: string;
}

interface CreateCreditDto {
    productId: string;
    totalAmount: number;
    downPayment: number;
    creditAmount: number;
    customerDetails: CustomerDetails;
    paymentDueDate: string;
    status: string;
}

interface UpdateCreditDto {
    productId?: string;
    totalAmount?: number;
    downPayment?: number;
    creditAmount?: number;
    customerDetails?: CustomerDetails;
    paymentDueDate?: string;
    status?: string;
}

class CreditService {
    private credits: Credit[] = [];

    findAll(): Credit[] {
        return this.credits;
    }

    findOne(id: string): Credit | undefined {
        return this.credits.find(credit => credit.id === id);
    }

    create(createCreditDto: CreateCreditDto): Credit {
        const newCredit: Credit = {
            id: this.generateId(),
            ...createCreditDto
        };
        this.credits.push(newCredit);
        return newCredit;
    }

    update(id: string, updateCreditDto: UpdateCreditDto): Credit | undefined {
        const creditIndex = this.credits.findIndex(credit => credit.id === id);
        if (creditIndex === -1) {
            return undefined;
        }
        const updatedCredit = { ...this.credits[creditIndex], ...updateCreditDto };
        this.credits[creditIndex] = updatedCredit;
        return updatedCredit;
    }

    remove(id: string): void {
        this.credits = this.credits.filter(credit => credit.id !== id);
    }

    private generateId(): string {
        return Math.random().toString(36).substr(2, 9);
    }
}

export { CreditService, Credit, CreateCreditDto, UpdateCreditDto };