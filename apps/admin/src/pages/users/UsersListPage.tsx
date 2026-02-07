import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { usersApi } from '../../api/client';
import {
  Input,
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
} from '../../components/common';
import { Search, Users } from 'lucide-react';
import type { User } from '../../types';

const ITEMS_PER_PAGE = 10;

export function UsersListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['users', { search, page }],
    queryFn: () =>
      usersApi.getAll({
        search: search || undefined,
        limit: ITEMS_PER_PAGE,
        offset: (page - 1) * ITEMS_PER_PAGE,
      }),
  });

  const users: User[] = data?.users || [];
  const pagination = data?.pagination || { total: 0, limit: ITEMS_PER_PAGE, offset: 0 };
  const totalPages = Math.ceil(pagination.total / ITEMS_PER_PAGE);

  const getRoleBadge = (role: string) => {
    const variants: Record<string, 'success' | 'warning' | 'info' | 'default'> = {
      admin: 'success',
      user: 'info',
    };
    return <Badge variant={variants[role] || 'default'}>{role}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="text-gray-500">Manage user accounts and settings</p>
      </div>

      {/* Search */}
      <Card>
        <div className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-10"
            />
          </div>
        </div>
      </Card>

      {error && (
        <Alert variant="error" title="Error loading users">
          Failed to load users. Please try again.
        </Alert>
      )}

      {isLoading ? (
        <LoadingPage message="Loading users..." />
      ) : (
      /* Users Table */
      <Card>
        {users.length === 0 ? (
          <EmptyState
            icon={<Users className="h-12 w-12" />}
            title="No users found"
            description={search ? 'Try a different search term' : 'No users have registered yet'}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow
                    key={user.id}
                    onClick={() => navigate(`/users/${user.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-primary-600 font-medium">
                            {user.firstName?.[0]}{user.lastName?.[0]}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">
                            {user.firstName} {user.lastName}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phoneNumber || '-'}</TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString()}
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
