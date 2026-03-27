import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getAccessToken(): Promise<string> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GMAIL_CLIENT_ID")!,
      client_secret: Deno.env.get("GMAIL_CLIENT_SECRET")!,
      refresh_token: Deno.env.get("GMAIL_REFRESH_TOKEN")!,
      grant_type: "refresh_token",
    }),
  });
  const data = await response.json();
  return data.access_token;
}

function buildEmailHTML(nombre: string, negocio: string, email: string, password: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table width="540" cellpadding="0" cellspacing="0" style="background:#111111;border-radius:12px;border:1px solid #2a2a2a;overflow:hidden;">
        
        <!-- Header -->
        <tr>
          <td style="background:#1a1a1a;padding:28px 32px;border-bottom:1px solid #2a2a2a;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:36px;height:36px;background:#ffffff;border-radius:8px;text-align:center;vertical-align:middle;">
                  <span style="font-size:16px;font-weight:bold;color:#111111;">V</span>
                </td>
                <td style="padding-left:12px;">
                  <span style="font-size:16px;font-weight:bold;color:#ffffff;letter-spacing:1px;">VELO POS</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 32px;">
            <p style="font-size:11px;color:#888;margin:0 0 8px;letter-spacing:1px;">BIENVENIDO AL EQUIPO</p>
            <h1 style="font-size:24px;font-weight:bold;color:#ffffff;margin:0 0 24px;line-height:1.3;">
              Hola, <span style="color:#d4d4d4;">${nombre}</span> ✂️
            </h1>

            <p style="font-size:14px;color:#999;line-height:1.7;margin:0 0 28px;">
              El dueño de <strong style="color:#ccc;">${negocio}</strong> te ha dado acceso al sistema. 
              Aquí están tus credenciales para entrar:
            </p>

            <!-- Credenciales -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border:1px solid #333;border-radius:10px;margin-bottom:28px;">
              <tr>
                <td style="padding:20px 24px;border-bottom:1px solid #2a2a2a;">
                  <p style="font-size:11px;color:#666;margin:0 0 4px;letter-spacing:1px;">CORREO</p>
                  <p style="font-size:15px;color:#e0e0e0;margin:0;font-family:monospace;">${email}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:20px 24px;">
                  <p style="font-size:11px;color:#666;margin:0 0 4px;letter-spacing:1px;">CONTRASEÑA TEMPORAL</p>
                  <p style="font-size:15px;color:#e0e0e0;margin:0;font-family:monospace;">${password}</p>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td align="center" style="background:#ffffff;border-radius:8px;padding:14px;">
                  <a href="https://TU-APP.vercel.app" style="font-size:14px;font-weight:bold;color:#111111;text-decoration:none;letter-spacing:0.5px;">
                    Entrar al sistema →
                  </a>
                </td>
              </tr>
            </table>

            <!-- Aviso -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td style="background:#1a1a1a;border-left:2px solid #444;padding:12px 16px;border-radius:0 6px 6px 0;">
                  <p style="font-size:12px;color:#777;margin:0;line-height:1.6;">
                    Por seguridad, cambia tu contraseña la primera vez que entres.
                  </p>
                </td>
              </tr>
            </table>

            <p style="font-size:12px;color:#555;line-height:1.6;margin:0;">
              Si tienes problemas para acceder, contacta a tu administrador directamente.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#141414;padding:20px 32px;border-top:1px solid #2a2a2a;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td><span style="font-size:11px;color:#555;letter-spacing:0.5px;">VELO POS — Sistema de barbería</span></td>
                <td align="right"><span style="font-size:11px;color:#444;">2025</span></td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { nombre, negocio, email, password } = await req.json();

    if (!nombre || !negocio || !email || !password) {
      return new Response(
        JSON.stringify({ error: "Faltan campos requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = await getAccessToken();
    const htmlContent = buildEmailHTML(nombre, negocio, email, password);
    const fromEmail = Deno.env.get("GMAIL_FROM")!;

    const emailLines = [
      `From: VELO POS <${fromEmail}>`,
      `To: ${email}`,
      `Subject: Bienvenido a VELO POS - Tus credenciales de acceso`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=UTF-8`,
      ``,
      htmlContent,
    ];

    const rawEmail = emailLines.join("\n");
    const encodedEmail = btoa(unescape(encodeURIComponent(rawEmail)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const gmailResponse = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw: encodedEmail }),
      }
    );

    if (!gmailResponse.ok) {
      const error = await gmailResponse.json();
      throw new Error(JSON.stringify(error));
    }

    return new Response(
      JSON.stringify({ success: true, message: "Correo enviado correctamente" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});