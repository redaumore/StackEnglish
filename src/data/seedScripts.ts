import type { ConversationScript } from '../types/script';

export const SEED_SCRIPTS: ConversationScript[] = [
  {
    id: 'script-architecture-adr',
    title: 'Architecture Review: Event-Driven vs Direct REST API',
    topic: 'Microservices Communication & Decoupling',
    category: 'Architecture Review',
    contextDescription:
      'A technical debate between the Principal Software Architect and a Senior Backend Lead regarding whether to adopt Apache Kafka for event-driven updates or stick to synchronous REST endpoints with retry queues.',
    createdAt: '2026-08-20T10:00:00.000Z',
    characters: [
      {
        id: 'char-1',
        name: 'Alex (Principal Architect)',
        role: 'Principal Architect',
        avatarColor: 'bg-indigo-600',
        voice: 'onyx',
      },
      {
        id: 'char-2',
        name: 'Jordan (Senior Backend Lead)',
        role: 'Senior Backend Lead',
        avatarColor: 'bg-emerald-600',
        voice: 'nova',
      },
    ],
    userRoleCharacterId: 'char-2',
    lines: [
      {
        id: 'l1',
        characterId: 'char-1',
        text: 'Thanks for hopping on, Jordan. I reviewed your Architecture Decision Record regarding the checkout notification pipeline. My main concern is tight coupling if we stay on direct REST calls.',
        notes: 'Firm, constructive architect opening.',
      },
      {
        id: 'l2',
        characterId: 'char-2',
        text: 'I hear you, Alex. However, spinning up a dedicated Kafka broker for just two downstream consumers introduces substantial operational overhead. We want to avoid premature optimization.',
        notes: 'Defending pragmatic design while acknowledging feedback.',
      },
      {
        id: 'l3',
        characterId: 'char-1',
        text: 'Valid point on the maintenance footprint, but consider our throughput projections for Q4. If the payment gateway latency spikes, synchronous HTTP calls will cascade failures across our worker pool.',
        notes: 'Explaining cascading failures and reliability risks.',
      },
      {
        id: 'l4',
        characterId: 'char-2',
        text: 'What if we adopt an Outbox pattern with AWS SQS as a middle ground? It guarantees eventual consistency without burdening the team with cluster partition management.',
        notes: 'Proposing a solid technical compromise.',
      },
      {
        id: 'l5',
        characterId: 'char-1',
        text: 'That strikes a great balance. It gives us backpressure handling and idempotency without the full operational complexity of Kafka. Let’s document the trade-offs and update the ADR.',
        notes: 'Agreement and wrap-up.',
      },
    ],
  },
  {
    id: 'script-scope-negotiation',
    title: 'Scope Negotiation: Pushing Back on Unrealistic Deadlines',
    topic: 'Sprint Commitment & Technical Debt Mitigation',
    category: 'Scope Negotiation',
    contextDescription:
      'A Product Manager requests three major features for the upcoming bi-weekly release, and the Tech Lead must push back diplomatically to protect code quality and team velocity.',
    createdAt: '2026-08-21T14:30:00.000Z',
    characters: [
      {
        id: 'char-pm',
        name: 'Sarah (Lead Product Manager)',
        role: 'Product Manager',
        avatarColor: 'bg-violet-600',
        voice: 'shimmer',
      },
      {
        id: 'char-tl',
        name: 'David (Tech Lead)',
        role: 'Tech Lead',
        avatarColor: 'bg-blue-600',
        voice: 'alloy',
      },
    ],
    userRoleCharacterId: 'char-tl',
    lines: [
      {
        id: 'sn-1',
        characterId: 'char-pm',
        text: 'David, stakeholders are pushing hard to include multi-currency billing and automated invoicing in this two-week sprint before the marketing summit.',
        notes: 'Assertive request with external business pressure.',
      },
      {
        id: 'sn-2',
        characterId: 'char-tl',
        text: 'I understand the business urgency, Sarah. But given our current velocity and the need to refactor the legacy billing module, committing to both would jeopardize the stability of the entire release.',
        notes: 'Diplomatic pushback anchored on data and risk management.',
      },
      {
        id: 'sn-3',
        characterId: 'char-pm',
        text: 'Is there any way we can cut corners on the test coverage or defer the database migration to hit the milestone?',
        notes: 'Common high-pressure PM request.',
      },
      {
        id: 'sn-4',
        characterId: 'char-tl',
        text: 'Cutting corners on financial transactions will inevitably backfire with reconciliation bugs. Instead, let us descope the automated invoicing and ship an MVP of multi-currency billing with robust regression tests.',
        notes: 'Firm boundaries with an actionable, high-quality MVP alternative.',
      },
      {
        id: 'sn-5',
        characterId: 'char-pm',
        text: 'Fair enough. Delivering a reliable multi-currency experience is better than shipping a brittle end-to-end system. I will reset expectations with the executive team.',
        notes: 'Aligned resolution.',
      },
    ],
  },
  {
    id: 'script-post-mortem',
    title: 'Blameless Post-Mortem: Production Outage Triage',
    topic: 'Database Connection Pool Exhaustion Incident',
    category: 'Post-Mortem',
    contextDescription:
      'Following a 45-minute production downtime caused by an unindexed query exhausting the database connection pool, the Site Reliability Engineer and Senior Developer review root causes and action items.',
    createdAt: '2026-08-22T09:15:00.000Z',
    characters: [
      {
        id: 'char-sre',
        name: 'Elena (Principal SRE)',
        role: 'Principal SRE',
        avatarColor: 'bg-rose-600',
        voice: 'fable',
      },
      {
        id: 'char-dev',
        name: 'Marcus (Staff Software Engineer)',
        role: 'Staff Software Engineer',
        avatarColor: 'bg-amber-600',
        voice: 'echo',
      },
    ],
    userRoleCharacterId: 'char-dev',
    lines: [
      {
        id: 'pm-1',
        characterId: 'char-sre',
        text: 'Let us walk through the timeline of yesterday’s incident. At 14:22 UTC, p99 latency spiked past 8 seconds, triggering HTTP 504 gateway timeouts across our primary cluster.',
        notes: 'Objective, data-driven post-mortem opening.',
      },
      {
        id: 'pm-2',
        characterId: 'char-dev',
        text: 'The telemetry shows that the newly deployed user search endpoint triggered a sequential table scan on 12 million rows, holding connection locks and exhausting the Prisma connection pool.',
        notes: 'Root cause analysis without finger-pointing.',
      },
      {
        id: 'pm-3',
        characterId: 'char-sre',
        text: 'Right. Why didn’t our synthetic canary tests catch the missing composite index prior to the blue-green rollout?',
        notes: 'Investigating detection and testing gaps.',
      },
      {
        id: 'pm-4',
        characterId: 'char-dev',
        text: 'The staging database only had twenty thousand seed records, so full table scans completed in milliseconds. Moving forward, we should enforce query plan analysis in our CI pipeline for any schema migrations.',
        notes: 'Actionable preventive measure.',
      },
      {
        id: 'pm-5',
        characterId: 'char-sre',
        text: 'Excellent action item. I will also configure strict statement timeouts at the Postgres pool level so runaway queries fail fast rather than monopolizing connections.',
        notes: 'Systemic architectural guardrail.',
      },
    ],
  },
  {
    id: 'script-standup-blocker',
    title: 'Daily Standup: Surfacing Critical Blockers & Dependencies',
    topic: 'Third-Party Webhook Flakiness & OAuth Token Refresh',
    category: 'Standup / Follow-up',
    contextDescription:
      'A software engineer clearly articulates a cross-team dependency blocker during the morning standup and coordinates pairing with a teammate.',
    createdAt: '2026-08-23T11:00:00.000Z',
    characters: [
      {
        id: 'char-scrum',
        name: 'Liam (Scrum Master)',
        role: 'Scrum Master / Agile Coach',
        avatarColor: 'bg-teal-600',
        voice: 'alloy',
      },
      {
        id: 'char-dev2',
        name: 'Rolando (Software Engineer)',
        role: 'Software Engineer',
        avatarColor: 'bg-indigo-600',
        voice: 'onyx',
      },
    ],
    userRoleCharacterId: 'char-dev2',
    lines: [
      {
        id: 'su-1',
        characterId: 'char-scrum',
        text: 'Good morning everyone! Rolando, how are things looking on the Stripe webhook reconciliation worker?',
        notes: 'Standard standup check-in.',
      },
      {
        id: 'su-2',
        characterId: 'char-dev2',
        text: 'Yesterday I finished the idempotency key validation and wrote unit tests for the replay logic. Today I was planning to deploy to sandbox, but I am currently blocked on missing OAuth test credentials from the Identity team.',
        notes: 'Structured update: yesterday, today, and explicit blocker.',
      },
      {
        id: 'su-3',
        characterId: 'char-scrum',
        text: 'Is there a workaround so you do not lose momentum while we wait for their response?',
        notes: 'Agile unblocking question.',
      },
      {
        id: 'su-4',
        characterId: 'char-dev2',
        text: 'Yes, I can stub the OAuth handshake with MSW mocks and proceed with the dead-letter queue consumer. But I will need someone to pair on the contract review this afternoon.',
        notes: 'Proactive mitigation and call for collaboration.',
      },
    ],
  },
];
