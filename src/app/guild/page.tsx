import { asc } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/lib/db";
import { plants, relationships } from "@/lib/db/schema";
import { toEnginePlant } from "@/lib/db/to-engine-plant";
import { buildGuild } from "@/lib/engine/guild-builder";

export const dynamic = "force-dynamic";

function toIdArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export default async function GuildPage({
  searchParams,
}: {
  searchParams: Promise<{ anchor?: string; present?: string | string[] }>;
}) {
  const { anchor: anchorId, present } = await searchParams;
  const presentIds = toIdArray(present).filter((id) => id !== anchorId);

  const allPlants = await db.select().from(plants).orderBy(asc(plants.commonName));
  const enginePlants = allPlants.map(toEnginePlant);
  const anchor = anchorId ? enginePlants.find((p) => p.id === anchorId) : undefined;
  const alsoPresent = enginePlants.filter((p) => presentIds.includes(p.id));
  const presentPlants = anchor ? [anchor, ...alsoPresent] : [];

  const guild = anchor
    ? buildGuild(
        presentPlants,
        enginePlants.filter((p) => !presentPlants.some((pp) => pp.id === p.id)),
        await db.select().from(relationships),
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
        shade-casting anchor. Site features (existing yard trees, marked
        below) can anchor a guild but are never auto-added to fill a layer.
      </p>
      <form>
        <p>
          <label>
            Anchor plant:{" "}
            <select name="anchor" defaultValue={anchorId ?? ""}>
              <option value="" disabled>
                Choose a plant…
              </option>
              {allPlants.map((plant) => (
                <option key={plant.id} value={plant.id}>
                  {plant.commonName} ({plant.guildLayer ?? "no layer"})
                  {!plant.recommendable ? " — site feature" : ""}
                </option>
              ))}
            </select>
          </label>
        </p>
        <p>
          <label htmlFor="present-select">
            What else is already growing there? (optional — ctrl/cmd-click to
            select multiple)
          </label>
          <br />
          <select
            id="present-select"
            name="present"
            multiple
            size={6}
            defaultValue={presentIds}
          >
            {allPlants.map((plant) => (
              <option key={plant.id} value={plant.id}>
                {plant.commonName} ({plant.guildLayer ?? "no layer"})
                {!plant.recommendable ? " — site feature" : ""}
              </option>
            ))}
          </select>
        </p>
        <button type="submit">Build guild</button>
      </form>

      {anchor && guild && (
        <section style={{ marginTop: "2rem" }}>
          <h2>
            Guild built around{" "}
            {presentPlants.map((p) => p.commonName).join(", ")}
          </h2>
          {guild.conflicts.length > 0 && (
            <div style={{ border: "2px solid", padding: "0.75rem", marginBottom: "1rem" }}>
              <strong>⚠ Conflict between plants you already have:</strong>
              <ul>
                {guild.conflicts.map((conflict) => (
                  <li key={`${conflict.plantAId}-${conflict.plantBId}`}>
                    {conflict.plantAName} × {conflict.plantBName} ({conflict.evidenceTier}
                    -tier): {conflict.summary}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {guild.members.length === presentPlants.length ? (
            <p>No compatible candidates found for any other layer.</p>
          ) : (
            <ol>
              {guild.members.map((member) => (
                <li key={member.plant.id} style={{ marginBottom: "1rem" }}>
                  <Link href={`/plants/${member.plant.id}`}>
                    <strong>{member.plant.commonName}</strong>
                  </Link>{" "}
                  <em>({member.plant.guildLayer ?? "unassigned layer"})</em>{" "}
                  {presentPlants.some((pp) => pp.id === member.plant.id) ? (
                    <small>— already there</small>
                  ) : (
                    <small>— suggested</small>
                  )}
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
