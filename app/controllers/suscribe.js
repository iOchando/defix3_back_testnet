const { dbConnect } = require('../../config/postgres')

async function setEmailSuscribe(req, res) {
    try {
        const { email } = req.body
        var result

        rul_format = /.+@.+\..+/.test(email) || false;

        if (rul_format) {
            const conexion = await dbConnect()
            result = await conexion.query(`insert into suscribe
                    (email)
                    values ($1)`, [email])
                .then(() => {
                    result = true
                }).catch(() => {
                    result = false
                })
            res.json({respuesta: "ok", data: result})
        } else {
            res.status(404).json({respuesta: "email invalido"})
        }
    } catch (error) {
        console.log(error)
        res.status(500).json({respuesta: "Error interno del sistema"})
    }
}

module.exports = { setEmailSuscribe }
