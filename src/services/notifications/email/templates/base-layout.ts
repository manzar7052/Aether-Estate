/**
 * Luxury branded email container layout for Aether Estates.
 */
export function renderEmailLayout(params: {
  title: string;
  preheader?: string;
  contentHtml: string;
  appUrl?: string;
}): string {
  const appUrl = params.appUrl || process.env.APP_URL || "https://aetherestates.com";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${params.title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #faf8f5;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #faf8f5;
      padding: 40px 0;
    }
    .main {
      background-color: #ffffff;
      margin: 0 auto;
      width: 100%;
      max-width: 600px;
      border: 1px solid #e2ded4;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(15, 23, 42, 0.05);
    }
    .header {
      background-color: #0f172a;
      padding: 32px 36px;
      text-align: center;
    }
    .brand-name {
      color: #ffffff;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin: 0;
      font-family: Georgia, 'Times New Roman', serif;
    }
    .brand-tagline {
      color: #c5a059;
      font-size: 11px;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin: 6px 0 0 0;
    }
    .body-content {
      padding: 36px;
      line-height: 1.6;
      font-size: 15px;
    }
    .card {
      background-color: #faf8f5;
      border: 1px solid #e2ded4;
      border-radius: 12px;
      padding: 20px 24px;
      margin: 24px 0;
    }
    .card-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #64748b;
      margin: 0 0 12px 0;
    }
    .btn {
      display: inline-block;
      background-color: #c5a059;
      color: #0f172a !important;
      text-decoration: none;
      font-weight: 700;
      font-size: 13px;
      padding: 12px 28px;
      border-radius: 8px;
      margin: 16px 0;
      text-align: center;
    }
    .footer {
      text-align: center;
      padding: 28px 36px;
      font-size: 12px;
      color: #94a3b8;
      border-top: 1px solid #f1eee7;
    }
    .footer a {
      color: #c5a059;
      text-decoration: none;
    }
  </style>
</head>
<body>
  ${params.preheader ? `<div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${params.preheader}</div>` : ""}
  <table class="wrapper" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center">
        <table class="main" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td class="header">
              <h1 class="brand-name">Aether Estates</h1>
              <p class="brand-tagline">Find a place that feels like home</p>
            </td>
          </tr>
          <tr>
            <td class="body-content">
              ${params.contentHtml}
            </td>
          </tr>
          <tr>
            <td class="footer">
              <p style="margin: 0 0 6px 0;">&copy; ${new Date().getFullYear()} Aether Estates Portfolio. All rights reserved.</p>
              <p style="margin: 0;">Austin &middot; Westlake &middot; Barton Creek &middot; Lake Travis</p>
              <p style="margin: 8px 0 0 0;"><a href="${appUrl}">Visit Aether Estates</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
