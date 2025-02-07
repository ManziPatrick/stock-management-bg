import { Request, Response } from 'express';
import { ProformaService } from './proforma.service';

export class ProformaController {
  private proformaService: ProformaService;

  constructor() {
    this.proformaService = new ProformaService();
  }

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const proforma = await this.proformaService.createProforma(req.body);
      res.status(201).json(proforma);
    } catch (error) {
      res.status(400).json({ error: (error as any).message });
    }
  };

  updateStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const proforma = await this.proformaService.updateStatus(id, status);
      res.json(proforma);
    } catch (error) {
      res.status(400).json({ error: (error as any).message });
    }
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const proforma = await this.proformaService.findById(id);
      res.json(proforma);
    } catch (error) {
      res.status(404).json({ error: (error as any).message });
    }
  };

  getAll = async (req: Request, res: Response): Promise<void> => {
    try {
      const proformas = await this.proformaService.getAllProformas(req.query);
      res.json(proformas);
    } catch (error) {
      res.status(400).json({ error: (error as any).message });
    }
  };
}
