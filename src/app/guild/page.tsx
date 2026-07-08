import { asc } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/lib/db";
import { plants, relationships } from "@/lib/db/schema";
import { toEnginePlant } from "@/lib/db/to-engine-plant";
import { buildGuild } from "@/lib/engine/guild-builder";

export const dynamic = "force-dynamic";

export default async function GuildPage({
  searchParams,
}: {
  searchParams: Promise<{ anchor?: string }>;
}) {
  const { anchor: anchorId } = await searchParams;

  const allPlants = await db.select().from(plants).orderBy(asc(plants.commonName));
  const enginePlants = allPlants.map(toEnginePlant);
  const anchor = anchorId ? enginePlants.find((p) => p.id === anchorId) : undefined;

  const guild = anchor
    ? buildGuild(
        anchor,
        enginePlants.filter((p) => p.id !== anchor.id),
        anchorId ? await db.select().from(relationships) : [],
      )
    : null;

  return (
    <main style={{ maxWidth: 800, margin: "2rem auto", padding: "0 1rem" }}>
      <p>
        <Link href="/">← All plants</Link>
      </p>
      <h1>Guild builder</h1>
      <p>
        Pick an anchor plant; the builder greedily fills each empty layer
        (canopy → vine) with the best-fitting candidate, ruling out
        antagonists and preferring shade-tolerant species under a
        shade-casting anchor.
      </p>
      <form>
        <label>
          Anchor plant:{" "}
          <select name="anchor" defaultValue={anchorId ?? ""}>
            <option value="" disabled>
              Choose a plant…
            </option>
            {allPlants.map((plant) => (
              <option key={plant.id} value={plant.id}>
                {plant.commonName} ({plant.guildLayer ?? "no layer"})
              </option>
            ))}
          </select>
        </label>{" "}
        <button type="submit">Build guild</button>
      </form>

      {anchor && guild && (
        <section style={{ marginTop: "2rem" }}>
          <h2>Guild anchored on {anchor.commonName}</h2>
          {guild.members.length === 1 ? (
            <p>No compatible candidates found for any other layer.</p>
          ) : (
            <ol>
              {guild.members.map((member) => (
                <li key={member.plant.id} style={{ marginBottom: "1rem" }}>
                  <Link href={`/plants/${member.plant.id}`}>
                    <strong>{member.plant.commonName}</strong>
                  </Link>{" "}
                  <em>({member.plant.guildLayer ?? "unassigned layer"})</em>
                  {member.reasons.length > 0 && (
                    <ul>
                      {member.reasons.map((reason) => (
                        <li key={reason.text}>
                          {reason.isTraditional && (
                            <span
                              style={{
                                fontSize: "0.75em",
                                border: "1px solid",
                                borderRadius: 4,
                                padding: "0 4px",
                                marginRight: "0.5em",
                              }}
                            >
                              traditional
                            </span>
                          )}
                          {reason.text}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </main>
  );
}
