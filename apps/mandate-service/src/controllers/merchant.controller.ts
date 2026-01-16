import { Request, Response } from 'express';
import { MerchantService } from '../services/merchant.service';
import { CreateMerchantRequest, UpdateMerchantRequest } from '../repositories/merchant.repository';

export class MerchantController {
  private merchantService: MerchantService;

  constructor() {
    this.merchantService = new MerchantService();
  }

  createMerchant = async (req: Request, res: Response) => {
    try {
      const data: CreateMerchantRequest = req.body;
      const merchant = await this.merchantService.createMerchant(data);

      res.status(201).json({
        success: true,
        data: merchant,
      });
    } catch (error) {
      console.error('Error creating merchant:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create merchant',
      });
    }
  };

  getAllMerchants = async (req: Request, res: Response) => {
    try {
      const merchants = await this.merchantService.getAllMerchants();
      res.json({
        success: true,
        data: merchants,
      });
    } catch (error) {
      console.error('Error getting merchants:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get merchants',
      });
    }
  };

  getMerchant = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const merchant = await this.merchantService.getMerchant(id);

      res.json({
        success: true,
        data: merchant,
      });
    } catch (error) {
      console.error('Error getting merchant:', error);
      const statusCode = error instanceof Error && error.message === 'Merchant not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get merchant',
      });
    }
  };

  updateMerchant = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data: UpdateMerchantRequest = req.body;
      const merchant = await this.merchantService.updateMerchant(id, data);

      res.json({
        success: true,
        data: merchant,
      });
    } catch (error) {
      console.error('Error updating merchant:', error);
      const statusCode = error instanceof Error && error.message === 'Merchant not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update merchant',
      });
    }
  };

  deleteMerchant = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.merchantService.deleteMerchant(id);

      res.json({
        success: true,
        message: 'Merchant deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting merchant:', error);
      const statusCode = error instanceof Error && error.message === 'Merchant not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete merchant',
      });
    }
  };
}
