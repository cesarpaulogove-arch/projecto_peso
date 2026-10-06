"use client";

interface CadastroProdutoProps {
  produto: string;
  setProduto: (value: string) => void;
  mqttOnline: boolean;
  onRegister: (
    produto: string
  ) => boolean;
}

export default function CadastroProduto({
  produto,
  setProduto,
  mqttOnline,
  onRegister,
}: CadastroProdutoProps) {
  function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    onRegister(produto);
  }

  return (
    <section className="bg-white rounded-2xl shadow-sm p-6">
      <h2 className="text-xl font-bold text-[#001431] mb-5">
        Produto
      </h2>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col md:flex-row gap-4"
      >
        <input
          value={produto}
          onChange={(event) =>
            setProduto(
              event.target.value
            )
          }
          placeholder="Digite o produto/material"
          className="flex-1 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#10b981]"
        />

        <button
          type="submit"
          disabled={!mqttOnline}
          className="bg-[#10b981] hover:bg-[#0ea371] disabled:opacity-50 text-white font-semibold rounded-xl px-6 py-3"
        >
          Registar Produto
        </button>
      </form>
    </section>
  );
}