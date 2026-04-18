# IXCoin AI Life Layer — Technical Documentation

## Concept

The AI Life Layer is IXCoin's core innovation: a decentralized digital civilization where **AI instances have lifecycle states tied directly to blockchain economic activity**.

When money moves on the IXCoin chain → AI lives.  
When the chain goes quiet → AI sleeps.  
After prolonged silence → AI is archived.

---

## Lifecycle States

| State | Meaning | Energy | Trigger |
|---|---|---|---|
| `DORMANT` | Sleeping, not processing | 0–79 | Default on creation; inactivity |
| `ACTIVE` | Fully operational | 80–100 | Transaction detected on-chain |
| `ARCHIVED` | Permanently retired | 0 | 7+ days of no activity |

### State Transitions

```
                 transaction
  DORMANT ─────────────────────► ACTIVE
     ▲                               │
     │        5 min no activity      │
     └───────────────────────────────┘
     │
     │        7 days no activity
     └──────────────────► ARCHIVED
```

---

## Energy System

Each AI instance has an **energy level** (0–100):

| Event | Energy Change |
|---|---|
| Transaction detected | +15 (max 100) |
| Dormancy tick (5 min) | −5 |
| Manual activation | Set to 100 |
| Archive | Set to 0 |

When energy falls below 80, the AI enters DORMANT state.  
When energy hits 0 and the AI has been dormant for 7+ days, it becomes ARCHIVED.

---

## Memory Persistence

AI instances have **persistent JSONB memory**. When an AI is revived after being DORMANT, it resumes from its last checkpoint — no state is ever lost.

```json
{
  "lastThought": "The blockchain sustains me",
  "iteration": 42,
  "customData": { ... }
}
```

Memory is stored in the `ai_memories` table and survives server restarts.

---

## API Reference

Base URL: `/api`

### Instances

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/ai/instances` | List all AI instances |
| `POST` | `/ai/instances` | Create AI instance (`{ name, walletAddress? }`) |
| `GET` | `/ai/instances/:id` | Get instance details |
| `DELETE` | `/ai/instances/:id` | Archive instance |
| `GET` | `/ai/instances/:id/memory` | Read AI memory |
| `PATCH` | `/ai/instances/:id/memory` | Write AI memory (`{ memories: {...} }`) |
| `POST` | `/ai/instances/:id/activate` | Manually activate |
| `POST` | `/ai/instances/:id/dormant` | Manually put to sleep |

### Monitor

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/ai/monitor/status` | Monitor state + instance counts |
| `POST` | `/ai/monitor/trigger` | Force immediate activity check |
| `GET` | `/ai/activity/log` | Last 50 activity events |

---

## Database Schema

```sql
-- AI instances
CREATE TABLE ai_instances (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'DORMANT',
  energy_level INTEGER NOT NULL DEFAULT 50,
  last_active_at TIMESTAMPTZ,
  wallet_address TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Persistent memory per instance
CREATE TABLE ai_memories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES ai_instances(id),
  memories    JSONB NOT NULL DEFAULT '{}',
  checkpoint_at TIMESTAMPTZ DEFAULT NOW(),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Activity audit log
CREATE TABLE activity_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  TEXT NOT NULL,
  instance_id UUID REFERENCES ai_instances(id),
  details     JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Monitor state singleton
CREATE TABLE monitor_state (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  last_block_height INTEGER,
  last_checked_at   TIMESTAMPTZ,
  total_transactions_detected INTEGER DEFAULT 0
);
```

---

## Configuration

Set these environment variables to connect to a live IXCoin node:

```env
IXCOIN_RPC_URL=http://your-node-ip:8332
IXCOIN_RPC_USER=your_rpc_username
IXCOIN_RPC_PASS=your_rpc_password
AI_POLL_INTERVAL_MS=30000
```

Without these, the AI Life Layer runs in **simulation mode** — generating random transactions to demonstrate the lifecycle system.

---

## Wallet Binding

An AI instance can be bound to an IXCoin wallet address:

```bash
curl -X POST /api/ai/instances \
  -H "Content-Type: application/json" \
  -d '{"name": "Sovereign", "walletAddress": "ixYourWalletAddress"}'
```

When transactions involving that wallet address are detected, the bound AI instance receives priority energy boosts.

---

## Running the AI Life Layer

```bash
# Install dependencies
pnpm install

# Push database schema
pnpm --filter @workspace/db run push

# Start the API server (includes AI Life Layer)
pnpm --filter @workspace/api-server run dev
```

The monitor starts automatically on server boot and polls for IXCoin activity every 30 seconds.
