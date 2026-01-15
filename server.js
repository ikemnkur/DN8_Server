// Keep the original comment when rewriting the code:

require('dotenv').config();
const path = require('path');
const cors = require('cors');
const express = require('express');
const db = require('./config/db');
const bcrypt = require('bcryptjs');
// const session = require('express-session');
const bodyParser = require('body-parser');
const geoip = require('geoip-lite');
const moment = require('moment')
const multer = require('multer')
const authRoutes = require('./routes/auth');
const admin = require('./routes/admin');
const adminPurchases = require('./routes/adminPurchases');
const adminWithdraws = require('./routes/adminWithdraws');
const userRoutes = require('./routes/user');
const adminUsers = require('./routes/adminUsers');
const adminReports = require('./routes/adminReports');
// const logs = require('./routes/');
const transactionRoutes = require('./routes/transactions');
const userSubscriptionRoute = require('./routes/user_subscriptions');
const publicSubscriptionRoute = require('./routes/public_subscriptions');
const wallet = require('./routes/wallet');
const searchForUsers = require('./routes/searchForUsers');
const messageRoutes = require('./routes/messages');
const paymentRoutes = require('./routes/paymentRoutes');
const content = require('./routes/content');
const publicContent = require('./routes/public_content');
const userContent = require('./routes/user_content');
const donate = require('./routes/donate');
const subscrybe = require('./routes/subscrybe');
const notifications = require('./routes/notifications');
const crypto = require('./routes/crypto');
const coinbase = require('./routes/coinbase');
const cashapp = require('./routes/cashapp');
const uploadImage = require('./routes/uploadImage');
const { v2: cloudinary } = require('cloudinary');
const adServer = require('./routes/adServer'); // Import the ad server routes
const fileUpload = require('./routes/fileUpload');


const app = express();


// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5000',
      'https://microtrax.netlify.app',
      "https://servers4sqldb.uc.r.appspot.com",
      "https://orca-app-j32vd.ondigitalocean.app",
      "https://monkfish-app-mllt8.ondigitalocean.app/",
      "*"
      // Add any other origins you want to allow
    ];
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));


// // #################################################################################


let LOG_FILE;
let lastRotationCheck = new Date().getUTCDate();

/**
 * Generates a new log filename with a 2026-compliant ISO timestamp.
 */
function getNewLogPath() {
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  return path.join(__dirname, `universal_${timestamp}.log`);
}

/**
 * Checks if the current date has changed and rotates the log file if necessary.
 */
function rotateLogIfNecessary() {
  const currentDay = new Date().getUTCDate();
  if (currentDay !== lastRotationCheck) {
    LOG_FILE = getNewLogPath();
    lastRotationCheck = currentDay;
    // Optional: Log rotation event to the new file
    fs.appendFileSync(LOG_FILE, `--- Log rotated on ${new Date().toISOString()} ---\n`);
  }
}

