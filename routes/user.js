
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('../config/db');
const authenticateToken = require('../middleware/auth');
// const { use } = require('react');

const router = express.Router();


// GET /api/users/search?q=searchterm - Returns array of matching users
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;

    // Validate search query
    if (!q || q.trim().length < 3) {
      return res.status(400).json({
        message: 'Search query must be at least 3 characters long',
        users: []
      });
    }

    const searchTerm = `%${q.trim()}%`;

    // Search users by username, firstName, or lastName
    // Exclude the current user from results
    // Note: Using 'id' instead of 'user_id' for the primary comparison
    const [users] = await db.query(
      `SELECT u.id, u.user_id, u.username, u.firstName, u.lastName, u.bio, u.profilePic,
              CASE 
                WHEN u.last_activity >= DATE_SUB(NOW(), INTERVAL 5 MINUTE) THEN 1 
                ELSE 0 
              END as isOnline
       FROM users u
       WHERE (u.username LIKE ? OR u.firstName LIKE ? OR u.lastName LIKE ?)
       AND u.id != ?
       AND u.accountTier != 0
       ORDER BY 
         CASE 
           WHEN u.username LIKE ? THEN 1
           WHEN u.firstName LIKE ? THEN 2
           WHEN u.lastName LIKE ? THEN 3
           ELSE 4
         END,
         u.username
       LIMIT 20`,
      [
        searchTerm, searchTerm, searchTerm, // For WHERE clause
        req.user.id, // Exclude current user (using 'id' from JWT)
        `${q.trim()}%`, `${q.trim()}%`, `${q.trim()}%` // For ORDER BY (exact matches first)
      ]
    );

    // Format the response
    const formattedUsers = users.map(user => ({
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      bio: user.bio,
      profilePic: user.profilePic,
      isOnline: Boolean(user.isOnline)
    }));

    res.json({
      users: formattedUsers,
      total: formattedUsers.length,
      query: q.trim()
    });

  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({
      message: 'Server error while searching users',
      users: []
    });
  }
});

// FIXED VERSION - Use /validate/:username instead of /:username
router.get('/validate/:username', authenticateToken, async (req, res) => {
  try {
    const { username } = req.params;

    // Validate username parameter
    if (!username || username.trim().length === 0) {
      return res.status(400).json({
        exists: false,
        message: 'Username parameter is required'
      });
    }

    // Check if user exists and is not banned (accountTier 0 = banned)
    const [users] = await db.query(
      `SELECT u.id, u.user_id, u.username, u.firstName, u.lastName, u.bio, u.profilePic, u.accountTier,
              CASE 
                WHEN u.last_activity >= DATE_SUB(NOW(), INTERVAL 5 MINUTE) THEN 1 
                ELSE 0 
              END as isOnline
       FROM users u
       WHERE u.username = ? AND u.accountTier != 0`,
      [username.trim()]
    );

    if (users.length === 0) {
      return res.status(404).json({
        exists: false,
        message: 'User not found or account is banned'
      });
    }

    const user = users[0];

    // Check if it's the same user trying to message themselves
    if (user.id === req.user.id) {
      return res.status(400).json({
        exists: false,
        message: 'You cannot start a conversation with yourself'
      });
    }

    // Return user existence confirmation with basic info
    res.json({
      exists: true,
      user: {
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        bio: user.bio,
        profilePic: user.profilePic,
        isOnline: Boolean(user.isOnline)
      }
    });

  } catch (error) {
    console.error('Error validating user:', error);
    res.status(500).json({
      exists: false,
      message: 'Server error while validating user'
    });
  }
});

// GET /api/users/:username - Returns user existence validation
router.get('/exists/:username', authenticateToken, async (req, res) => {
  try {
    const { username } = req.params;

    // Validate username parameter
    if (!username || username.trim().length === 0) {
      return res.status(400).json({
        exists: false,
        message: 'Username parameter is required'
      });
    }

    // Check if user exists and is not banned (accountTier 0 = banned)
    const [users] = await db.query(
      `SELECT u.id, u.user_id, u.username, u.firstName, u.lastName, u.bio, u.profilePic, u.accountTier,
              CASE 
                WHEN u.last_activity >= DATE_SUB(NOW(), INTERVAL 30 MINUTE) THEN 1 
                ELSE 0 
              END as isOnline
       FROM users u
       WHERE u.username = ? AND u.accountTier != 0`,
      [username.trim()]
    );

    if (users.length === 0) {
      return res.status(404).json({
        exists: false,
        message: 'User not found or account is banned'
      });
    }

    const user = users[0];

    // Check if it's the same user trying to message themselves
    if (user.id === req.user.id) {
      return res.status(400).json({
        exists: false,
        message: 'You cannot start a conversation with yourself'
      });
    }

    // Return user existence confirmation with basic info
    res.json({
      exists: true,
      user: {
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        bio: user.bio,
        profilePic: user.profilePic,
        isOnline: Boolean(user.isOnline)
      }
    });

  } catch (error) {
    console.error('Error validating user:', error);
    res.status(500).json({
      exists: false,
      message: 'Server error while validating user'
    });
  }
});

