// src/services/debit.service.ts
//@ts-nocheck
import { DebitModel } from './debits.models';
import { CreateDebitDto, UpdateDebitDto, DebitQueryParams, IDebit } from './debits.interface';
import { AppError } from '../utils/appError';
import nodemailer from 'nodemailer';
import User from '../user/user.model';
import SaleTransaction from '../sale/sale.model';

export class DebitService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    
    // Schedule daily check for deadlines
    this.scheduleDeadlineChecks();
  }

  private async getAdminEmails(): Promise<string[]> {
    try {
      const users = await User.find({
        role: { $in: ['ADMIN', 'KEEPER'] },
        status: 'ACTIVE'
      });
      return users.map(user => user.email);
    } catch (error) {
      console.error('Error fetching admin emails:', error);
      return [];
    }
  }
  private async sendDebitNotification(
    debit: IDebit, 
    templateType: 'created' | 'reminder' | 'overdue' | 'updated' | 'completed', 
    daysRemaining?: number,
    updates?: Partial<UpdateDebitDto>
  ): Promise<void> {
    try {
      console.log(`Starting ${templateType} notification for debit:`, debit.productName);
      
      const adminEmails = await this.getAdminEmails();
      const recipients = [...adminEmails, debit.buyerEmail];
      console.log('Recipients for notification:', recipients);
      
      let subject: string;
      let htmlContent: string;
      
      const styles = `
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          color: #333;
          line-height: 1.6;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #0a3d62;
          color: #ffffff;
          padding: 15px;
          border-radius: 5px 5px 0 0;
          text-align: center;
        }
        .content {
          background-color: #f9f9f9;
          padding: 20px;
          border-left: 1px solid #ddd;
          border-right: 1px solid #ddd;
        }
        .footer {
          background-color: #0a3d62;
          color: #ffffff;
          padding: 10px;
          text-align: center;
          border-radius: 0 0 5px 5px;
          font-size: 12px;
        }
        .amount-info {
          background-color: #e8f4ff;
          padding: 15px;
          border-radius: 5px;
          margin: 15px 0;
        }
        .amount-row {
          display: flex;
          justify-content: space-between;
          margin: 5px 0;
          border-bottom: 1px solid #ddd;
          padding-bottom: 5px;
        }
        .amount-label {
          font-weight: bold;
          color: #0a3d62;
        }
        .warning {
          background-color: #fff8e1;
          padding: 10px;
          border-left: 4px solid #ffc107;
          margin: 15px 0;
        }
        .critical {
          background-color: #ffebee;
          padding: 10px;
          border-left: 4px solid #f44336;
          margin: 15px 0;
        }
        .success {
          background-color: #e8f5e9;
          padding: 10px;
          border-left: 4px solid #4caf50;
          margin: 15px 0;
        }
        .button {
          display: inline-block;
          background-color: #0a3d62;
          color: white;
          padding: 10px 20px;
          text-decoration: none;
          border-radius: 5px;
          margin-top: 15px;
        }
        .button:hover {
          background-color: #1e5b8d;
        }
        .success-button {
          background-color: #2e7d32;
        }
        .urgent-button {
          background-color: #d32f2f;
        }
      `;
      
      switch (templateType) {
        case 'created':
          subject = `Payment Plan Created: ${debit.productName}`;
          htmlContent = `
            <html>
            <head>
              <style>${styles}</style>
            </head>
            <body>
              <div class="header">
                <h2>New Payment Plan Created</h2>
              </div>
              <div class="content">
                <p>Dear ${debit.buyerName},</p>
                <p>Your payment plan has been created successfully for:</p>
                <p><strong>${debit.productName}</strong></p>
                
                <div class="amount-info">
                  <div class="amount-row">
                    <span class="amount-label">Total Amount:</span>
                    <span>${debit.totalAmount.toFixed(2)} frw</span>
                  </div>
                  <div class="amount-row">
                    <span class="amount-label">Amount Paid:</span>
                    <span>${debit.paidAmount.toFixed(2)} frw</span>
                  </div>
                  <div class="amount-row">
                    <span class="amount-label">Remaining Amount:</span>
                    <span>${debit.remainingAmount.toFixed(2)} frw</span>
                  </div>
                  <div class="amount-row">
                    <span class="amount-label">Due Date:</span>
                    <span>${debit.dueDate.toLocaleDateString()}</span>
                  </div>
                </div>
                
                <p>Please ensure that payment is made before the due date to avoid late payment fees.</p>
                <p>Thank you for your business.</p>
                
                <a href="#" class="button">View Payment Details</a>
              </div>
              <div class="footer">
                <p>This is an automated notification. Please do not reply to this email.</p>
              </div>
            </body>
            </html>
          `;
          break;
          
        case 'reminder':
          const daysLeft = daysRemaining ?? 0;
          const isUrgent = daysLeft <= 3;
          
          subject = `Payment Reminder: ${debit.productName} - ${daysLeft} days remaining`;
          htmlContent = `
            <html>
            <head>
              <style>${styles}</style>
            </head>
            <body>
              <div class="header">
                <h2>Payment Reminder</h2>
              </div>
              <div class="content">
                <p>Dear ${debit.buyerName},</p>
                <p>This is a friendly reminder that your payment for <strong>${debit.productName}</strong> is due in <strong>${daysLeft} days</strong>.</p>
                
                <div class="amount-info">
                  <div class="amount-row">
                    <span class="amount-label">Remaining Amount:</span>
                    <span>${debit.remainingAmount.toFixed(2)} frw</span>
                  </div>
                  <div class="amount-row">
                    <span class="amount-label">Due Date:</span>
                    <span>${debit.dueDate.toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div class="${isUrgent ? 'critical' : 'warning'}">
                  <p><strong>Please make your payment as soon as possible to avoid late fees.</strong></p>
                </div>
                
                <p>If you've already made this payment, please disregard this message.</p>
                <p>Thank you for your prompt attention to this matter.</p>
                
                <a href="#" class="button ${isUrgent ? 'urgent-button' : ''}">Make Payment Now</a>
              </div>
              <div class="footer">
                <p>This is an automated notification. Please do not reply to this email.</p>
              </div>
            </body>
            </html>
          `;
          break;
          
        case 'overdue':
          subject = `OVERDUE Payment: ${debit.productName}`;
          htmlContent = `
            <html>
            <head>
              <style>${styles}</style>
            </head>
            <body>
              <div class="header">
                <h2>OVERDUE PAYMENT NOTICE</h2>
              </div>
              <div class="content">
                <p>Dear ${debit.buyerName},</p>
                <p>Our records indicate that your payment for <strong>${debit.productName}</strong> is now <strong style="color: #f44336;">OVERDUE</strong>.</p>
                
                <div class="amount-info">
                  <div class="amount-row">
                    <span class="amount-label">Remaining Amount:</span>
                    <span>${debit.remainingAmount.toFixed(2)} frw</span>
                  </div>
                  <div class="amount-row">
                    <span class="amount-label">Due Date:</span>
                    <span>${debit.dueDate.toLocaleDateString()} (PASSED)</span>
                  </div>
                </div>
                
                <div class="critical">
                  <p><strong>Please contact us immediately to arrange payment and avoid additional penalties or collection actions.</strong></p>
                </div>
                
                <p>If you have already made this payment, please contact us with your payment details so we can update our records.</p>
                
                <a href="#" class="button urgent-button">Make Urgent Payment</a>
              </div>
              <div class="footer">
                <p>This is an automated notification. Please do not reply to this email.</p>
              </div>
            </body>
            </html>
          `;
          break;

        case 'updated':
          subject = `Payment Plan Updated: ${debit.productName}`;
          htmlContent = `
            <html>
            <head>
              <style>${styles}</style>
            </head>
            <body>
              <div class="header">
                <h2>Payment Plan Updated</h2>
              </div>
              <div class="content">
                <p>Dear ${debit.buyerName},</p>
                <p>Your payment plan for <strong>${debit.productName}</strong> has been updated.</p>
                
                <div class="amount-info">
                  <div class="amount-row">
                    <span class="amount-label">Total Amount:</span>
                    <span>${debit.totalAmount.toFixed(2)} frw</span>
                  </div>
                  <div class="amount-row">
                    <span class="amount-label">Amount Paid:</span>
                    <span>${debit.paidAmount.toFixed(2)} frw</span>
                  </div>
                  <div class="amount-row">
                    <span class="amount-label">Remaining Amount:</span>
                    <span>${debit.remainingAmount.toFixed(2)} frw</span>
                  </div>
                  <div class="amount-row">
                    <span class="amount-label">Due Date:</span>
                    <span>${debit.dueDate.toLocaleDateString()}</span>
                  </div>
                </div>
                
                ${updates ? `
                <div class="warning">
                  <p><strong>Changes made:</strong></p>
                  <ul>
                    ${Object.entries(updates).map(([key, value]) => 
                      `<li>${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}</li>`
                    ).join('')}
                  </ul>
                </div>
                ` : ''}
                
                <p>Please review these changes and contact us if you have any questions.</p>
                
                <a href="#" class="button">View Updated Details</a>
              </div>
              <div class="footer">
                <p>This is an automated notification. Please do not reply to this email.</p>
              </div>
            </body>
            </html>
          `;
          break;
          
        case 'completed':
          subject = `Payment Plan Completed: ${debit.productName}`;
          htmlContent = `
            <html>
            <head>
              <style>${styles}</style>
            </head>
            <body>
              <div class="header" style="background-color: #2e7d32">
                <h2>Payment Plan Completed</h2>
              </div>
              <div class="content">
                <p>Dear ${debit.buyerName},</p>
                <p>Congratulations! Your payment plan for <strong>${debit.productName}</strong> has been successfully completed.</p>
                
                <div class="amount-info success">
                  <div class="amount-row">
                    <span class="amount-label">Total Amount Paid:</span>
                    <span>${debit.totalAmount.toFixed(2)} frw</span>
                  </div>
                  <div class="amount-row">
                    <span class="amount-label">Completion Date:</span>
                    <span>${new Date().toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div class="success">
                  <p><strong>All payments have been received and processed. Thank you for your timely payments!</strong></p>
                </div>
                
                <div style="text-align: center; margin-top: 20px;">
                  <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 24 24'%3E%3Cpath fill='%232e7d32' d='M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z'/%3E%3C/svg%3E" 
                       alt="Completed" 
                       style="width: 64px; height: 64px;"
                  />
                </div>
                
                <p>We appreciate your business and look forward to serving you again!</p>
                
                <a href="#" class="button success-button">View Payment History</a>
              </div>
              <div class="footer" style="background-color: #2e7d32">
                <p>This is an automated notification. Please do not reply to this email.</p>
              </div>
            </body>
            </html>
          `;
          break;
      }
      
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: recipients.join(', '),
        subject,
        html: htmlContent
      };
      
      console.log('Sending email with options:', {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject
      });
      
      await this.transporter.sendMail(mailOptions);
      console.log(`${templateType} notification sent successfully`);
    } catch (error) {
      console.error(`Error in send${templateType}Notification:`, error);
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
    }
  }

  private scheduleDeadlineChecks(): void {
    // Run this function daily at midnight
    const runDaily = () => {
      const now = new Date();
      const midnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1, // next day
        0, 0, 0 // at midnight
      );
      
      const msUntilMidnight = midnight.getTime() - now.getTime();
      
      setTimeout(async () => {
        await this.checkAllDeadlines();
        runDaily(); // Schedule next day's check
      }, msUntilMidnight);
    };
    
    // Start the cycle
    runDaily();
    
    // Also run immediately upon service start
    this.checkAllDeadlines();
  }
  
  private async checkAllDeadlines(): Promise<void> {
    try {
      console.log('Running daily deadline checks');
      
      // Get current date and normalize to start of day
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Find debits with due dates coming up in 7 days
      const sevenDaysFromNow = new Date(today);
      sevenDaysFromNow.setDate(today.getDate() + 7);
      sevenDaysFromNow.setHours(23, 59, 59, 999);
      
      const weekReminderDebits = await DebitModel.find({
        status: 'PENDING',
        dueDate: {
          $gte: today,
          $lte: sevenDaysFromNow
        }
      });
      
      console.log(`Found ${weekReminderDebits.length} debits due within 7 days`);
      
      for (const debit of weekReminderDebits) {
        const daysDiff = Math.ceil((debit.dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        // Send reminder on specific days: 7 days before, 3 days before, and on the due date
        if (daysDiff === 7 || daysDiff === 3 || daysDiff === 0) {
          await this.sendDebitNotification(debit, 'reminder', daysDiff);
        }
      }
      
      // Check for overdue debits and update their status
      await this.updateOverdueStatus();
      
      // Get newly overdue debits and send notifications
      const newlyOverdueDebits = await DebitModel.find({
        status: 'OVERDUE',
        // Find debits that just became overdue (within last day)
        updatedAt: {
          $gte: new Date(today.getTime() - 24 * 60 * 60 * 1000)
        }
      });
      
      console.log(`Found ${newlyOverdueDebits.length} newly overdue debits`);
      
      for (const debit of newlyOverdueDebits) {
        await this.sendDebitNotification(debit, 'overdue');
      }
      
    } catch (error) {
      console.error('Error in checkAllDeadlines:', error);
    }
  }

  async createDebit(data: CreateDebitDto): Promise<IDebit> {
    // Check if sale exists
    if (data.saleId) {
      const sale = await SaleTransaction.findById(data.saleId);
      if (!sale) {
        throw new AppError('Sale not found', 404);
      }
      
      // Update sale status to credit if it's not already
      if (sale.status !== 'credit') {
        await SaleTransaction.findByIdAndUpdate(
          data.saleId,
          { $set: { status: 'credit' } },
          { new: true }
        );
      }
    }
    
    // Create debit record
    const debit = await DebitModel.create(data);
    
    // Send notification
    await this.sendDebitNotification(debit, 'created');
    
    return debit;
  }

  async getAllDebits(queryParams: DebitQueryParams) {
    const {
      page = 1,
      limit = 10,
      status,
      search,
      startDate,
      endDate,
    } = queryParams;
    
    const query: any = {};
    
    if (status) {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { buyerName: { $regex: search, $options: 'i' } },
        { productName: { $regex: search, $options: 'i' } },
      ];
    }
    
    if (startDate && endDate) {
      query.dueDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }
    
    const skip = (page - 1) * limit;
    
    const [debits, total] = await Promise.all([
      DebitModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      DebitModel.countDocuments(query),
    ]);
    
    const totalPages = Math.ceil(total / limit);
    
    return {
      data: debits,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async getDebitById(id: string): Promise<IDebit> {
    const debit = await DebitModel.findById(id);
    
    if (!debit) {
      throw new AppError('Debit record not found', 404);
    }
    
    return debit;
  }

  async updateDebit(id: string, data: UpdateDebitDto): Promise<IDebit> {
    // Get the debit before update to check for completion status change
    const oldDebit = await DebitModel.findById(id);
    if (!oldDebit) {
      throw new AppError('Debit record not found', 404);
    }
  
    // Calculate new remaining amount if paid amount is updated
    let newRemainingAmount = oldDebit.remainingAmount;
    if (data.paidAmount !== undefined) {
      // If only an additional payment is provided
      if (data.additionalPayment !== undefined && data.paidAmount === undefined) {
        data.paidAmount = oldDebit.paidAmount + data.additionalPayment;
        delete data.additionalPayment; // Remove it so it's not saved in the DB
      }
      
      newRemainingAmount = oldDebit.totalAmount - data.paidAmount;
      data.remainingAmount = newRemainingAmount;
      
      // Set status based on remaining amount
      if (newRemainingAmount <= 0) {
        data.status = 'COMPLETED';
      } else if (data.status !== 'OVERDUE') {
        data.status = 'PENDING';
      }
    }
  
    const debit = await DebitModel.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    );
    
    if (!debit) {
      throw new AppError('Debit record not found', 404);
    }
    
    // If this debit is linked to a sale, create a new payment transaction 
    // when additional payment is made
    if (debit.saleId && (oldDebit.paidAmount !== debit.paidAmount)) {
      const paymentAmount = debit.paidAmount - oldDebit.paidAmount;
      
      if (paymentAmount > 0) {
        try {
          // Update the related sale transaction with the new payment amount
          const sale = await SaleTransaction.findById(debit.saleId);
          
          if (sale) {
            // Update the paidAmount in the sale record
            const newSalePaidAmount = (sale.paidAmount || 0) + paymentAmount;
            
            // Update sale status if payment is complete
            let saleStatus = sale.status;
            if (newSalePaidAmount >= sale.totalAmount) {
              saleStatus = 'approved'; // Set to approved if fully paid
            }
            
            // Update the sale record
            await SaleTransaction.findByIdAndUpdate(
              debit.saleId,
              { 
                $set: { 
                  paidAmount: newSalePaidAmount,
                  status: saleStatus
                } 
              },
              { new: true }
            );
            
            console.log(`Updated sale ${debit.saleId} with payment of ${paymentAmount}. New paid amount: ${newSalePaidAmount}`);
          } else {
            console.error(`Referenced sale ${debit.saleId} not found`);
          }
        } catch (error) {
          console.error(`Error updating related sale ${debit.saleId}:`, error);
          // We don't want to fail the debit update if the sale update fails
          // But we should log this for investigation
        }
      }
    }
    
    // Check if debit is now complete and update the sale accordingly
    if (data.status === 'COMPLETED' && oldDebit.status !== 'COMPLETED' && debit.saleId) {
      try {
        // When debit is marked as completed, ensure the sale is marked as approved
        await SaleTransaction.findByIdAndUpdate(
          debit.saleId,
          { 
            $set: { 
              status: 'approved',
              paidAmount: debit.totalAmount // Ensure the paid amount matches the total
            } 
          }
        );
        console.log(`Marked sale ${debit.saleId} as approved due to completed debit payment`);
      } catch (error) {
        console.error(`Error updating sale status for ${debit.saleId}:`, error);
      }
    }
    
    // Send update notification
    await this.sendDebitNotification(debit, 'updated', undefined, data);
    
    return debit;
  }

  // Method to handle partial payments
  async makePayment(id: string, amount: number): Promise<IDebit> {
    const debit = await DebitModel.findById(id);
    
    if (!debit) {
      throw new AppError('Debit record not found', 404);
    }
    
    if (amount <= 0) {
      throw new AppError('Payment amount must be greater than zero', 400);
    }
    
    // Update paid and remaining amounts
    const newPaidAmount = debit.paidAmount + amount;
    const newRemainingAmount = debit.totalAmount - newPaidAmount;
    
    // Ensure we don't overpay
    if (newRemainingAmount < 0) {
      throw new AppError('Payment amount exceeds remaining balance', 400);
    }
    
    // Determine new status
    const newStatus = newRemainingAmount === 0 ? 'COMPLETED' : 'PENDING';
    
    // Update the debit record
    const updatedDebit = await DebitModel.findByIdAndUpdate(
      id,
      { 
        $set: { 
          paidAmount: newPaidAmount, 
          remainingAmount: newRemainingAmount,
          status: newStatus
        } 
      },
      { new: true, runValidators: true }
    );
    
    if (!updatedDebit) {
      throw new AppError('Failed to update debit record', 500);
    }
    
    // If this debit is linked to a sale, record the payment
    if (updatedDebit.saleId) {
      // Record payment in your system
      // This could involve updating the original sale or creating a payment record
    }
    
    // Send notification
    await this.sendDebitNotification(updatedDebit, 'payment', { amount });
    
    return updatedDebit;
  }
  
  async deleteDebit(id: string): Promise<void> {
    const result = await DebitModel.findByIdAndDelete(id);
    
    if (!result) {
      throw new AppError('Debit record not found', 404);
    }
  }

  async updateOverdueStatus(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const result = await DebitModel.updateMany(
      {
        status: 'PENDING',
        dueDate: { $lt: today },
      },
      {
        $set: { status: 'OVERDUE' },
      }
    );
    
    console.log(`Updated ${result.modifiedCount} debits to OVERDUE status`);
  }

  async getDebitSummary() {
    const summary = await DebitModel.aggregate([
      {
        $group: {
          _id: '$status',
          totalAmount: { $sum: '$totalAmount' },
          totalRemaining: { $sum: '$remainingAmount' },
          count: { $sum: 1 },
        },
      },
    ]);
    
    return summary;
  }
}