function overrideConsole() {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  LOG_FILE = getNewLogPath();

  const appendToFile = (level, ...args) => {
    rotateLogIfNecessary();
    
    const message = util.format(...args);
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} [${level.toUpperCase()}]: ${message}\n`;

    // Use asynchronous append to prevent blocking the event loop
    fs.appendFile(LOG_FILE, logEntry, (err) => {
      if (err) originalError('Failed to write to log file:', err);
    });
  };
 // Monkey-patch console.error
  console.log = (...args) => {
    appendToFile('info', ...args);
    originalLog.apply(console, args);// Also call the original console method to display in terminal
  };
 // Monkey-patch console.error
  console.warn = (...args) => {
    appendToFile('warn', ...args);
    originalWarn.apply(console, args);
  };
 // Monkey-patch console.error
  console.error = (...args) => {
    appendToFile('error', ...args);
    originalError.apply(console, args);
  };
}

// Activate the console override immediately
overrideConsole();


// --- Express Endpoints ---

// Log some test messages using the *now-overridden* console methods
console.log("Console logging is now being redirected to the webpage endpoint.");
console.warn("This is a sample warning message!");
console.error("This is a sample error message!");


// ###########################################################
//                    server routes
// ###########################################################

app.use(express.json({ limit: '250mb' }));
app.use(express.urlencoded({ extended: true, limit: '250mb' }));

// Serve static files from public directory
app.use(express.static('public'));

// Request logging middleware with analytics
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  
  // Track visitor IP
  const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
  if (ip) {
    analytics.visitors.add(ip);
  }
  
  // Track total requests
  analytics.totalRequests++;
  
  // Track data received (request size)
  const contentLength = parseInt(req.headers['content-length']) || 0;
  analytics.dataRx += contentLength;
  
  // Track endpoint calls
  const endpoint = `${req.method} ${req.path}`;
  analytics.endpointCalls[endpoint] = (analytics.endpointCalls[endpoint] || 0) + 1;
  
  // Track data transmitted (response size)
  const originalSend = res.send;
  res.send = function(data) {
    if (data) {
      const size = Buffer.byteLength(typeof data === 'string' ? data : JSON.stringify(data));
      analytics.dataTx += size;
    }
    originalSend.call(this, data);
  };
  
  next();
});

// Root route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Endpoint to fetch and display the raw logs
app.get('/log-file', (req, res) => {
  fs.readFile(LOG_FILE, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading log file for endpoint:', err);
      return res.status(500).send('Error reading logs.');
    }
    res.setHeader('Content-Type', 'text/plain');
    res.send(data);
  });
});

// A sample endpoint to generate more log activity
app.get('/generate-activity', (req, res) => {
  console.log(`User accessed /generate-activity endpoint (IP: ${req.ip})`);
  res.send('Activity logged using console.log()! Check your main page.');
});

// Server landing page route
app.get('/server', async (req, res) => {
  try {
    const uptime = process.uptime();
    const uptimeFormatted = {
      days: Math.floor(uptime / 86400),
      hours: Math.floor((uptime % 86400) / 3600),
      minutes: Math.floor((uptime % 3600) / 60),
      seconds: Math.floor(uptime % 60)
    };

    const memoryUsage = process.memoryUsage();
    const memoryFormatted = {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
      external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`
    };

    // Get database stats
    const [dbStats] = await pool.execute('SHOW STATUS LIKE "Threads_connected"');
    const dbConnections = dbStats[0]?.Value || 'N/A';

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Key-Ching Server - Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #333;
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      color: white;
      margin-bottom: 40px;
    }
    .header h1 {
      font-size: 3em;
      margin-bottom: 10px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    }
    .header p {
      font-size: 1.2em;
      opacity: 0.9;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 25px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      transition: transform 0.3s ease;
    }
    .stat-card:hover {
      transform: translateY(-5px);
    }
    .stat-card h3 {
      color: #667eea;
      margin-bottom: 15px;
      font-size: 1.1em;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .stat-value {
      font-size: 2em;
      font-weight: bold;
      color: #333;
      margin: 10px 0;
    }
    .stat-label {
      color: #666;
      font-size: 0.9em;
    }
    .console-box {
      background: #1e1e1e;
      border-radius: 12px;
      padding: 20px;
      color: #d4d4d4;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
      max-height: 400px;
      overflow-y: auto;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }
    .console-box h3 {
      color: #4ec9b0;
      margin-bottom: 15px;
    }
    .log-entry {
      padding: 5px 0;
      border-bottom: 1px solid #333;
    }
    .log-time {
      color: #858585;
    }
    .log-error {
      color: #f48771;
    }
    .log-info {
      color: #4ec9b0;
    }
    .log-warn {
      color: #dcdcaa;
    }
    .status-indicator {
      display: inline-block;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #4caf50;
      animation: pulse 2s infinite;
      margin-right: 8px;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .endpoints {
      background: white;
      border-radius: 12px;
      padding: 25px;
      margin-top: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }
    .endpoints h3 {
      color: #667eea;
      margin-bottom: 15px;
    }
    .endpoint-item {
      padding: 10px;
      margin: 5px 0;
      background: #f5f5f5;
      border-radius: 6px;
      font-family: monospace;
    }
    .method {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-weight: bold;
      margin-right: 10px;
      font-size: 0.85em;
    }
    .get { background: #61affe; color: white; }
    .post { background: #49cc90; color: white; }
    .patch { background: #fca130; color: white; }
    .delete { background: #f93e3e; color: white; }
    .request-count {
      float: right;
      background: #667eea;
      color: white;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 0.85em;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔑 Key-Ching Server</h1>
      <p><span class="status-indicator"></span>Server is running</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <h3>⏱️ Uptime</h3>
        <div class="stat-value">${uptimeFormatted.days}d ${uptimeFormatted.hours}h ${uptimeFormatted.minutes}m</div>
        <div class="stat-label">${Math.floor(uptime)} seconds total</div>
      </div>

      <div class="stat-card">
        <h3>💾 Memory Usage</h3>
        <div class="stat-value">${memoryFormatted.heapUsed}</div>
        <div class="stat-label">Heap: ${memoryFormatted.heapTotal}</div>
      </div>

      <div class="stat-card">
        <h3>🔌 Database</h3>
        <div class="stat-value">${dbConnections}</div>
        <div class="stat-label">Active connections</div>
      </div>

      <div class="stat-card">
        <h3>🌐 Environment</h3>
        <div class="stat-value">${process.env.NODE_ENV || 'development'}</div>
        <div class="stat-label">Port: ${PORT}</div>
      </div>

      <div class="stat-card">
        <h3>👥 Visitors</h3>
        <div class="stat-value">${analytics.visitors.size}</div>
        <div class="stat-label">Unique IP addresses</div>
      </div>

      <div class="stat-card">
        <h3>👤 Users</h3>
        <div class="stat-value">${analytics.users.size}</div>
        <div class="stat-label">Registered accounts accessed</div>
      </div>

      <div class="stat-card">
        <h3>📊 Total Requests</h3>
        <div class="stat-value">${analytics.totalRequests.toLocaleString()}</div>
        <div class="stat-label">Since server start</div>
      </div>

      <div class="stat-card">
        <h3>📤 Data Transmitted</h3>
        <div class="stat-value">${(analytics.dataTx / 1024 / 1024).toFixed(2)} MB</div>
        <div class="stat-label">Total sent: ${(analytics.dataTx / 1024).toFixed(2)} KB</div>
      </div>

      <div class="stat-card">
        <h3>📥 Data Received</h3>
        <div class="stat-value">${(analytics.dataRx / 1024 / 1024).toFixed(2)} MB</div>
        <div class="stat-label">Total received: ${(analytics.dataRx / 1024).toFixed(2)} KB</div>
      </div>
    </div>

    <div class="console-box">
      <h3>📋 Server Console</h3>
      <div id="console-logs">
        <div class="log-entry">
          <span class="log-time">[${new Date().toISOString()}]</span>
          <span class="log-info">INFO:</span> Server started successfully
        </div>
        <div class="log-entry">
          <span class="log-time">[${new Date().toISOString()}]</span>
          <span class="log-info">INFO:</span> Database connection established
        </div>
        <div class="log-entry">
          <span class="log-time">[${new Date().toISOString()}]</span>
          <span class="log-info">INFO:</span> CORS configured for multiple origins
        </div>
      </div>
    </div>

    <div class="endpoints">
      <h3>🛣️ Active API Endpoints</h3>
      ${Object.entries(analytics.endpointCalls)
        .sort((a, b) => b[1] - a[1])
        .map(([endpoint, count]) => {
          const [method, ...pathParts] = endpoint.split(' ');
          const path = pathParts.join(' ');
          const methodClass = method.toLowerCase();
          return `<div class="endpoint-item">
            <span class="method ${methodClass}">${method}</span> ${path}
            <span class="request-count">${count}</span>
          </div>`;
        }).join('')}
    </div>

     <div class="endpoints">
      <h3>🛣️ Available API Endpoints</h3>
      <div class="endpoint-item"><span class="method get">GET</span> /health - Health check</div>
      <div class="endpoint-item"><span class="method post">POST</span> /api/auth/login - User login</div>
      <div class="endpoint-item"><span class="method post">POST</span> /api/auth/register - User registration</div>
      <div class="endpoint-item"><span class="method post">POST</span> /api/auth/logout - User logout</div>
      <div class="endpoint-item"><span class="method get">GET</span> /api/wallet/balance/:username - Get wallet balance</div>
      <div class="endpoint-item"><span class="method post">POST</span> /api/unlock/:keyId - Unlock a key</div>
      <div class="endpoint-item"><span class="method get">GET</span> /api/listings/:username - User listings</div>
      <div class="endpoint-item"><span class="method post">POST</span> /api/create-key - Create new key listing</div>
      <div class="endpoint-item"><span class="method get">GET</span> /api/notifications/:username - Get notifications</div>
      <div class="endpoint-item"><span class="method get">GET</span> /api/purchases/:username - Get purchase history</div>
      <div class="endpoint-item"><span class="method post">POST</span> /api/profile-picture/:username - Upload profile picture</div>
    </div>
  </div>

  <script>
    // Auto-refresh every 30 seconds
    setTimeout(() => location.reload(), 30000);
  </script>
</body>
</html>
    `;

    res.send(html);
  } catch (error) {
    console.error('Landing page error:', error);
    res.status(500).send('<h1>Error loading dashboard</h1>');
  }
});

// Logs viewer route
app.get('/logs', (req, res) => {
  const type = req.query.type || 'all'; // Filter by type: all, info, error, warn
  const limit = parseInt(req.query.limit) || 100;
  
  let filteredLogs = logs.entries;
  if (type !== 'all') {
    filteredLogs = logs.entries.filter(log => log.type === type);
  }
  
  const displayLogs = filteredLogs.slice(-limit).reverse();
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Server Logs - KeyChing</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, monospace;
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 20px;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    .header {
      background: #252526;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      border-left: 4px solid #007acc;
    }
    .header h1 {
      color: #4ec9b0;
      margin-bottom: 10px;
    }
    .stats {
      display: flex;
      gap: 20px;
      font-size: 14px;
    }
    .stat-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .badge {
      padding: 4px 10px;
      border-radius: 12px;
      font-weight: bold;
      font-size: 12px;
    }
    .badge.info { background: #007acc; color: white; }
    .badge.error { background: #f48771; color: white; }
    .badge.warn { background: #dcdcaa; color: #1e1e1e; }
    .badge.all { background: #4ec9b0; color: #1e1e1e; }
    .controls {
      background: #252526;
      padding: 15px 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      display: flex;
      gap: 15px;
      align-items: center;
      flex-wrap: wrap;
    }
    .controls label {
      color: #858585;
      font-size: 14px;
    }
    .controls select,
    .controls input {
      background: #3c3c3c;
      border: 1px solid #555;
      color: #d4d4d4;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 14px;
    }
    .controls button {
      background: #007acc;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.3s;
    }
    .controls button:hover {
      background: #005a9e;
    }
    .controls button.clear {
      background: #f48771;
    }
    .controls button.clear:hover {
      background: #d9534f;
    }
    .log-container {
      background: #252526;
      border-radius: 8px;
      padding: 15px;
      max-height: calc(100vh - 300px);
      overflow-y: auto;
    }
    .log-entry {
      padding: 10px 12px;
      border-left: 3px solid transparent;
      margin-bottom: 8px;
      border-radius: 4px;
      background: #1e1e1e;
      font-family: 'Courier New', monospace;
      font-size: 13px;
      line-height: 1.6;
    }
    .log-entry.info {
      border-left-color: #4ec9b0;
    }
    .log-entry.error {
      border-left-color: #f48771;
      background: #2d1f1f;
    }
    .log-entry.warn {
      border-left-color: #dcdcaa;
      background: #2d2d1f;
    }
    .log-time {
      color: #858585;
      font-size: 11px;
      margin-right: 10px;
    }
    .log-type {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: bold;
      margin-right: 10px;
      text-transform: uppercase;
    }
    .log-type.info { background: #007acc; color: white; }
    .log-type.error { background: #f48771; color: white; }
    .log-type.warn { background: #dcdcaa; color: #1e1e1e; }
    .log-message {
      color: #d4d4d4;
      word-wrap: break-word;
    }
    .no-logs {
      text-align: center;
      padding: 40px;
      color: #858585;
    }
    .auto-refresh {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .auto-refresh input[type="checkbox"] {
      width: 16px;
      height: 16px;
      cursor: pointer;
    }
    .scroll-to-bottom {
      position: fixed;
      bottom: 30px;
      right: 30px;
      background: #007acc;
      color: white;
      border: none;
      padding: 12px 20px;
      border-radius: 50px;
      cursor: pointer;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0, 122, 204, 0.4);
      transition: all 0.3s;
    }
    .scroll-to-bottom:hover {
      background: #005a9e;
      transform: translateY(-2px);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 Server Logs</h1>
      <div class="stats">
        <div class="stat-item">
          <span class="badge all">${logs.entries.length}</span>
          <span>Total Logs</span>
        </div>
        <div class="stat-item">
          <span class="badge info">${logs.entries.filter(l => l.type === 'info').length}</span>
          <span>Info</span>
        </div>
        <div class="stat-item">
          <span class="badge warn">${logs.entries.filter(l => l.type === 'warn').length}</span>
          <span>Warnings</span>
        </div>
        <div class="stat-item">
          <span class="badge error">${logs.entries.filter(l => l.type === 'error').length}</span>
          <span>Errors</span>
        </div>
      </div>
    </div>

    <div class="controls">
      <label>Filter:</label>
      <select id="typeFilter" onchange="filterLogs()">
        <option value="all" ${type === 'all' ? 'selected' : ''}>All Types</option>
        <option value="info" ${type === 'info' ? 'selected' : ''}>Info Only</option>
        <option value="warn" ${type === 'warn' ? 'selected' : ''}>Warnings Only</option>
        <option value="error" ${type === 'error' ? 'selected' : ''}>Errors Only</option>
      </select>
      
      <label>Limit:</label>
      <input type="number" id="limitInput" value="${limit}" min="10" max="500" step="10" onchange="filterLogs()">
      
      <div class="auto-refresh">
        <input type="checkbox" id="autoRefresh" onchange="toggleAutoRefresh()">
        <label for="autoRefresh">Auto-refresh (5s)</label>
      </div>
      
      <button onclick="location.reload()">🔄 Refresh</button>
      <button class="clear" onclick="clearLogs()">🗑️ Clear Logs</button>
      <button onclick="exportLogs()">📥 Export</button>
    </div>

    <div class="log-container" id="logContainer">
      ${displayLogs.length === 0 ? '<div class="no-logs">No logs to display</div>' : displayLogs.map(log => `
        <div class="log-entry ${log.type}">
          <span class="log-time">${new Date(log.timestamp).toLocaleString()}</span>
          <span class="log-type ${log.type}">${log.type}</span>
          <span class="log-message">${escapeHtml(log.message)}</span>
        </div>
      `).join('')}
    </div>

    <button class="scroll-to-bottom" onclick="scrollToBottom()">↓ Scroll to Bottom</button>
  </div>

  <script>
    let autoRefreshInterval = null;

    function filterLogs() {
      const type = document.getElementById('typeFilter').value;
      const limit = document.getElementById('limitInput').value;
      window.location.href = \`/logs?type=\${type}&limit=\${limit}\`;
    }

    function toggleAutoRefresh() {
      const checkbox = document.getElementById('autoRefresh');
      if (checkbox.checked) {
        autoRefreshInterval = setInterval(() => location.reload(), 5000);
      } else {
        if (autoRefreshInterval) {
          clearInterval(autoRefreshInterval);
          autoRefreshInterval = null;
        }
      }
    }

    function scrollToBottom() {
      const container = document.getElementById('logContainer');
      container.scrollTop = container.scrollHeight;
    }

    function clearLogs() {
      if (confirm('Are you sure you want to clear all logs?')) {
        fetch('/api/logs/clear', { method: 'POST' })
          .then(() => location.reload())
          .catch(err => alert('Error clearing logs: ' + err));
      }
    }

    function exportLogs() {
      fetch('/api/logs/export')
        .then(res => res.json())
        .then(data => {
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = \`server-logs-\${new Date().toISOString()}.json\`;
          a.click();
          URL.revokeObjectURL(url);
        })
        .catch(err => alert('Error exporting logs: ' + err));
    }

    // Auto-scroll to bottom on load
    window.addEventListener('load', () => {
      scrollToBottom();
    });
  </script>
</body>
</html>
  `;
  
  function escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
  
  res.send(html);
});

// API endpoint to clear logs
app.post('/api/logs/clear', (req, res) => {
  logs.entries = [];
  res.json({ success: true, message: 'Logs cleared' });
});

// API endpoint to export logs
app.get('/api/logs/export', (req, res) => {
  res.json({
    exportDate: new Date().toISOString(),
    totalLogs: logs.entries.length,
    logs: logs.entries
  });
});

// API endpoint to get logs as JSON
app.get('/api/logs', (req, res) => {
  const type = req.query.type || 'all';
  const limit = parseInt(req.query.limit) || 100;
  
  let filteredLogs = logs.entries;
  if (type !== 'all') {
    filteredLogs = logs.entries.filter(log => log.type === type);
  }
  
  res.json({
    total: filteredLogs.length,
    logs: filteredLogs.slice(-limit).reverse()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  const uptimeSeconds = process.uptime();
  const uptimeFormatted = {
    days: Math.floor(uptimeSeconds / 86400),
    hours: Math.floor((uptimeSeconds % 86400) / 3600),
    minutes: Math.floor((uptimeSeconds % 3600) / 60),
    seconds: Math.floor(uptimeSeconds % 60)
  };

  const memoryUsage = process.memoryUsage();
  const memoryFormatted = {
    rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
    heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
    heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`
  };

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Health Check - Key-Ching Server</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      padding: 40px;
      max-width: 600px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      background: #10b981;
      color: white;
      padding: 12px 24px;
      border-radius: 50px;
      font-weight: bold;
      font-size: 1.2em;
      margin-bottom: 30px;
    }
    .status-indicator {
      width: 12px;
      height: 12px;
      background: white;
      border-radius: 50%;
      margin-right: 10px;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    h1 {
      color: #333;
      margin-bottom: 30px;
      font-size: 2em;
    }
    .info-grid {
      display: grid;
      gap: 20px;
    }
    .info-item {
      background: #f8fafc;
      padding: 20px;
      border-radius: 12px;
      border-left: 4px solid #667eea;
    }
    .info-label {
      color: #64748b;
      font-size: 0.85em;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    .info-value {
      color: #1e293b;
      font-size: 1.3em;
      font-weight: 600;
    }
    .timestamp {
      text-align: center;
      color: #64748b;
      font-size: 0.9em;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="status-badge">
      <span class="status-indicator"></span>
      System Healthy
    </div>
    
    <h1>🔑 Key-Ching Server</h1>
    
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Environment</div>
        <div class="info-value">${process.env.NODE_ENV || 'development'}</div>
      </div>
      
      <div class="info-item">
        <div class="info-label">Server Uptime</div>
        <div class="info-value">${uptimeFormatted.days}d ${uptimeFormatted.hours}h ${uptimeFormatted.minutes}m ${uptimeFormatted.seconds}s</div>
      </div>
      
      <div class="info-item">
        <div class="info-label">Memory Usage</div>
        <div class="info-value">${memoryFormatted.heapUsed} / ${memoryFormatted.heapTotal}</div>
      </div>
      
      <div class="info-item">
        <div class="info-label">Database</div>
        <div class="info-value">Configured (${dbConfig.database})</div>
      </div>
      
      <div class="info-item">
        <div class="info-label">Port</div>
        <div class="info-value">${PORT}</div>
      </div>
    </div>
    
    <div class="timestamp">
      Last checked: ${new Date().toISOString()}
    </div>
  </div>
  
  <script>
    (function() {
      const RELOAD_INTERVAL = 30000;

      function scheduleReload() {
        return setTimeout(() => {
          if (document.visibilityState === 'visible') {
            location.reload();
          }
        }, RELOAD_INTERVAL);
      }

      let reloadTimeoutId = scheduleReload();

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          clearTimeout(reloadTimeoutId);
          reloadTimeoutId = scheduleReload();
        } else {
          clearTimeout(reloadTimeoutId);
        }
      });
    })();
  </script>
</body>
</html>
  `;

  res.send(html);
});


// ============================================
// DATABASE MANAGEMENT ENDPOINTS
// ============================================

// Serve database manager HTML page
app.get('/db-manager', (req, res) => {
  res.sendFile(__dirname + '/public/db-manager.html');
});

// Get database statistics
app.get('/api/db-stats', async (req, res) => {
  try {
    // Get database size
    const [sizeResult] = await pool.execute(`
      SELECT 
        ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb
      FROM information_schema.TABLES 
      WHERE table_schema = ?
    `, [dbConfig.database]);

    // Get total tables
    const [tablesResult] = await pool.execute(`
      SELECT COUNT(*) as count 
      FROM information_schema.TABLES 
      WHERE table_schema = ?
    `, [dbConfig.database]);

    // Get active connections
    const [connectionsResult] = await pool.execute(`
      SELECT COUNT(*) as count 
      FROM information_schema.PROCESSLIST 
      WHERE DB = ?
    `, [dbConfig.database]);

    // Get total records across all tables
    const [allTables] = await pool.execute(`
      SELECT table_name 
      FROM information_schema.TABLES 
      WHERE table_schema = ?
    `, [dbConfig.database]);

    let totalRecords = 0;
    for (const table of allTables) {
      const [countResult] = await pool.execute(`SELECT COUNT(*) as count FROM ${table.table_name}`);
      totalRecords += countResult[0].count;
    }

    // Get table details
    const [tableDetails] = await pool.execute(`
      SELECT 
        table_name,
        table_rows,
        ROUND((data_length + index_length) / 1024 / 1024, 2) AS size_mb,
        engine,
        table_collation
      FROM information_schema.TABLES 
      WHERE table_schema = ?
      ORDER BY table_name
    `, [dbConfig.database]);

    res.json({
      databaseSize: sizeResult[0].size_mb,
      totalTables: tablesResult[0].count,
      activeConnections: connectionsResult[0].count,
      totalRecords: totalRecords,
      tables: tableDetails,
      databaseName: dbConfig.database,
      host: dbConfig.host,
      port: dbConfig.port
    });
  } catch (error) {
    console.error('Database stats error:', error);
    res.status(500).json({ error: 'Failed to retrieve database statistics', message: error.message });
  }
});

// Get list of tables with details
app.get('/api/db-tables', async (req, res) => {
  try {
    const [tables] = await pool.execute(`
      SELECT 
        table_name as name,
        table_rows as rows,
        ROUND((data_length + index_length) / 1024 / 1024, 2) AS size,
        engine,
        create_time,
        update_time
      FROM information_schema.TABLES 
      WHERE table_schema = ?
      ORDER BY table_name
    `, [dbConfig.database]);

    const formattedTables = tables.map(table => ({
      name: table.name,
      rows: table.rows,
      size: `${table.size} MB`,
      engine: table.engine,
      created: table.create_time,
      updated: table.update_time
    }));

    res.json({ tables: formattedTables });
  } catch (error) {
    console.error('Get tables error:', error);
    res.status(500).json({ error: 'Failed to retrieve tables', message: error.message });
  }
});

// Get records from a specific table with pagination and search
app.get('/api/db-records/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const search = req.query.search || '';

    // Validate table name exists
    const [tableCheck] = await pool.execute(`
      SELECT table_name 
      FROM information_schema.TABLES 
      WHERE table_schema = ? AND table_name = ?
    `, [dbConfig.database, tableName]);

    if (tableCheck.length === 0) {
      return res.status(404).json({ error: 'Table not found' });
    }

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM ${tableName}`;
    let dataQuery = `SELECT * FROM ${tableName}`;
    const params = [];

    // Add search filter if provided
    if (search) {
      // Get column names
      const [columns] = await pool.execute(`
        SELECT COLUMN_NAME 
        FROM information_schema.COLUMNS 
        WHERE table_schema = ? AND table_name = ?
      `, [dbConfig.database, tableName]);

      const searchConditions = columns.map(col => `${col.COLUMN_NAME} LIKE ?`).join(' OR ');
      const searchParams = columns.map(() => `%${search}%`);

      countQuery += ` WHERE ${searchConditions}`;
      dataQuery += ` WHERE ${searchConditions}`;
      params.push(...searchParams);
    }

    // Get total count
    const [countResult] = await pool.execute(countQuery, params);
    const total = countResult[0].total;

    // Get records with pagination
    dataQuery += ` LIMIT ? OFFSET ?`;
    const [records] = await pool.execute(dataQuery, [...params, limit, offset]);

    res.json({
      records,
      total,
      limit,
      offset
    });
  } catch (error) {
    console.error('Get records error:', error);
    res.status(500).json({ error: 'Failed to retrieve records', message: error.message });
  }
});

// Execute raw SQL query (SELECT only for safety)
app.post('/api/db-query', async (req, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Only allow SELECT queries for safety
    const trimmedQuery = query.trim().toUpperCase();
    if (!trimmedQuery.startsWith('SELECT') && !trimmedQuery.startsWith('SHOW') && !trimmedQuery.startsWith('DESCRIBE')) {
      return res.status(403).json({ error: 'Only SELECT, SHOW, and DESCRIBE queries are allowed' });
    }

    const [results] = await pool.execute(query);

    res.json({
      success: true,
      results,
      rowCount: results.length
    });
  } catch (error) {
    console.error('Query execution error:', error);
    res.status(500).json({ error: 'Query execution failed', message: error.message });
  }
});


// Enable CORS for all origins and methods
app.use(express.json());

// Data storage for admin page
let pageVisits = [];
let recentRequests = [];
const startTime = Date.now();

// Middleware to track page visits and requests
app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const geo = geoip.lookup(ip);
  const visit = {
    count: pageVisits.length + 1,
    url: req.originalUrl,
    time: new Date().toISOString(),
    ip: ip,
    location: geo ? `${geo.city}, ${geo.country}` : 'Unknown'
  };
  pageVisits.push(visit);

  const request = {
    method: req.method,
    url: req.originalUrl,
    time: new Date().toISOString(),
    ip: ip
  };
  recentRequests.unshift(request);
  if (recentRequests.length > 20) recentRequests.pop();

  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/user-subscriptions', userSubscriptionRoute);
app.use('/api/public-subscriptions', publicSubscriptionRoute);
app.use('/api/wallet', wallet);
app.use('/api/searchForUsers', searchForUsers);
app.use('/api/messages', messageRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/donate', donate);
app.use('/api/subscribe', subscrybe);
app.use('/api/content', content);
app.use('/api/public-content', publicContent);
app.use('/api/user-content', userContent);
app.use('/api/notifications', notifications);
app.use('/api/crypto', crypto);
app.use('/api/coinbase', coinbase);
app.use('/api/cashapp', cashapp);
app.use('/api/admin', admin);
app.use('/api/adminp', adminPurchases);
app.use('/api/adminw', adminWithdraws);
app.use('/api/adminu', adminUsers);
app.use('/api/adminr', adminReports)
app.use('/api/ads/', adServer);
app.use('/api/upload', fileUpload);


// Serve static files from a 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Admin route
app.get('/api/admin', (req, res) => {
  const uptime = Date.now() - startTime;
  res.json({
    pageVisits: pageVisits,
    recentRequests: recentRequests,
    uptime: uptime
  });
});

const notificationsRouter = require('./routes/notifications'); // Adjust path
app.use('/api/notifications', notificationsRouter);

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Root route -- old not needed
// app.get('/adminTemplate', (req, res) => {
//   res.sendFile(path.join(__dirname, 'public', 'admin.html'));
// });

// Admin Dashboard route

app.get('/admin/stats', (req, res) => {
  const uptime = moment.duration(Date.now() - startTime).humanize();
  res.render('admin', { 
    recentRequests: recentRequests, 
    pageVisits: pageVisits, 
    uptime: uptime 
  });
});


// Route to render the admin users page
app.get('/admin/logs', (req, res) => {
  // Add middleware to check if user is admin
  // if (!req.session || !req.session.user || req.session.user.role !== 'admin') {
    // return res.redirect('/login?redirect=/admin/users');
  // }
  const uptime = moment.duration(Date.now() - startTime).humanize();
  res.render('logs', { 
    recentRequests: recentRequests, 
    pageVisits: pageVisits, 
    uptime: uptime 
  });
});

// Admin reports page
app.get('/admin/reports', (req, res) => {
  res.render('reports');
});


// Route to render the admin users page
app.get('/admin/users', (req, res) => {
  // Add middleware to check if user is admin
  // if (!req.session || !req.session.user || req.session.user.role !== 'admin') {
    // return res.redirect('/login?redirect=/admin/users');
  // }
  res.render('admin-users');
});


app.get('/admin', (req, res) => {
  const uptime = moment.duration(Date.now() - startTime).humanize();
  res.render('admin', { 
    recentRequests: recentRequests, 
    pageVisits: pageVisits, 
    uptime: uptime 
  });
});


// Route to render the admin users page
app.get('/admin/logs', (req, res) => {
  // Add middleware to check if user is admin
  // if (!req.session || !req.session.user || req.session.user.role !== 'admin') {
    // return res.redirect('/login?redirect=/admin/users');
  // }
  const uptime = moment.duration(Date.now() - startTime).humanize();
  res.render('logs', { 
    recentRequests: recentRequests, 
    pageVisits: pageVisits, 
    uptime: uptime 
  });
});

// Admin reports page
app.get('/admin/reports', (req, res) => {
  res.render('reports');
});


// Route to render the admin users page
app.get('/admin/users', (req, res) => {
  // Add middleware to check if user is admin
  // if (!req.session || !req.session.user || req.session.user.role !== 'admin') {
    // return res.redirect('/login?redirect=/admin/users');
  // }
  res.render('admin-users');
});

// In your server or route file, e.g. app.js or routes/adminPurchases.js
app.get('/admin/purchases', async (req, res) => {
  try {
    // Example: fetch from your existing DB/API
    // You might pass search, statusFilter, etc. as query params if you want server-side filter
    // const [rows] = await db.query(`
    //   SELECT id, username, amount, status, created_at, reference_id, transactionId, type  
    //   FROM purchases
    //   WHERE created_at >= NOW() - INTERVAL 48 HOUR
    //   ORDER BY created_at DESC
    // `);

    const [rows] = await db.query(`
      SELECT * FROM purchases
      WHERE created_at >= NOW() - INTERVAL 48 HOUR
      ORDER BY created_at DESC
    `);

    // Render the EJS template, passing the purchase data
    res.render('adminPurchases', { purchases: rows });
  } catch (error) {
    console.error('Error fetching purchases:', error);
    return res.status(500).send('Server Error');
  }
});


// In your server or route file, e.g. app.js or routes/adminPurchases.js
app.get('/admin/withdraws', async (req, res) => {
  try {
    // Example: fetch from your existing DB/API
    // You might pass search, statusFilter, etc. as query params if you want server-side filter
    const [rows] = await db.query(`
      SELECT id, username, amount, status, created_at, reference_id, transactionId, method 
      FROM withdraws
      WHERE created_at >= NOW() - INTERVAL 48 HOUR
      ORDER BY created_at DESC
    `);

    // Render the EJS template, passing the purchase data
    res.render('adminWithdraw', { withdraws: rows });
  } catch (error) {
    console.error('Error fetching withdraws:', error);
    return res.status(500).send('Server Error');
  }
});

// In your server or route file, e.g. app.js or routes/adminPurchases.js
app.get('/admin/dashboard', async (req, res) => {
  try {
    // Example: fetch from your existing DB/API
    // You might pass search, statusFilter, etc. as query params if you want server-side filter
    
    // Render the EJS template, passing the purchase data
    res.render('dashboard', { purchases: rows });
  } catch (error) {
    console.error('Error fetching purchases:', error);
    return res.status(500).send('Server Error');
  }
});

// Route to render the admin users page
app.get('/admin/logs', (req, res) => {
  // Add middleware to check if user is admin
  // if (!req.session || !req.session.user || req.session.user.role !== 'admin') {
    // return res.redirect('/login?redirect=/admin/users');
  // }
  const uptime = moment.duration(Date.now() - startTime).humanize();
  res.render('logs', { 
    recentRequests: recentRequests, 
    pageVisits: pageVisits, 
    uptime: uptime 
  });
});

app.get('/admin', (req, res) => {
  const uptime = moment.duration(Date.now() - startTime).humanize();
  res.render('admin', { 
    recentRequests: recentRequests, 
    pageVisits: pageVisits, 
    uptime: uptime 
  });
});


// Route to render the admin users page
app.get('/admin/users', (req, res) => {
  // Add middleware to check if user is admin
  // if (!req.session || !req.session.user || req.session.user.role !== 'admin') {
    // return res.redirect('/login?redirect=/admin/users');
  // }
  res.render('admin-users');
});

const PORT = 5000;
// const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


//  ################  Stripe  #######################

// This is your test secret API key.
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const YOUR_DOMAIN = 'http://localhost:3000';

app.post('/create-checkout-session', async (req, res) => {
  const { amount } = req.query
  console.log("amount: ", amount)

  try {
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      line_items: [
        {
          // Provide the exact Price ID (for example, pr_1234) of the product you want to sell
          price: 'price_1QBf9hEViYxfJNd2lG5GH62D',
          quantity: amount || 1,
        },
      ],
      mode: 'payment',
      return_url: `${YOUR_DOMAIN}/return?session_id={CHECKOUT_SESSION_ID}&amount=${amount}`,
    });

    res.send({ clientSecret: session.client_secret });
  } catch (error) {
    res.send({ error: "Checkout failed." });
  }
});

app.get('/session-status', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.query.session_id);

    // The paymentIntent ID is usually stored in session.payment_intent
    const paymentIntentId = session.payment_intent;

    // Retrieve PaymentIntent for more details, including total amounts & breakdown
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    console.log("PyINT: ", paymentIntent)

    // Extract any relevant data, e.g. charges, amount received, etc.
    // const charge = paymentIntent.charges.data[0]; // If only 1 charge
    const amountReceived = paymentIntent.amount; // in cents
    const receiptUrl = paymentIntent.receipt_url;
    const createAt = paymentIntent.created;
    const clientSecret = paymentIntent.clientSecret;
    const paymentID = paymentIntent.id;
    const paymentStatus = paymentIntent.paymentStatus;

    res.json({
      session,
      paymentIntent,
      status: session.status,
      customer_email: session.customer_details.email,
      receipt_url: receiptUrl,
      amount_received_cents: amountReceived,
      created: createAt,
      clientSecret: clientSecret,
      paymentID: paymentID,
      paymentStatus: paymentStatus,
      // ...any other data you need
    });

  } catch (error) {
    console.log("Error retrieving session status:", error);
    res.status(500).send("Error retrieving session status");
  }
});

// ############################# MULTER IMAGE HANDLER ########################


// Serve static files from profile-images
app.use('/profile-images', express.static(path.join(__dirname, 'profile-images')));

// Multer storage configuration
const ServerLocalStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'profile-images'); // Destination folder (local, optional)
  },
  filename: function (req, file, cb) {
    // Generate a unique filename using username and id
    const username = req.body.username;
    const id = req.body.id;
    const ext = path.extname(file.originalname);
    cb(null, `${username}-${id}-${Date.now()}${ext}`);
  }
});

