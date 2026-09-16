import express from 'express';
import cors from 'cors';
import './db.js';
import toursRouter from './routes/tours.js';
import bookingsRouter from './routes/bookings.js';
import usersRouter from './routes/users.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use('/api/tours', toursRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/users', usersRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`GoReady backend listening on http://localhost:${PORT}`);
});
