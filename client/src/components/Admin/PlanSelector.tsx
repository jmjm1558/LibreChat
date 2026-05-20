import { useState } from 'react';
import { request } from 'librechat-data-provider';

const PLANS = [
  { id: 'plan_basico', label: 'Basico', tokens: 400_000 },
  { id: 'plan_estandar', label: 'Estandar', tokens: 900_000 },
  { id: 'plan_pro', label: 'Pro', tokens: 1_500_000 },
  { id: 'plan_byok', label: 'BYOK', tokens: 0 },
  { id: 'plan_pro_byok', label: 'Pro + BYOK', tokens: 1_500_000 },
] as const;

interface PlanSelectorProps {
  userId: string;
  currentPlan: string | null;
  onPlanAssigned: (userId: string, plan: string, newBalance: number) => void;
}

export default function PlanSelector({ userId, currentPlan, onPlanAssigned }: PlanSelectorProps) {
  const [selected, setSelected] = useState(currentPlan || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedPlan = PLANS.find((p) => p.id === selected);

  const handleAssign = async () => {
    if (!selected || selected === currentPlan) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await request.put(`/api/admin/plans/${userId}/plan`, { plan: selected }) as { plan: string; newBalance: number };
      onPlanAssigned(userId, data.plan, data.newBalance);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="mb-2 w-full rounded border border-border-medium bg-surface-secondary px-3 py-1.5 text-sm"
      >
        <option value="">Select plan...</option>
        {PLANS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label} ({p.tokens > 0 ? `+${p.tokens.toLocaleString()} tokens` : 'no tokens'})
          </option>
        ))}
      </select>

      {selectedPlan && selected !== currentPlan && (
        <div className="mb-2 rounded bg-surface-tertiary px-3 py-2 text-xs">
          Will add <strong>{selectedPlan.tokens.toLocaleString()}</strong> tokens immediately
        </div>
      )}

      <button
        onClick={handleAssign}
        disabled={loading || !selected || selected === currentPlan}
        className="w-full rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Assigning...' : 'Assign Plan'}
      </button>

      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
