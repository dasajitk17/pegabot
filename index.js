const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const amqp = require('amqplib');

// Serve static files (HTML, CSS, JS)
app.use(express.static('public'));
app.use(bodyParser.json());

const rabbitMqUrl = process.env.AMQP_URL; // Replace with your RabbitMQ server
let channel; // We'll use a single channel for sending and receiving messages

const chatHistory = []; // Array to store chat history

(async () => {
  const connection = await amqp.connect(rabbitMqUrl);
  channel = await connection.createChannel();

  const queueName = 'my-queue-name'; // Replace with the name of your queue

  // Consume messages from the queue
  await channel.assertQueue(queueName, { durable: false });
  channel.consume(queueName, (message) => {
    if (message !== null) {
      const messageContent = message.content.toString();
      console.log(`Received message: ${messageContent}`);
      chatHistory.push({ type: 'received', message: messageContent }); // Store received message

      // Acknowledge the message to remove it from the queue
      channel.ack(message);
    }
  });
})();

app.post('/send-message', async (req, res) => {
  try {
    const queueName = 'my-queue-name'; // Replace with the name of your queue
    const message = req.body.message;

    const connection = await amqp.connect(rabbitMqUrl);
    const channel = await connection.createChannel();

    await channel.assertQueue(queueName, { durable: false });
    channel.sendToQueue(queueName, Buffer.from(message));

    chatHistory.push({ type: 'sent', message }); // Store sent message

    console.log(`Message sent to ${queueName}: ${message}`);

    res.status(200).send({ message: 'Message sent successfully' });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).send({ error: 'Error sending message' });
  }
});

app.get('/receive-message', async (req, res) => {
  try {
    const queueName = 'my-queue-name'; // Replace with the name of your queue

    const connection = await amqp.connect(rabbitMqUrl);
    const channel = await connection.createChannel();
    
    const { message } = await channel.get(queueName, { noAck: true });

    if (message) {
      const messageContent = message.content.toString();
      chatHistory.push({ type: 'received', message: messageContent }); // Store received message
      res.status(200).send({ message: messageContent });
    } else {
      res.status(204).send({ message: 'No messages in the queue' });
    }
  } catch (error) {
    console.error('Error receiving message:', error);
    res.status(500).send({ error: 'Error receiving message' });
  }
});

// Endpoint to retrieve chat history
app.get('/chat-history', (req, res) => {
  res.status(200).send(chatHistory);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
