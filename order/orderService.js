const express = require("express");
const cors = require("cors");
const { v4: uuid } = require("uuid");
const axios = require("axios");
const app = express();
const { execQuery, execTransaction } = require("../lib/mysqlUtil");
const OrderOchestrator = require("./OrderOchestrator");

let orderOchestrator = null;
initOrchestrator();

app.use(cors()); // cross domain middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json()); // body -> json -> obj

app.get("/health", (req, res) => {
  res.json({
    status: "OrderService OK",
  });
});

app.get("/orders", async (req, res) => {
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

app.post("/orders", async (req, res) => {
  let message = req.body;
  let order = message.order;
  const transactionId = uuid();
  try {
    // console.log(`request order: ${message}`);
    let { data } = await axios.get(
      `http://user-service:3000/users/${order.userId}`
    );
    if (!data?.rows || data.rows.length === 0) {
      return res.json({
        isSuccess: false,
        results: "Not Found User",
      });
    }

    if (!orderOchestrator) {
      return res.status(500).json({
        results: "service unavailable",
      });
    }

    await createOrder(
      transactionId,
      order.userId,
      order.productId,
      order.quantity
    );

    orderOchestrator.createOrder({
      event: "ORDER_CREATED",
      transactionId,
      ...message,
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({
      isSuccess: false,
      results: err.message,
    });
  }
  res.json({
    isSuccess: true,
    results: {
      event: "ORDER_CREATED",
      transactionId,
      ...message,
    },
  });
});

app.get("/orders/:id", async (req, res) => {
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

app.listen("3003", () => console.log("orderService started on 3003"));

async function initOrchestrator() {
  try {
    orderOchestrator = new OrderOchestrator(updateOrderByReport);
    await orderOchestrator.init();
  } catch (err) {
    console.error(err.message);
  }
}

async function createOrder(transactionId, userId, productId, quantity) {
  const sql = `
  insert into orders(transactionId, userId, productId, quantity, status)
  values (?, ?, ?, ?, ?)
  `;
  const bindParams = [transactionId, userId, productId, quantity, "CREATED"];
  const result = await execTransaction(sql, bindParams);
  return result;
}

async function updateOrderByReport(transactionId, status) {
  const sql = "update orders set status = ? where transactionId = ?";
  const bindParams = [status, transactionId];
  const result = await execTransaction(sql, bindParams);
  return result;
}

async function findAll(offset, limit) {
  const sql = "select * from orders limit ?, ?";
  const bindParams = [offset, limit];
  const result = await execQuery(sql, bindParams);
  return result;
}

async function findById(id) {
  const sql = "select * from orders where transactionId = ?";
  const bindParams = [id];
  const result = await execQuery(sql, bindParams);
  return result;
}
