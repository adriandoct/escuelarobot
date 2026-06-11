import { NextResponse } from "next/server";

const PLANS = [
  { id: "0", title: "Mensualidad Regular - IA Make", price: 1000 },
  { id: "1", title: "Trimestre Raion Kai - IA Make", price: 1400 },
  { id: "2", title: "Semestre Shito-Ryu - IA Make", price: 2700 },
];

export async function GET(request: Request) {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") || "http";
  const cleanProto = proto.split(",")[0].trim();
  const baseUrl = `${cleanProto}://${host}`;

  try {
    const { searchParams } = new URL(request.url);
    const planIndex = searchParams.get("plan") || "0";
    
    // Find the selected plan, fallback to index 0 if out of range
    const plan = PLANS.find(p => p.id === planIndex) || PLANS[0];
    
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    const isMockToken = !token || 
                        token === "tu_access_token_aqui" || 
                        token.trim() === "" ||
                        token.includes("MOCK") ||
                        token.includes("TEST");

    if (isMockToken) {
      console.log("Mercado Pago token not configured or using mock, redirecting to local checkout simulator.");
      return NextResponse.redirect(`${baseUrl}/checkout/mock?plan=${plan.id}`);
    }

    // Call Mercado Pago Preferences API
    const response = await fetch("https://api.mercadopago.com/v1/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [
          {
            id: plan.id,
            title: plan.title,
            quantity: 1,
            unit_price: plan.price,
            currency_id: "MXN",
          }
        ],
        back_urls: {
          success: `${baseUrl}/register?payment=success&plan=${plan.id}`,
          failure: `${baseUrl}/register?payment=failure`,
          pending: `${baseUrl}/register?payment=pending`,
        },
        auto_return: "approved",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Mercado Pago API error response:", errorText);
      // Fallback to mock checkout if API call fails
      return NextResponse.redirect(`${baseUrl}/checkout/mock?plan=${plan.id}&api_error=true`);
    }

    const data = await response.json();
    
    // Mercado Pago provides 'init_point' for live/redirect checkout, and 'sandbox_init_point' for testing
    const checkoutUrl = data.init_point || data.sandbox_init_point;

    if (!checkoutUrl) {
      console.error("No init_point or sandbox_init_point found in response:", data);
      return NextResponse.redirect(`${baseUrl}/checkout/mock?plan=${plan.id}&api_error=no_url`);
    }

    return NextResponse.redirect(checkoutUrl);
  } catch (error) {
    console.error("Unexpected error in checkout API route:", error);
    return NextResponse.redirect(`${baseUrl}/checkout/mock?plan=0&api_error=exception`);
  }
}
