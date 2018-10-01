const Sequelize = require('sequelize');
const sequelize = new Sequelize('mobilidad', 'sa', 'Comisi0n123', {
  host: 'localhost',
  dialect: 'mssql',
  port:1433,
  "dialectOptions":{
    "instanceName": "DRONES",
    "encrypt": true
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },

});
module.exports = () => {
  sequelize
  .authenticate()
  .then(() => {
    console.log('Connection has been established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });
  // sequelize.query('INSERT INTO cellocator_test (device, latitude, longitude, speed, bearing, date) VALUES (?, ?, ?, ?, ?, ?)', {
  //   replacements: ['123', 18.05425, -98.02392623, 34, 99, Date.now()],
  //   type: sequelize.QueryTypes.INSERT
  // });
}
