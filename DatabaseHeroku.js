var pg = require('pg');

pg.defaults.ssl = true;
var answer ='Не подключено'
pg.connect('ec2-54-247-120-169.eu-west-1.compute.amazonaws.com', function(err, client) {
  if (err) throw err;
  console.log('Connected to postgres! Getting schemas...');

  client
    .query('SELECT SYSDATE FROM DUAL;')
    .on('row', function(row) {
      console.log(JSON.stringify(row));
	  answer= JSON.stringify(row);
    });
});