// Optional: GET /api/users/profile/:username - Get public profile info
router.get('/profile/:username', authenticateToken, async (req, res) => {
  try {
    const { username } = req.params;

    const [users] = await db.query(
      `SELECT u.username, u.firstName, u.lastName, u.bio, u.profilePic, u.accountTier,
              CASE 
                WHEN u.last_activity >= DATE_SUB(NOW(), INTERVAL 30 MINUTE) THEN 1 
                ELSE 0 
              END as isOnline
       FROM users u
       WHERE u.username = ? AND u.accountTier != 0`,
      [username]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = users[0];

    // Return public profile information only
    res.json({
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      bio: user.bio,
      profilePic: user.profilePic,
      isOnline: Boolean(user.isOnline),
      accountTier: user.accountTier
    });

  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const [users] = await db.query(
      `SELECT u.user_id, u.username, u.email, u.user_id, u.firstName, u.lastName, u.phoneNumber, u.birthDate, u.unlocks, u.subscriptions,
       u.accountTier, u.timezone, a.balance, a.spendable, a.redeemable, u.bio, u.encryptionKey, u.account_id, u.profilePic, u.favorites, u.advertising
       FROM users u
       LEFT JOIN accounts a ON u.user_id = a.user_id
       WHERE u.user_id = ?`,
      [req.user.user_id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    let user = users[0];

    // Handle case where user has no favorites yet (null or empty)
    let favoriteUsers = [];

    if (user.favorites) {
      try {
        // Check if favorites is a string (comma-separated) or JSON
        let listOfFavorites;

        if (typeof user.favorites === 'string') {
          // Handle comma-separated string
          if (user.favorites.trim() === '') {
            listOfFavorites = [];
          } else {
            listOfFavorites = user.favorites.split(",").filter(id => id.trim() !== '');
          }
        } else {
          // Handle JSON array
          listOfFavorites = Array.isArray(user.favorites) ? user.favorites : JSON.parse(user.favorites);
        }

        // Only query if there are favorites to look up
        if (listOfFavorites.length > 0) {
          const [favoriteUsersResult] = await db.query(
            `SELECT u.user_id, u.username, u.profilePic, u.bio, u.id
             FROM users u
             WHERE u.id IN (?)`,
            [listOfFavorites]
          );

          favoriteUsers = favoriteUsersResult || [];
        }

      } catch (parseError) {
        console.error('Error parsing favorites:', parseError);
        // If parsing fails, default to empty array
        favoriteUsers = [];
      }
    }

    // Check if the viewed user is in the current user's favorites
    const isFavorite = user.favorites ?
      (typeof user.favorites === 'string' ?
        user.favorites.split(",").includes(req.user.id?.toString()) :
        user.favorites.includes(req.user.id)
      ) : false;

    // Format the favorites for response
    user.favorites = favoriteUsers.map(favUser => ({
      user_id: favUser.user_id,
      username: favUser.username,
      profilePic: favUser.profilePic,
      bio: favUser.bio
    }));

    // Add isFavorite flag if needed
    user.isFavorite = isFavorite;

    res.json(user);

  } catch (error) {
    console.error('Error in /profile route:', error);
    res.status(500).json({
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.put('/account-tier', authenticateToken, async (req, res) => {
  const { accountTier } = req.body;
  try {
    await db.query(
      'UPDATE users SET accountTier = ? WHERE user_id = ?',
      [accountTier, req.user.user_id]
    );
    await db.query(
      'UPDATE accounts SET tier = ? WHERE user_id = ?',
      [accountTier, req.user.user_id]
    );
    await db.query(
      'UPDATE accounts SET spendable = ? WHERE user_id = ?',
      [(accountTier - 1) * 5, req.user.user_id]
    );

    res.json({ message: 'Account tier updated successfully' });
  } catch (error) {
    console.error('Error updating account tier:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/profile', authenticateToken, async (req, res) => {
  const { username, email, firstName, lastName, phoneNumber, birthDate, accountTier, encryptionKey, profilePic, timezone } = req.body;
  console.log("Put.Body: ", req.body);
  try {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Update user information
      if (profilePic != null || !profilePic) {
        await connection.query(
          'UPDATE users SET username = ?, email = ?, firstName = ?, lastName = ?, phoneNumber = ?, birthDate = ?, encryptionKey = ?, accountTier = ?, timezone = ?, profilePic = ? WHERE user_id = ?',
          [username, email, firstName, lastName, phoneNumber, birthDate, encryptionKey, accountTier, timezone, profilePic, req.user.user_id]
        );
      } else {
        //revert to only this is the script fails
        await connection.query(
          'UPDATE users SET username = ?, email = ?, firstName = ?, lastName = ?, phoneNumber = ?, birthDate = ?, encryptionKey = ?, accountTier = ?, timezone = ? WHERE user_id = ?',
          [username, email, firstName, lastName, phoneNumber, birthDate, encryptionKey, accountTier, timezone, req.user.user_id]
        );

      }

      await connection.query(
        'UPDATE accounts SET tier = ? WHERE user_id = ?',
        [accountTier, req.user.user_id]
      );

      console.log()
      await connection.commit();
      res.json({ message: 'Profile updated successfully' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/user-data', authenticateToken, async (req, res) => {
  const { data } = req.body;
  console.log("Put.Body: ", req.body);
  try {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Update user information
      await connection.query(
        'UPDATE users SET data = ? WHERE user_id = ?',
        [data, req.user.user_id]
      );
      console.log()
      await connection.commit();
      res.json({ message: 'User-Data updated successfully' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Fetch user's balance and account ID
router.get('/user-balance', authenticateToken, async (req, res) => {
  try {
    const [account] = await db.query(
      'SELECT balance, spendable, redeemable FROM accounts WHERE user_id = ?',
      [req.user.user_id]
    );
    if (account.length === 0) {
      return res.status(404).json({ message: 'Account not found' });
    }
    res.json({ balance: account[0].balance, spendable: account[0].spendable, redeemable: account[0].redeemable, });
  } catch (error) {
    console.error('Error fetching user balance:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    console.log('User ID from token:', req.user.user_id);
    console.log('req.user:', req.user);


    // Fetch user data along with account ID
    const [userData] = await db.query(
      `SELECT u.user_id AS userId, a.id AS accountId, a.balance, u.accountTier, a.spendable, a.redeemable
       FROM users u
       LEFT JOIN accounts a ON u.user_id = a.user_id
       WHERE u.user_id = ?`,
      [req.user.user_id]
    );
    // console.log('User Data:', userData);

    if (!userData || userData.length === 0) {
      return res.status(404).json({ message: 'User data not found' });
    }

    const id = req.user.user_id;
    // const accountId = req.user.accountId;
    const accountId = req.user.user_id;

    if (!accountId) {
      return res.status(404).json({ message: 'Account ID not found for the user' });
    }

    // Aggregate transaction data
    const [transactions] = await db.query(
      `SELECT
         COUNT(CASE 
               WHEN (sender_account_id = ? OR recipient_account_id = ?) 
                    AND created_at >= NOW() - INTERVAL 1 DAY 
               THEN 1 
             END) AS transactionsLast24Hours,
         COUNT(CASE 
               WHEN (sender_account_id = ? OR recipient_account_id = ?) 
                    AND DATE(created_at) = CURDATE() 
               THEN 1 
             END) AS transactionsToday,
         SUM(CASE 
               WHEN (sender_account_id = ? OR recipient_account_id = ?) 
                    AND DATE(created_at) = CURDATE() 
               THEN amount 
               ELSE 0 
             END) AS totalAmountToday,
         COUNT(CASE 
               WHEN sender_account_id = ? 
                    AND DATE(created_at) = CURDATE() 
               THEN 1 
             END) AS sentTransactions,
         COUNT(CASE 
               WHEN recipient_account_id = ? 
                    AND DATE(created_at) = CURDATE() 
               THEN 1 
             END) AS receivedTransactions,
         SUM(CASE
               WHEN sender_account_id = ? AND created_at >= NOW() - INTERVAL 1 DAY
               THEN amount ELSE 0
             END) AS totalAmountSentLast24Hours,
         SUM(CASE
               WHEN recipient_account_id = ? AND created_at >= NOW() - INTERVAL 1 DAY
               THEN amount ELSE 0
             END) AS totalAmountReceivedLast24Hours,
         SUM(CASE
               WHEN sender_account_id = ? AND DATE(created_at) = CURDATE()
               THEN amount ELSE 0
             END) AS totalAmountSentToday,
         SUM(CASE
               WHEN recipient_account_id = ? AND DATE(created_at) = CURDATE()
               THEN amount ELSE 0
             END) AS totalAmountReceivedToday
       FROM transactions
       WHERE (sender_account_id = ? OR recipient_account_id = ?)`,
      [
        accountId, accountId, // For transactionsLast24Hours
        accountId, accountId, // For transactionsToday
        accountId, accountId, // For totalAmountToday
        accountId,            // For sentTransactions
        accountId,            // For receivedTransactions
        accountId,            // For totalAmountSentLast24Hours
        accountId,            // For totalAmountReceivedLast24Hours
        accountId,            // For totalAmountSentToday
        accountId,            // For totalAmountReceivedToday
        id, id  // For the WHERE clause
      ]
    );
    // console.log('Transactions:', transactions);

    // Define daily limits based on account tier
    const dailyLimits = {
      1: 5,    // Basic
      2: 10,    // Standard
      3: 25,   // Premium
      4: 50,   // Gold
      5: 100,  // Platinum
      6: 200,  // Diamond
      7: 500  // Ultimate
    };

    // Define daily limits based on account tier
    const dailyCoinLimits = {
      1: 100,    // Basic
      2: 500,    // Standard
      3: 1000,   // Premium
      4: 5000,   // Gold
      5: 10000,  // Platinum
      6: 50000,  // Diamond
      7: 100000  // Ultimate
    };

    const dashboardData = {
      balance: userData[0].balance ?? 0,
      spendable: userData[0].spendable ?? 0,
      redeemable: userData[0].redeemable ?? 0,
      accountTier: userData[0].accountTier ?? 1,
      dailyLimit: dailyLimits[userData[0].accountTier] ?? 100, // Default to 100 if not found
      dailyCoinLimit: dailyCoinLimits[userData[0].accountTier] ?? 100, // Default to 100 if not found
      transactionsLast24Hours: transactions[0].transactionsLast24Hours || 0,
      transactionsToday: transactions[0].transactionsToday || 0,
      totalAmountToday: transactions[0].totalAmountToday ? parseFloat(transactions[0].totalAmountToday) : 0,
      sentTransactions: transactions[0].sentTransactions || 0,
      receivedTransactions: transactions[0].receivedTransactions || 0,
      // New fields
      totalAmountSentLast24Hours: transactions[0].totalAmountSentLast24Hours ? parseFloat(transactions[0].totalAmountSentLast24Hours) : 0,
      totalAmountReceivedLast24Hours: transactions[0].totalAmountReceivedLast24Hours ? parseFloat(transactions[0].totalAmountReceivedLast24Hours) : 0,
      totalAmountSentToday: transactions[0].totalAmountSentToday ? parseFloat(transactions[0].totalAmountSentToday) : 0,
      totalAmountReceivedToday: transactions[0].totalAmountReceivedToday ? parseFloat(transactions[0].totalAmountReceivedToday) : 0
    };

    // console.log('Dashboard Data:', dashboardData);
    res.json(dashboardData);
  } catch (error) {
    console.error('Error in dashboard route:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


async function fetchuserprofilebyidorusername(term, req_user_userId, res) {
  let query, params;
  let userIdOrUsername = term;
  let username;
  let mode = "username";
  console.log("fetchuserprofilebyidorusername, term: ", term);
    
  try {

    // Check if the parameter is a numeric userId or a string (username)
    if (/^\d+$/.test(userIdOrUsername) || (userIdOrUsername.length > 24 && userIdOrUsername.charAt(8) === '-')) {
      // It's a userId
      query = `

        SELECT u.user_id, u.username, u.created_at, u.email,
               a.balance, u.accountTier, u.favorites, u.bio,
               u.rating, u.user_id, u.profilePic, last_activity, num_fav, advertising

        FROM users u
        LEFT JOIN accounts a ON u.user_id = a.user_id
        WHERE u.user_id = ?
      `;
      params = [userIdOrUsername];
      mode = "userId";
    } else {
      // It's a username
      // It's a username
      query = `
           SELECT u.user_id, u.username, u.created_at, u.email,
               a.balance, u.accountTier, u.favorites, u.bio,
               u.rating, u.user_id, u.profilePic, last_activity, num_fav, advertising

        FROM users u
        LEFT JOIN accounts a ON u.user_id = a.user_id
        WHERE u.username = ?
      `;
      params = [userIdOrUsername];
      mode = "username";

    }

     if (mode === "username") {
      // Fetch user details, this mean the value userIdOrUsername is actually a username, but i want to use it as a user_id value
      const [user_id] = await db.query(
        'SELECT user_id FROM users WHERE username = ?',
        [userIdOrUsername]
      );

      console.log("UserId provided instead of username, finding id; here is the user_id: ", user_id[0].user_id)
      // the username has been moved to a different variable
      username = userIdOrUsername
      // this is the actual user_id
      userIdOrUsername = user_id[0].user_id
    }

    if (mode === "userId") {
      // Fetch user details
      const [usernameDB] = await db.query(
        'SELECT username FROM users WHERE user_id = ?',
        [userIdOrUsername]
      );

      console.log("UserId provided instead of username, finding id; here is the user_id: ", usernameDB[0].username)
      username = usernameDB[0].username
    }

    // 1) Recalculate the average rating for content this user created
    const [ratingRows] = await db.query(
      'SELECT AVG(rating) AS avgRating FROM content_ratings WHERE user_id = ?',
      [userIdOrUsername]
    );
    const avgRating = ratingRows[0].avgRating || 0;
     const [numofRatings] = await db.query(
      'SELECT COUNT(*) AS numberOfRatings FROM content_ratings WHERE user_id = ? AND rating > 0',
      [userIdOrUsername]
    );
    const numberOfRatings = numofRatings[0].numberOfRatings;

    // 2A) Count how many times like_status = 1 for this user
    const [likes] = await db.query(
      'SELECT COUNT(*) AS numberOfLikes FROM content_ratings WHERE user_id = ? AND like_status = 1',
      [userIdOrUsername]
    );
    const numberOfLikes = likes[0].numberOfLikes;

    const [avgLikes] = await db.query(
      'SELECT AVG(likes) AS avgLikes FROM public_content WHERE host_user_id = ?',
      [userIdOrUsername]
    );

    // 2B) Count how many times dislike_status = 1 for this user
    const [dislikes] = await db.query(
      'SELECT COUNT(*) AS numberOfDislikes FROM content_ratings WHERE user_id = ? AND like_status = -1',
      [userIdOrUsername]
    );
    const numberOfDislikes = dislikes[0].numberOfDislikes;

    const [avgDislike] = await db.query(
      'SELECT AVG(dislikes) AS avgDislikes FROM public_content WHERE host_user_id = ?',
      [userIdOrUsername]
    );

    // 2) Count how many times posts were created by this user
    const [posts] = await db.query(
      'SELECT COUNT(*) AS numberOfPosts FROM public_content WHERE host_user_id = ?',
      [userIdOrUsername]
    );
    const numberOfPosts = posts[0].numberOfPosts;

    // 2) Count how many times posts were unlocked for this user
    const [postsUnlocked] = await db.query(
      'SELECT COUNT(*) AS numberOfPostsUnlocked FROM public_content WHERE host_user_id = ?',
      [userIdOrUsername]
    );
    const [AvgTimesUnlocked] = await db.query(
      'SELECT AVG(unlocks) AS avgUnlocks FROM public_content WHERE host_user_id = ?',
      [userIdOrUsername]
    );
    const avgUnlocks = AvgTimesUnlocked[0].avgUnlocks || 0;

    const numberOfPostsUnlocked = postsUnlocked[0].numberOfPostsUnlocked;

    const totalUnlocks = numberOfPostsUnlocked * avgUnlocks;

    // 2) Count how many times posts were viewed for this user
    const [postsViewed] = await db.query(
      'SELECT COUNT(*) AS numberOfPostsViewed FROM public_content WHERE host_user_id = ?',
      [userIdOrUsername]
    );
    const [AvgTimesViewed] = await db.query(
      'SELECT AVG(views) AS avgViews FROM public_content WHERE host_user_id = ?',
      [userIdOrUsername]
    );
    const avgViews = AvgTimesViewed[0].avgViews || 0;

    const numberOfPostsViewed = postsViewed[0].numberOfPostsViewed;

    const totalViews = Math.ceil(numberOfPostsViewed * avgViews);
    const totalLikes = Math.ceil(numberOfLikes * [avgLikes[0].avgLikes || 1]);
    const totalDislikes = Math.ceil(numberOfDislikes * [avgDislike[0].avgDislikes || 1]);

    console.log("Avg Rating: ", avgRating)
    console.log("Number of Ratings: ", numberOfRatings)
    console.log("Number of Likes: ", numberOfLikes)
    console.log("Number of Dislikes: ", numberOfDislikes)
    console.log("Number of Posts: ", numberOfPosts)
    console.log("Total Unlocks: ", totalUnlocks)
    console.log("Total Views: ", totalViews)
    console.log("Total Likes: ", totalLikes)
    console.log("Total Dislikes: ", totalDislikes)

    // 3) Fetch the user’s main record
    const [users] = await db.query(query, params);
    if (users.length === 0) {
      console.log("User not found");
      // return res.status(404).json({ message: 'User not found' });
      return { message: 'User not found' };
    }


    // Fetch user details - get the favorites of the requester user (viewer)
    const [favorites] = await db.query(
      'SELECT favorites FROM users WHERE user_id = ?',
      [req_user_userId]
    );

    // Fetch user details - get the id of the user whose profile is being viewed
    const [id] = await db.query(
      'SELECT id FROM users WHERE user_id = ?',
      [userIdOrUsername]
    );

    console.log("ID#: ", id[0].id)
    let favs = favorites[0].favorites

    // 4) Add the rating and likes info to the user object
    users[0].avgRating = avgRating;
    users[0].numberOfRatings = numberOfRatings;
    users[0].totalLikes = totalLikes;
    users[0].totalDislikes = totalDislikes;
    users[0].numberOfLikes = numberOfLikes;
    users[0].numberOfDislikes = numberOfDislikes;
    users[0].numberOfPosts = numberOfPosts;
    users[0].totalUnlocks = totalUnlocks;
    users[0].totalViews = totalViews;


    // console.log("Favorites: ", favorites[0].favorites)
    let fav = favorites[0].favorites.replaceAll(" ", '');
    let favoriteList = fav.split(",");
    let favnum = favoriteList.length;
    // console.log("Favorites: ", favnum)

    users[0].numberOfFavorites = favnum;

    // console.log("#Posts: ", favs)

    // Optionally check if user is in the current user's favorites
    const user = users[0];
    const isFavorite = favoriteList.includes(id[0].id.toString());
    //   ? JSON.parse(user.favorites).includes(req.user.user_id)
    //   : false;

    // Remove any sensitive details before sending
    delete user.password;
    delete user.salt;

    return {user, isFavorite };
  } catch (error) {
    console.error(error);
    return { message: 'Server error' };
  }
}



// 1. GET /user/:username/profile - Fetch any user profile by username
router.get('/:username/profile', authenticateToken, async (req, res) => {
  try {

    const { username } = req.params;
    let query, params;
    console.log("get user profile: ", username);

    let { user, isFavorite } = await fetchuserprofilebyidorusername(username, req.user.user_id, res);

    // const [userData] = await db.query(
    //   `SELECT u.user_id, u.username, u.profilePic, u.bio, u.id
    //    FROM users u
    //    WHERE u.username = ?`,
    //   [username]
    // );

    // console.log("User Data: ", userData)

    // let userId = userData[0].user_id

    // // Check if the parameter is a number (userId) or a string (username)

    // // It's a username
    // query = `
    //     SELECT u.user_id, u.username, u.created_at, u.email, u.accountTier, u.favorites, u.bio, u.rating, u.user_id, u.profilePic
    //     FROM users u
    //     LEFT JOIN accounts a ON u.user_id = a.user_id
    //     WHERE u.username = ?
    //   `;
    // params = [username];


    // // 1) Recalculate the average rating for content this user created
    // const [ratingRows] = await db.query(
    //   'SELECT AVG(rating) AS avgRating FROM content_ratings WHERE user_id = ?',
    //   [userId]
    // );
    // const avgRating = ratingRows[0].avgRating || 0;

    // // 2) Count how many times like_status = 1 for this user
    // const [likes] = await db.query(
    //   'SELECT COUNT(*) AS numberOfLikes FROM content_ratings WHERE user_id = ? AND like_status = 1',
    //   [userId]
    // );
    // const numberOfLikes = likes[0].numberOfLikes;

    // // 2) Count how many times like_status = 1 for this user
    // const [posts] = await db.query(
    //   'SELECT COUNT(*) AS numberOfPosts FROM public_content WHERE host_user_id = ?',
    //   [userId]
    // );
    // const numberOfPosts = posts[0].numberOfPosts;

    // // 3) Fetch the user’s main record
    // const [users] = await db.query(query, params);
    // if (users.length === 0) {
    //   return res.status(404).json({ message: 'User not found' });
    // }


    // // Fetch user details
    // const [favorites] = await db.query(
    //   'SELECT favorites FROM users WHERE user_id = ?',
    //   [req.user.user_id]
    // );

    // // Fetch user details
    // const [id] = await db.query(
    //   'SELECT id FROM users WHERE user_id = ?',
    //   [userId]
    // );

    // console.log("ID#: ", id[0].id)
    // let favs = favorites[0].favorites

    // // 4) Add the rating and likes info to the user object
    // users[0].avgRating = avgRating;
    // users[0].numberOfLikes = numberOfLikes;
    // users[0].numberOfPosts = numberOfPosts;
    // // console.log("Favorites: ", favorites[0].favorites)
    // let fav = favorites[0].favorites.replaceAll(" ", '');
    // let favoriteList = fav.split(",");
    // let favnum = favoriteList.length;
    // // console.log("Favorites: ", favnum)
    // users[0].numberOfFavorites = favnum;

    // // console.log("#Posts: ", favs)

    // // Optionally check if user is in the current user's favorites
    // const user = users[0];
    // const isFavorite = favoriteList.includes(id[0].id.toString());
    // //   ? JSON.parse(user.favorites).includes(req.user.user_id)
    // //   : false;

    // // Remove any sensitive details before sending
    // delete user.password;
    // delete user.salt;

    res.json({ ...user, isFavorite });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});



// 1. GET /id/:userIdOrUsername/profile - Fetch other user profile by ID or Username
router.get('/id/:userIdOrUsername/profile', authenticateToken, async (req, res) => {
  try {
    const { userIdOrUsername } = req.params;
    let query, params;

    let { user, isFavorite } = await fetchuserprofilebyidorusername(userIdOrUsername, req.user.user_id, res);

    // // Check if the parameter is a numeric userId or a string (username)
    // if (/^\d+$/.test(userIdOrUsername) || (userIdOrUsername.length > 24 && userIdOrUsername.charAt(8) === '-')) {
    //   // It's a userId
    //   query = `

    //     SELECT u.user_id, u.username, u.created_at, u.email,
    //            a.balance, u.accountTier, u.favorites, u.bio,
    //            u.rating, u.user_id, u.profilePic, last_activity

    //     FROM users u
    //     LEFT JOIN accounts a ON u.user_id = a.user_id
    //     WHERE u.user_id = ?
    //   `;
    //   params = [userIdOrUsername];
    // } else {
    //   // It's a username
    //   // It's a username
    //   query = `
    //     SELECT u.user_id, u.username, u.created_at, u.email, u.accountTier, u.favorites, u.bio, u.rating, u.user_id, u.profilePic, last_activity
    //     FROM users u
    //     LEFT JOIN accounts a ON u.user_id = a.user_id
    //     WHERE u.username = ?
    //   `;
    //   params = [userIdOrUsername];
    // }

    // // 1) Recalculate the average rating for content this user created
    // const [ratingRows] = await db.query(
    //   'SELECT AVG(rating) AS avgRating FROM content_ratings WHERE user_id = ?',
    //   [userIdOrUsername]
    // );
    // const avgRating = ratingRows[0].avgRating || 0;

    // // 2) Count how many times like_status = 1 for this user
    // const [likes] = await db.query(
    //   'SELECT COUNT(*) AS numberOfLikes FROM content_ratings WHERE user_id = ? AND like_status = 1',
    //   [userIdOrUsername]
    // );
    // const numberOfLikes = likes[0].numberOfLikes;

    // // 2) Count how many times dislike_status = 1 for this user
    // const [dislikes] = await db.query(
    //   'SELECT COUNT(*) AS numberOfDislikes FROM content_ratings WHERE user_id = ? AND dislike_status = 1',
    //   [userIdOrUsername]
    // );
    // const numberOfDislikes = dislikes[0].numberOfDislikes;

    // // 2) Count how many times like_status = 1 for this user
    // const [posts] = await db.query(
    //   'SELECT COUNT(*) AS numberOfPosts FROM public_content WHERE host_user_id = ?',
    //   [userIdOrUsername]
    // );
    // const numberOfPosts = posts[0].numberOfPosts;

    //  // 2) Count how many times posts were unlocked for this user
    // const [postsUnlocked] = await db.query(
    //   'SELECT COUNT(*) AS numberOfPostsUnlocked FROM public_content WHERE host_user_id = ?',
    //   [userIdOrUsername]
    // );
    // const [AvgTimesUnlocked] = await db.query(
    //   'SELECT AVG(unlocks) AS avgUnlocks FROM content_ratings WHERE host_user_id = ?',
    //   [userIdOrUsername]
    // );
    // const avgUnlocks = AvgTimesUnlocked[0].avgUnlocks || 0;

    // const numberOfPostsUnlocked = postsUnlocked[0].numberOfPostsUnlocked;

    // const totalUnlocks = numberOfPostsUnlocked * avgUnlocks;

    //   // 2) Count how many times posts were viewed for this user
    // const [postsViewed] = await db.query(
    //   'SELECT COUNT(*) AS numberOfPostsViewed FROM public_content WHERE host_user_id = ?',
    //   [userIdOrUsername]
    // );
    // const [AvgTimesViewed] = await db.query(
    //   'SELECT AVG(views) AS avgViews FROM content_ratings WHERE host_user_id = ?',
    //   [userIdOrUsername]
    // );
    // const avgViews = AvgTimesViewed[0].avgViews || 0;

    // const numberOfPostsViewed = postsViewed[0].numberOfPostsViewed;

    // const totalViews = numberOfPostsViewed * avgViews;



    // // 3) Fetch the user’s main record
    // const [users] = await db.query(query, params);
    // if (users.length === 0) {
    //   return res.status(404).json({ message: 'User not found' });
    // }


    // // Fetch user details
    // const [favorites] = await db.query(
    //   'SELECT favorites FROM users WHERE user_id = ?',
    //   [req.user.user_id]
    // );

    // // Fetch user details
    // const [id] = await db.query(
    //   'SELECT id FROM users WHERE user_id = ?',
    //   [userIdOrUsername]
    // );

    // console.log("ID#: ", id[0].id)
    // let favs = favorites[0].favorites

    // // 4) Add the rating and likes info to the user object
    // users[0].avgRating = avgRating;
    // users[0].numberOfLikes = numberOfLikes;
    // users[0].numberOfDislikes = numberOfDislikes;
    // users[0].numberOfPosts = numberOfPosts;
    // users[0].totalUnlocks = totalUnlocks;
    // users[0].totalViews = totalViews;


    // // console.log("Favorites: ", favorites[0].favorites)
    // let fav = favorites[0].favorites.replaceAll(" ", '');
    // let favoriteList = fav.split(",");
    // let favnum = favoriteList.length;
    // // console.log("Favorites: ", favnum)

    // users[0].numberOfFavorites = favnum;

    // // console.log("#Posts: ", favs)

    // // Optionally check if user is in the current user's favorites
    // const user = users[0];
    // const isFavorite = favoriteList.includes(id[0].id.toString());
    // //   ? JSON.parse(user.favorites).includes(req.user.user_id)
    // //   : false;

    // // Remove any sensitive details before sending
    // delete user.password;
    // delete user.salt;

    res.json({ ...user, isFavorite });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add rating
router.post('/add-rating', authenticateToken, async (req, res) => {
  const { rateduserId, rating, user_id } = req.body;
  try {
    // Update the average rating
    await db.query(
      'INSERT INTO user_ratings (rated_user_id, user_id, rating) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE rating = ?',
      [rateduserId, req.user.user_id, rating]
    );
    console.log("Rating Posted: ", rating)
    // Recalculate the average rating
    const [rows] = await db.query(
      'SELECT AVG(rating) as avgRating FROM content_ratings WHERE content_id = ?',
      [rateduserId]
    );
    const avgRating = rows[0].avgRating;

    await db.query(
      'UPDATE users SET rating = ? WHERE id = ?',
      [avgRating, rateduserId]
    );

    res.status(200).json({ message: 'Rating submitted', avgRating });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// 2. PUT /user/:userId/favorite - Update favorite status
router.put('/:userId/favorite', authenticateToken, async (req, res) => {
  // const { userId, isFavorite, user } = req.body;
  // const favoriteUserId = req.params.userId;
  // console.log("(FAV REQ) User ID: ", user.user_id);
  // console.log("userId: ", userId);

  console.log("FAV REQ");

  const { isFavorite } = req.body;
  // const favoriteUserId = req.params.userId; // user_id being favorited/unfavorited
  console.log("Params: ", req.params);
  console.log("Req.user : ", req.user);
  const currentUserId = req.user.user_id; // Current authenticated user's user_id

  const favoriteUsername = req.params.username || req.params.userId; // username being favorited/unfavorited
  let favorites = [];


  console.log("(FAV REQ) Current User ID: ", currentUserId);
  // (FAV REQ) Current User ID:  123ds435-897c-4d96-822c-118a4cc899c8
  console.log("Target Username to favorite/unfavorite: ", favoriteUsername);
  // Example output: Target Username to favorite/unfavorite:  user1

  let query, params;


  const [userData] = await db.query(
    `SELECT u.user_id, u.username, u.profilePic, u.bio, u.id
       FROM users u
       WHERE u.username = ?`,
    [favoriteUsername]
  );

  const favoriteUserId = userData[0]?.user_id; // user_id being favorited/unfavorited
  console.log("favoriteUserId : ", favoriteUserId);
  console.log("Favorite Username: ", favoriteUsername);
  console.log("Favorite User Data: ", userData)
  let fav_str = "";
  // example:
  //   User Data:  [
  //   {
  //     user_id: '4aa87961-8b51-4a89-94ff-a747f69d5071',
  //     username: 'user1',
  //     profilePic: 'https://res.cloudinary.com/dabegwb2z/image/upload/v1735462041/profile_pics/hi2ssghycopjjosbncnx.jpg',
  //     bio: 'dumb fast money'
  //   }
  // ]

  try {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Get current user's favorites
      // Fetch user details
      // Fetch user details
      const [id] = await db.query(
        'SELECT id FROM users WHERE user_id = ?',
        [userData[0].user_id]
      );
      // console.log("ID#: ", id)
      // console.log("ID#: ", id[0].id)
      const [favoritesObj] = await db.query(
        'SELECT favorites FROM users WHERE user_id = ?',
        [req.user.user_id]
      );
      let fav = favoritesObj[0].favorites.replaceAll(" ", '');
      favorites = fav.split(",");
      let favnum = favorites.length;
      // console.log("Favorites: ", favorites);
      // console.log("Number of Favorites: ", favnum);
      /// let favorites = user.favorites ? JSON.parse(user.favorites) : [];

      if (isFavorite) {
        // Add to favorites if not already present
        if (!favorites.includes(id[0].id)) {
          if (favorites[0] === "") {
            favorites[0] = id[0].id;
          } else {
            favorites.push(id[0].id);
          }
          fav_str = JSON.stringify(favorites);
          fav_str = fav_str.replaceAll(" ", '');
          fav_str = fav_str.replaceAll("[", '');
          fav_str = fav_str.replaceAll("]", '');
          fav_str = fav_str.replaceAll('"', '');
          // favorites_string:  \\\\\\\\\13\\\\\\\\\,\\\\\\\\\11\\\\\\\\\,\\\\\\\\\21\\\\\\\\\,\\\\\\\\\19\\\\\\\\\,\8\,\13\,21
          fav_str = fav_str.replaceAll('\\', '');
          fav_str = fav_str.replaceAll('\\\\\\', '\\');
          console.log("favorites_string: ", fav_str);
          // console.log("favorites_string: ", favorites);
          const num_of_fav = favorites.length;
          console.log("number_of_favorites_received: ", num_of_fav);

          // Update list of favorites for the current user
          await connection.query('UPDATE users SET favorites = ? WHERE user_id = ?',
            [fav_str, req.user.user_id]);

          // Update favorites count by 1 for the user receiving "favorited or liked" status
          // FIXED: Use the same connection object, not db
          await connection.query('UPDATE users SET num_fav = num_fav + ? WHERE user_id = ?',
            [1, favoriteUserId]);
        }
      } else {
        // Remove from favorites
        // Update favorites count by -1 for the user losing "favorited or liked" status
        // FIXED: Use the same connection object, not db
        await connection.query('UPDATE users SET num_fav = num_fav - ? WHERE user_id = ?',
          [1, favoriteUserId]);

        favorites = favorites.filter(id => id !== userData[0].id);

        // FIXED: Missing update to favorites after removal
        const fav_str = JSON.stringify(favorites);
        await connection.query('UPDATE users SET favorites = ? WHERE user_id = ?',
          [fav_str, req.user.user_id]);
      }

      await connection.commit();
      res.json({
        message: isFavorite ? 'User added to favorites' : 'User removed from favorites',
        favorites: favorites
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// // PUT /user/:userId/favorite - Update favorite status
// router.put('/:userId/favorite2', authenticateToken, async (req, res) => {

//   console.log("FAV REQ");

//   const { isFavorite } = req.body;
//   // const favoriteUserId = req.params.userId; // user_id being favorited/unfavorited
//   console.log("Params: ", req.params);
//   console.log("Req.user : ", req.user);
//   const currentUserId = req.user.user_id; // Current authenticated user's user_id

//   const favoriteUsername = req.params.username || req.params.userId; // username being favorited/unfavorited



//   console.log("(FAV REQ) Current User ID: ", currentUserId);
//   // (FAV REQ) Current User ID:  123ds435-897c-4d96-822c-118a4cc899c8
//   console.log("Target Username to favorite/unfavorite: ", favoriteUsername);
//   // Example output: Target Username to favorite/unfavorite:  user1

//   let query, params;


//   const [userData] = await db.query(
//     `SELECT u.user_id, u.username, u.profilePic, u.bio, u.id
//        FROM users u
//        WHERE u.username = ?`,
//     [favoriteUsername]
//   );

//   const favoriteUserId = userData[0]?.user_id; // user_id being favorited/unfavorited
//   console.log("favoriteUserId : ", favoriteUserId);
//   console.log("Favorite Username: ", favoriteUsername);
//   console.log("Favorite User Data: ", userData)
//   // example:
//   //   User Data:  [
//   //   {
//   //     user_id: '4aa87961-8b51-4a89-94ff-a747f69d5071',
//   //     username: 'user1',
//   //     profilePic: 'https://res.cloudinary.com/dabegwb2z/image/upload/v1735462041/profile_pics/hi2ssghycopjjosbncnx.jpg',
//   //     bio: 'dumb fast money'
//   //   }
//   // ]

//   try {
//     const connection = await db.getConnection();
//     await connection.beginTransaction();

//     try {

//       // Verify that the target user exists
//       const [targetUserResult] = await connection.query(
//         'SELECT user_id FROM users WHERE user_id = ?',
//         [favoriteUserId]
//       );

//       if (!targetUserResult || targetUserResult.length === 0) {
//         await connection.rollback();
//         return res.status(404).json({ message: 'Target user not found' });
//       }

//       // Prevent users from favoriting themselves
//       if (currentUserId === favoriteUserId) {
//         await connection.rollback();
//         return res.status(400).json({ message: 'Cannot favorite yourself' });
//       }

//       if (isFavorite) {
//         // Add to favorites - use INSERT IGNORE to prevent duplicate key errors
//         const [insertResult] = await connection.query(
//           'INSERT IGNORE INTO favorites (user_id, favorite_user_id) VALUES (?, ?)',
//           [currentUserId, favoriteUserId]
//         );

//         // Check if a new row was actually inserted
//         if (insertResult.affectedRows > 0) {
//           // Increment the num_fav count for the user being favorited
//           await connection.query(
//             'UPDATE users SET num_fav = num_fav + 1 WHERE user_id = ?',
//             [favoriteUserId]
//           );
//           console.log(`Added user ${favoriteUserId} to favorites for user ${currentUserId}`);
//         } else {
//           console.log(`User ${favoriteUserId} already in favorites for user ${currentUserId}`);
//         }

//       } else {
//         // Remove from favorites
//         const [deleteResult] = await connection.query(
//           'DELETE FROM favorites WHERE user_id = ? AND favorite_user_id = ?',
//           [currentUserId, favoriteUserId]
//         );

//         // Check if a row was actually deleted
//         if (deleteResult.affectedRows > 0) {
//           // Decrement the num_fav count for the user being unfavorited
//           await connection.query(
//             'UPDATE users SET num_fav = GREATEST(num_fav - 1, 0) WHERE user_id = ?',
//             [favoriteUserId]
//           );
//           console.log(`Removed user ${favoriteUserId} from favorites for user ${currentUserId}`);
//         } else {
//           console.log(`User ${favoriteUserId} was not in favorites for user ${currentUserId}`);
//         }
//       }

//       // Get updated favorites list for response
//       const [favoritesResult] = await connection.query(
//         'SELECT favorite_user_id FROM favorites WHERE user_id = ? ORDER BY created_at DESC',
//         [currentUserId]
//       );

//       const favoritesList = favoritesResult.map(row => row.favorite_user_id);

//       // Get updated num_fav count for the target user
//       const [numFavResult] = await connection.query(
//         'SELECT num_fav FROM users WHERE user_id = ?',
//         [favoriteUserId]
//       );

//       await connection.commit();

//       res.json({
//         success: true,
//         message: isFavorite ? 'User added to favorites' : 'User removed from favorites',
//         currentUserFavorites: favoritesList,
//         targetUserFavoriteCount: numFavResult[0]?.num_fav || 0,
//         isFavorite: favoritesList.includes(favoriteUserId)
//       });

//     } catch (error) {
//       await connection.rollback();
//       throw error;
//     } finally {
//       connection.release();
//     }
//   } catch (error) {
//     console.error('Favorites endpoint error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error',
//       error: error.message
//     });
//   }
// });


// 3. POST /user/:userId/report - Submit a report
router.post('/:userId/report', authenticateToken, async (req, res) => {
  const { reportMessage, reportedUser, reportingUser } = req.body;
  const reportedUserId = req.params.userId;

  try {
    await db.query(
      'INSERT INTO user_reports (reporter_id, reported_user_id, report_message, reportedUsername, reportingUsername) VALUES (?, ?, ?, ?, ?)',
      [req.user.user_id, reportedUserId, reportMessage, reportedUser, reportingUser]
    );

    res.status(201).json({ message: 'Report submitted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// 3. POST /user/:userId/report - Submit a report

router.post('/:username/report', authenticateToken, async (req, res) => {
  const { reportMessage } = req.body;
  const reportedUsername = req.params.username;

  try {
    await db.query(
      'INSERT INTO user_reports (reporter_id, reported_user_id, report_message, reportedUsername, reportingUsername) VALUES (?, ?, ?, ?, ?)',
      [req.user.user_id, reportedUserId, reportMessage, reportedUser, reportingUser]
    );

    res.status(201).json({ message: 'Report submitted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// 3. POST /user/:userId/report - Submit a report
router.post('/:username/report', authenticateToken, async (req, res) => {
  const { reportMessage } = req.body;
  const reportedUsername = req.params.username;

  try {
    await db.query(
      'INSERT INTO user_reports (reporter_id, reported_user_id, report_message) VALUES (?, ?, ?)',
      [req.user.user_id, reportedUserId, reportMessage]
    );

    res.status(201).json({ message: 'Report submitted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;