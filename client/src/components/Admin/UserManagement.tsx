import { useState, useEffect, useCallback } from 'react';
import { request } from 'librechat-data-provider';
import PlanSelector from './PlanSelector';

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  plan: string | null;
  createdAt?: string;
}

interface BalanceInfo {
  user: string;
  tokenCredits: number;
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [userBalance, setUserBalance] = useState<BalanceInfo | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [message, setMessage] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await request.get<{ users: UserItem[]; total: number }>('/api/admin/users?limit=100');
      setUsers(data.users);
      setTotal(data.total);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error loading users');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBalance = useCallback(async (userId: string) => {
    try {
      const data = await request.get<BalanceInfo>(`/api/admin/plans/${userId}/balance`);
      setUserBalance(data);
    } catch {
      setUserBalance(null);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (selectedUser) {
      fetchBalance(selectedUser.id);
    }
  }, [selectedUser, fetchBalance]);

  const handlePlanAssigned = (userId: string, plan: string, newBalance: number) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, plan } : u)),
    );
    setUserBalance((prev) => prev ? { ...prev, tokenCredits: newBalance } : null);
    setMessage(`Plan ${plan} assigned. New balance: ${newBalance.toLocaleString()} tokens`);
  };

  const handleAdjustBalance = async () => {
    if (!selectedUser || !adjustAmount) {
      return;
    }

    const amount = parseInt(adjustAmount, 10);
    if (isNaN(amount) || amount === 0) {
      setMessage('Enter a valid non-zero amount');
      return;
    }

    try {
      const data = await request.post(`/api/admin/plans/${selectedUser.id}/balance`, { amount }) as { newBalance: number };
      setUserBalance((prev) => prev ? { ...prev, tokenCredits: data.newBalance } : null);
      setAdjustAmount('');
      setMessage(`Balance adjusted: ${amount > 0 ? '+' : ''}${amount.toLocaleString()}. New: ${data.newBalance.toLocaleString()}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error adjusting balance');
    }
  };

  if (loading) {
    return <div className="text-text-secondary">Loading users...</div>;
  }

  return (
    <div className="flex gap-6">
      <div className="flex-1">
        <h2 className="mb-4 text-lg font-medium">Users ({total})</h2>
        {message && (
          <div className="mb-4 rounded bg-surface-tertiary px-4 py-2 text-sm">
            {message}
          </div>
        )}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-medium text-left text-text-secondary">
              <th className="pb-2 pr-4">Name</th>
              <th className="pb-2 pr-4">Email</th>
              <th className="pb-2 pr-4">Plan</th>
              <th className="pb-2 pr-4">Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                onClick={() => setSelectedUser(u)}
                className={`cursor-pointer border-b border-border-light hover:bg-surface-secondary ${
                  selectedUser?.id === u.id ? 'bg-surface-tertiary' : ''
                }`}
              >
                <td className="py-2 pr-4">{u.name || '—'}</td>
                <td className="py-2 pr-4">{u.email}</td>
                <td className="py-2 pr-4">
                  <span className={`rounded px-2 py-0.5 text-xs ${u.plan ? 'bg-green-500/20 text-green-400' : 'bg-surface-tertiary text-text-secondary'}`}>
                    {u.plan?.replace('plan_', '') || 'none'}
                  </span>
                </td>
                <td className="py-2 pr-4">{u.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedUser && (
        <div className="w-80 rounded-lg border border-border-medium p-4">
          <h3 className="mb-1 font-medium">{selectedUser.name || selectedUser.email}</h3>
          <p className="mb-4 text-sm text-text-secondary">{selectedUser.email}</p>

          <div className="mb-4">
            <label className="mb-1 block text-xs text-text-secondary">Balance</label>
            <p className="text-lg font-semibold">
              {userBalance?.tokenCredits?.toLocaleString() ?? '0'} tokens
            </p>
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-xs text-text-secondary">Assign Plan</label>
            <PlanSelector
              userId={selectedUser.id}
              currentPlan={selectedUser.plan}
              onPlanAssigned={handlePlanAssigned}
            />
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-xs text-text-secondary">Adjust Balance</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                placeholder="e.g. 100000 or -50000"
                className="flex-1 rounded border border-border-medium bg-surface-secondary px-3 py-1.5 text-sm"
              />
              <button
                onClick={handleAdjustBalance}
                className="rounded bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
