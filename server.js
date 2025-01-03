const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Serve static files from the "public" directory
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});
app.use(express.static(path.join(__dirname, 'public')));

mongoose.connect('mongodb://localhost:27017/signupDB', {
    // useNewUrlParser: true,
    // useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true }, // Prevent duplicate emails
    university: String,
    hometown: String,
    password:String,
});
const bookSchema = new mongoose.Schema({
    bookName: String,
    bookGenre: String,
    bookAuthor: String,
    userEmail: String, // Reference to the user
});

const messageSchema = new mongoose.Schema({
    senderEmail: String,
    receiverEmail: String,
    message: String,
    timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Book = mongoose.model('Book', bookSchema);
const Message = mongoose.model('Message', messageSchema);

app.post('/addBook', async (req, res) => {
    const { bookName, bookGenre, bookAuthor, userEmail } = req.body;

    try {
        const existingBook = await Book.findOne({ bookName, userEmail });
        if (existingBook) {
            return res.status(400).send('Book already exists');
        }

        const newBook = new Book({ bookName, bookGenre, bookAuthor, userEmail });
        await newBook.save();
        res.status(201).send('Book added successfully');
    } catch (error) {
        res.status(500).send('Error adding book');
    }
});
app.post('/signup', async (req, res) => {
    const { name, email, university, hometown, password } = req.body; // Include password

    try {
        const newUser = new User({ name, email, university, hometown, password });
        await newUser.save();
        res.status(201).send('User saved successfully');
    } catch (error) {
        if (error.code === 11000) {
            // Duplicate key error
            res.status(400).send('Email already exists');
        } else {
            res.status(500).send('Error saving user');
        }
    }
});
// Serve the login page
app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email, password });
        if (user) {
            res.status(200).send('Login successful');
        } else {
            res.status(401).send('Invalid email or password');
        }
    } catch (error) {
        res.status(500).send('Error logging in');
    }
});
app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});
// Serve the profile page
app.get('/profile.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

app.get('/searchBook', async (req, res) => {
    const query = req.query.query;

    try {
        const books = await Book.find({
            $or: [
                { bookName: new RegExp(query, 'i') },
                { bookGenre: new RegExp(query, 'i') },
                { bookAuthor: new RegExp(query, 'i') }
            ]
        }).populate('userEmail', 'name university');

        const results = await Promise.all(books.map(async book => {
            const user = await User.findOne({ email: book.userEmail });
            return {
                bookName: book.bookName,
                bookGenre: book.bookGenre,
                bookAuthor: book.bookAuthor,
                ownerName: user.name,
                university: user.university,
                userEmail: book.userEmail // Include userEmail in the response
            };
        }));

        res.status(200).json(results);
    } catch (error) {
        res.status(500).send('Error searching for books');
    }
});
app.get('/addedBooks', async (req, res) => {
    const userEmail = req.query.userEmail;

    try {
        const books = await Book.find({ userEmail });

        res.status(200).json(books);
    } catch (error) {
        res.status(500).send('Error fetching added books');
    }
});

app.delete('/deleteBook', async (req, res) => {
    const { bookName, userEmail } = req.body;

    try {
        const result = await Book.deleteOne({ bookName, userEmail });
        if (result.deletedCount > 0) {
            res.status(200).send('Book deleted successfully');
        } else {
            res.status(404).send('Book not found');
        }
    } catch (error) {
        res.status(500).send('Error deleting book');
    }
});

app.post('/sendMessage', async (req, res) => {
    const { senderEmail, receiverEmail, message } = req.body;

    try {
        const newMessage = new Message({ senderEmail, receiverEmail, message });
        await newMessage.save();
        res.status(201).send('Message sent successfully');
    } catch (error) {
        res.status(500).send('Error sending message');
    }
});

app.get('/getMessages', async (req, res) => {
    const { bookName, userEmail } = req.query;

    try {
        const messages = await Message.find({ receiverEmail: userEmail });
        res.status(200).json(messages);
    } catch (error) {
        res.status(500).send('Error fetching messages');
    }
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});