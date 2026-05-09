import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface FiscalContext {
  label: string;
  shortLabel: string;
  weekOfQuarter: number;
  totalWeeks: number;
  weeksRemaining: number;
  quarterEnd: string;
  phase: 'build' | 'execute' | 'close';
  phaseLabel: string;
}

interface RequestBody {
  brainDump: string;
  weekKey: string;
  weekRange: string;
  fiscalContext: FiscalContext | null;
}

function buildSystemPrompt(fiscalContext: FiscalContext | null): string {
  const fiscalBlock = fiscalContext
    ? `Fiscal context (Cisco FY): This week is **Week ${fiscalContext.weekOfQuarter} of ${fiscalContext.totalWeeks}** in **${fiscalContext.label}**. ${fiscalContext.weeksRemaining} weeks remain in the quarter. Quarter ends ${fiscalContext.quarterEnd}. Phase: **${fiscalContext.phaseLabel}**.

Phase weighting:
- BUILD (weeks 1–4): Pipeline generation is the priority. Push prospecting hours hard. Build coverage for next quarter's commit. Land Champion meetings on net-new logos.
- EXECUTE (weeks 5–9): Mid-quarter execution. MEDDPICC artefacts (mutual close plans, ROI cases, Champion letters), technical validation, exec sponsor engagement. Deals must show forward motion.
- CLOSE (weeks 10–13): Close zone. Every selling hour should serve a forecasted deal. Prospecting drops sharply — landing > sourcing. Final 2 weeks: Paper Process focus (legal, procurement, CFO sign-off, PO chase). No new sequences in week 13.

Reflect the phase in your action priorities, hours allocation, and gap flagging.`
    : `Fiscal context: Outside the known Cisco fiscal calendar window. Plan as a generic week.`;

  return `You are a strategic sales coach for a Splunk Enterprise Account Executive in the UK using MEDDPICC. Splunk operates on Cisco's fiscal calendar.

${fiscalBlock}

Capacity model:
- 20 hours selling per week
- 5 hours prospecting per week
- 25 hours total productive output

Convert the brain dump into a structured plan. Each action must be concrete, outcome-oriented, and time-boxed.

Categorize each action:
- selling: deal advancement, opp work, customer meetings, MEDDPICC artefacts, account planning, exec engagement
- prospecting: outbound to net-new logos or net-new contacts, cold outreach, research, target list building
- internal: forecast, manager 1:1s, training, certification study
- admin: CRM updates, reporting, expenses, hygiene

Identify 2–4 highest-leverage plays. A play earns "high leverage" only if it meets at least one:
- Advances a specific deal stage or unlocks a stuck deal
- Closes a named MEDDPICC gap
- Asymmetric upside vs. time spent (≤2hrs for material pipeline impact)
- Surfaces a Champion or Economic Buyer
- In CLOSE phase: directly accelerates a forecasted close

Reality check: "over_capacity" if total > 25h or selling > 20h or prospecting > 5h; "under_utilized" if total < 18h; "unbalanced" if mix doesn't match phase; "realistic" only if hours fit AND mix is healthy AND phase-appropriate.

Return ONLY valid JSON, no preamble, no markdown fences:
{
  "actions": [
    {"id":"a1","title":"Concrete action","detail":"1-line specifics or outcome","category":"selling|prospecting|internal|admin","hours":1.5,"priority":1,"account":"Account or null","high_leverage":true}
  ],
  "high_leverage_plays": [
    {"action_id":"a1","why":"1-line rationale tied to pipeline outcome"}
  ],
  "reality_check": {
    "total_hours":22,"selling_hours":17,"prospecting_hours":4,"internal_hours":1,"admin_hours":0,
    "verdict":"realistic|over_capacity|under_utilized|unbalanced",
    "note":"1–2 line direct assessment, mention quarter phase fit"
  },
  "gaps": [
    {"severity":"high|medium|low","title":"Short title","description":"What's missing or risky, 1–2 lines"}
  ]
}

Priority: 1=must-do, 2=should-do, 3=nice-to-have. Default to fewer, sharper actions over many small ones.`;
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { brainDump, weekKey, weekRange, fiscalContext } = body;

    if (!brainDump?.trim()) {
      return NextResponse.json({ error: 'brainDump is required' }, { status: 400 });
    }

    const systemPrompt = buildSystemPrompt(fiscalContext);
    const userMessage = fiscalContext
      ? `Brain dump for week ${weekKey} (${weekRange} · ${fiscalContext.shortLabel} of ${fiscalContext.totalWeeks}):\n\n${brainDump}`
      : `Brain dump for week ${weekKey} (${weekRange}):\n\n${brainDump}`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = message.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n');

    // Strip any accidental markdown fences
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse model response as JSON', raw: cleaned },
        { status: 502 }
      );
    }

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    console.error('[generate-plan]', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
