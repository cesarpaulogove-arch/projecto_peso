
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
   * do histórico.
   */
  useEffect(() => {
    historicoRef.current = historico;
  }, [historico]);

  /*
   * Envia o histórico da BALANÇA 1
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
              "Nenhum histórico da Balança 1 para enviar."
            );

            return;
          }

          console.log(
            "Enviando histórico da Balança 1 por e-mail..."
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
                  tipo: "balanca1",
                }),
              }
            );

          const resultado =
            await resposta.json();

          if (!resposta.ok) {
            console.error(
              "Erro ao enviar histórico da Balança 1:",
              resultado
            );

            return;
          }

          console.log(
            "Histórico da Balança 1 enviado com sucesso:",
            resultado
          );
        } catch (error) {
          console.error(
            "Erro no envio automático da Balança 1:",
            error
          );
        }
      },

      // 10 minutos
      10 * 60 * 1000
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
            Registo dos produtos pesados na Balança 1.
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
                Data
              </th>
            </tr>
          </thead>

          <tbody>
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
              historico.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-gray-100"
                >
                  <td className="p-3 font-medium">
                    {item.product || "-"}
                  </td>

                  <td className="p-3 font-semibold">
                    {Number(item.weight).toFixed(2)} kg
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

