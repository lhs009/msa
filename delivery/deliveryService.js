const express = require("express");
const cors = require("cors");
const app = express();
// const { execQuery, execTransaction } = require("../lib/mysqlUtil");
const { getYYYYMMDDHHMMSS } = require("../lib/dateUtil");
const MessageBrokerQ = require("../lib/MessageBrokerQ");
const { put, get } = require("../lib/dynamoUtil");

let deliveryQ, orderQ;
initQ();

app.use(cors()); // cross domain middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json()); // body -> json -> obj

app.get("/health", (req, res) => {
  res.json({
    status: "DeliveryService OK",
  });
});

app.get("/deliveries", async (req, res) => {
  let result;
  try {
    result = await findAll(0, 100);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({
      errMessage: err.message,
    });
  }

  res.json(result);
});

app.get("/deliveries/:id", async (req, res) => {
  let result;
  try {
    result = await findById(req.params.id);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({
      errMessage: err.message,
    });
  }
  res.json(result);
});

app.listen("3004", () => console.log("deliveryService started on 3004"));

async function initQ() {
  try {
    deliveryQ = new MessageBrokerQ(
      process.env.MESSAGE_BROKER_HOST,
      process.env.MESSAGE_DELIVERY_Q
    );
    orderQ = new MessageBrokerQ(
      process.env.MESSAGE_BROKER_HOST,
      process.env.MESSAGE_ORDER_Q
    );
    await deliveryQ.init();
    await orderQ.init();
    deliveryQ.waitForMessage(messageHandler);
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
      `[DELIVERY SERVICE <- ORDER OCHESTRATOR]: ${data.event} - ${data.transactionId}`
    );

    switch (data.event) {
      case "PAYMENT_COMPLETED":
        break;
      case "TRANSACTION_ROLLBACK":
        await cancelDeliveryToDynamo(data.transactionId);
        return;
      default:
        console.log(`UNKNOWN EVENT: ${jsonMessage}`);
        return;
    }

    if (data.requestType === "delivery_failed") {
      throw new Error("delivery_failed");
    }
    // delivery reserve
    await createDeliveryToDynamo(data.transactionId);

    console.log(
      `[DELIVERY SERVICE -> ORDER OCHESTRATOR]: DELIVERY_RESERVED - ${data.transactionId}`
    );
    orderQ.sendMessage(
      Buffer.from(
        JSON.stringify({
          ...data,
          event: "DELIVERY_RESERVED",
          from: "DELIVERY_SERVICE",
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
    `[DELIVERY SERVICE -> ORDER OCHESTRATOR]: DELIVERY_RESERVE_FAILED - ${data.transactionId} - ${reason}`
  );
  if (orderQ)
    orderQ.sendMessage(
      Buffer.from(
        JSON.stringify({
          ...data,
          event: "DELIVERY_RESERVE_FAILED",
          from: "DELIVERY SERVICE",
          reason,
        })
      )
    );
}

async function createDeliveryToDynamo(transactionId) {
  const item = {
    transactionId: transactionId,
    schedule: getYYYYMMDDHHMMSS(),
    status: "RESERVED",
    createdAt: getYYYYMMDDHHMMSS(),
  };
  return put(item, "delivery");
}

async function cancelDeliveryToDynamo(transactionId) {
  const { Item } = await get({ transactionId }, "delivery");
  const updateItem = {
    ...Item,
    status: "CANCELLED",
  };
  await put(updateItem, "delivery");
}

/* mysql version */
/*
async function createDelivery(transactionId) {
  const sql = `
    insert into delivery(transactionId, schedule, status)
    values (?, ?, ?)
  `;
  const bindParams = [transactionId, getYYYYMMDDHHMMSS(), "RESERVED"];
  const result = await execTransaction(sql, bindParams);
  return result;
}

async function cancelDelivery(transactionId) {
  const sql = "update delivery set status = ? where transactionId = ?";
  const bindParams = ["CANCELLED", transactionId];
  const result = await execTransaction(sql, bindParams);
  return result;
}

async function findAll(offset, limit) {
  const sql = "select * from delivery limit ?, ?";
  const bindParams = [offset, limit];
  const result = await execQuery(sql, bindParams);
  return result;
}

async function findById(id) {
  const sql = "select * from delivery where deliveryId = ?";
  const bindParams = [id];
  const result = await execQuery(sql, bindParams);
  return result;
}
*/
