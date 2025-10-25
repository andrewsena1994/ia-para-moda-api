import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());                 // depois podemos restringir para seu domínio
app.use(express.json());

const { PORT = 8080, MP_ACCESS_TOKEN, APP_URL } = process.env;

app.get("/health", (_req, res) => res.send("ok"));

// Criar preferência de pagamento Mercado Pago
app.post("/payments/mp/checkout", async (req, res) => {
  const { userId, title, amount } = req.body;
  try {
    const r = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MP_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        items: [{ title, quantity: 1, unit_price: Number(amount) }],
        back_urls: {
          success: `${APP_URL}/pagamento/sucesso`,
          failure: `${APP_URL}/pagamento/erro`,
          pending: `${APP_URL}/pagamento/pendente`
        },
        auto_return: "approved",
        notification_url: `${APP_URL}/payments/mp/webhook`,
        external_reference: String(userId)
      })
    });
    const data = await r.json();
    if (!data.init_point) {
      console.error("MP error", data);
      return res.status(400).json({ ok:false, error:"mp_error", detail:data });
    }
    res.json({ ok:true, url: data.init_point });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false });
  }
});

// Webhook (para ativar plano/creditar após pagamento aprovado)
app.post("/payments/mp/webhook", express.json(), async (req, res) => {
  // TODO: consultar pagamento pelo ID e atualizar seu banco (plan/credits)
  res.sendStatus(200);
});

app.listen(PORT, () => console.log("API on", PORT));
