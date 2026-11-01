import express from 'express';
import { receiveSelcomWebhook } from '../../controllers/integrations/selcom.controller.js';
const router = express.Router();
router.post('/selcom/webhook',receiveSelcomWebhook);
export default router;
