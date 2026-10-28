// Itinerary Item Mongoose Model
const mongoose = require('mongoose');

const itineraryItemSchema = new mongoose.Schema(
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
    dayNumber: {
      type: Number,
      required: [true, 'Please specify the day number (e.g. 1, 2)'],
      min: 1
    },
    placeName: {
      type: String,
      required: [true, 'Please provide the place name'],
      trim: true
    },
    activity: {
      type: String,
      default: '',
      trim: true
    },
    time: {
      type: String,
      default: '',
      trim: true
    },
    visitOrder: {
      type: Number,
      required: [true, 'Please specify the visit order'],
      default: 1,
      min: 1
    },
    notes: {
      type: String,
      default: '',
      trim: true
    },
    expense: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Expense',
      default: null
    }
  },
  {
    timestamps: true,
    collection: 'itineraryitems'
  }
);

module.exports = mongoose.model('ItineraryItem', itineraryItemSchema);
