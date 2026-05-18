import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { SystemRoles } from 'librechat-data-provider';
import { useAuthContext } from '~/hooks/AuthContext';
import UserManagement from './UserManagement';
import LiteLLMPanel from './LiteLLMPanel';

type Tab = 'users' | 'litellm';

export default function AdminLayout() {
  const { user } = useAuthContext();
  const [activeTab, setActiveTab] = useState<Tab>('users');

  if (user?.role !== SystemRoles.ADMIN) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex h-screen w-full flex-col bg-surface-primary text-text-primary">
      <header className="flex items-center justify-between border-b border-border-medium px-6 py-4">
        <h1 className="text-xl font-semibold">StellarLLM Admin</h1>
        <a href="/" className="text-sm text-text-secondary hover:text-text-primary">
          &larr; Back to Chat
        </a>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <nav className="w-48 border-r border-border-medium p-4">
          <button
            onClick={() => setActiveTab('users')}
            className={`mb-2 w-full rounded px-3 py-2 text-left text-sm ${
              activeTab === 'users'
                ? 'bg-surface-tertiary font-medium'
                : 'hover:bg-surface-secondary'
            }`}
          >
            Users & Plans
          </button>
          <button
            onClick={() => setActiveTab('litellm')}
            className={`w-full rounded px-3 py-2 text-left text-sm ${
              activeTab === 'litellm'
                ? 'bg-surface-tertiary font-medium'
                : 'hover:bg-surface-secondary'
            }`}
          >
            Models & Keys
          </button>
        </nav>
        <main className="flex-1 overflow-auto p-6">
          {activeTab === 'users' && <UserManagement />}
          {activeTab === 'litellm' && <LiteLLMPanel />}
        </main>
      </div>
    </div>
  );
}
