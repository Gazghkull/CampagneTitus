import sqlite3 from "sqlite3";

const db = new sqlite3.Database("./server/db.sqlite");

const updates = [
  {id:1, name:"Atar I"},
  {id:2, name:"Atar II"},
  {id:3, name:"Atar III"},
  {id:4, name:"Atar IV"}
];

updates.forEach(u => {
  db.run("UPDATE systems SET name=? WHERE id=?", [u.name, u.id], (err)=>{
    if (err) console.error(err);
  });
});

db.close(() => console.log("✅ Noms des systèmes mis à jour"));