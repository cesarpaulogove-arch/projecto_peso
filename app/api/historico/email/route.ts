
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================
// TIPO — SOMENTE DADOS DA TABELA 1
// ============================================================

interface HistoricoBalanca1 {
  id: string | number;
  product?: string;
  weight: number;
  timestamp?: string;
}

// ============================================================
// DATA/HORA DE MOÇAMBIQUE
// ============================================================

function formatarDataMaputo(
  data: string | Date
): string {
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

// ============================================================
// ESCAPAR HTML
// ============================================================

function escaparHTML(
  valor: unknown
): string {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ============================================================
// POST
// ============================================================

export async function POST(
  req: Request
) {
  console.log("");
  console.log("========================================");
  console.log("API HISTÓRICO BALANÇA 1");
  console.log("REQUISIÇÃO RECEBIDA");
  console.log("========================================");

  try {

    // ========================================================
    // CONFIGURAÇÕES SMTP
    // ========================================================

    const smtpHost =
      process.env.EMAIL_SMTP_HOST;

    const smtpPort =
      Number(
        process.env.EMAIL_SMTP_PORT || 587
      );

    const smtpUser =
      process.env.EMAIL_SMTP_USER;

    const smtpPassword =
      process.env.EMAIL_SMTP_PASSWORD;

    const destino =
      process.env.EMAIL_DESTINO;

    const remetente =
      process.env.EMAIL_REMETENTE;

    console.log(
      "SMTP HOST:",
      smtpHost || "NÃO CONFIGURADO"
    );

    console.log(
      "SMTP PORT:",
      smtpPort
    );

    console.log(
      "SMTP USER:",
      smtpUser || "NÃO CONFIGURADO"
    );

    console.log(
      "SMTP PASSWORD:",
      smtpPassword
        ? "CONFIGURADO"
        : "NÃO CONFIGURADO"
    );

    console.log(
      "EMAIL DESTINO:",
      destino || "NÃO CONFIGURADO"
    );

    console.log(
      "EMAIL REMETENTE:",
      remetente || "NÃO CONFIGURADO"
    );

    // ========================================================
    // VALIDAR CONFIGURAÇÃO
    // ========================================================

    if (
      !smtpHost ||
      !smtpUser ||
      !smtpPassword ||
      !destino ||
      !remetente
    ) {
      console.error(
        "CONFIGURAÇÃO DE EMAIL INCOMPLETA."
      );

      return NextResponse.json(
        {
          sucesso: false,
          enviado: false,
          erro:
            "Configuração SMTP incompleta. Verifique EMAIL_SMTP_HOST, EMAIL_SMTP_PORT, EMAIL_SMTP_USER, EMAIL_SMTP_PASSWORD, EMAIL_DESTINO e EMAIL_REMETENTE.",
        },
        {
          status: 500,
        }
      );
    }

    // ========================================================
    // CRIAR TRANSPORTADOR
    // ========================================================

    const transporter =
      nodemailer.createTransport({
        host: smtpHost,

        port: smtpPort,

        secure:
          smtpPort === 465,

        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },

        connectionTimeout:
          15000,

        greetingTimeout:
          15000,

        socketTimeout:
          20000,
      });

    // ========================================================
    // TESTAR SMTP
    // ========================================================

    console.log(
      "A verificar conexão SMTP..."
    );

    await transporter.verify();

    console.log(
      "SMTP VERIFICADO COM SUCESSO."
    );

    // ========================================================
    // RECEBER BODY
    // ========================================================

    const body =
      await req.json();

    console.log(
      "BODY RECEBIDO."
    );

    // ========================================================
    // SOMENTE HISTÓRICO DA TABELA 1
    // ========================================================

    const historico =
      body?.historico;

    // ========================================================
    // VALIDAR ARRAY
    // ========================================================

    if (
      !Array.isArray(
        historico
      )
    ) {
      console.error(
        "O campo historico não é um array."
      );

      return NextResponse.json(
        {
          sucesso: false,
          enviado: false,
          erro:
            "O histórico da Tabela 1 deve ser um array.",
        },
        {
          status: 400,
        }
      );
    }

    console.log(
      "Registos recebidos:",
      historico.length
    );

    // ========================================================
    // SEM HISTÓRICO
    // ========================================================

    if (
      historico.length === 0
    ) {
      console.log(
        "Nenhum registo para enviar."
      );

      return NextResponse.json({
        sucesso: true,
        enviado: false,
        total: 0,
        mensagem:
          "Não existem registos no histórico da Tabela 1.",
      });
    }

    // ========================================================
    // NORMALIZAR
    //
    // IMPORTANTE:
    // SOMENTE:
    // - id
    // - product
    // - weight
    // - timestamp
    //
    // NÃO EXISTE:
    // - pessoaNome
    // - fingerprintId
    // - printed
    // ========================================================

    const historicoBalanca1:
      HistoricoBalanca1[] =
      historico.map(
        (item: any) => {

          let peso =
            Number(
              item?.weight ??
              item?.peso ??
              0
            );

          if (
            !Number.isFinite(
              peso
            )
          ) {
            peso = 0;
          }

          peso =
            Math.abs(
              peso
            );

          return {
            id:
              item?.id ??
              `${Date.now()}-${Math.random()
                .toString(36)
                .slice(2)}`,

            product:
              String(
                item?.product ??
                item?.produto ??
                ""
              ).trim(),

            weight:
              peso,

            timestamp:
              item?.timestamp ??
              "",
          };
        }
      );

    console.log(
      "Histórico Tabela 1 normalizado:",
      historicoBalanca1.length
    );

    // ========================================================
    // DATA/HORA DO ENVIO
    // ========================================================

    const agora =
      new Date();

    const dataUTC =
      agora.toISOString();

    const dataMaputo =
      formatarDataMaputo(
        agora
      );

    // ========================================================
    // LINHAS HTML
    //
    // SOMENTE:
    // PRODUTO
    // PESO
    // DATA
    // ========================================================

    const linhas =
      historicoBalanca1
        .map(
          (item) => {

            const dataRegistro =
              item.timestamp
                ? formatarDataMaputo(
                    item.timestamp
                  )
                : "Data indisponível";

            return `
              <tr>

                <td>
                  ${escaparHTML(
                    item.product || "-"
                  )}
                </td>

                <td>
                  ${item.weight.toFixed(2)} kg
                </td>

                <td>
                  ${escaparHTML(
                    dataRegistro
                  )}
                </td>

              </tr>
            `;
          }
        )
        .join("");

    // ========================================================
    // HTML DO EMAIL
    // ========================================================

    const html = `
      <!DOCTYPE html>

      <html lang="pt">

      <head>

        <meta charset="UTF-8">

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        >

        <title>
          Histórico Balança 1
        </title>

        <style>

          body {
            font-family:
              Arial,
              Helvetica,
              sans-serif;

            background:
              #f5f7fa;

            padding:
              30px;

            color:
              #001431;
          }

          .container {
            max-width:
              1000px;

            margin:
              auto;

            background:
              white;

            padding:
              30px;

            border-radius:
              12px;
          }

          h1 {
            color:
              #001431;
          }

          .info {
            margin-bottom:
              20px;

            color:
              #666;
          }

          .origem {
            display:
              inline-block;

            padding:
              6px 10px;

            border-radius:
              6px;

            background:
              #eef2f7;

            font-weight:
              bold;
          }

          table {
            width:
              100%;

            border-collapse:
              collapse;
          }

          th {
            background:
              #001431;

            color:
              white;

            padding:
              10px;

            text-align:
              left;
          }

          td {
            padding:
              10px;

            border-bottom:
              1px solid #ddd;
          }

          .total {
            margin-top:
              20px;

            font-weight:
              bold;

            font-size:
              16px;
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
              Relatório automático do
              Sistema de Armazém.
            </p>

            <p>
              <span class="origem">
                Tabela 1 — Balança 1
              </span>
            </p>

            <p>
              Data do envio:
              ${dataMaputo}
            </p>

            <p>
              Total de registos:
              ${historicoBalanca1.length}
            </p>

          </div>

          <table>

            <thead>

              <tr>

                <th>
                  Produto
                </th>

                <th>
                  Peso
                </th>

                <th>
                  Data
                </th>

              </tr>

            </thead>

            <tbody>

              ${linhas}

            </tbody>

          </table>

          <div class="total">

            Total de registos enviados:
            ${historicoBalanca1.length}

          </div>

        </div>

      </body>

      </html>
    `;

    // ========================================================
    // ENVIO
    // ========================================================

    console.log(
      "A enviar email..."
    );

    console.log(
      "FROM:",
      remetente
    );

    console.log(
      "TO:",
      destino
    );

    const resultado =
      await transporter.sendMail({

        from:
          `"Sistema de Armazém" <${remetente}>`,

        to:
          destino,

        subject:
          `Histórico Balança 1 — ${historicoBalanca1.length} registos`,

        html,
      });

    // ========================================================
    // SUCESSO
    // ========================================================

    console.log(
      "========================================"
    );

    console.log(
      "EMAIL ENVIADO COM SUCESSO"
    );

    console.log(
      "Message ID:",
      resultado.messageId
    );

    console.log(
      "========================================"
    );

    return NextResponse.json({
      sucesso: true,

      enviado: true,

      origem:
        "Tabela 1 — Balança 1",

      total:
        historicoBalanca1.length,

      dataUTC,

      dataMaputo,

      messageId:
        resultado.messageId,
    });

  } catch (error) {

    console.error(
      "========================================"
    );

    console.error(
      "ERRO AO ENVIAR EMAIL"
    );

    console.error(
      error
    );

    console.error(
      "========================================"
    );

    return NextResponse.json(
      {
        sucesso: false,

        enviado: false,

        erro:
          error instanceof Error
            ? error.message
            : "Erro interno ao enviar histórico da Tabela 1.",
      },
      {
        status: 500,
      }
    );
  }
}