// File filter to accept only images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb('Error: Images Only!');
  }
};

// Initialize multer
const upload = multer({
  storage: ServerLocalStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});



// ######################## POST PROFILE PIC ###############################

// Endpoint to handle profile picture upload
app.post('/api/upload-profile-picture', upload.single('profilePicture'), async (req, res) => {
  console.log("REQ.FILE:", req.file);
  console.log("REQ.BODY:", req.body);

  const { username, date } = req.body;
  const { userId } = req.body;
  const filePath = req.file.path;


  if (!req.file) {
    return res
      .status(400)
      .json({ message: 'No file uploaded or invalid file type.' });
  }

  // // Use UPDATE when modifying an existing row
  // await db.query(
  //   'UPDATE users SET profilePic = ? WHERE user_id = ?',
  //   [filePath, userId]
  // );

  // 1) Upload to Cloudinary
  const uploadResult = await cloundinaryUpload(req.file.path, userId);
  if (!uploadResult) {
    return res
      .status(500)
      .json({ message: 'Cloudinary upload failed.' });
  }

  // 2) Construct a Cloudinary-based URL instead of local
  const imageUrl = uploadResult.secure_url;

  // (Optional) You could delete the local file if you don't need it anymore:
  // fs.unlink(req.file.path, () => {});

  // You can also save `imageUrl` to your DB if needed

  return res.status(200).json({
    message: 'File uploaded successfully',
    url: imageUrl
  });
});


