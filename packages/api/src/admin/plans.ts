import { logger, isValidObjectIdString } from '@librechat/data-schemas';
import type { IUser, IBalance, StellarPlan } from '@librechat/data-schemas';
import type { FilterQuery } from 'mongoose';
import type { Response } from 'express';
import type { ServerRequest } from '~/types/http';
import { parsePagination } from './pagination';

const PLAN_TOKENS: Record<StellarPlan, number> = {
  plan_basico: 400_000,
  plan_estandar: 900_000,
  plan_pro: 1_500_000,
  plan_byok: 0,
  plan_pro_byok: 1_500_000,
};

const VALID_PLANS = Object.keys(PLAN_TOKENS) as StellarPlan[];

export interface AdminPlansDeps {
  findUser: (
    criteria: FilterQuery<IUser>,
    fieldsToSelect?: string | string[] | null,
  ) => Promise<IUser | null>;
  updateUser: (userId: string, updateData: Partial<IUser>) => Promise<IUser | null>;
  updateBalance: (params: {
    user: string;
    incrementValue: number;
  }) => Promise<IBalance>;
  findBalanceByUser: (user: string) => Promise<IBalance | null>;
  getTransactions: (filter: Record<string, unknown>) => Promise<unknown[]>;
}

export function createAdminPlansHandlers(deps: AdminPlansDeps) {
  const { findUser, updateUser, updateBalance, findBalanceByUser, getTransactions } = deps;

  async function assignPlanHandler(req: ServerRequest, res: Response) {
    try {
      const { id } = req.params as { id: string };
      const { plan } = req.body as { plan: StellarPlan };

      if (!isValidObjectIdString(id)) {
        return res.status(400).json({ error: 'Invalid user ID format' });
      }

      if (!plan || !VALID_PLANS.includes(plan)) {
        return res.status(400).json({ error: `Invalid plan. Must be one of: ${VALID_PLANS.join(', ')}` });
      }

      const user = await findUser({ _id: id });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      await updateUser(id, { plan });

      const tokens = PLAN_TOKENS[plan];
      let balance: IBalance | null = null;

      if (tokens > 0) {
        balance = await updateBalance({ user: id, incrementValue: tokens });
      } else {
        balance = await findBalanceByUser(id);
      }

      logger.info(`[adminPlans] Plan ${plan} assigned to user ${id}, tokens added: ${tokens}`);

      return res.status(200).json({
        user: id,
        plan,
        tokensAdded: tokens,
        newBalance: balance?.tokenCredits ?? 0,
      });
    } catch (error) {
      logger.error('[adminPlans] assignPlan error:', error);
      return res.status(500).json({ error: 'Failed to assign plan' });
    }
  }

  async function adjustBalanceHandler(req: ServerRequest, res: Response) {
    try {
      const { id } = req.params as { id: string };
      const { amount } = req.body as { amount: number };

      if (!isValidObjectIdString(id)) {
        return res.status(400).json({ error: 'Invalid user ID format' });
      }

      if (typeof amount !== 'number' || isNaN(amount) || amount === 0) {
        return res.status(400).json({ error: 'Amount must be a non-zero number' });
      }

      const user = await findUser({ _id: id });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const balance = await updateBalance({ user: id, incrementValue: amount });

      logger.info(`[adminPlans] Balance adjusted for user ${id}: ${amount > 0 ? '+' : ''}${amount}`);

      return res.status(200).json({
        user: id,
        adjustment: amount,
        newBalance: balance.tokenCredits,
      });
    } catch (error) {
      logger.error('[adminPlans] adjustBalance error:', error);
      return res.status(500).json({ error: 'Failed to adjust balance' });
    }
  }

  async function getUserTransactionsHandler(req: ServerRequest, res: Response) {
    try {
      const { id } = req.params as { id: string };

      if (!isValidObjectIdString(id)) {
        return res.status(400).json({ error: 'Invalid user ID format' });
      }

      const { limit, offset } = parsePagination(req.query as { limit?: string; offset?: string });

      const transactions = await getTransactions({ user: id }) as Array<{
        createdAt?: Date | string;
        [key: string]: unknown;
      }>;
      const sorted = transactions
        .sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt as string).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt as string).getTime() : 0;
          return dateB - dateA;
        })
        .slice(offset, offset + limit);

      return res.status(200).json({
        transactions: sorted,
        total: transactions.length,
        limit,
        offset,
      });
    } catch (error) {
      logger.error('[adminPlans] getUserTransactions error:', error);
      return res.status(500).json({ error: 'Failed to get transactions' });
    }
  }

  async function getUserBalanceHandler(req: ServerRequest, res: Response) {
    try {
      const { id } = req.params as { id: string };

      if (!isValidObjectIdString(id)) {
        return res.status(400).json({ error: 'Invalid user ID format' });
      }

      const balance = await findBalanceByUser(id);

      return res.status(200).json({
        user: id,
        tokenCredits: balance?.tokenCredits ?? 0,
        autoRefillEnabled: balance?.autoRefillEnabled ?? false,
        lastRefill: balance?.lastRefill ?? null,
      });
    } catch (error) {
      logger.error('[adminPlans] getUserBalance error:', error);
      return res.status(500).json({ error: 'Failed to get balance' });
    }
  }

  return {
    assignPlan: assignPlanHandler,
    adjustBalance: adjustBalanceHandler,
    getUserTransactions: getUserTransactionsHandler,
    getUserBalance: getUserBalanceHandler,
  };
}
