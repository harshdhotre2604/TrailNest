const path = require('path');
const express = require('express');
const cors = require('cors');
const client = require('prom-client');

const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const propertiesRoutes = require('./routes/properties.routes');
const leadsRoutes = require('./routes/leads.routes');
const aiRoutes = require('./routes/ai.routes');
const amenitiesRoutes = require('./routes/amenities.routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Behind a reverse proxy (nginx on EC2), trust the first hop so express-rate-limit
// keys on the real client IP and req.protocol reflects the original scheme. Left
// off by default so a local run with no proxy can't be spoofed via X-Forwarded-For.
// docker-compose.prod.yml sets TRUST_PROXY=1 on the backend service.
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);
}

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000' }));
app.use(express.json());

// Prometheus metrics. Node process defaults (heap, event-loop lag, GC) plus one
// histogram that gives request rate, error rate and latency per route.
client.collectDefaultMetrics();

const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'API request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
});

app.use((req, res, next) => {
  const end = httpDuration.startTimer();
  res.on('finish', () => {
    // Route pattern (/api/properties/:id), never the raw URL — raw URLs would
    // create a new time series per id and per bot-probed path.
    const route = req.route ? req.baseUrl + req.route.path : 'unmatched';
    end({ method: req.method, route, status: res.statusCode });
  });
  next();
});

// Deliberately not under /api: the ALB only forwards /api/* and /uploads/* to
// the backend, so this isn't reachable from the internet. Prometheus scrapes
// :4000 directly from inside the VPC.
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertiesRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/amenities', amenitiesRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
