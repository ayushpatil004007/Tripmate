// Authentication & User Preference Routes
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

// Helper to verify active MongoDB connection
const checkDbConnection = (res) => {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({
      success: false,
      message: 'Database service is currently unavailable. Please verify MongoDB is running.'
    });
    return false;
  }
  return true;
};

// Helper function to generate signed JWT token
const generateToken = (userId, name, email, role = 'user') => {
  return jwt.sign(
    { id: userId, name, email, role },
    process.env.JWT_SECRET || 'tripmate_secret_key',
    { expiresIn: '7d' }
  );
};

// @route   POST /api/auth/register
// @desc    Register a new user account with preferences
// @access  Public
router.post('/register', async (req, res) => {
  try {
    if (!checkDbConnection(res)) return;

    const { name, email, password, homeCountry, preferredCurrency, role } = req.body || {};

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    const trimmedEmail = String(email).trim().toLowerCase();
    const trimmedName = String(name).trim();

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: trimmedEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    // Hash the password with bcrypt salt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Determine role (default: 'user')
    const userRole = role === 'admin' ? 'admin' : 'user';

    // Create and save user record
    const newUser = await User.create({
      name: trimmedName,
      email: trimmedEmail,
      password: hashedPassword,
      homeCountry: homeCountry ? String(homeCountry).trim() : 'India',
      preferredCurrency: preferredCurrency ? String(preferredCurrency).trim().toUpperCase() : 'INR',
      role: userRole
    });

    // Issue JWT token
    const token = generateToken(newUser._id, newUser.name, newUser.email, newUser.role);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        homeCountry: newUser.homeCountry,
        preferredCurrency: newUser.preferredCurrency,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }
    res.status(500).json({ success: false, message: 'Server error during registration', error: error.message });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & return JWT token with preferences
// @access  Public
router.post('/login', async (req, res) => {
  try {
    if (!checkDbConnection(res)) return;

    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const trimmedEmail = String(email).trim().toLowerCase();

    // Find user record by email
    const user = await User.findOne({ email: trimmedEmail });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Verify password hash
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Generate token
    const token = generateToken(user._id, user.name, user.email, user.role);

    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        homeCountry: user.homeCountry || 'India',
        preferredCurrency: user.preferredCurrency || 'INR',
        role: user.role || 'user'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login', error: error.message });
  }
});

// @route   GET /api/auth/me
// @desc    Fetch authenticated user profile including preferences
// @access  Private
router.get('/me', authMiddleware, async (req, res) => {
  try {
    if (!checkDbConnection(res)) return;

    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        homeCountry: user.homeCountry || 'India',
        preferredCurrency: user.preferredCurrency || 'INR',
        role: user.role || 'user'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch user', error: error.message });
  }
});

// @route   PUT /api/auth/preferences
// @desc    Update user's home country and preferred currency
// @access  Private
router.put('/preferences', authMiddleware, async (req, res) => {
  try {
    if (!checkDbConnection(res)) return;

    const { homeCountry, preferredCurrency } = req.body || {};

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (homeCountry) user.homeCountry = String(homeCountry).trim();
    if (preferredCurrency) user.preferredCurrency = String(preferredCurrency).trim().toUpperCase();

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Preferences updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        homeCountry: user.homeCountry,
        preferredCurrency: user.preferredCurrency,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update preferences', error: error.message });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update general user profile
// @access  Private
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    if (!checkDbConnection(res)) return;

    const { name, homeCountry, preferredCurrency } = req.body || {};

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = String(name).trim();
    if (homeCountry) user.homeCountry = String(homeCountry).trim();
    if (preferredCurrency) user.preferredCurrency = String(preferredCurrency).trim().toUpperCase();

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        homeCountry: user.homeCountry,
        preferredCurrency: user.preferredCurrency,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update profile', error: error.message });
  }
});

module.exports = router;
