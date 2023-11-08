const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const amqp = require('amqplib');
const { removeStopwords } = require('stopword');
const { v4: uuidv4 } = require('uuid');

app.use(express.static('public'));
app.use(bodyParser.json());

const rabbitMqUrl = process.env.AMQP_URL; // Replace with your RabbitMQ server
let channel; // We'll use a single channel for sending and receiving messages
const chatHistory = []; // Array to store chat history

// Establish a single connection and channel to RabbitMQ
async function setupRabbitMQConnection() {
  try {
    console.log(`1`);
    const connection = await amqp.connect(rabbitMqUrl);
    console.log(`2`);
    channel = await connection.createChannel();
    console.log(`3`);
    const queueName = 'my-queue-name'; // Replace with the name of your queue
    console.log(`4`);
    await channel.assertQueue(queueName, { durable: false });
    console.log(`5`);

    // Consume messages from the queue
    channel.consume(queueName, (message) => {
      if (message !== null) {
        const messageContent = message.content.toString();
        console.log(`Received message: ${messageContent}`);
        chatHistory.push({ type: 'received', message: messageContent }); // Store received message

        // Acknowledge the message to remove it from the queue
        channel.ack(message);
      }
    });

    console.log('RabbitMQ connection and channel are set up successfully');
  } catch (error) {
    console.error('Error setting up RabbitMQ connection:', error);
  }
}

setupRabbitMQConnection();

// Rest of your code...
