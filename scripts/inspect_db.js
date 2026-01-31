const db = require('../config/db');

async function inspect() {
  try {
    const [rows] = await db.query("SHOW TABLES");
    console.log("Tables:", rows);

    for (const row of rows) {
      const tableName = Object.values(row)[0];
      const [columns] = await db.query(`DESCRIBE ${tableName}`);
      console.log(`\nTable: ${tableName}`);
      console.log(columns.map(c => `${c.Field} (${c.Type})`).join(', '));
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

inspect();
