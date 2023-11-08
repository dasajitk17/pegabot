const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const amqp = require('amqplib');
const { removeStopwords } = require('stopword');
const { v4: uuidv4 } = require('uuid');

app.use(express.static('public'));
app.use(bodyParser.json());

const rabbitMqUrl = process.env.AMQP_URL;
let channel; // Reuse a single channel for sending and receiving messages

const chatHistory = [];

async function setupRabbitMQConnection() {
  console.log('inside setupRabbitMQConnection');
  try {
    const connection = await amqp.connect(rabbitMqUrl);
    channel = await connection.createChannel();

    const queueName = 'my-queue-name';
    await channel.assertQueue(queueName, { durable: false });

    console.log('RabbitMQ connection and channel are set up successfully');
  } catch (error) {
    console.error('Error setting up RabbitMQ connection:', error);
  }
}

setupRabbitMQConnection();

app.post('/send-message', async (req, res) => {
  try {
    const queueName = 'your-queue-name';
    const message = req.body.message;
    const keywords = extractKeywordsFromQuestion(message);
    console.log(keywords);
    const resultString = '"' + keywords.join('","') + '"';
    console.log(resultString);

    const jsonMessage = {
      uniqueid: uuidv4(),
      question: message,
      contextid: resultString,
    };

    const jsonString = JSON.stringify(jsonMessage);
    console.log(jsonString);

    await channel.assertQueue(queueName, { durable: false });
    channel.sendToQueue(queueName, Buffer.from(jsonString));

    chatHistory.push({ type: 'sent', message });

    console.log(`Message sent to ${queueName}: ${message}`);

    res.status(200).send({ message: 'Message sent successfully' });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).send({ error: 'Error sending message' });
  }
});

app.get('/receive-message', async (req, res) => {
  try {
    const queueName = 'my-queue-name';

    const { message } = await channel.get(queueName, { noAck: true });

    if (message) {
      const messageContent = message.content.toString();
      chatHistory.push({ type: 'received', message: messageContent });
      res.status(200).send({ message: messageContent });
    } else {
      res.status(204).send({ message: 'No messages in the queue' });
    }
  } catch (error) {
    console.error('Error receiving message:', error);
    res.status(500).send({ error: 'Error receiving message' });
  }
});

function extractKeywordsFromQuestion(question) {
  // Implement your logic to extract keywords from the question here
  // You can use libraries or custom logic to analyze the question text and extract relevant keywords.
  // Example keywords
  const originalKeywords = removeStopwords(question.split(' '));//['google', 'ceo'];
  // Generate additional variations of keywords
  const keywordVariations = generateKeywordVariations(originalKeywords);
  // Combine the original keywords with variations
  const allKeywords = [...originalKeywords, ...keywordVariations];
  return allKeywords;
}

function generateKeywordVariations(originalKeywords) {
  const keywordVariations = [];
  // Generate combinations of keywords
  for (let i = 0; i < originalKeywords.length; i++) {
    for (let j = i + 1; j < originalKeywords.length; j++) {
      // Combine two keywords into a variation
      const variation = `${originalKeywords[i]} ${originalKeywords[j]}`;
      keywordVariations.push(variation);
    }
  }

  return keywordVariations;
}


// Endpoint to retrieve chat history
app.get('/chat-history', (req, res) => {
  res.status(200).send(chatHistory);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});


