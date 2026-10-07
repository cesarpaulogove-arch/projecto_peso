
"use client";

import type {
  FingerprintHistory,
} from "../../types/armazem";

interface Props {
  historico: FingerprintHistory[];
}

export default function HistoricoFingerprint({
  historico,
}: Props) {
  return (
    <section className="bg-white rounded-2xl shadow-sm p-6">

      {/* ======================================================
          CABEÇALHO
      ====================================================== */}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">

        <div>
          <h2 className="text-xl font-bold text-[#001431]">
            Histórico — Fingerprint
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Registo das utilizações autorizadas do leitor biométrico.
          </p>
        </div>

        <div className="text-sm text-gray-500">
          {historico.length} utilização
          {historico.length !== 1 ? "ões" : ""}
        </div>

      </div>

      {/* ======================================================
          TABELA
      ====================================================== */}

      <div className="overflow-x-auto">

        <table className="w-full text-sm">

          <thead>
            <tr className="border-b border-gray-200 text-left">

              <th className="p-3">
                Pessoa
              </th>

              <th className="p-3">
                ID Fingerprint
              </th>

              <th className="p-3">
                Estado
              </th>

              <th className="p-3">
                Data / Hora
              </th>

              <th className="p-3">
                Dispositivo
              </th>

            </tr>
          </thead>

          <tbody>

            {/* ==================================================
                SEM HISTÓRICO
            ================================================== */}

            {historico.length === 0 ? (

              <tr>
                <td
                  colSpan={5}
                  className="p-8 text-center text-gray-500"
                >
                  Nenhuma utilização autorizada registada.
                </td>
              </tr>

            ) : (

              historico.map((item) => (

                <tr
                  key={item.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition"
                >

                  {/* =================================================
                      PESSOA
                  ================================================= */}

                  <td className="p-3">

                    <div className="font-semibold text-[#001431]">
                      {item.pessoaNome || "Pessoa desconhecida"}
                    </div>

                    {item.pessoaId && (
                      <div className="text-xs text-gray-400 mt-1">
                        Pessoa ID: {item.pessoaId}
                      </div>
                    )}

                  </td>

                  {/* =================================================
                      FINGERPRINT
                  ================================================= */}

                  <td className="p-3 font-mono font-semibold">
                    {item.fingerprintId}
                  </td>

                  {/* =================================================
                      ESTADO
                  ================================================= */}

                  <td className="p-3">

                    <span className="inline-flex items-center gap-2 text-green-600 font-semibold">

                      <span className="w-2 h-2 rounded-full bg-green-500" />

                      Autorizado

                    </span>

                  </td>

                  {/* =================================================
                      DATA / HORA
                  ================================================= */}

                  <td className="p-3 whitespace-nowrap">

                    {new Date(
                      item.timestamp
                    ).toLocaleString(
                      "pt-MZ",
                      {
                        dateStyle: "short",
                        timeStyle: "medium",
                      }
                    )}

                  </td>

                  {/* =================================================
                      DISPOSITIVO
                  ================================================= */}

                  <td className="p-3 text-gray-500">
                    {item.dispositivo ||
                      "ESP32-Armazém"}
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
