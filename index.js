const express = require("express");
const mongoose = require("mongoose");
const timeout = require('connect-timeout');
const app = express();

// Add body-parser middleware for handling JSON data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/client'));

// Add timeout middleware
app.use(timeout('30s'));
app.use((req, res, next) => {
  if (!req.timedout) next();
});

// MongoDB connection - Azure Cosmos DB
const mongoURI = process.env.MONGODB_URI || "mongodb+srv://hanah:Password123!@capstone-cluster.global.mongocluster.cosmos.azure.com/?tls=true&authMechanism=SCRAM-SHA-256&retrywrites=false&maxIdleTimeMS=120000";

// Connect to MongoDB with proper options
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  retryWrites: false,
  maxIdleTimeMS: 30000,
  serverSelectionTimeoutMS: 30000,  // Increased from 5000 to 30000
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000,  // Increased from 10000 to 30000
  heartbeatFrequencyMS: 10000,
  retryReads: true,
  retryWrites: true
})
  .then(() => console.log('Connected to Azure Cosmos DB'))
  .catch(err => {
    console.error('Azure Cosmos DB connection error:', err);
    process.exit(1); // Exit if we can't connect to the database
  });

// Create an Event schema and model
const eventSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  address: { type: String, required: true },
  zipCode: { type: String, required: true },
  time: { type: String, required: true },
  date: { type: String, required: true },
  tags: [{ type: String }]
});

const Event = mongoose.model('Event', eventSchema);

// Create a Tag schema and model
const tagSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }
});

const Tag = mongoose.model('Tag', tagSchema);

const port = process.env.PORT || 3000;

// Route to get all events
app.get('/api/events', async function(request, response) {
  try {
    const { 
      startDate, 
      endDate, 
      zipCode, 
      tags 
    } = request.query;

    // Build filter object
    const filter = {};

    // Date range filter
    if (startDate && endDate) {
      filter.date = {
        $gte: startDate,
        $lte: endDate
      };
    }

    // Zip code filter
    if (zipCode) {
      filter.zipCode = zipCode;
    }

    // Tags filter
    if (tags) {
      const tagArray = tags.split(',');
      filter.tags = { $in: tagArray };
    }

    const events = await Event.find(filter).sort({ date: -1 });
    response.json(events);
  } catch (err) {
    console.error('Error fetching events:', err);
    response.status(500).json({ message: 'Error fetching events' });
  }
});

// Route to get all tags
app.get('/api/tags', async function(request, response) {
  try {
    const tags = await Tag.find().sort({ name: 1 });
    response.json(tags);
  } catch (err) {
    console.error('Error fetching tags:', err);
    response.status(500).json({ message: 'Error fetching tags' });
  }
});

// Route to serve the create event page
app.get('/create-event.html', function(request, response) {
  response.sendFile(__dirname + '/client/create-event.html');
});

// Route to create a new event
app.post('/api/events', async function(request, response) {
  try {
    console.log('Received event creation request:', request.body); // Debug log
    
    // Validate required fields
    const requiredFields = ['name', 'description', 'address', 'zipCode', 'time', 'date'];
    const missingFields = requiredFields.filter(field => !request.body[field]);
    
    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      return response.status(400).json({ 
        message: `Missing required fields: ${missingFields.join(', ')}` 
      });
    }

    const newEvent = new Event({
      name: request.body.name,
      description: request.body.description,
      address: request.body.address,
      zipCode: request.body.zipCode,
      time: request.body.time,
      date: request.body.date,
      tags: request.body.tags || []
    });
    
    console.log('Creating new event:', newEvent); // Debug log
    const savedEvent = await newEvent.save();
    console.log('Event created successfully:', savedEvent); // Debug log
    
    response.status(201).json(savedEvent);
  } catch (err) {
    console.error('Error creating event:', err);
    response.status(500).json({ 
      message: 'Error creating event',
      error: err.message 
    });
  }
});

// Route to create a new tag
app.post('/api/tags', async function(request, response) {
  try {
    const { name } = request.body;
    const existingTag = await Tag.findOne({ name });
    
    if (existingTag) {
      return response.status(400).json({ message: 'Tag already exists' });
    }
    
    const newTag = new Tag({ name });
    const savedTag = await newTag.save();
    response.status(201).json(savedTag);
  } catch (err) {
    console.error('Error creating tag:', err);
    response.status(500).json({ message: 'Error creating tag' });
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

// Add global error handler before app.listen
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

app.listen(port, function() {
  console.log("Server is running at http://localhost:3000/");
});
