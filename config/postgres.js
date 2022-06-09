const { Pool } = require("pg")
// Coloca aquí tus credenciales

const dbConnect = async () => {
  try {
      const connectionData = {
        user: process.env.USER_DB,
        host: process.env.HOST,
        database: process.env.DATABASE,
        password: process.env.PASSWORD_DB,
        port: process.env.PORT,
      }
      //const client = new Client(connectionData)
      //return client

      const pool = await new Pool(connectionData)
      return pool
  } catch (error) {
     return error
  }
  
}

module.exports = { dbConnect };