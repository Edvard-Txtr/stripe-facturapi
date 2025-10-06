const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

app.post('/webhook', async (req, res) => {
  const event = req.body;

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    try {
      const invoice = await axios.post('https://www.facturapi.io/v2/invoices', {
        customer: {
          legal_name: session.customer_details.name,
          email: session.customer_details.email,
          tax_id: session.metadata.tax_id
        },
        items: [{
          quantity: 1,
          product: {
            description: session.metadata.description,
            product_key: "84111506",
            price: parseFloat(session.amount_total) / 100,
            tax_included: true
          }
        }],
        payment_form: "03",
        use: "G03"
      }, {
        headers: {
          Authorization: `Bearer ${process.env.FACTURAPI_KEY}`
        }
      });

      console.log('Factura creada:', invoice.data.id);
    } catch (err) {
      console.error('Error creando factura:', err.response?.data || err.message);
    }
  }

  res.status(200).send('Received');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));