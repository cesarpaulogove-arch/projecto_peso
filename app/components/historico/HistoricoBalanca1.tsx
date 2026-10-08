
"use client";

import { useEffect, useRef } from "react";

import type {
  WeighingSensor1,
} from "../../types/armazem";

interface Props {
  historico: WeighingSensor1[];
}

// ======================================================
// CONVERTER DATA/HORA
// ======================================================

function formatarDataHoraValor(
  valor: unknown
): string {

  if (
    valor === undefined ||
    valor === null
  ) {
    return "Data/hora indisponível";
  }

  const texto =
    String(valor).trim();

  if (
    texto === "" ||
    texto === "data_indisponivel" ||
    texto === "null" ||
    texto === "undefined"
  ) {
    return "Data/hora indisponível";
  }

  // ====================================================
  // NÚMERO
  // ====================================================

  if (typeof valor === "number") {

    // Unix timestamp em segundos
    if (
      valor >= 1_000_000_000 &&
      valor < 10_000_000_000
    ) {

      const data =
        new Date(valor * 1000);

      if (!isNaN(data.getTime())) {
        return formatarData(data);
      }

      return "Data/hora indisponível";
    }

    // Unix timestamp em milissegundos
    if (
      valor >= 100_000_000_000 &&
      valor < 10_000_000_000_000
    ) {

      const data =
        new Date(valor);

      if (!isNaN(data.getTime())) {
        return formatarData(data);
      }

      return "Data/hora indisponível";
    }

    // Número pequeno:
    // provavelmente millis() do ESP32.
    return "Data/hora indisponível";
  }

  // ====================================================
  // STRING NUMÉRICA
  // ====================================================

  if (/^\d+$/.test(texto)) {

    const numero =
      Number(texto);

    // Unix timestamp em segundos
    if (
      numero >= 1_000_000_000 &&
      numero < 10_000_000_000
    ) {

      const data =
        new Date(numero * 1000);

      if (!isNaN(data.getTime())) {
        return formatarData(data);
      }

      return "Data/hora indisponível";
    }

    // Unix timestamp em milissegundos
    if (
      numero >= 100_000_000_000 &&
      numero < 10_000_000_000_000
    ) {

      const data =
        new Date(numero);

      if (!isNaN(data.getTime())) {
        return formatarData(data);
      }

      return "Data/hora indisponível";
    }

    // Número pequeno:
    // provavelmente millis() do ESP32.
    return "Data/hora indisponível";
  }

  // ====================================================
  // STRING DE DATA
  // ====================================================

  const data =
    new Date(texto);

  if (!isNaN(data.getTime())) {

    const ano =
      data.getFullYear();

    // Evitar datas inválidas/antigas
    if (ano < 2000) {
      return "Data/hora indisponível";
    }

    return formatarData(data);
  }

  return "Data/hora indisponível";
}

// ======================================================
// FORMATAR DATA
// ======================================================

function formatarData(
  data: Date
): string {

  return data.toLocaleString(
    "pt-MZ",
    {
      timeZone: "Africa/Maputo",

      day: "2-digit",
      month: "2-digit",
      year: "numeric",

      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",

      hour12: false,
    }
  );
}

// ======================================================
// FORMATAR DATA E HORA DO REGISTRO
// ======================================================

function formatarDataHora(
  item: WeighingSensor1
): string {

  const itemAny =
    item as WeighingSensor1 & {
      data_hora?: unknown;
      dataHora?: unknown;
      date?: unknown;
      createdAt?: unknown;
      timestamp?: unknown;
    };

  // ====================================================
  // PRIORIDADE 1 — data_hora
  // ====================================================

  if (
    itemAny.data_hora &&
    itemAny.data_hora !== "data_indisponivel"
  ) {

    const resultado =
      formatarDataHoraValor(
        itemAny.data_hora
      );

    if (
      resultado !==
      "Data/hora indisponível"
    ) {
      return resultado;
    }
  }

  // ====================================================
  // PRIORIDADE 2 — dataHora
  // ====================================================

  if (
    itemAny.dataHora &&
    itemAny.dataHora !== "data_indisponivel"
  ) {

    const resultado =
      formatarDataHoraValor(
        itemAny.dataHora
      );

    if (
      resultado !==
      "Data/hora indisponível"
    ) {
      return resultado;
    }
  }

  // ====================================================
  // PRIORIDADE 3 — date
  // ====================================================

  if (itemAny.date) {

    const resultado =
      formatarDataHoraValor(
        itemAny.date
      );

    if (
      resultado !==
      "Data/hora indisponível"
    ) {
      return resultado;
    }
  }

  // ====================================================
  // PRIORIDADE 4 — createdAt
  // ====================================================

  if (itemAny.createdAt) {

    const resultado =
      formatarDataHoraValor(
        itemAny.createdAt
      );

    if (
      resultado !==
      "Data/hora indisponível"
    ) {
      return resultado;
    }
  }

  // ====================================================
  // PRIORIDADE 5 — timestamp
  // ====================================================

  if (
    itemAny.timestamp !== undefined
  ) {

    const resultado =
      formatarDataHoraValor(
        itemAny.timestamp
      );

    if (
      resultado !==
      "Data/hora indisponível"
    ) {
      return resultado;
    }
  }

  return "Data/hora indisponível";
}

// ======================================================
// PREPARAR SOMENTE DADOS DA BALANÇA 1
// ======================================================

