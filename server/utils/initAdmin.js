// Admin Account Initialization Utility
const bcrypt = require('bcryptjs');
const User = require('../models/User');

/**
 * Initializes or updates the system administrator account in MongoDB.
 * Reads credentials securely from server environment variables:
 *  - ADMIN_EMAIL (defaults to 'admin@tripmate.com')
 *  - ADMIN_PASSWORD (defaults to 'admin@tripmate')
 */
const initAdmin = async () => {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@tripmate.com').trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin@tripmate';

    let admin = await User.findOne({ email: adminEmail });

    if (!admin) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);

      admin = await User.create({
        name: 'Administrator',
        email: adminEmail,
        password: hashedPassword,
        homeCountry: 'India',
        preferredCurrency: 'INR',
        role: 'admin'
      });
      console.log(`✅ Default admin account created: ${adminEmail}`);
    } else {
      let updated = false;

      // Ensure role is admin
      if (admin.role !== 'admin') {
        admin.role = 'admin';
        updated = true;
      }

      // Ensure password hash matches configured admin password
      const passwordMatches = await bcrypt.compare(adminPassword, admin.password);
      if (!passwordMatches) {
        const salt = await bcrypt.genSalt(10);
        admin.password = await bcrypt.hash(adminPassword, salt);
        updated = true;
      }

      if (updated) {
        await admin.save();
        console.log(`✅ Admin account privileges verified/updated for: ${adminEmail}`);
      } else {
        console.log(`✅ Admin account verified: ${adminEmail}`);
      }
    }

    return admin;
  } catch (err) {
    console.error('⚠️ Failed to initialize default admin account:', err.message);
    return null;
  }
};

module.exports = initAdmin;
