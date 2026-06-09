interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * Rhea MCP — expert-curated database of biochemical reactions.
 *
 * Rhea (https://www.rhea-db.org) is the reaction reference used by UniProt and
 * KEGG: balanced, expert-curated enzyme/metabolic reactions cross-referenced to
 * ChEBI compounds, EC numbers, UniProt enzymes and PubMed. Keyless.
 *
 * Note on the upstream API: the JSON format (`format=json`) ignores the
 * `columns` parameter and only ever returns id/equation/status/htmlequation.
 * The TSV format (`format=tsv`) is the one that honours `columns` and returns
 * the EC / ChEBI / UniProt / PubMed cross-references, so we request TSV and
 * parse it into structured objects. In TSV the Reaction identifier is already
 * formatted as "RHEA:<id>". The `uniprot` column maps to upstream's "Enzymes"
 * header and is a count of associated enzymes (not a list of accessions).
 */


const BASE = 'https://www.rhea-db.org';
const UA = 'pipeworx/1.0 (+https://pipeworx.io)';

const tools: McpToolExport['tools'] = [
  {
    name: 'search_reactions',
    description:
      'Search Rhea, the expert-curated database of biochemical reactions (the reaction reference used by UniProt and KEGG). Find enzyme/metabolic reactions by compound name, ChEBI id, EC number, or keyword and get the balanced plain-text reaction equation plus EC and ChEBI cross-references. Keyless.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Compound name, ChEBI id, EC number (e.g. "1.1.1.1"), UniProt accession, or free-text keyword.',
        },
        limit: { type: 'number', description: 'Max reactions to return (default 15, max 100).' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_reaction',
    description:
      'Fetch a single Rhea reaction by its Rhea id (e.g. "RHEA:14293" or "14293"). Returns the balanced plain-text equation plus EC number, ChEBI compound, UniProt enzyme and PubMed cross-references. Rhea is the expert-curated biochemical reaction reference used by UniProt and KEGG. Keyless.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'A Rhea reaction id, e.g. "RHEA:14293" or "14293".' },
      },
      required: ['id'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  try {
    switch (name) {
      case 'search_reactions':
        return await searchReactions(args);
      case 'get_reaction':
        return await getReaction(args);
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

async function searchReactions(args: Record<string, unknown>): Promise<unknown> {
  const query = reqStr(args, 'query');
  let limit = typeof args.limit === 'number' && Number.isFinite(args.limit) ? Math.floor(args.limit) : 15;
  if (limit < 1) limit = 1;
  if (limit > 100) limit = 100;

  const url =
    `${BASE}/rhea?query=${encodeURIComponent(query)}` +
    `&columns=${encodeURIComponent('rhea-id,equation,ec,chebi-id')}&format=tsv&limit=${limit}`;
  const rows = await rheaTsv(url);

  const reactions = rows.map((r) => ({
    rhea_id: r['Reaction identifier'] ?? '',
    equation: r['Equation'] ?? '',
    ec: splitList(r['EC number']),
    status: 'approved',
  }));

  return { count: reactions.length, reactions };
}

async function getReaction(args: Record<string, unknown>): Promise<unknown> {
  const idArg = reqStr(args, 'id');
  const number = idArg.replace(/^RHEA:/i, '').replace(/[^0-9]/g, '');
  if (!number) return { error: 'reaction not found', id: idArg };

  const url =
    `${BASE}/rhea?query=${encodeURIComponent(number)}` +
    `&columns=${encodeURIComponent('rhea-id,equation,ec,chebi-id,uniprot,pubmed')}&format=tsv&limit=1`;
  const rows = await rheaTsv(url);
  const r = rows[0];
  if (!r) return { error: 'reaction not found', id: idArg };

  return {
    rhea_id: r['Reaction identifier'] ?? `RHEA:${number}`,
    equation: r['Equation'] ?? '',
    ec: splitList(r['EC number']),
    chebi: splitList(r['ChEBI identifier']),
    uniprot: r['Enzymes'] ?? '',
    pubmed: splitList(r['PubMed']),
    status: 'approved',
  };
}

/** Fetch a Rhea TSV endpoint and parse into an array of header-keyed row objects. */
async function rheaTsv(url: string): Promise<Record<string, string>[]> {
  const res = await fetch(url, { headers: { Accept: 'text/tab-separated-values', 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Rhea: ${res.status} ${(await res.text()).slice(0, 200)}`);
  const text = await res.text();
  const lines = text.split('\n').filter((l) => l.length > 0);
  if (lines.length < 2) return [];
  const headers = lines[0].split('\t');
  return lines.slice(1).map((line) => {
    const cells = line.split('\t');
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = cells[i] ?? '';
    });
    return obj;
  });
}

/** Split a semicolon-delimited Rhea cell into a trimmed array (empty cell → []). */
function splitList(v: string | undefined): string[] {
  if (!v) return [];
  return v
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function reqStr(args: Record<string, unknown>, key: string): string {
  const v = args[key];
  if (typeof v !== 'string' || !v.trim()) throw new Error(`Required argument "${key}" is missing.`);
  return v.trim();
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
