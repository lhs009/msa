const { getYYYYMMDDHHMMSS } = require("../lib/dateUtil");
const { put, get, remove } = require("../lib/dynamoUtil");
const { v4: uuid } = require("uuid");

(async () => {
  const transactionId = uuid();

  try {
    // const item = {
    //   transactionId: transactionId,
    //   schedule: getYYYYMMDDHHMMSS(),
    //   status: "RESERVED",
    // };
    // const item = {
    //   transactionId: transactionId,
    //   price: 10000,
    //   status: "RESERVED",
    // };
    // await put(item, "payments");
    const { Item } = await get(
      { transactionId: "11963cdb-bd9c-4205-b465-06423b8a44cb" },
      "payments"
    );
    console.log(Item);
    const updateItem = {
      ...Item,
      status: "CANCELLED",
    };
    await put(updateItem, "payments");
  } catch (err) {
    console.error(err.message);
  }
})();
