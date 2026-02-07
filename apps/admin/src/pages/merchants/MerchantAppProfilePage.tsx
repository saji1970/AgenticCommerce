import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { merchantsApi, agentsApi } from '../../api/client';
import {
  Button,
  Badge,
  LoadingPage,
  Alert,
  TabBar,
} from '../../components/common';
import type { Tab } from '../../components/common';
import {
  ArrowLeft,
  Bot,
  ChevronRight,
  LayoutDashboard,
  FileText,
  ShoppingCart,
  ClipboardList,
  CreditCard,
} from 'lucide-react';
import type { MerchantAgent } from '../../types';

import { AgentOverviewTab } from '../../components/agents/AgentOverviewTab';
import { AgentMandatesTab } from '../../components/agents/AgentMandatesTab';
import { AgentIntentsTab } from '../../components/agents/AgentIntentsTab';
import { AgentActionsTab } from '../../components/agents/AgentActionsTab';
import { AgentTransactionsTab } from '../../components/agents/AgentTransactionsTab';

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'mandates', label: 'Mandates', icon: FileText },
  { id: 'intents', label: 'Intents', icon: ShoppingCart },
  { id: 'actions', label: 'Action Logs', icon: ClipboardList },
  { id: 'transactions', label: 'Transactions', icon: CreditCard },
];

export function MerchantAppProfilePage() {
  const { id, agentId } = useParams<{ id: string; agentId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get('tab') || 'overview';

  const { data: merchantData } = useQuery({
    queryKey: ['merchant', id],
    queryFn: () => merchantsApi.getById(id!),
    enabled: !!id,
  });

  const { data: agentsData } = useQuery({
    queryKey: ['merchant', id, 'agents'],
    queryFn: () => merchantsApi.getAgents(id!),
    enabled: !!id,
  });

  const { data: monitoringData, isLoading: monitoringLoading } = useQuery({
    queryKey: ['agent', agentId, 'monitoring'],
    queryFn: () => agentsApi.getMonitoring(agentId!, 7),
    enabled: !!agentId,
  });

  if (monitoringLoading) {
    return <LoadingPage message="Loading agent details..." />;
  }

  const merchant = merchantData?.merchant;
  const agent = monitoringData?.agent;
  const monitoring = monitoringData;

  // Find the merchant-agent config for this agent
  const merchantAgents: MerchantAgent[] = agentsData?.agents || [];
  const merchantAgent = merchantAgents.find(
    (ma) => ma.agent?.agentId === agentId
  );

  if (!agent) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate(`/merchants/${id}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Merchant
        </Button>
        <Alert variant="error" title="Agent not found">
          The requested agent could not be found.
        </Alert>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
      active: 'success',
      inactive: 'default',
      suspended: 'error',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const handleTabChange = (tabId: string) => {
    if (tabId === 'overview') {
      setSearchParams({});
    } else {
      setSearchParams({ tab: tabId });
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb Header */}
      <div className="space-y-4">
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <Link to="/merchants" className="hover:text-gray-700">
            Merchants & Agents
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link to={`/merchants/${id}`} className="hover:text-gray-700">
            {merchant?.businessName || merchant?.name || 'Merchant'}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-gray-900 font-medium">{agent.name}</span>
        </nav>

        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(`/merchants/${id}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary-100 rounded-lg">
              <Bot className="h-8 w-8 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{agent.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-sm bg-gray-100 px-2 py-0.5 rounded">
                  {agent.agentId}
                </code>
                {getStatusBadge(agent.status)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <TabBar
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <AgentOverviewTab
          agentId={agentId!}
          merchantAgent={merchantAgent}
          monitoring={monitoring}
          agent={agent}
        />
      )}
      {activeTab === 'mandates' && (
        <AgentMandatesTab agentId={agentId!} />
      )}
      {activeTab === 'intents' && (
        <AgentIntentsTab agentId={agentId!} />
      )}
      {activeTab === 'actions' && (
        <AgentActionsTab agentId={agentId!} />
      )}
      {activeTab === 'transactions' && (
        <AgentTransactionsTab agentId={agentId!} />
      )}
    </div>
  );
}
