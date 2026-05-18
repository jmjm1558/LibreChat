import { useState, useEffect, useCallback } from 'react';

interface ModelInfo {
  model_name: string;
  litellm_params: {
    model: string;
    api_key?: string;
    api_base?: string;
  };
  model_info?: {
    id?: string;
  };
}

export default function LiteLLMPanel() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newModel, setNewModel] = useState({ model_name: '', model: '', api_key: '' });

  const fetchModels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/litellm/models');
      if (!res.ok) {
        throw new Error('Failed to connect to LiteLLM');
      }
      const data = await res.json();
      setModels(data.data || []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const handleAddModel = async () => {
    if (!newModel.model_name || !newModel.model || !newModel.api_key) {
      setMessage('All fields are required');
      return;
    }

    try {
      const res = await fetch('/api/admin/litellm/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_name: newModel.model_name,
          litellm_params: {
            model: newModel.model,
            api_key: newModel.api_key,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add model');
      }

      setMessage(`Model ${newModel.model_name} added successfully`);
      setNewModel({ model_name: '', model: '', api_key: '' });
      setShowAdd(false);
      fetchModels();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error adding model');
    }
  };

  const handleDeleteModel = async (modelId: string, modelName: string) => {
    if (!confirm(`Delete model ${modelName}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/litellm/models/${encodeURIComponent(modelId)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete model');
      }

      setMessage(`Model ${modelName} deleted`);
      fetchModels();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error deleting model');
    }
  };

  if (loading) {
    return <div className="text-text-secondary">Connecting to LiteLLM...</div>;
  }

  if (error) {
    return (
      <div className="rounded border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
        {error}
        <button onClick={fetchModels} className="ml-4 underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium">Models ({models.length})</h2>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
        >
          {showAdd ? 'Cancel' : '+ Add Model'}
        </button>
      </div>

      {message && (
        <div className="mb-4 rounded bg-surface-tertiary px-4 py-2 text-sm">
          {message}
        </div>
      )}

      {showAdd && (
        <div className="mb-4 rounded border border-border-medium p-4">
          <h3 className="mb-3 text-sm font-medium">Add Model</h3>
          <div className="mb-2">
            <label className="mb-1 block text-xs text-text-secondary">Display Name</label>
            <input
              type="text"
              value={newModel.model_name}
              onChange={(e) => setNewModel((p) => ({ ...p, model_name: e.target.value }))}
              placeholder="e.g. claude-sonnet"
              className="w-full rounded border border-border-medium bg-surface-secondary px-3 py-1.5 text-sm"
            />
          </div>
          <div className="mb-2">
            <label className="mb-1 block text-xs text-text-secondary">Model ID (Bedrock)</label>
            <input
              type="text"
              value={newModel.model}
              onChange={(e) => setNewModel((p) => ({ ...p, model: e.target.value }))}
              placeholder="e.g. bedrock/us.anthropic.claude-sonnet-4-6"
              className="w-full rounded border border-border-medium bg-surface-secondary px-3 py-1.5 text-sm"
            />
          </div>
          <div className="mb-3">
            <label className="mb-1 block text-xs text-text-secondary">API Key (ABSK)</label>
            <input
              type="password"
              value={newModel.api_key}
              onChange={(e) => setNewModel((p) => ({ ...p, api_key: e.target.value }))}
              placeholder="ABSK..."
              className="w-full rounded border border-border-medium bg-surface-secondary px-3 py-1.5 text-sm"
            />
          </div>
          <button
            onClick={handleAddModel}
            className="rounded bg-green-600 px-4 py-1.5 text-sm text-white hover:bg-green-700"
          >
            Add Model
          </button>
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-medium text-left text-text-secondary">
            <th className="pb-2 pr-4">Name</th>
            <th className="pb-2 pr-4">Model ID</th>
            <th className="pb-2 pr-4">Key</th>
            <th className="pb-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {models.map((m, i) => (
            <tr key={m.model_info?.id || i} className="border-b border-border-light">
              <td className="py-2 pr-4 font-medium">{m.model_name}</td>
              <td className="py-2 pr-4 font-mono text-xs text-text-secondary">
                {m.litellm_params.model}
              </td>
              <td className="py-2 pr-4 text-xs text-text-secondary">
                {m.litellm_params.api_key
                  ? `${m.litellm_params.api_key.substring(0, 8)}...`
                  : 'env'}
              </td>
              <td className="py-2">
                {m.model_info?.id && (
                  <button
                    onClick={() => handleDeleteModel(m.model_info!.id!, m.model_name)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
