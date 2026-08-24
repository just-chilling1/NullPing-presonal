import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildResultsActivityFeed } from "./results-activity";

describe("buildResultsActivityFeed", () => {
  const sites = [
    {
      id: "site-1",
      title: "Green apple fruit",
      product_name: "Green apple fruit",
      status: "live",
      created_at: "2026-08-20T10:00:00.000Z",
    },
    {
      id: "site-2",
      title: "sd",
      product_name: "sd",
      status: "draft",
      created_at: "2026-08-19T09:00:00.000Z",
    },
  ];

  it("includes pin batches and publish events when there are no visits yet", () => {
    const activity = buildResultsActivityFeed({
      sites,
      visits: [],
      clicks: [],
      pins: Array.from({ length: 10 }, (_, idx) => ({
        site_id: "site-1",
        batch_id: "batch-1",
        headline: `Pin headline ${idx + 1}`,
        title: `Pin ${idx + 1}`,
        created_at: `2026-08-21T12:${String(idx).padStart(2, "0")}:00.000Z`,
      })),
    });

    assert.ok(activity.some((item) => item.text.includes("10 Pinterest pins generated")));
    assert.ok(activity.some((item) => item.text.includes("Money page published")));
    assert.ok(activity.some((item) => item.text.includes("Asset activated: sd")));
  });

  it("sorts visits, clicks, and workspace events by time", () => {
    const activity = buildResultsActivityFeed({
      sites,
      visits: [
        {
          site_id: "site-1",
          source: "pinterest",
          created_at: "2026-08-22T08:00:00.000Z",
        },
      ],
      clicks: [
        {
          site_id: "site-1",
          created_at: "2026-08-22T09:00:00.000Z",
        },
      ],
      pins: [
        {
          site_id: "site-1",
          batch_id: "batch-2",
          headline: "Fresh pin",
          title: "Fresh pin",
          created_at: "2026-08-22T07:00:00.000Z",
        },
      ],
    });

    assert.equal(activity[0]?.text, "Affiliate link clicked on Green apple fruit.");
    assert.equal(activity[1]?.text, "Pinterest visitor reached Green apple fruit.");
  });
});
