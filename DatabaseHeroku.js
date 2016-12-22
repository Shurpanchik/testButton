var pg = require('pg');
  pg.defaults.ssl = true;
  var answer ='Не подключено';
const connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/todo';
const client = new pg.Client(connectionString);
client.connect(); 
