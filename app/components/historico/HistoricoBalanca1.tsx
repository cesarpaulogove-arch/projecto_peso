"use client";

import { useEffect, useRef } from "react";

import type {
  WeighingSensor1,
} from "../../types/armazem";

interface Props {
  historico: WeighingSensor1[];
}

export default function HistoricoBalanca1({
  historico,
}: Props) {

  const historicoRef =
    useRef<WeighingSensor1[]>(historico);

  /*
   * Mantém sempre a versão mais recente
   * do histórico disponível para o intervalo.
   */
  useEffect(() => {
    historicoRef.current = historico;
  }, [historico]);

  /*
   * Envia todos os dados históricos
   * automaticamente a cada 10 minutos.
   */
  useEffect(() => {
    const intervalo = setInterval(
      async () => {
        try {
          const dados =
            historicoRef.current;

          if (!dados || dados.length === 0) {
            console.log(
              "Nenhum histórico para enviar."
            );

            return;
          }

          console.log(
            "Enviando histórico por e-mail..."
          );

          const resposta =
            await fetch(
              "/api/historico/email",
              {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body: JSON.stringify({
                  historico: dados,
                }),
              }
            );

          const resultado =
            await resposta.json();

          if (!resposta.ok) {
            console.error(
              "Erro ao enviar histórico:",
              resultado
            );

            return;
          }

          console.log(
            "Histórico enviado com sucesso:",
            resultado
          );
        } catch (error) {
          console.error(
            "Erro no envio automático:",
            error
          );
        }
      },

      // 10 minutos
      1 * 60 * 1000
    );

    return () => {
      clearInterval(intervalo);
    };
  }, []);

  return (
    <section className="bg-white rounded-2xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-[#001431]">
            Histórico — Balança 1
          </h2>

          <p className="text-sm text-gray-500">
            Registos finalizados após
            autorização e impressão.
          </p>
        </div>
      </div>

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
                Pessoa
              </th>

              <th className="p-3">
                Fingerprint
              </th>

              <th className="p-3">
                Impressão
              </th>

              <th className="p-3">
                Data
              </th>
            </tr>
          </thead>

          <tbody>
            {historico.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="p-6 text-center text-gray-500"
                >
                  Nenhum registo.
                </td>
              </tr>
            ) : (
              historico.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-gray-100"
                >
                  <td className="p-3">
                    {item.product || "-"}
                  </td>

                  <td className="p-3 font-semibold">
                    {item.weight.toFixed(2)} kg
                  </td>

                  <td className="p-3">
                    {item.pessoaNome || "-"}
                  </td>

                  <td className="p-3">
                    {item.fingerprintId ?? "-"}
                  </td>

                  <td className="p-3">
                    {item.printed ? (
                      <span className="text-green-600 font-semibold">
                        Impresso
                      </span>
                    ) : (
                      <span className="text-gray-500">
                        —
                      </span>
                    )}
                  </td>

                  <td className="p-3">
                    {new Date(
                      item.timestamp
                    ).toLocaleString("pt-MZ")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}