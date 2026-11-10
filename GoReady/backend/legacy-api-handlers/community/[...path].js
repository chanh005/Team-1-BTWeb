import express from 'express';
import communityRouter from '../../backend/src/routes/community.js';

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use('/api/community', communityRouter);

export default app;

