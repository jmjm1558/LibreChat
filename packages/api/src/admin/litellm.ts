import { logger } from '@librechat/data-schemas';
import type { Response } from 'express';
import type { ServerRequest } from '~/types/http';

interface LiteLLMConfig {
  baseUrl: string;
  masterKey: string;
}

function getConfig(): LiteLLMConfig {
  return {
    baseUrl: process.env.LITELLM_BASE_URL || 'http://litellm:4000',
    masterKey: process.env.LITELLM_MASTER_KEY || '',
  };
}

async function proxyRequest(path: string, options: RequestInit = {}): Promise<unknown> {
  const { baseUrl, masterKey } = getConfig();

  if (!masterKey) {
    throw new Error('LITELLM_MASTER_KEY not configured');
  }

  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${masterKey}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LiteLLM API error ${response.status}: ${text}`);
  }

  return response.json();
}

export function createAdminLiteLLMHandlers() {
  async function listModelsHandler(_req: ServerRequest, res: Response) {
    try {
      const data = await proxyRequest('/model/info');
      return res.status(200).json(data);
    } catch (error) {
      logger.error('[adminLiteLLM] listModels error:', error);
      const message = error instanceof Error ? error.message : 'Failed to list models';
      return res.status(502).json({ error: message });
    }
  }

  async function addModelHandler(req: ServerRequest, res: Response) {
    try {
      const { model_name, litellm_params, model_info } = req.body as {
        model_name: string;
        litellm_params: Record<string, unknown>;
        model_info?: Record<string, unknown>;
      };

      if (!model_name || !litellm_params) {
        return res.status(400).json({ error: 'model_name and litellm_params are required' });
      }

      const data = await proxyRequest('/model/new', {
        method: 'POST',
        body: JSON.stringify({ model_name, litellm_params, model_info }),
      });

      logger.info(`[adminLiteLLM] Model added: ${model_name}`);
      return res.status(201).json(data);
    } catch (error) {
      logger.error('[adminLiteLLM] addModel error:', error);
      const message = error instanceof Error ? error.message : 'Failed to add model';
      return res.status(502).json({ error: message });
    }
  }

  async function deleteModelHandler(req: ServerRequest, res: Response) {
    try {
      const { id } = req.params as { id: string };

      if (!id) {
        return res.status(400).json({ error: 'Model ID is required' });
      }

      const data = await proxyRequest('/model/delete', {
        method: 'POST',
        body: JSON.stringify({ id }),
      });

      logger.info(`[adminLiteLLM] Model deleted: ${id}`);
      return res.status(200).json(data);
    } catch (error) {
      logger.error('[adminLiteLLM] deleteModel error:', error);
      const message = error instanceof Error ? error.message : 'Failed to delete model';
      return res.status(502).json({ error: message });
    }
  }

  async function healthHandler(_req: ServerRequest, res: Response) {
    try {
      const data = await proxyRequest('/health');
      return res.status(200).json(data);
    } catch (error) {
      logger.error('[adminLiteLLM] health error:', error);
      const message = error instanceof Error ? error.message : 'LiteLLM unreachable';
      return res.status(502).json({ error: message });
    }
  }

  return {
    listModels: listModelsHandler,
    addModel: addModelHandler,
    deleteModel: deleteModelHandler,
    health: healthHandler,
  };
}
