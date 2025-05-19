const express = require('express');
const path = require('path');
const fs = require('fs');
const { parse } = require('csv-parse'); // Correct import for async parsing
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to serve static files (for CSS, etc.)
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true })); // To parse form data

// Read the CSV file (replace with your CSV file path)
const parseCSV = () => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(path.join(__dirname, 'Music Info.csv'))  // Make sure this path is correct
      .pipe(parse({ columns: true, delimiter: ',' }))
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (err) => {
        console.error("Error reading CSV:", err);
        reject(err);
      });
  });
};

// Home route
app.get('/', async (req, res) => {
  try {
    const data = await parseCSV();
    const genres = Array.from(new Set(data.map(song => song.tags.split(',')[0])));  // Extract unique genres
    res.render('index', { genres });
  } catch (err) {
    console.error("Error loading genres:", err);
    res.status(500).send("Error loading genres");
  }
});

// Show tags based on selected genre
app.post('/tags', async (req, res) => {
  const genre = req.body.genre;
  try {
    const data = await parseCSV();
    const tags = Array.from(new Set(data.filter(song => song.tags.includes(genre)).map(song => song.tags.split(',')[0])));
    res.render('tags', { tags, genre });
  } catch (err) {
    console.error("Error loading tags:", err);
    res.status(500).send("Error loading tags");
  }
});

// Recommend songs based on selected genre and tags
app.post('/recommend', async (req, res) => {
  const { genre, tags } = req.body;
  try {
    // Ensure tags is always an array
    const selectedTags = Array.isArray(tags) ? tags : [tags];
    
    const data = await parseCSV();
    
    // Filter songs based on genre and selected tags
    const filteredSongs = data.filter(song => 
      song.tags.includes(genre) && selectedTags.some(tag => song.tags.includes(tag))
    );

    // Threshold for probability (e.g., 50%)
    const threshold = 0.5;  // You can adjust this number based on your needs

    // Calculate probability and filter songs based on threshold
    const recommendations = filteredSongs
      .map(song => ({
        name: song.name,
        artist: song.artist,
        tags: song.tags,
        spotifyId: song.spotifyId, // Ensure that this column exists in your CSV
        probability: selectedTags.filter(tag => song.tags.includes(tag)).length / selectedTags.length,  // Probability calculation
      }))
      .filter(song => song.probability >= threshold)  // Filter songs below threshold
      .sort((a, b) => b.probability - a.probability);  // Sort by highest probability

    res.render('result', { songs: recommendations });
  } catch (err) {
    console.error("Error recommending songs:", err);
    res.status(500).send("Error recommending songs");
  }
});

// Set the view engine to EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
