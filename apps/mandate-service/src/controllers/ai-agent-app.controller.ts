import { Request, Response } from 'express';
import { AIAgentAppService } from '../services/ai-agent-app.service';
import { CreateAIAgentAppRequest, UpdateAIAgentAppRequest } from '../repositories/ai-agent-app.repository';

export class AIAgentAppController {
  private agentAppService: AIAgentAppService;

  constructor() {
    this.agentAppService = new AIAgentAppService();
  }

  createAgentApp = async (req: Request, res: Response) => {
    try {
      const data: CreateAIAgentAppRequest = req.body;
      const app = await this.agentAppService.createAgentApp(data);

      res.status(201).json({
        success: true,
        data: app,
      });
    } catch (error) {
      console.error('Error creating agent app:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create agent app',
      });
    }
  };

  getAllAgentApps = async (req: Request, res: Response) => {
    try {
      const { active } = req.query;
      const apps = active === 'true'
        ? await this.agentAppService.getActiveAgentApps()
        : await this.agentAppService.getAllAgentApps();

      res.json({
        success: true,
        data: apps,
      });
    } catch (error) {
      console.error('Error getting agent apps:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get agent apps',
      });
    }
  };

  getAgentApp = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const app = await this.agentAppService.getAgentApp(id);

      res.json({
        success: true,
        data: app,
      });
    } catch (error) {
      console.error('Error getting agent app:', error);
      const statusCode = error instanceof Error && error.message === 'Agent app not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get agent app',
      });
    }
  };

  updateAgentApp = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data: UpdateAIAgentAppRequest = req.body;
      const app = await this.agentAppService.updateAgentApp(id, data);

      res.json({
        success: true,
        data: app,
      });
    } catch (error) {
      console.error('Error updating agent app:', error);
      const statusCode = error instanceof Error && error.message === 'Agent app not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update agent app',
      });
    }
  };

  deleteAgentApp = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.agentAppService.deleteAgentApp(id);

      res.json({
        success: true,
        message: 'Agent app deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting agent app:', error);
      const statusCode = error instanceof Error && error.message === 'Agent app not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete agent app',
      });
    }
  };
}
