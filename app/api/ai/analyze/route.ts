import { NextRequest, NextResponse } from 'next/server';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

type OutputFormat = 'numbered_list' | 'attribution_quadrants';

function buildUserContent(args: {
  instructions: string;
  runtimeBlock: string;
  data: unknown;
  outputFormat: OutputFormat;
}): string {
  const dataJson =
    typeof args.data === 'string' ? args.data : JSON.stringify(args.data ?? {}, null, 2);

  const tail =
    args.outputFormat === 'numbered_list'
      ? [
          'Output format requirements:',
          '- Respond with ONLY a numbered list.',
          '- Each line must start with a number, a period, a space, then one concise insight (e.g. "1. ...").',
          '- Provide 5–8 items. No title, no preamble, no markdown code fences.',
        ].join('\n')
      : [
          'Output format requirements:',
          '- Respond with ONLY a single JSON object, no markdown fences, no other text.',
          '- Required shape: {"working":["..."],"notWorking":["..."],"doNext":["..."],"stopDoing":["..."]}',
          '- Each array should have 3–6 short string bullets grounded in the data.',
        ].join('\n');

  return [
    'You are a senior performance marketing analyst for a D2C e-commerce brand.',
    'Use the instructions, runtime context, and DATA below. Prefer quantitative, actionable points.',
    '',
    '## Instructions from the user (prompt template)',
    args.instructions.trim(),
    '',
    args.runtimeBlock.trim(),
    '',
    '## DATA (JSON)',
    dataJson.slice(0, 120_000),
    '',
    tail,
  ].join('\n');
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: 'ANTHROPIC_API_KEY is not configured on the server.' },
      { status: 503 }
    );
  }

  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';

  try {
    const body = await request.json();
    const instructions = String(body.instructions ?? '');
    const runtimeBlock = String(body.runtimeBlock ?? '');
    const data = body.data ?? {};
    const outputFormat = (body.outputFormat ?? 'numbered_list') as OutputFormat;
    const promptId = typeof body.promptId === 'string' ? body.promptId : '';

    if (!instructions.trim()) {
      return NextResponse.json(
        { success: false, error: 'instructions (prompt) is required' },
        { status: 400 }
      );
    }

    const userContent = buildUserContent({
      instructions,
      runtimeBlock,
      data,
      outputFormat,
    });

    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        messages: [{ role: 'user', content: userContent }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Anthropic API error:', res.status, errText.slice(0, 500));
      return NextResponse.json(
        {
          success: false,
          error: `Anthropic request failed (${res.status}). Check model name and API key.`,
        },
        { status: 502 }
      );
    }

    const json = await res.json();
    const textBlocks = json.content;
    const text =
      Array.isArray(textBlocks) && textBlocks[0]?.type === 'text'
        ? String(textBlocks[0].text ?? '')
        : '';

    return NextResponse.json({
      success: true,
      promptId,
      text,
      model,
      outputFormat,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('AI analyze route:', e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
