import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch'; // node-fetch v3 (ESM)

const app = express();
app.use(cors());
app.use(express.json());

const { PORT = 8080, MP_ACCESS_TOKEN, APP_URL, API_URL } = process.env;

app.get('/health', (req, res) => res.send('ok'));

// Criar preferência de pagamento (MP) e devolver a URL do checkout
app.post('/payments/mp/checkout', async (req, res) => {
  const { userid, title, amount } = req.body;

  try {
    const r = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        items: [{ title, quantity: 1, unit_price: Number(amount) }],
        back_urls: {
          success: `${APP_URL}/pagamento/sucesso`,
          failure: `${APP_URL}/pagamento/erro`,
          pending: `${APP_URL}/pagamento/pendente`,
        },
        auto_return: 'approved',
        // IMPORTANTÍSSIMO: webhook no BACKEND (API_URL), não no front:
        notification_url: `${API_URL}/payments/mp/webhook`,
        external_reference: String(userid),
      }),
    });

    const data = await r.json();
    if (!data.init_point) {
      console.error('mp_error', data);
      return res.status(400).json({ ok: false, error: 'mp_error', detail: data });
    }

    return res.json({ ok: true, url: data.init_point });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false });
  }
});

// Webhook do Mercado Pago (mínimo viável)
app.post('/payments/mp/webhook', (req, res) => {
  // Dica: logue para testar
  console.log('MP webhook:', JSON.stringify(req.body));
  // Responda 200 rapidamente para não gerar reenvios
  res.sendStatus(200);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API listening on ${PORT}`);
});
