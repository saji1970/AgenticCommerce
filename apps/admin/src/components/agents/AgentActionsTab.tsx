import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { agentsApi } from '../../api/client';
import {
  Badge,
  Card,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Pagination,
  LoadingPage,
  EmptyState,
  Alert,
} from '../common';
import { ClipboardList } from 'lucide-react';
import type { AgentAction } from '../../types';

const ITEMS_PER_PAGE = 20;

interface AgentActionsTabProps {
  agentId: string;
}

export function AgentActionsTab({ agentId }: AgentActionsTabProps) {
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['agent', agentId, 'auditability', { page }],
    queryFn: () =>
      agentsApi.getAuditability(agentId, {
        limit: ITEMS_PER_PAGE,
        offset: (page - 1) * ITEMS_PER_PAGE,
      }),
    enabled: !!agentId,
  });

  const actions: AgentAction[] = data?.actions || [];
  const pagination = data?.pagination || { total: 0, limit: ITEMS_PER_PAGE, offset: 0 };
  const totalPages = Math.ceil(pagination.total / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6 pt-6">
      {error && (
        <Alert variant="error" title="Error loading action logs">
          Failed to load action logs. Please try again.
        </Alert>
      )}

      {isLoading ? (
        <LoadingPage message="Loading action logs..." />
      ) : (
        <Card>
          {actions.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="h-12 w-12" />}
              title="No action logs found"
              description="No actions have been recorded for this agent yet"
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {actions.map((action) => (
                    <TableRow key={action.id}>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(action.timestamp).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(action.timestamp).toLocaleTimeString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm">{action.userName}</div>
                          <div className="text-xs text-gray-500">{action.userEmail}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="info">{action.action}</Badge>
                      </TableCell>
                      <TableCell>
                        {action.resourceType ? (
                          <div>
                            <div className="text-sm">{action.resourceType}</div>
                            {action.resourceId && (
                              <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                                {action.resourceId.substring(0, 8)}...
                              </code>
                            )}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={action.success ? 'success' : 'error'}>
                          {action.success ? 'Success' : 'Failed'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {action.errorMessage ? (
                          <span className="text-xs text-red-600">{action.errorMessage}</span>
                        ) : action.mandateType ? (
                          <span className="text-xs text-gray-500">Mandate: {action.mandateType}</span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  totalItems={pagination.total}
                  itemsPerPage={ITEMS_PER_PAGE}
                />
              )}
            </>
          )}
        </Card>
      )}
    </div>
  );
}
