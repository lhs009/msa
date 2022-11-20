/**
 *  file: OrderOchestrator.js
 *  writer: hwansoo.lee
 *  description: Order Serice SAGA
 *
 */
"use strict";

const MessageBrokerQ = require("../lib/MessageBrokerQ");

class OrderOchestrator {
  // private member fields
  #orderQ;
  #productQ;
  #paymentQ;
  #deliveryQ;
  #orderReportCallback;
  // constructor
  constructor(callback) {
    this.#orderReportCallback = callback;
  }

  async init() {
    this.#orderQ = new MessageBrokerQ(
      process.env.MESSAGE_BROKER_HOST,
      process.env.MESSAGE_ORDER_Q
    );
    await this.#orderQ.init();
    this.#productQ = new MessageBrokerQ(
      process.env.MESSAGE_BROKER_HOST,
      process.env.MESSAGE_PRODUCT_Q
    );
    await this.#productQ.init();
    this.#paymentQ = new MessageBrokerQ(
      process.env.MESSAGE_BROKER_HOST,
      process.env.MESSAGE_PAYMENT_Q
    );
    await this.#paymentQ.init();
    this.#deliveryQ = new MessageBrokerQ(
      process.env.MESSAGE_BROKER_HOST,
      process.env.MESSAGE_DELIVERY_Q
    );
    await this.#deliveryQ.init();

    this.#orderQ.waitForMessage(this.#messageHandler);
  }

  // success
  // ORDER_CREATED -> PRODUCT_RESERVED -> PAYMENT_COMPLETED -> DELIVERY_RESERVED

  #messageHandler = async (message) => {
    const jsonMessage = message.toString();
    // console.log(`ORDER ORCHESTRATOR: ${jsonMessage});
    const data = JSON.parse(jsonMessage);
    try {
      const event = data.event;
      console.log(
        `[ORDER ORCHESTRATOR <- ${data.from}]: ${event} - ${data.transactionId}`
      );
      switch (event) {
        case "PRODUCT_RESERVED":
          console.log(
            `[ORDER ORCHESTRATOR -> PAYMENT SERVICE]: ${event} - ${data.transactionId}`
          );
          this.#paymentQ.sendMessage(
            Buffer.from(
              JSON.stringify({
                ...data,
              })
            )
          );
          return;
        case "PAYMENT_COMPLETED":
          console.log(
            `[ORDER ORCHESTRATOR -> DELIVERY SERVICE]: ${event} - ${data.transactionId}`
          );
          this.#deliveryQ.sendMessage(
            Buffer.from(
              JSON.stringify({
                ...data,
              })
            )
          );
          return;
        case "DELIVERY_RESERVED":
          console.log(
            `[ORDER TRANSACITION COMPLETED]: ${event} - ${data.transactionId}`
          );
          this.#orderReportCallback(data.transactionId, "COMPLETED");
          return;
        case "PRODUCT_RESERVE_FAILED":
          this.#orderReportCallback(data.transactionId, "CANCELLED");
          return;
        case "PAYMENT_FAILED":
          this.#notifyRollBack(this.#productQ, "PRODUCT SERVICE", data);
          this.#orderReportCallback(data.transactionId, "CANCELLED");
          return;
        case "DELIVERY_RESERVE_FAILED":
          this.#notifyRollBack(this.#paymentQ, "PAYMENT SERVICE", data);
          this.#notifyRollBack(this.#productQ, "PRODUCT SERVICE", data);
          this.#orderReportCallback(data.transactionId, "CANCELLED");
          return;
        default:
          console.log(`UNKNOWN EVENT: ${jsonMessage}`);
          return;
      }
    } catch (err) {
      console.error(err.message);
    }
  };

  #notifyRollBack = (q, to, data) => {
    console.log(
      `[ORDER OCHESTRATOR -> ${to}]: TRANSACTION_ROLLBACK - ${data.transactionId}`
    );
    if (q)
      q.sendMessage(
        Buffer.from(
          JSON.stringify({
            ...data,
            event: "TRANSACTION_ROLLBACK",
            from: "ORDER OCHESTRATOR",
          })
        )
      );
  };

  createOrder = async (message) => {
    console.log(
      `[ORDER ORCHESTRATOR -> PRODUCT SERVICE]: ${message.event} - ${message.transactionId}`
    );
    this.#productQ.sendMessage(Buffer.from(JSON.stringify(message)));
  };
}

module.exports = OrderOchestrator;
