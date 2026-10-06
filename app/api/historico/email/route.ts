
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface HistoricoItem {
  id: string | number;
  product?: string;
  weight: number;
  pessoaNome?: string;
  fingerprintId?: number | string;
  printed?: boolean;
  timestamp: string;
}

/*
 * ============================================================
 * TRANSPORTADOR DE EMAIL
 * ============================================================
 */

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SMTP_HOST,
  port: Number(process.env.EMAIL_SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.EMAIL_SMTP_USER,
    pass: process.env.EMAIL_SMTP_PASSWORD,
  },
});

/*
 * ============================================================
 * DATA/HORA DE MOÇAMBIQUE
 * ============================================================
 */

function formatarDataMaputo(data: string | Date): string {
  const dataConvertida = new Date(data);

  if (Number.isNaN(dataConvertida.getTime())) {
    return "Data inválida";
  }

  return new Intl.DateTimeFormat("pt-MZ", {
    timeZone: "Africa/Maputo",
    calendar: "gregory",
    numberingSystem: "latn",

    day: "2-digit",
    month: "2-digit",
    year: "numeric",

    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",

    hour12: false,
  }).format(dataConvertida);
}

/*
 * ============================================================
 * POST
 * ============================================================
 */

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const historico: HistoricoItem[] =
      body.historico || [];

    /*
     * ========================================================
     * VALIDAR HISTÓRICO
     * ========================================================
     */

    if (!Array.isArray(historico)) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: "Histórico inválido.",
        },
        { status: 400 }
      );
    }

    if (historico.length === 0) {
      return NextResponse.json({
        sucesso: true,
        enviado: false,
        mensagem: "Não existem registos para enviar.",
      });
    }

    /*
     * ========================================================
     * EMAIL
     * ========================================================
     */

    const destino = process.env.EMAIL_DESTINO;
    const remetente = process.env.EMAIL_REMETENTE;

    if (!destino || !remetente) {
      return NextResponse.json(
        {
          sucesso: false,
          erro:
            "EMAIL_DESTINO ou EMAIL_REMETENTE não configurado.",
        },
        { status: 500 }
      );
    }

    /*
     * ========================================================
     * DATA/HORA ATUAL
     * ========================================================
     */

    const agora = new Date();

    const dataUTC = agora.toISOString();

    const dataMaputo = formatarDataMaputo(agora);

    /*
     * LOG PARA VERIFICAR A HORA REAL DA VERCEL
     */

    console.log("========================================");
    console.log("TESTE DE DATA/HORA");
    console.log("UTC:", dataUTC);
    console.log("MAPUTO:", dataMaputo);
    console.log("========================================");

    /*
     * ========================================================
     * LINHAS DA TABELA
     * ========================================================
     */

    const linhas = historico
      .map(
        (item) => `
          <tr>
            <td>${item.product || "-"}</td>

            <td>
              ${Number(item.weight || 0).toFixed(2)} kg
            </td>

            <td>
              ${item.pessoaNome || "-"}
            </td>

            <td>
              ${item.fingerprintId ?? "-"}
            </td>

            <td>
              ${
                item.printed
                  ? "Impresso"
                  : "Não impresso"
              }
            </td>

            <td>
              ${formatarDataMaputo(item.timestamp)}
            </td>
          </tr>
        `
      )
      .join("");

    /*
     * ========================================================
     * HTML DO EMAIL
     * ========================================================
     */

    const html = `
      <!DOCTYPE html>

      <html lang="pt">
        <head>
          <meta charset="UTF-8" />

          <style>
            body {
              font-family: Arial, sans-serif;
              background: #f5f7fa;
              padding: 30px;
              color: #001431;
            }

            .container {
              max-width: 1000px;
              margin: auto;
              background: white;
              padding: 30px;
              border-radius: 12px;
            }

            h1 {
              color: #001431;
            }

            .info {
              margin-bottom: 20px;
              color: #666;
            }

            table {
              width: 100%;
              border-collapse: collapse;
            }

            th {
              background: #001431;
              color: white;
              padding: 10px;
              text-align: left;
            }

            td {
              padding: 10px;
              border-bottom: 1px solid #ddd;
            }

            .total {
              margin-top: 20px;
              font-weight: bold;
              font-size: 16px;
            }
          </style>
        </head>

        <body>

          <div class="container">

            <h1>
              Histórico — Balança 1
            </h1>

            <div class="info">

              <p>
                Relatório automático do sistema
                de armazém.
              </p>

              <p>
                Data do envio:
                ${dataMaputo}
              </p>

              <p>
                Total de registos:
                ${historico.length}
              </p>

            </div>

            <table>

              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Peso</th>
                  <th>Pessoa</th>
                  <th>Fingerprint</th>
                  <th>Impressão</th>
                  <th>Data</th>
                </tr>
              </thead>

              <tbody>
                ${linhas}
              </tbody>

            </table>

            <div class="total">
              Total de registos enviados:
              ${historico.length}
            </div>

          </div>

        </body>
      </html>
    `;

    /*
     * ========================================================
     * ENVIAR EMAIL
     * ========================================================
     */

    const resultado = await transporter.sendMail({
      from: `"Sistema de Armazém" <${remetente}>`,
      to: destino,
      subject:
        `Histórico Balança 1 — ${historico.length} registos`,
      html,
    });

    /*
     * ========================================================
     * RESPOSTA
     * ========================================================
     */

    return NextResponse.json({
      sucesso: true,
      enviado: true,
      total: historico.length,
      dataUTC,
      dataMaputo,
      messageId: resultado.messageId,
    });

  } catch (error) {

    console.error(
      "Erro ao enviar histórico:",
      error
    );

    return NextResponse.json(
      {
        sucesso: false,
        erro:
          "Erro interno ao enviar histórico.",
      },
      { status: 500 }
    );
  }
}

