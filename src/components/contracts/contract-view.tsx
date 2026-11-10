import type { Block, Inline } from "@/lib/contracts/rules";

export type CommissionTableView = { paliers: { label: string }[]; rows: { service: string; amounts: number[] }[] };

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

function Text({ inline }: { inline: Inline }) {
  return (
    <>
      {inline.map((p, i) => (p.bold ? <strong key={i}>{p.text}</strong> : <span key={i}>{p.text}</span>))}
    </>
  );
}

/** Contrat rempli rendu en HTML (Inter, noir, intertitres rouges, 16 px sur mobile). */
export function ContractView({ blocks, table, partnerName }: { blocks: Block[]; table: CommissionTableView; partnerName: string }) {
  return (
    <article className="space-y-3 text-[16px] leading-relaxed text-texte" lang="fr">
      {blocks.map((b, i) => {
        if (b.type === "h1") return <h2 key={i} className="text-2xl font-extrabold leading-tight"><Text inline={b.inline} /></h2>;
        if (b.type === "h2") return <h3 key={i} className="pt-3 text-lg font-extrabold text-rouge"><Text inline={b.inline} /></h3>;
        if (b.type === "p") return <p key={i}><Text inline={b.inline} /></p>;
        if (b.type === "ul" || b.type === "ol") {
          const List = b.type;
          return (
            <List key={i} className={`space-y-1 pl-6 ${b.type === "ul" ? "list-disc" : "list-decimal"}`}>
              {b.items.map((it, j) => (
                <li key={j}>
                  <Text inline={it} />
                </li>
              ))}
            </List>
          );
        }
        if (b.type === "commissions") {
          return (
            <div key={i} className="overflow-x-auto rounded-[10px] border border-bord">
              <table className="w-full min-w-[460px] text-[14px]">
                <thead className="bg-noir text-white">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold">Cursus de l&apos;étudiant</th>
                    {table.paliers.map((p) => (
                      <th key={p.label} className="px-2 py-2 text-center text-[13px] font-bold">
                        {p.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((r, ri) => (
                    <tr key={r.service} className={ri % 2 ? "bg-fond" : ""}>
                      <td className="px-3 py-2 font-bold">{r.service}</td>
                      {r.amounts.map((a, ai) => (
                        <td key={ai} className="whitespace-nowrap px-2 py-2 text-center tabular-nums">
                          {fmt(a)} FCFA
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return (
          <div key={i} className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[10px] border border-bord p-3 text-[14px]">
              <p className="font-extrabold text-rouge">POUR ODYSSEO</p>
              <p>Dr Jiresse Nguetsa Kuate Loïc, fondateur</p>
              <p className="text-gris">Signature et cachet apposés sur le PDF signé.</p>
            </div>
            <div className="rounded-[10px] border border-bord p-3 text-[14px]">
              <p className="font-extrabold text-rouge">LE PARTENAIRE</p>
              <p>{partnerName}</p>
              <p className="text-gris">Signature électronique ci-dessous.</p>
            </div>
          </div>
        );
      })}
    </article>
  );
}
