import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditLogsApi } from '../../api/client';
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

interface AuditLogEntry {
  id: string;
  actorType: string;
  actorId: string;
  eventType: string;
  eventCategory: string;
  severity: string;
  mandateId?: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

const ITEMS_PER_PAGE = 20;

interface AgentActionsTabProps {
  agentId: string;
}

export function AgentActionsTab({ agentId }: AgentActionsTabProps) {
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['agent-audit-logs', agentId, { page }],
    queryFn: () =>
      auditLogsApi.getByAgent(agentId, {
        limit: ITEMS_PER_PAGE,
        offset: (page - 1) * ITEMS_PER_PAGE,
      }),
    enabled: !!agentId,
  });

  const entries: AuditLogEntry[] = data?.data || [];
  const total = data?.pagination?.total || 0;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
      info: 'info',
      warning: 'warning',
      critical: 'error',
    };
    return <Badge variant={variants[severity] || 'default'}>{severity}</Badge>;
  };

  const getCategoryBadge = (category: string) => {
    const variants: Record<string, 'success' | 'warning' | 'info' | 'default'> = {
      mandate: 'info',
      payment: 'success',
      security: 'warning',
    };
    return <Badge variant={variants[category] || 'default'}>{category}</Badge>;
  };

  return (
    <div className="space-y-6 pt-6">
      {error && (
        <Alert variant="error" title="Error loading audit logs">
          Failed to load audit logs. Please try again.
        </Alert>
      )}

      {isLoading ? (
        <LoadingPage message="Loading audit logs..." />
      ) : (
        <Card>
          {entries.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="h-12 w-12" />}
              title="No audit logs found"
              description="No actions have been recorded for this agent yet"
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Mandate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(entry.createdAt).toLocaleTimeString()}
                        </div>
                      </TableCell>
                      <TableCell>{getCategoryBadge(entry.eventCategory)}</TableCell>
                      <TableCell>
                        <span className="text-sm">{entry.eventType}</span>
                      </TableCell>
                      <TableCell>{getSeverityBadge(entry.severity)}</TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-600 max-w-xs truncate">
                          {entry.description}
                        </div>
                      </TableCell>
                      <TableCell>
                        {entry.mandateId ? (
                          <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                            {entry.mandateId.substring(0, 8)}...
                          </code>
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
                  totalItems={total}
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
