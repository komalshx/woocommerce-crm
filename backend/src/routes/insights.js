import { Router } from 'express';
import { wrap } from '../utils/http.js';
import { dashboard, insightsSummary } from '../services/insights.js';

const router = Router();
router.get('/summary', wrap(async (req, res) => res.json(await insightsSummary())));
router.get('/dashboard', wrap(async (req, res) => res.json(await dashboard())));
export default router;
