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
// const corsOptions = {
//   origin: 'http://localhost:3000', // Replace with your frontend URL
//   credentials: true,
//   optionsSuccessStatus: 200
// };

// const { Storage } = require("@google-cloud/storage");
// const storage = new Storage({
//   projectId: "servers4sqldb",
//   keyFilename: "service-account.json",
// });

// Function to upload file to Firebase Storage
// service-account.json content below - make sure to keep it secure and not expose it publicly
// {
//   "type": "service_account",
//   "project_id": "servers4sqldb",
//   "private_key_id": "2ff49d7f0f81fb5061cf477be6b8cb3ccb7d2003",
//   "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCuJ6d4v6N9H/lx\nF7u6k/4b4mACOZzB6Dycy4V7IQtCqJ6Y93BeQw/qPMEwFq6YBAL0SPb22nAouy2j\nxEjmzmm49STT8U3u0bpTLSZyJu/L58IsYqw8pfhpAX+k8lRahU1rFoz5+WTMRFtG\n6jqsA/xVcepRQpO2yRUwjp4KKHsbPVJ4kbqtcsQZOLVMKciK4iuhsEMnYrNyzX2e\nrKXr/tABMyDW2ludjEvOI7ARMOqmBMNKEJcFiDJccE191Kv6MAw4X7YzGwmOzLgn\nybob/Bs5RaA1CCcrTKczqqGS++09rc+8eCPbX7nk81KcRoJKfyjeRlh+M5i3ejw6\nq50wFCkjAgMBAAECggEAC0xyTotW/tVWDb1wRf9iTd/RbRjcxS3Hz5UFUMLeOVG5\nkbYCmchNs4YuiGv9oXTSgOkXm1X6TyzZngAsNKExSw5zIwxK4JLFvQNhtP02syq9\ni7tOblQxj2pz+WO+ukK0uPJfwhCpNqFmr0KfUi1OBSMcrxnxKGYs/uykbzHyJAb/\n4L76nA0eDyvFpZmdwJLZ4YoTEAH3zi36T3Is/ZVP7G7liBr0evyqo02TGiqC3/2T\n4xo3HmavVsfexOCa+j/bv+tJRWUMMhJpCs88j3ze7yibSxwvws0EJmacCDV+Mg4Z\n/4Q1frXm/9MZuNEKe1Wuygxwr9by3OgyTucalRj+2QKBgQDZxfRe3TI0vyjsNCW2\nOkQPRyzMM1RwM8ycJOGnExJ31sgZ8dTnmsqymiEBlFOJG3UfXc78lOB5GKSk3EMf\n1N4jkLmV+/ZRHDJ2S0Gz+2YbGPhWUSMFrjSUJVSgBR5jSw2sz8sbR5wbU74Rj/Kf\nPHaNAoM3Z1qZACWTicdVFLdfmwKBgQDMuaCtyWJ7NFc0aiK3ibW8UPaHULdNM61U\ntgDL3VSTjCN69T+eyG9GVj8q5VTGDPJ9x4rf70bz7ku1/iNNiW2GXdSEBYMDTPxF\na66qg+zoRX+vzS/y23crARWWDSLn3xRq4KlmcskgPpMjP+GSVOZuvNnaqFho4WIi\nBE6Xl1QpGQKBgBOU9j1VfH87tS1QHxf8s0QAbWnLL8uLDNn5gwTn9SArgwC6Ox+8\nTn+y1kbzFHPesTBp2gPiSzD4Y02jtLF3DaZ7DAUNi/+NHoh+ieDqOSs0mpgAYbrQ\nCFBN7wcYjrv08rzYTnYcgU//vraLkBB7elmBoVTpCT96wOY8XF0tKLQDAoGBAIIk\nGpV/KICDlE/4jFs6SnIM0brRP8Tu7eekzzrJVyN4eXGHh8rrRXlkCEG/iTVhM6Fr\ngMe79tHIEQ7/H/gBPcOl0Bug2Vj2zoNe4aj5tlctHu9ls25hvw5yYQODFEZsFDGg\n4W8D1wENZkGJMV7xY47PtHmAfLsnU1emf0N0aoa5AoGAJyC/00sn/zbkRNG58czR\ncuyCWkDyInMi3JhF+jKFD/3IVFoLFcqoerDlr5MsFn9IxUQ9CLWa/UIDiiZYHJIn\nBfpudiykOeUXBJXS4WNWHIOwedTtPLVXf3YwwmGvZSkttZUXjEw5JeqNanpBpCw6\n7i1UyZNyRvaS6ry2EW5HcfM=\n-----END PRIVATE KEY-----\n",
//   "client_email": "cloutcloinclub@servers4sqldb.iam.gserviceaccount.com",
//   "client_id": "110059448242111104944",
//   "auth_uri": "https://accounts.google.com/o/oauth2/auth",
//   "token_uri": "https://oauth2.googleapis.com/token",
//   "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
//   "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/cloutcloinclub%40servers4sqldb.iam.gserviceaccount.com",
//   "universe_domain": "googleapis.com"
// }


// const uploadToFirebaseStorage = async (filepath, fileName) => {
//     try {
//         const gcs = storage.bucket("bucket_name"); // Removed "gs://" from the bucket name
//         const storagepath = `storage_folder/${fileName}`;
//         const result = await gcs.upload(filepath, {
//             destination: storagepath,
//             predefinedAcl: 'publicRead', // Set the file to be publicly readable
//             metadata: {
//                 contentType: "application/plain", // Adjust the content type as needed
//             }
//         });
//         return result[0].metadata.mediaLink;
//     } catch (error) {
//         console.log(error);
//         throw new Error(error.message);
//     }
// }

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
// Enable CORS for all origins and methods
// app.use(cors()); 
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


// app.use('/api/logs', logs);
// Mount the admin API routes
// app.use('/api/adminp', adminApiRoutes);

// app.use('/api/uploadImage', uploadImage);

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

// In your server or route file, e.g. server.js or routes/adminPurchases.js
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


// In your server or route file, e.g. server.js or routes/adminPurchases.js
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

// In your server or route file, e.g. server.js or routes/adminPurchases.js
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
// const db = require('./config/db'); // adjust the path if needed

// // Schedule the job to run every day at 12:00 AM EST
// cron.schedule(
//   '0 0 * * *',
//   async () => {
//     console.log('Running daily deduction job at 12:00 AM EST');
//     try {
//       // For example, subtract a fixed daily amount (e.g., 10 units) from each user account,
//       // but only if the account has sufficient balance.
//       const query = 'SELECT tier FROM accounts WHERE balance >= ?';
//       const [result] = await db.query(query, [dailyDeduction]);
//       const dailyDeduction = 10*result[0].tier; // Adjust this based on your logic
//       const query2 = 'UPDATE accounts SET balance = balance - ? WHERE balance >= ?';
//       const [result2] = await db.query(query2, [dailyDeduction, dailyDeduction]);
//       console.log(`Daily deduction applied to ${result2.affectedRows} accounts.`);
//     } catch (error) {
//       console.error('Error applying daily deduction:', error);
//     }
//   },
//   {
//     timezone: 'America/New_York'
//   }
// );

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
//  ##########################  END OF SERVER.JS  #########################
// #########################AD Server Code#####################

