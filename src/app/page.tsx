import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { plants } from "@/lib/db/schema";

// Data changes independently of deploys (reseeding after each curation
// batch), so read the DB per request instead of baking results in at build.
export const dynamic = "force-dynamic";

export default async function Home() {
  const rows = await db
    .select({
      id: plants.id,
      commonName: plants.commonName,
      scientificName: plants.scientificName,
      type: plants.type,
      guildLayer: plants.guildLayer,
      minZone: plants.minZone,
      maxZone: plants.maxZone,
    })
    .from(plants)
    .orderBy(asc(plants.commonName));

  return (
    <main style={{ maxWidth: 800, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Verdant Forest — Plants</h1>
      <p>{rows.length} plants seeded.</p>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid" }}>
            <th>Common name</th>
            <th>Type</th>
            <th>Guild layer</th>
            <th>Zone</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((plant) => (
            <tr key={plant.id} style={{ borderBottom: "1px solid #ccc4" }}>
              <td>
                {plant.commonName}
                <br />
                <em>{plant.scientificName}</em>
              </td>
              <td>{plant.type}</td>
              <td>{plant.guildLayer ?? "—"}</td>
              <td>
                {plant.minZone}–{plant.maxZone}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