// ############################# CLOUDNINARY IMAGE TO DB UPLOADER ########################

/**
 * Configure Cloudinary globally (for production, consider using process.env for these values).
 */
cloudinary.config({
  cloud_name: 'dabegwb2z',
  api_key: '464793128734399',
  api_secret: 'yNe3uZ1lgIIeecDqwRzRASq6SMk'
});

/**
 * Upload a local image file to Cloudinary.
 * @param {string} filePath - The local file path (from multer)
 */
const cloundinaryUpload = async (filePath, userId) => {
  try {
    // Upload the actual file from the local file path
    const uploadResult = await cloudinary.uploader.upload(filePath, {
      // Optional transformation parameters, folder naming, etc.
      folder: 'profile_pics',
    });

    console.log('Upload Result:', uploadResult);

    // Use UPDATE when modifying an existing row
    await db.query(
      'UPDATE users SET profilePic = ? WHERE user_id = ?',
      [uploadResult.secure_url, userId]
    );

    return uploadResult;

  } catch (error) {
    console.error('Cloudinary Upload Error:', error);
    return null;
  }
};



//  ################################## EJS #####################################

// Set EJS as templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public')); // For serving static files (CSS, JS)


// Import routes
const adminRoutes = require('./routes/admin');
const { subscribe } = require('diagnostics_channel');
const { Console } = require('console');
const { request } = require('https');
app.use('/admin', adminRoutes);

