# mcp-rhea

Rhea MCP — expert-curated database of biochemical reactions.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `search_reactions` | Search Rhea, the expert-curated database of biochemical reactions (the reaction reference used by UniProt and KEGG). Find enzyme/metabolic reactions by compound name, ChEBI id, EC number, or keyword and get the balanced plain-text reaction equation plus EC and ChEBI cross-references. Keyless. |
| `get_reaction` | Fetch a single Rhea reaction by its Rhea id (e.g. "RHEA:14293" or "14293"). Returns the balanced plain-text equation plus EC number, ChEBI compound, UniProt enzyme and PubMed cross-references. Rhea is the expert-curated biochemical reaction reference used by UniProt and KEGG. Keyless. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "rhea": {
      "url": "https://gateway.pipeworx.io/rhea/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Rhea data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
