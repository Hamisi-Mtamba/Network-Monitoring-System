import express from 'express';
import { receiveHttpSmsWebhook } from '../../controllers/integrations/httpsms.controller.js';

const router = express.Router();

router.post('/httpsms/webhook', receiveHttpSmsWebhook);

export default router;
