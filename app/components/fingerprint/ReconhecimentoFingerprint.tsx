"use client";

import type { Person } from "../../types/armazem";

interface Props {
  pending: boolean;
  status: string;
  fingerprintId?: number;
  pessoa: Person | null;
}

export default function ReconhecimentoFingerprint({
  pending,
  status,
  fingerprintId,
  pessoa,
}: Props) {
  return (
    <section className="bg-white rounded-2xl shadow-sm p-6">
      <h2 className="text-xl font-bold text-[#001431]">
        Reconhecimento de Fingerprint
      </h2>

      <div className="mt-5 rounded-xl bg-gray-50 p-6">
        {pending ? (
          <div>
            <p className="text-lg font-semibold text-[#001431]">
              Aproxime o dedo cadastrado
            </p>

            <p className="text-gray-500 mt-2">
              {status ||
                "Aguardando leitura..."}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-gray-500">
              Estado
            </p>

            <p className="font-semibold text-[#001431] mt-1">
              {status ||
                "Nenhuma autenticação pendente."}
            </p>
          </div>
        )}

        {pessoa && (
          <div className="mt-5 border-t border-gray-200 pt-4">
            <p className="text-sm text-gray-500">
              Pessoa autorizada
            </p>

            <p className="text-lg font-bold text-[#10b981]">
              {pessoa.nome}
            </p>

            <p className="text-sm text-gray-500 mt-1">
              ID: {pessoa.id}
              {fingerprintId !==
                undefined &&
                ` • Fingerprint: ${fingerprintId}`}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}