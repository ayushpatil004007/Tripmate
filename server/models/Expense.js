// Expense Mongoose Model
const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    title: {
      type: String,
      required: [true, 'Please provide expense title'],
      trim: true
    },
    amount: {
      type: Number,
      required: [true, 'Please provide expense amount'],
      min: [0, 'Amount must be a positive number']
    },
    category: {
      type: String,
      required: [true, 'Please select a category'],
      enum: ['Food', 'Travel', 'Hotels', 'Other'],
      default: 'Other'
    },
    date: {
      type: Date,
      default: Date.now
    },
    note: {
      type: String,
      default: '',
      trim: true
    }
  },
  {
    timestamps: true,
    collection: 'expenses'
  }
);

module.exports = mongoose.model('Expense', expenseSchema);
