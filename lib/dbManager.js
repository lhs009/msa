/**
 * file: dbManager.js
 * writer: hwansoo lee
 * description: mysql db pool
 * Query 필요 시 매번 DB 연결을 시도 하는 것이 아니라 connection pool을 만들어 놓고
 * Query 시 Pool로 붙어 connection object를 얻어와 사용
 * SingleTon 객체 패턴 사용, 여러 모듈에서 호출 하여도 DB pool 객체를 한번만 생성하여 공유함
 * Pool에서 connection을 얻은 후 쿼리 실행이 완료 되면 connection을 Pool에 반드시 반납 (connection release())
 *
 */
"use strict";

const mysql = require("mysql2/promise");
const config = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10, //pool connection size  10 - 15개
  debug: false,
  waitForConnections: true,
  multipleStatements: false, // select * ...;update *;.....
};

const dbSingleton = (() => {
  // Instance stores a reference to the Singleton
  let instance;
  let pool;

  let init = () => {
    // Singleton Private methods and variables
    pool = mysql.createPool(config);
    return {
      // Public methods and variables
      getPool: () => {
        return pool;
      },
    };
  };

  return {
    // Get the Singleton instance if one exists
    // or create one if it doesn't
    getInstance: () => {
      if (!instance) {
        instance = init();
      }
      return instance;
    },
  };
})();

module.exports = dbSingleton;
