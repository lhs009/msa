/**
 * file: dbHelper.js
 * writer: hwansoo lee
 * description:
 *  mysql db handler
 *
 */

"use strict";

const pool = require("./dbManager").getInstance().getPool();

/*   
    single transaction only   
    update, insert, delete transaction 처리 return 
  */
const execTransaction = async (sql, bindParams) => {
  let dbconn;
  try {
    dbconn = await pool.getConnection(async (conn) => conn);
    // START TRANSACTION
    await dbconn.beginTransaction();
    sql = dbconn.format(sql, bindParams);
    let [rows] = await dbconn.execute(sql);
    await dbconn.commit();
    // COMMIT
    return {
      isSuccess: true,
      rows,
    };
  } catch (err) {
    console.log(`transaction error: ${JSON.stringify(err)}`);
    if (dbconn) {
      await dbconn.rollback(); // ROLLBACK
    }
    return {
      isSuccess: false,
      error: err.message,
    };
  } finally {
    if (dbconn) {
      dbconn.release();
    }
  }
};

/*
       select query 수행
    */

const execQuery = async (sql, bindParams) => {
  let dbconn;
  try {
    let rows;
    dbconn = await pool.getConnection(async (conn) => conn);

    if (Array.isArray(bindParams) && bindParams.length > 0) {
      sql = dbconn.format(sql, bindParams);
    }

    [rows] = await dbconn.execute(sql);
    return {
      isSuccess: true,
      rows,
    };
  } catch (err) {
    console.log(`query error: ${err}`);
    return {
      isSuccess: false,
      error: err.message,
    };
  } finally {
    if (dbconn) {
      dbconn.release();
    }
  }
};

const dbHeler = {
  execTransaction: execTransaction,
  execQuery: execQuery,
};

module.exports = dbHeler;
