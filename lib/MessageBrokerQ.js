/**
 *  file: MessageBrokerQ.js
 *  writer: hwansoo.lee
 *  description: Rabbitmq wrapper
 *
 */
"use strict";
const amqp = require("amqplib");

class MessageBrokerQ {
  #url;
  #q;
  #connection;
  #channel;

  constructor(url, qName) {
    this.#q = qName;
    this.#url = url;
  }

  async init() {
    this.#connection = await amqp.connect(this.#url);
    this.#channel = await this.#connection.createChannel();
    await this.#channel.assertQueue(this.#q);
    console.log(`Q created: ${this.#q}`);
  }

  async waitForMessage(callback) {
    this.#channel.consume(this.#q, (message) => {
      this.#channel.ack(message);
      callback(message.content);
    });
  }

  async sendMessage(message) {
    if (!this.#q) return;
    this.#channel.sendToQueue(this.#q, message);
  }

  async release() {
    if (this.#channel) await this.#channel.close();
    if (this.#connection) await this.#connection.close();
  }
}

module.exports = MessageBrokerQ;
