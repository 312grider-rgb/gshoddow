const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/ai/chat', async (req, res) => {
    try {
        const { messages, systemPrompt } = req.body;
        
        // Mock response for testing
        const mockResponses = [
            "That's a great question! Let me break it down for you.",
            "The key concept here is understanding the fundamentals.",
            "Think of it as building blocks that work together.",
            "I'd recommend starting with the basics and building up.",
            "You're on the right track! Here's what to focus on."
        ];
        
        const reply = mockResponses[Math.floor(Math.random() * mockResponses.length)];
        res.json({ success: true, reply });
    } catch (error) {
        res.status(500).json({ error: 'AI service error' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