function prepararHistoricoBalanca1(
  dados: WeighingSensor1[]
) {

  return dados.map(
    (item) => {

      const peso =
        Number(item.weight);

      return {
        id:
          item.id,

        product:
          item.product || "",

        weight:
          Number.isFinite(peso)
            ? Math.abs(peso)
            : 0,

        pessoaNome:
          (item as any).pessoaNome ??
          "",

        fingerprintId:
          (item as any).fingerprintId ??
          "",

        printed:
          Boolean(
            (item as any).printed
          ),

        timestamp:
          (item as any).timestamp ??
          "",
      };
    }
  );
}

// ======================================================
// COMPONENTE
// ======================================================

export default function HistoricoBalanca1({
  historico,
}: Props) {

  const historicoRef =
    useRef<WeighingSensor1[]>(
      historico
    );

  // ====================================================
  // MANTER REFERÊNCIA ATUALIZADA
  // ====================================================

  useEffect(() => {

    historicoRef.current =
      historico;

  }, [historico]);

  // ====================================================
  // ENVIO AUTOMÁTICO POR E-MAIL
  // SOMENTE TABELA 1 / BALANÇA 1
  // A CADA 1 MINUTO
  // ====================================================

  useEffect(() => {

    const enviarHistorico =
      async () => {

        try {

          const dados =
            historicoRef.current;

          // --------------------------------------------
          // NÃO ENVIAR SE NÃO EXISTIR HISTÓRICO
          // --------------------------------------------

          if (
            !dados ||
            dados.length === 0
          ) {

            console.log(
              "Nenhum histórico da Balança 1 para enviar."
            );

            return;
          }

          // --------------------------------------------
          // PREPARAR SOMENTE TABELA 1
          // --------------------------------------------

          const historicoBalanca1 =
            prepararHistoricoBalanca1(
              dados
            );

          console.log(
            "========================================"
          );

          console.log(
            "ENVIO AUTOMÁTICO DE HISTÓRICO"
          );

          console.log(
            "Origem: Tabela 1 / Balança 1"
          );

          console.log(
            "Total de registros:",
            historicoBalanca1.length
          );

          console.log(
            "========================================"
          );

          // --------------------------------------------
          // ENVIAR PARA API
          // --------------------------------------------

          const resposta =
            await fetch(
              "/api/historico/email",
              {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    historico:
                      historicoBalanca1,

                    tipo:
                      "balanca1",
                  }),
                }
            );

          // --------------------------------------------
          // LER RESPOSTA
          // --------------------------------------------

          const resultado =
            await resposta.json();

          // --------------------------------------------
          // ERRO
          // --------------------------------------------

          if (!resposta.ok) {

            console.error(
              "Erro ao enviar histórico da Balança 1:",
              resultado
            );

            return;
          }

          // --------------------------------------------
          // SUCESSO
          // --------------------------------------------

          console.log(
            "Histórico da Tabela 1 enviado com sucesso:",
            resultado
          );

        } catch (error) {

          console.error(
            "Erro no envio automático da Balança 1:",
            error
          );

        }

      };

    // ==================================================
    // PRIMEIRO ENVIO:
    // NÃO ENVIA IMEDIATAMENTE
    //
    // Depois:
    // 60 segundos
    // 120 segundos
    // 180 segundos
    // ...
    // ==================================================

    const intervalo =
      setInterval(
        enviarHistorico,
        60 * 1000
      );

    // ==================================================
    // LIMPAR INTERVALO
    // ==================================================

    return () => {

      clearInterval(
        intervalo
      );

    };

  }, []);

  // ====================================================
  // INTERFACE
  // ====================================================

  return (
    <section className="bg-white rounded-2xl shadow-sm p-6">

      {/* ==================================================
          CABEÇALHO
      ================================================== */}

      <div className="flex items-center justify-between mb-5">

        <div>

          <h2 className="text-xl font-bold text-[#001431]">
            Histórico — Balança 1
          </h2>

          <p className="text-sm text-gray-500">
            Registo dos produtos pesados na Balança 1.
          </p>

        </div>

      </div>

      {/* ==================================================
          TABELA
      ================================================== */}

      <div className="overflow-x-auto">

        <table className="w-full text-sm">

          <thead>

            <tr className="border-b border-gray-200 text-left">

              <th className="p-3">
                Produto
              </th>

              <th className="p-3">
                Peso
              </th>

              <th className="p-3">
                Data e Hora
              </th>

            </tr>

          </thead>

          <tbody>

            {/* ==================================================
                SEM REGISTOS
            ================================================== */}

            {historico.length === 0 ? (

              <tr>

                <td
                  colSpan={3}
                  className="p-6 text-center text-gray-500"
                >
                  Nenhum produto registado.
                </td>

              </tr>

            ) : (

              /* ==================================================
                 REGISTOS DA BALANÇA 1
              ================================================== */

              historico.map(
                (
                  item,
                  index
                ) => {

                  const peso =
                    Number(
                      item.weight
                    );

                  const pesoPositivo =
                    Number.isFinite(
                      peso
                    )
                      ? Math.abs(
                          peso
                        )
                      : 0;

                  return (

                    <tr
                      key={
                        item.id ??
                        `balanca1-${index}`
                      }

                      className="border-b border-gray-100"
                    >

                      {/* PRODUTO */}

                      <td className="p-3 font-medium">

                        {item.product || "-"}

                      </td>

                      {/* PESO */}

                      <td className="p-3 font-semibold">

                        {pesoPositivo.toFixed(2)}
                        {" "}kg

                      </td>

                      {/* DATA/HORA */}

                      <td className="p-3">

                        {formatarDataHora(
                          item
                        )}

                      </td>

                    </tr>

                  );
                }
              )

            )}

          </tbody>

        </table>

      </div>

    </section>
  );
}

