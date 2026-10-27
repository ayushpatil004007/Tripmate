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
      required: [true, 'Please describe the activity'],
      trim: true
    },
    time: {
      type: String,
      default: '09:00 AM',
      trim: true
    },
    visitOrder: {
      type: Number,
      default: 1
    },
    notes: {
      type: String,
      default: '',
      trim: true
    }
  },
  {
    timestamps: true,
    collection: 'itineraryitems'
  }
);

module.exports = mongoose.model('ItineraryItem', itineraryItemSchema);
