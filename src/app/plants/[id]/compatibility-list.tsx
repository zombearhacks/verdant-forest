"use client";

import { useState } from "react";
import Link from "next/link";
import type { PairingCard } from "@/lib/engine/pairing";

interface Card extends PairingCard {
  otherPlantId: string;
  otherCommonName: string;
  otherScientificName: string;
  sources: { title: string; url: string | null }[];
}

export function CompatibilityList({ cards }: { cards: Card[] }) {
  const [showAll, setShowAll] = useState(false);
  const hiddenCount = cards.filter((card) => !card.defaultVisible).length;
  const visible = cards.filter((card) => card.defaultVisible || showAll);

  const goodPairings = visible.filter((card) => card.verdict === "good pairing");
  const keepApart = visible.filter((card) => card.verdict === "keep apart");
  const neutral = visible.filter((card) => card.verdict === "neutral");

  return (
    <section>
      {hiddenCount > 0 && (
        <label style={{ display: "block", margin: "1rem 0" }}>
          <input
            type="checkbox"
            checked={showAll}
            onChange={(event) => setShowAll(event.target.checked)}
          />{" "}
          Show tradition/folklore ({hiddenCount} hidden)
        </label>
      )}

      <h2>Grows well with</h2>
      {goodPairings.length === 0 && <p>No known companions yet.</p>}
      <ul>
        {goodPairings.map((card) => (
          <CardItem key={card.otherPlantId} card={card} />
        ))}
      </ul>

      <h2>Keep apart from</h2>
      {keepApart.length === 0 && <p>No known antagonists.</p>}
      <ul>
        {keepApart.map((card) => (
          <CardItem key={card.otherPlantId} card={card} />
        ))}
      </ul>

      {neutral.length > 0 && (
        <>
          <h2>Neutral</h2>
          <ul>
            {neutral.map((card) => (
              <CardItem key={card.otherPlantId} card={card} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function CardItem({ card }: { card: Card }) {
  return (
    <li style={{ marginBottom: "1rem" }}>
      <Link href={`/plants/${card.otherPlantId}`}>
        <strong>{card.otherCommonName}</strong>
      </Link>{" "}
      <em>({card.otherScientificName})</em>
      <br />
      <span>{card.confidence}</span>
      <p>{card.summary}</p>
      {card.sources.length > 0 && (
        <p>
          Sources:{" "}
          {card.sources.map((source, i) => (
            <span key={source.title}>
              {i > 0 && ", "}
              {source.url ? (
                <a href={source.url} target="_blank" rel="noopener noreferrer">
                  {source.title}
                </a>
              ) : (
                source.title
              )}
            </span>
          ))}
        </p>
      )}
    </li>
  );
}
