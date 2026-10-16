const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { requireAuth } = require('./auth');
const { seedIfEmpty } = require('./seed');

seedIfEmpty();

const app = express();
app.set('trust proxy', 1); // behind Render's proxy
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"], imgSrc: ["'self'", 'data:'], formAction: ["'self'"], frameAncestors: ["'none'"] } },
}));
app.use(express.json({ limit: '50kb' }));
app.use(cookieParser());

// CSRF defence in depth: state-changing requests must be same-origin JSON.
app.use('/api', (req, res, next) => {
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
    const o = req.get('origin');
    if (o && new URL(o).host !== req.get('host')) return res.status(403).json({ error: 'Cross-site request blocked.' });
  }
  next();
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/me', require('./routes/me'));
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

// Static portals. The admin/employee HTML is public but holds no data: every byte of data comes from the role-checked API.
app.use(express.static(path.join(__dirname, '..', 'public'), { extensions: ['html'] }));
app.get('/', (req, res) => res.redirect('/login.html'));

app.use((err, req, res, next) => { // eslint-disable-line
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
});

const port = process.env.PORT || 3000;
if (require.main === module) app.listen(port, () => console.log(`Aqua running on http://localhost:${port}`));
module.exports = app;
