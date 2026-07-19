const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'jjcompanybrotrading@gmail.com',
    pass: 'pxamytdswvlbixca'
  }
})

async function test() {
  try {
    await transporter.verify()
    console.log('SMTP conectado correctamente')

    await transporter.sendMail({
      from: '"J&J Company Bro" <jjcompanybrotrading@gmail.com>',
      to: 'TU_CORREO_PERSONAL@gmail.com',
      subject: 'Prueba J&J',
      text: 'Correo de prueba funcionando'
    })

    console.log('Correo enviado correctamente')
  } catch (err) {
    console.log('ERROR:', err)
  }
}

test()