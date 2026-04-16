# IXCoin (IXC) — Tokenomics

## Overview

| Property | Value |
|---|---|
| **Ticker** | IXC |
| **Max Supply** | 21,000,000 IXC |
| **Consensus** | Proof of Work (SHA-256) |
| **Block Reward** | 25 IXC per block |
| **Halving Interval** | Every 210,000 blocks (~4 years) |
| **Block Time** | ~10 minutes |

---

## Supply Distribution

| Allocation | Amount | % | Status |
|---|---|---|---|
| Proof of Work Mining | 12,000,000 IXC | 57.14% | Unlocked — earned by miners |
| AI Ecosystem Fund | 5,000,000 IXC | 23.81% | Milestone-vested |
| Development Fund | 4,000,000 IXC | 19.05% | Unlocked — dev team managed |
| Free Circulation | 2,000,000 IXC | 9.52% | Immediately liquid |

---

## Allocation Details

### 1. Proof of Work Mining — 12,000,000 IXC (57.14%)

The mining reward follows Bitcoin's proven emission schedule:

- **Block reward**: 25 IXC per block at genesis
- **Halving**: Every 210,000 blocks (~4 years), the reward halves
- **Schedule**: 25 → 12.5 → 6.25 → 3.125 → ... (asymptotic)
- **Immutable**: This parameter is enforced at the consensus layer and cannot be changed without a hard fork

Miners secure the network by solving SHA-256 proof-of-work puzzles. Block rewards are the sole mechanism for new IXC entering supply from the mining pool.

---

### 2. AI Ecosystem Fund — 5,000,000 IXC (23.81%)

Reserved for growing the IXCoin AI Life Layer ecosystem:

- Developer grants for building on the AI Life Layer module
- Bounties for open-source contributions and security audits
- Integration rewards for dApps and wallets that support AI instances
- AI instance funding pools (running ACTIVE state AI agents on-chain)

**Vesting**: Released in milestone tranches:
- Tranche 1 (1,000,000 IXC): Mainnet launch
- Tranche 2 (1,500,000 IXC): 10+ AI module integrations shipped
- Tranche 3 (2,500,000 IXC): Ecosystem growth milestones (governance vote)

---

### 3. Development Fund — 4,000,000 IXC (19.05%)

Managed by the core development team for:

- Protocol engineering and maintenance
- AI Life Layer module development
- Infrastructure and node hosting
- Exchange listing fees
- Legal and compliance
- Security audits

**Wallet**: HD wallet secured with BIP39 seed phrase (24 words), stored offline by project lead on a hardware wallet. Derivation path: `m/44'/0'/0'/0/0`.

---

### 4. Free Circulation — 2,000,000 IXC (9.52%)

Immediately liquid from genesis. No lock, no vesting:

- Initial DEX/CEX liquidity provision
- Early community distribution and airdrops
- Public market making
- Exchange listing seed liquidity

---

## AI Life Layer Integration

IXCoin's unique innovation is the **AI Life Layer** — a decentralized digital civilization module where AI instances have lifecycle states tied to on-chain economic activity:

- **ACTIVE** — triggered by blockchain transactions
- **DORMANT** — after 5 minutes of no on-chain activity
- **ARCHIVED** — after 7 days of inactivity

AI instances hold energy (0–100), have persistent memory (JSONB), and are bound to IXCoin wallet addresses. Every transaction on the IXCoin network revives dormant AI instances automatically — creating a living, blockchain-powered AI civilization.

See [AI_LAYER.md](./AI_LAYER.md) for full technical details.

---

## Emission Schedule (Mining)

| Era | Block Range | Reward | IXC Minted |
|---|---|---|---|
| Genesis | 0 – 210,000 | 25 IXC | 5,250,000 |
| Era 2 | 210,001 – 420,000 | 12.5 IXC | 2,625,000 |
| Era 3 | 420,001 – 630,000 | 6.25 IXC | 1,312,500 |
| Era 4 | 630,001 – 840,000 | 3.125 IXC | 656,250 |
| ... | ... | ... | ... |
| **Asymptotic total** | ~2140 | → 0 | ~12,000,000 |

---

## Max Supply Cap

The **21,000,000 IXC hard cap** is enforced at the consensus layer, identical to Bitcoin's model. No additional coins can ever be created beyond this limit.

```
Mining pool (asymptotic) : 12,000,000 IXC
AI Ecosystem Fund        :  5,000,000 IXC
Development Fund         :  4,000,000 IXC
                         ─────────────────
Total Pre-mine           : 21,000,000 IXC (including mining pool ceiling)
```

> Note: The mining pool ceiling of 12M is the theoretical maximum reached asymptotically by ~year 2140. In practice, circulating supply grows slowly as blocks are mined.
