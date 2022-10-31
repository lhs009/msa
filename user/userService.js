const express = require("express");
const cors = require("cors");
const app = express();
const { execQuery } = require("../lib/mysqlUtil");

app.use(cors()); // cross domain middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json()); // body -> json -> obj

app.get("/health", (req, res) => {
  res.json({
    status: "UserService OK",
  });
});

app.get("/users", async (req, res) => {
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

app.get("/users/:id", async (req, res) => {
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

app.listen("3000", () => console.log("userService started on 3000"));

async function findAll(offset, limit) {
  const sql = "select * from users limit ?, ?";
  const bindParams = [offset, limit];
  const result = await execQuery(sql, bindParams);
  return result;
}

async function findById(id) {
  const sql = "select * from users where userId = ?";
  const bindParams = [id];
  const result = await execQuery(sql, bindParams);
  return result;
}
