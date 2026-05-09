import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

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
  const startTime = Date.now();
  const logData: Record<string, unknown> = { event: 'generate-plan' };

  try {
    const body: RequestBody = await request.json();
    const { brainDump, weekKey, weekRange, fiscalContext } = body;

    logData.weekKey = weekKey;
    logData.phase = fiscalContext?.phaseLabel || 'none';
    logData.weekOfQuarter = fiscalContext?.weekOfQuarter;
    logData.brainDumpWords = brainDump?.trim().split(/\s+/).filter(Boolean).length || 0;
    logData.brainDumpChars = brainDump?.length || 0;

    if (!brainDump?.trim()) {
      logData.status = 'error';
      logData.error = 'empty_brain_dump';
      console.log('[pp]', JSON.stringify(logData));
      return NextResponse.json({ error: 'brainDump is required' }, { status: 400 });
    }

    const apiKey = process.env.PP_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      logData.status = 'error';
      logData.error = 'no_api_key';
      console.log('[pp]', JSON.stringify(logData));
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
    }
    const client = new Anthropic({ apiKey });

    const systemPrompt = buildSystemPrompt(fiscalContext);
    const userMessage = fiscalContext
      ? `Brain dump for week ${weekKey} (${weekRange} · ${fiscalContext.shortLabel} of ${fiscalContext.totalWeeks}):\n\n${brainDump}`
      : `Brain dump for week ${weekKey} (${weekRange}):\n\n${brainDump}`;

    const apiStart = Date.now();
    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });
    const apiMs = Date.now() - apiStart;

    // Token usage
    logData.inputTokens = message.usage?.input_tokens;
    logData.outputTokens = message.usage?.output_tokens;
    logData.apiMs = apiMs;
    logData.model = message.model;
    logData.stopReason = message.stop_reason;

    const text = message.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n');

    // Strip any accidental markdown fences
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      logData.status = 'parse_error';
      logData.rawLength = cleaned.length;
      logData.totalMs = Date.now() - startTime;
      console.log('[pp]', JSON.stringify(logData));
      return NextResponse.json(
        { error: 'Failed to parse model response as JSON', raw: cleaned },
        { status: 502 }
      );
    }

    // Extract quality metrics from the parsed plan
    const actions = Array.isArray(parsed.actions) ? parsed.actions : [];
    const rc = (parsed.reality_check || parsed.rc) as Record<string, unknown> | undefined;
    const plays = Array.isArray(parsed.high_leverage_plays || parsed.plays)
      ? (parsed.high_leverage_plays || parsed.plays) as unknown[]
      : [];
    const gaps = Array.isArray(parsed.gaps) ? parsed.gaps : [];

    logData.status = 'ok';
    logData.actionCount = actions.length;
    logData.verdict = rc?.verdict || rc?.v;
    logData.totalHours = rc?.total_hours || rc?.th;
    logData.sellingHours = rc?.selling_hours || rc?.sh;
    logData.prospectingHours = rc?.prospecting_hours || rc?.ph;
    logData.highLeveragePlays = plays.length;
    logData.gapCount = gaps.length;
    logData.highGaps = gaps.filter((g: unknown) => (g as Record<string, string>).severity === 'high').length;
    logData.categories = actions.reduce((acc: Record<string, number>, a: Record<string, unknown>) => {
      const cat = (a.category || a.c || 'admin') as string;
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});
    logData.accounts = [...new Set(actions.map((a: Record<string, unknown>) => a.account || a.acct).filter(Boolean))];
    logData.totalMs = Date.now() - startTime;

    console.log('[pp]', JSON.stringify(logData));

    // Include metrics in response so the client can store them
    (parsed as Record<string, unknown>)._metrics = {
      apiMs,
      inputTokens: message.usage?.input_tokens,
      outputTokens: message.usage?.output_tokens,
      model: message.model,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    logData.status = 'exception';
    logData.error = err instanceof Error ? err.message : String(err);
    logData.totalMs = Date.now() - startTime;
    console.error('[pp]', JSON.stringify(logData));
    const errMessage = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: errMessage }, { status: 500 });
  }
}