// ############################# Cron Job ########################

const cron = require('node-cron');


// Enhanced version with logging and error handling
cron.schedule(
  '0 0 * * *',
  async () => {
    const startTime = new Date();
    console.log(`Starting daily deduction job at ${startTime.toISOString()}`);
    
    try {
      // Begin transaction for data consistency
      await db.query('START TRANSACTION');
      
      // Get accounts that can afford the deduction
      const selectQuery = `
        SELECT id, tier, balance, (10 * tier) as daily_deduction
        FROM accounts 
        WHERE balance >= (10 * tier) AND tier > 0
      `;
      const [eligibleAccounts] = await db.query(selectQuery);
      
      if (eligibleAccounts.length === 0) {
        console.log('No accounts eligible for daily deduction');
        await db.query('COMMIT');
        return;
      }
      
      // Apply deductions
      const updateQuery = `
        UPDATE accounts 
        SET balance = balance - (10 * tier),
            last_deduction = NOW()
        WHERE balance >= (10 * tier) AND tier > 0
      `;
      
      const [result] = await db.query(updateQuery);
      
      // Log the deduction details
      const totalDeducted = eligibleAccounts.reduce((sum, account) => sum + account.daily_deduction, 0);
      
      console.log(`Daily deduction completed:`);
      console.log(`- Accounts processed: ${result.affectedRows}`);
      console.log(`- Total amount deducted: ${totalDeducted}`);
      console.log(`- Average deduction per account: ${(totalDeducted / result.affectedRows).toFixed(2)}`);
      
      // Commit transaction
      await db.query('COMMIT');
      
      const endTime = new Date();
      const duration = endTime - startTime;
      console.log(`Daily deduction job completed in ${duration}ms`);
      
    } catch (error) {
      // Rollback on error
      await db.query('ROLLBACK');
      console.error('Error applying daily deduction:', error);
      
      // Optional: Send alert notification
      // await sendAlertNotification('Daily deduction job failed', error.message);
    }
  },
  {
    timezone: 'America/New_York'
  }
);

// email-service.js
const nodemailer = require('nodemailer');

// Configure nodemailer with your SMTP settings
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || 'your-email@example.com',
    pass: process.env.SMTP_PASS || 'your-password'
  }
});

// Send password reset email
async function sendPasswordResetEmail(email, username, newPassword) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Admin System" <admin@example.com>',
      to: email,
      subject: 'Your Password Has Been Reset',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #333;">Password Reset</h2>
          <p>Hello ${username},</p>
          <p>Your password has been reset by an administrator.</p>
          <p>Your new password is: <strong>${newPassword}</strong></p>
          <p>Please login with this password and change it immediately for security reasons.</p>
          <p style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #777;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
}

module.exports = {
  sendPasswordResetEmail
};



// 
//  ##########################  END OF app.JS  #########################
// #########################AD Server Code#####################

