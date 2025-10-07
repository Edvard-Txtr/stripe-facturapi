import express from 'express';
import Stripe from 'stripe';
import Facturapi from 'facturapi';

const app = express();
const port = process.env.PORT || 3000;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-08-16',
});
const facturapi = new Facturapi(process.env.FACTURAPI_KEY);

app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

app.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      process.env.STRIPE_ENDPOINT_SECRET
    );
  } catch (err) {
    console.error('❌ Error verificando webhook:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    const customerEmail = session.customer_details.email;
    const customerName = session.customer_details.name;

    const metadata = session.metadata || {};
    const tax_id = metadata.tax_id || 'XAXX010101000';
    const description = metadata.description || 'Donativo';

    try {
      const customer = await facturapi.customers.create({
        legal_name: customerName,
        email: customerEmail,
        tax_id,
        tax_system: '612',
        address: {
          zip: '99999',
        },
      });

      const invoice = await facturapi.invoices.create({
        customer: customer.id,
        items: [
          {
            quantity: 1,
            product: {
              description,
              product_key: '84101600',
              price: session.amount_total / 100,
            },
          },
        ],
        payment_form: '03',
        use: 'D01',
      });

      console.log('✅ Factura creada:', invoice.id);
    } catch (err) {
      console.error('❌ Error creando factura:', err.message);
    }
  }

  res.sendStatus(200);
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
