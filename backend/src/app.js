const path = require('path');
const express = require('express');
const cors = require('cors');

const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const propertiesRoutes = require('./routes/properties.routes');
const leadsRoutes = require('./routes/leads.routes');
const aiRoutes = require('./routes/ai.routes');
const amenitiesRoutes = require('./routes/amenities.routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000' }));
app.use(express.json());
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
