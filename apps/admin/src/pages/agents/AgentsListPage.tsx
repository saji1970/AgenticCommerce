import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { agentsApi } from '../../api/client';
import {
  Select,
  Badge,
  Card,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  LoadingPage,
  EmptyState,
  Alert,
} from '../../components/common';
import { Bot } from 'lucide-react';
import type { AIAgent } from '../../types';

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
];

export function AgentsListPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['agents', { status }],
    queryFn: () => agentsApi.getAll({ status: status || undefined }),
  });

  if (isLoading) {
    return <LoadingPage message="Loading agents..." />;
  }

  if (error) {
    return (
      <Alert variant="error" title="Error loading agents">
        Failed to load agentic apps. Please try again.
      </Alert>
    );
  }

  const agents: AIAgent[] = data?.agents || [];

  const getStatusBadge = (agentStatus: string) => {
    const variants: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
      active: 'success',
      inactive: 'default',
      suspended: 'error',
    };
    return <Badge variant={variants[agentStatus] || 'default'}>{agentStatus}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Agentic Apps</h1>
        <p className="text-gray-500">Manage AI agents and their configurations</p>
      </div>

      {/* Filters */}
      <Card>
        <div className="p-4 flex gap-4">
          <div className="w-48">
            <Select
              options={statusOptions}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Agents Table */}
      <Card>
        {agents.length === 0 ? (
          <EmptyState
            icon={<Bot className="h-12 w-12" />}
            title="No agents found"
            description={status ? 'Try adjusting your filters' : 'No agentic apps have been registered yet'}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Agent ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Capabilities</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((agent) => (
                <TableRow
                  key={agent.id}
                  onClick={() => navigate(`/agents/${agent.agentId}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary-100 rounded-lg">
                        <Bot className="h-5 w-5 text-primary-600" />
                      </div>
                      <div>
                        <div className="font-medium">{agent.name}</div>
                        <div className="text-sm text-gray-500">{agent.agentName}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {agent.agentId}
                    </code>
                  </TableCell>
                  <TableCell>{getStatusBadge(agent.status)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {agent.capabilities.slice(0, 3).map((cap) => (
                        <Badge key={cap} variant="info" size="sm">
                          {cap}
                        </Badge>
                      ))}
                      {agent.capabilities.length > 3 && (
                        <Badge variant="default" size="sm">
                          +{agent.capabilities.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(agent.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
