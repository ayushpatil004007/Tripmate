// Trip Mongoose Model
const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    title: {
      type: String,
      required: [true, 'Please provide a trip title'],
      trim: true
    },
    destination: {
      type: String,
      required: [true, 'Please provide a destination'],
      trim: true
    },
    startDate: {
      type: Date,
      required: [true, 'Please provide a start date']
    },
    endDate: {
      type: Date,
      required: [true, 'Please provide an end date']
    },
    totalBudget: {
      type: Number,
      default: 0
    },
    dailyBudget: {
      type: Number,
      default: 0
    },
    notes: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['Planned', 'Ongoing', 'Completed'],
      default: 'Planned'
    }
  },
  {
    timestamps: true,
    collection: 'trips'
  }
);

module.exports = mongoose.model('Trip', tripSchema);
