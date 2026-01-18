import { Request, Response } from 'express';
import { AgentService } from '../services/agent.service';

export class AgentController {
  private agentService: AgentService;

  constructor() {
    this.agentService = new AgentService();
  }

  // Get all agents
  getAllAgents = async (req: Request, res: Response) => {
    try {
      const { status } = req.query;
      
      const agents = status === 'active' 
        ? await this.agentService.getActiveAgents()
        : await this.agentService.getAllAgents();

      res.json({
        success: true,
        data: agents,
      });
    } catch (error) {
      console.error('Error getting agents:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get agents',
      });
    }
  };

  // Get agent by ID
  getAgent = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const agent = await this.agentService.getAgent(id);

      res.json({
        success: true,
        data: agent,
      });
    } catch (error) {
      console.error('Error getting agent:', error);
      res.status(404).json({
        success: false,
        error: error instanceof Error ? error.message : 'Agent not found',
      });
    }
  };

  // Get agent by agentId
  getAgentByAgentId = async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      const agent = await this.agentService.getAgentByAgentId(agentId);

      res.json({
        success: true,
        data: agent,
      });
    } catch (error) {
      console.error('Error getting agent:', error);
      res.status(404).json({
        success: false,
        error: error instanceof Error ? error.message : 'Agent not found',
      });
    }
  };

  // Create agent
  createAgent = async (req: Request, res: Response) => {
    try {
      const agent = await this.agentService.createAgent(req.body);

      res.status(201).json({
        success: true,
        data: agent,
      });
    } catch (error) {
      console.error('Error creating agent:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create agent',
      });
    }
  };

  // Update agent
  updateAgent = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const agent = await this.agentService.updateAgent(id, req.body);

      res.json({
        success: true,
        data: agent,
      });
    } catch (error) {
      console.error('Error updating agent:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update agent',
      });
    }
  };

  // Delete agent
  deleteAgent = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.agentService.deleteAgent(id);

      res.json({
        success: true,
        message: 'Agent deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting agent:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete agent',
      });
    }
  };
}
