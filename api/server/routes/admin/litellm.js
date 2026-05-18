const express = require('express');
const { createAdminLiteLLMHandlers } = require('@librechat/api');
const { SystemCapabilities } = require('@librechat/data-schemas');
const { requireCapability } = require('~/server/middleware/roles/capabilities');
const { requireJwtAuth } = require('~/server/middleware');

const router = express.Router();

const requireAdminAccess = requireCapability(SystemCapabilities.ACCESS_ADMIN);

const handlers = createAdminLiteLLMHandlers();

router.use(requireJwtAuth, requireAdminAccess);

router.get('/models', handlers.listModels);
router.post('/models', handlers.addModel);
router.delete('/models/:id', handlers.deleteModel);
router.get('/health', handlers.health);

module.exports = router;
