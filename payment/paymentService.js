/**
 *  file: paymentService.js
 *  writer: hwansoo.lee
 *  description: payment service example
 *
 */
const express = require("express");
const cors = require("cors");
const app = express();
// const { execQuery, execTransaction } = require("../lib/mysqlUtil");
const MessageBrokerQ = require("../lib/MessageBrokerQ");
const { put, get } = require("../lib/dynamoUtil");
const { getYYYYMMDDHHMMSS } = require("../lib/dateUtil");

let paymentQ, orderQ;
initQ();

app.use(cors()); // cross domain middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json()); // body -> json -> obj

app.get("/health", (req, res) => {
  res.json({
    status: "PaymentServiceOK",
  });
});

app.get("/payments", async (req, res) => {
  let result;
  try {
    //result = await findAll(0, 100);
    result = [];
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({
      errMessage: err.message,
    });
  }

  res.json(result);
});

app.get("/payments/:id", async (req, res) => {
  let result;
  try {
    //result = await findById(req.params.id);
    result = await findByIdFromDynamo(req.params.id);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({
      errMessage: err.message,
    });
  }
  res.json(result);
});

app.listen("3002", () => console.log("paymentService started on 3002"));

async function initQ() {
  try {
    paymentQ = new MessageBrokerQ(
      process.env.MESSAGE_BROKER_HOST,
      process.env.MESSAGE_PAYMENT_Q
    );
    orderQ = new MessageBrokerQ(
      process.env.MESSAGE_BROKER_HOST,
      process.env.MESSAGE_ORDER_Q
    );
    await paymentQ.init();
    await orderQ.init();
    paymentQ.waitForMessage(messageHandler);
  } catch (err) {
    console.error(err.message);
  }
}

async function messageHandler(message) {
  let data, jsonMessage;
  try {
    jsonMessage = message.toString();
    data = JSON.parse(jsonMessage);
    console.log(
      `[PAYMENT SERVICE <- ORDER OCHESTRATOR]: ${data.event} - ${data.transactionId} - ${data.totalPrice}`
    );
    switch (data.event) {
      case "PRODUCT_RESERVED":
        break;
      case "TRANSACTION_ROLLBACK":
        //await cancelPayment(data.transactionId);
        cancelPaymentToDynamo(data.transactionId);
        return;
      default:
        console.log(`UNKNOWN EVENT: ${jsonMessage}`);
        return;
    }

    if (data.requestType === "payment_failed") {
      throw new Error("payment_failed");
    }

    // create payment
    // await createPayment(data.transactionId, data.totalPrice);
    await createPaymentToDynamo(data.transactionId, data.totalPrice);
    console.log(
      `[PAYMENT SERVICE -> ORDER OCHESTRATOR]: PAYMENT_COMPLETED - ${data.transactionId}`
    );
    orderQ.sendMessage(
      Buffer.from(
        JSON.stringify({
          ...data,
          event: "PAYMENT_COMPLETED",
          from: "PAYMENT SERVICE",
        })
      )
    );
  } catch (err) {
    // console.error(err.message);
    notifyRollBack(data, err.message);
  }
}

async function notifyRollBack(data, reason) {
  console.log(
    `[PAYMENT SERVICE -> ORDER OCHESTRATOR]: PAYMENT_FAILED - ${data.transactionId} - ${reason}`
  );
  if (orderQ)
    orderQ.sendMessage(
      Buffer.from(
        JSON.stringify({
          ...data,
          event: "PAYMENT_FAILED",
          from: "PAYMENT SERVICE",
          reason,
        })
      )
    );
}

async function createPaymentToDynamo(transactionId, price) {
  const item = {
    transactionId: transactionId,
    price: price,
    status: "COMPLETED",
    createdAt: getYYYYMMDDHHMMSS(),
  };
  return put(item, "payments");
}

async function cancelPaymentToDynamo(transactionId) {
  const { Item } = await get({ transactionId }, "payments");
  const updateItem = {
    ...Item,
    status: "CANCELLED",
  };
  await put(updateItem, "payments");
}

async function findByIdFromDynamo(transactionId) {
  const { Item } = await get({ transactionId }, "payments");
  return Item ? Item : {};
}

/* mysql version */
/*
async function createPayment(transactionId, price) {
  const sql = `
    insert into payments(transactionId, price, status)
    values (?, ?, ?)
  `;
  const bindParams = [transactionId, price, "COMPLETED"];
  const result = await execTransaction(sql, bindParams);
  return result;
}

async function cancelPayment(transactionId) {
  const sql =
    "update payments set status = 'CANCELLED' where transactionId = ?";
  const bindParams = [transactionId];
  const result = await execTransaction(sql, bindParams);
  return result;
}

async function findAll(offset, limit) {
  const sql = "select * from payments limit ?, ?";
  const bindParams = [offset, limit];
  const result = await execQuery(sql, bindParams);
  return result;
}

async function findById(id) {
  const sql = "select * from payments where paymentId = ?";
  const bindParams = [id];
  const result = await execQuery(sql, bindParams);
  return result;
}

*/
