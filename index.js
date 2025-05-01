const express = require("express");
const mongoose = require("mongoose");
const app = express();

// Add body-parser middleware for handling JSON data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/client'));

// MongoDB connection - replace with your own connection string
// For local MongoDB: mongodb://localhost:27017/events-db
// For MongoDB Atlas: mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/events-db
const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/events-db";

// Connect to MongoDB
mongoose.connect(mongoURI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Create an Event schema and model
const eventSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  address: { type: String, required: true },
  time: { type: String, required: true },
  date: { type: Date, default: Date.now }
});

const Event = mongoose.model('Event', eventSchema);

const port = process.env.PORT || 3000;

// Route to get all events
app.get('/api/events', async function(request, response) {
  try {
    const events = await Event.find().sort({ date: -1 });
    response.json(events);
  } catch (err) {
    console.error('Error fetching events:', err);
    response.status(500).json({ message: 'Error fetching events' });
  }
});

// Route to serve the create event page
app.get('/create-event.html', function(request, response) {
  response.sendFile(__dirname + '/client/create-event.html');
});

// Route to create a new event
app.post('/api/events', async function(request, response) {
  try {
    const newEvent = new Event({
      name: request.body.name,
      description: request.body.description,
      address: request.body.address,
      time: request.body.time,
      date: new Date()
    });
    
    const savedEvent = await newEvent.save();
    response.status(201).json(savedEvent);
  } catch (err) {
    console.error('Error creating event:', err);
    response.status(500).json({ message: 'Error creating event' });
  }
});

// Route to delete an event
app.delete('/api/events/:id', async function(request, response) {
  try {
    const result = await Event.findByIdAndDelete(request.params.id);
    
    if (!result) {
      return response.status(404).json({ message: 'Event not found' });
    }
    
    response.json({ message: 'Event deleted successfully' });
  } catch (err) {
    console.error('Error deleting event:', err);
    response.status(500).json({ message: 'Error deleting event' });
  }
});

app.get('/test', function(request, response) {
  response.type('text/plain');
  response.send('Node.js and Express running on port='+port);
});

app.listen(port, function() {
  console.log("Server is running at http://localhost:3000/");
});
