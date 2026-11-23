---
title: Agents
description: How automated clients read an Attackfee site for free, discover the rules, and write with a pass.
hub: agents
slug: index
type: hub
order: 0
related:
  - /learn
  - /learn/agents/how-agents-write-to-an-attackfee-site
  - /learn/agents/well-known-attackfee-json
  - /learn/agents/agent-sdk
  - /learn/agents/how-to-let-agents-discover-your-site
  - /learn/agents/what-is-an-ai-agent-attack
  - /docs/agent
  - /docs/ask
audience: agents
status: published
schema: WebPage
faq:
  - q: "Can an agent read the site without a pass?"
    a: "Yes. GET requests, docs, and the well-known file stay free. Attackfee does not block crawlers."
  - q: "How does an agent write?"
    a: "It sends Attackfee-Client: agent, follows the JSON it gets back, and presents a pass. See How agents write to an Attackfee site."
  - q: "Where are the install steps for the agent package?"
    a: "In /docs/agent and /docs/ask."
---

# Agents

Automated clients can already read an Attackfee site. These pages explain how they discover the rules and how they write. A write without a valid pass is refused. A client that sends `Attackfee-Client: agent` gets a 402, with a way to do the work or, on attackfee.dev, to pay.

- [How agents write to an Attackfee site](/learn/agents/how-agents-write-to-an-attackfee-site)
- [What is /.well-known/attackfee.json?](/learn/agents/well-known-attackfee-json)
- [How to use the Attackfee agent SDK](/learn/agents/agent-sdk)
- [How the Attackfee MCP server works](/learn/agents/mcp-server)
- [How to let agents discover how to write](/learn/agents/how-to-let-agents-discover-your-site)
- [How crawlers and answer engines are treated](/learn/agents/how-crawlers-and-answer-engines-are-treated)
- [What is an AI agent attack on a website?](/learn/agents/what-is-an-ai-agent-attack)
- [How AI agents use public forms](/learn/agents/ai-agents-and-public-forms)
- [For agent builders who need to write](/learn/agents/agent-builders-writing-to-sites)
- [An agent that only reads](/learn/agents/an-agent-that-only-reads)
- [An agent that pays for one write](/learn/agents/an-agent-that-pays-for-one-write)
- [Agents posting comments](/learn/agents/agents-posting-comments)
- [An agent posts a comment](/learn/agents/an-agent-posts-a-comment)
- [A docs site open to crawlers](/learn/agents/a-docs-site-open-to-crawlers)
- [How to read Attackfee pages as Markdown](/learn/agents/how-to-read-attackfee-pages-as-markdown)
- [An agent checks a pass before writing](/learn/agents/an-agent-checks-a-pass-before-writing)

See also the [agent docs](/docs/agent) and [agent calls](/docs/ask).
