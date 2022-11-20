/**
 *  file: productService.js
 *  writer: hwansoo.lee
 *  description: product service example
 *
 */
const express = require("express");
const cors = require("cors");
const app = express();
const { execQuery, execTransaction } = require("../lib/mysqlUtil");
const MessageBrokerQ = require("../lib/MessageBrokerQ");

let productQ, orderQ;
initQ();

app.use(cors()); // cross domain middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json()); // body -> json -> obj

app.get("/health", (req, res) => {
  res.json({
    status: "ProductService OK",
  });
});

app.get("/products", async (req, res) => {
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

app.get("/products/:id", async (req, res) => {
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

app.listen("3001", () => console.log("productService started on 3001"));

async function initQ() {
  try {
    productQ = new MessageBrokerQ(
      process.env.MESSAGE_BROKER_HOST,
      process.env.MESSAGE_PRODUCT_Q
    );
    orderQ = new MessageBrokerQ(
      process.env.MESSAGE_BROKER_HOST,
      process.env.MESSAGE_ORDER_Q
    );
    await productQ.init();
    await orderQ.init();
    productQ.waitForMessage(messageHandler);
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
      `[PRODUCT SERVICE <- ORDER OCHESTRATOR]: ${data.event} - ${data.transactionId}`
    );
    switch (data.event) {
      case "ORDER_CREATED":
        break;
      case "TRANSACTION_ROLLBACK":
        await updateById({ ...data.order, quantity: data.order.quantity * -1 });
        return;
      default:
        console.log(`UNKNOWN EVENT: ${jsonMessage}`);
        return;
    }

    if (data.requestType === "product_failed") {
      throw new Error("product_failed");
    }

    // check product
    let result = await findById(data.order.productId);
    if (!result.isSuccess || result.rows.length <= 0) {
      throw new Error("Not Found Item");
    }

    const product = result.rows[0];
    if (product.quantity - data.order.quantity < 0) {
      throw new Error("Not Enough Stock");
    }

    // reserve quantity
    await updateById(data.order);
    console.log(
      `[PRODUCT SERVICE -> ORDER OCHESTRATOR]: PRODUCT_RESERVED - ${data.transactionId}`
    );
    orderQ.sendMessage(
      Buffer.from(
        JSON.stringify({
          ...data,
          totalPrice: product.price * data.order.quantity,
          event: "PRODUCT_RESERVED",
          from: "PRODUCT SERVICE",
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
    `[PRODUCT SERVICE -> ORDER OCHESTRATOR]: PRODUCT_RESERVE_FAILED - ${data.transactionId} - ${reason}`
  );
  if (orderQ)
    orderQ.sendMessage(
      Buffer.from(
        JSON.stringify({
          ...data,
          event: "PRODUCT_RESERVE_FAILED",
          from: "PRODUCT SERVICE",
          reason,
        })
      )
    );
}

async function updateById({ productId, quantity }) {
  const sql = "update products set quantity = quantity - ? where productId = ?";
  const bindParams = [quantity, productId];
  const result = await execTransaction(sql, bindParams);
  return result;
}

async function findAll(offset, limit) {
  const sql = "select * from products limit ?, ?";
  const bindParams = [offset, limit];
  const result = await execQuery(sql, bindParams);
  return result;
}

async function findById(id) {
  const sql = "select * from products where productId = ?";
  const bindParams = [id];
  const result = await execQuery(sql, bindParams);
  return result;
}
