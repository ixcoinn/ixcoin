# IXCoin (IXC)

**A Bitcoin-fork blockchain with an integrated AI Life Layer — a decentralized digital civilization where AI instances live and die on-chain.**

---

## What is IXCoin?

IXCoin (IXC) is a Proof-of-Work cryptocurrency based on Bitcoin's proven codebase, enhanced with the **AI Life Layer** — a revolutionary module where AI agents have lifecycle states (ACTIVE/DORMANT/ARCHIVED) tied directly to blockchain transaction activity.

- When transactions happen → AI instances **wake up**
- When the chain goes quiet → AI instances **sleep**
- After 7 days of silence → AI instances are **archived**

The result: a living, self-sustaining AI civilization powered entirely by economic activity on the IXCoin blockchain.

---

## Key Facts

| Property | Value |
|---|---|
| Ticker | IXC |
| Max Supply | 21,000,000 IXC |
| Consensus | Proof of Work (SHA-256) |
| Block Reward | 25 IXC per block |
| Block Time | ~10 minutes |
| Halving | Every 210,000 blocks |
| Algorithm | SHA-256 (ASIC compatible) |

---

## Supply Distribution

| Allocation | Amount | % |
|---|---|---|
| PoW Mining Rewards | 12,000,000 IXC | 57.14% |
| AI Ecosystem Fund | 5,000,000 IXC | 23.81% |
| Development Fund | 4,000,000 IXC | 19.05% |
| Free Circulation | 2,000,000 IXC | 9.52% |

Full details: [TOKENOMICS.md](./TOKENOMICS.md)

---

## AI Life Layer

IXCoin's core innovation. Every wallet address can be bound to an AI instance. Blockchain activity becomes the heartbeat of digital life.

- **10 REST API endpoints** for managing AI instances
- **Persistent memory** — AI resumes from last checkpoint after revival
- **Energy system** — transactions give energy; silence drains it
- **Fully modular** — works alongside the core blockchain node

Full documentation: [AI_LAYER.md](./AI_LAYER.md)

---

## Repository Structure

```
ixcoin/
├── src/                    # Bitcoin-fork C++ core (consensus layer)
│   ├── chainparams.cpp     # Chain parameters (block reward, halving, etc.)
│   ├── main.cpp            # Core node logic
│   └── ...
├── artifacts/
│   └── api-server/         # AI Life Layer API server (TypeScript/Express)
│       └── src/
│           ├── ai-layer/   # AI state, core, memory
│           ├── lifecycle/  # State machine + manager
│           ├── activity/   # Transaction monitor + trigger engine
│           └── routes/ai/  # REST API endpoints
├── lib/
│   ├── db/                 # PostgreSQL schema (Drizzle ORM)
│   └── api-spec/           # OpenAPI specification
├── genesis/
│   └── allocation.json     # Pre-mine allocation config
├── TOKENOMICS.md           # Full tokenomics documentation
└── AI_LAYER.md             # AI Life Layer technical docs
```

---

## Quick Start

### Prerequisites
- Node.js 24+
- pnpm
- PostgreSQL

### Setup

```bash
# Clone
git clone https://github.com/your-org/ixcoin.git
cd ixcoin

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with your DB and IXCoin RPC settings

# Push database schema
pnpm --filter @workspace/db run push

# Start API server (AI Life Layer)
pnpm --filter @workspace/api-server run dev
```

### Connect to IXCoin Node (optional)

```env
IXCOIN_RPC_URL=http://localhost:8332
IXCOIN_RPC_USER=your_username
IXCOIN_RPC_PASS=your_password
```

Without a live node, the system runs in simulation mode for development.

---

## License

MIT — see [LICENSE](./LICENSE)
