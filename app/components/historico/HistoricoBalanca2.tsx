"use client";

import type {
  WeighingSensor1,
} from "../../types/armazem";

interface Props {
  historico: WeighingSensor1[];
}

export default function HistoricoBalanca1({
  historico,
}: Props) {
  return (
    <section className="bg-white rounded-2xl shadow-sm p-6">
      <h2 className="text-xl font-bold text-[#001431] mb-5">
        Histórico — Balança 2
      </h2>

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
                Estado
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
                  colSpan={4}
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
                    {item.status}
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