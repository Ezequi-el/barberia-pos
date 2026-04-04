import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

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
                  <span style="font-size:16px;font-weight:bold;color:#111111;">A</span>
                </td>
                <td style="padding-left:12px;">
                  <span style="font-size:16px;font-weight:bold;color:#ffffff;letter-spacing:1px;">ATHERIS-SAAS</span>
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
                  <a href="https://barberia-pos.vercel.app/" style="font-size:14px;font-weight:bold;color:#111111;text-decoration:none;letter-spacing:0.5px;">
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
                <td><span style="font-size:11px;color:#555;letter-spacing:0.5px;">ATHERIS-SAAS — Sistema de gestión empresarial</span></td>
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

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { nombre, negocio, email, password, business_id, create_user = false, update_password = false, user_id } = await req.json();

    if (update_password) {
      if (!user_id || !password) {
        return new Response(
          JSON.stringify({ error: "Faltan datos para actualizar contraseña (user_id o password missing)" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const { data, error } = await supabase.auth.admin.updateUserById(user_id, { password });
      if (error) {
        return new Response(
          JSON.stringify({ error: `Auth Error: ${error.message}` }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Update password_changed flag in profiles to force change on next login if needed
      await supabase.from('profiles').update({ password_changed: false }).eq('id', user_id);

      return new Response(
        JSON.stringify({ success: true, message: "Contraseña actualizada" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!nombre || (!negocio && !create_user) || !email || !password) {
      return new Response(
        JSON.stringify({ error: "Faltan campos requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let userId = "";

    if (create_user) {
  if (!business_id) throw new Error("business_id es requerido para crear un barbero");

  // Si ya existe un usuario con ese email, eliminarlo primero
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find((u: any) => u.email === email);
  
 if (existingUser) {
  // Primero eliminar de tablas dependientes
  await supabase.from('barberos').delete().eq('user_id', existingUser.id);
  await supabase.from('profiles').delete().eq('id', existingUser.id);
  
  // Luego eliminar de Auth
  const { error: deleteError } = await supabase.auth.admin.deleteUser(existingUser.id);
  if (deleteError) throw new Error(`Error eliminando usuario anterior: ${deleteError.message}`);
}
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: nombre }
  });

  if (userError) throw userError;
  userId = userData.user.id;

      // 2. Crear su perfil automáticamente
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          business_id: business_id,
          role: "barber",
          full_name: nombre,
          activo: true,
          password_changed: false
        });

      if (profileError) throw profileError;
    }

    // 3. Enviar correo usando Gmail API
    const accessToken = await getAccessToken();
    const htmlContent = buildEmailHTML(nombre, negocio || 'Atheris-SaaS', email, password);
    const fromEmail = Deno.env.get("GMAIL_FROM")!;

    const emailLines = [
      `From: ATHERIS-SAAS <${fromEmail}>`,
      `To: ${email}`,
      `Subject: Bienvenido a ATHERIS-SAAS - Tus credenciales de acceso`,
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
      const errorData = await gmailResponse.json();
      console.error("Gmail Error:", errorData);
      // No lanzamos error para no fallar el proceso completo si el usuario se creó pero el mail falló
      return new Response(
        JSON.stringify({ 
          success: true, 
          user_id: userId,
          message: "Usuario creado pero el correo falló al enviarse" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, user_id: userId, message: "Usuario creado y correo enviado correctamente" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in Edge Function:", error.message);
    return new Response(
      JSON.stringify({ error: `Internal Error: ${error.message}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});