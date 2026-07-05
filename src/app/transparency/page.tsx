import { asc } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/lib/db";
import { sources } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const SOURCE_TYPE_LABEL: Record<string, string> = {
  peer_reviewed: "Peer-reviewed",
  extension_service: "Extension service",
  horticultural_org: "Horticultural org",
  book: "Book",
  traditional: "Traditional",
};

const TIERS = [
  {
    tier: "A",
    meaning: "Peer-reviewed research supports the interaction",
    example: "Intercropping / allelopathy studies",
    visibility: "Shown by default",
  },
  {
    tier: "B",
    meaning: "Horticultural authority / extension service",
    example: "MU Extension, Missouri Botanical Garden, RHS",
    visibility: "Shown by default",
  },
  {
    tier: "C",
    meaning: "Widely reported tradition, plausible mechanism, untested",
    example: "Permaculture literature, consistent grower reports",
    visibility: "Opt-in (tradition/folklore toggle)",
  },
  {
    tier: "D",
    meaning: "Folklore: unsupported, contradicted, or debunked",
    example: "Unsourced \"X loves Y\" chains",
    visibility: "Opt-in, labeled",
  },
];

export default async function TransparencyPage() {
  const rows = await db
    .select({
      id: sources.id,
      title: sources.title,
      publisher: sources.publisher,
      url: sources.url,
      sourceType: sources.sourceType,
      year: sources.year,
    })
    .from(sources)
    .orderBy(asc(sources.title));

  return (
    <main style={{ maxWidth: 800, margin: "2rem auto", padding: "0 1rem" }}>
      <p>
        <Link href="/">← All plants</Link>
      </p>
      <h1>Data sources & evidence tiers</h1>
      <p>
        Every companion-planting claim in Verdant Forest carries an evidence
        tier and at least one cited source. Tradition and folklore are
        included, but labeled honestly rather than presented as science.
      </p>

      <h2>Evidence tiers</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "2rem" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid" }}>
            <th>Tier</th>
            <th>Meaning</th>
            <th>Example</th>
            <th>Default visibility</th>
          </tr>
        </thead>
        <tbody>
          {TIERS.map((row) => (
            <tr key={row.tier} style={{ borderBottom: "1px solid #ccc4" }}>
              <td>
                <strong>{row.tier}</strong>
              </td>
              <td>{row.meaning}</td>
              <td>{row.example}</td>
              <td>{row.visibility}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Sources ({rows.length})</h2>
      <ul>
        {rows.map((source) => (
          <li key={source.id} style={{ marginBottom: "0.75rem" }}>
            {source.url ? (
              <a href={source.url} target="_blank" rel="noopener noreferrer">
                {source.title}
              </a>
            ) : (
              source.title
            )}
            {source.publisher && <> — {source.publisher}</>}
            {source.year && <> ({source.year})</>}
            <br />
            <small>{SOURCE_TYPE_LABEL[source.sourceType] ?? source.sourceType}</small>
          </li>
        ))}
      </ul>
    </main>
  );
}
