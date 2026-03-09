import sqlite3 from "sqlite3";
const db = new sqlite3.Database("./server/db.sqlite");

db.all("SELECT * FROM users", (err, rows) => {
  console.log(rows);
  db.close();
});