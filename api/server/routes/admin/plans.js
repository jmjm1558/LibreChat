const express = require('express');
const { createAdminPlansHandlers } = require('@librechat/api');
const { SystemCapabilities } = require('@librechat/data-schemas');
const { requireCapability } = require('~/server/middleware/roles/capabilities');
const { requireJwtAuth } = require('~/server/middleware');
const db = require('~/models');

const router = express.Router();

const requireAdminAccess = requireCapability(SystemCapabilities.ACCESS_ADMIN);
const requireManageUsers = requireCapability(SystemCapabilities.MANAGE_USERS);

const handlers = createAdminPlansHandlers({
  findUser: db.findUser,
  updateUser: db.updateUser,
  updateBalance: db.updateBalance,
  findBalanceByUser: db.findBalanceByUser,
  getTransactions: db.getTransactions,
});

router.use(requireJwtAuth, requireAdminAccess, requireManageUsers);

router.put('/:id/plan', handlers.assignPlan);
router.post('/:id/balance', handlers.adjustBalance);
router.get('/:id/transactions', handlers.getUserTransactions);
router.get('/:id/balance', handlers.getUserBalance);

module.exports = router;
