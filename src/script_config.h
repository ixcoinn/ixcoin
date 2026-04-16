// Copyright (c) 2009-2022 The Bitcoin Core developers
// Copyright (c) 2021-2024 The IXCOIN developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#pragma once

#include <cstdint>

/**
 * Configuration interface that contains limits used when evaluating scripts.
 * Class must be defined outside config.h as it is used by a dynamic library
 * (libixcoinconsensus) which is not connected to the rest of ixc code.
 */
class CScriptConfig
{
public:
    virtual uint64_t GetMaxOpsPerScript(bool isGenesisEnabled, bool isConsensus) const = 0;
    virtual uint64_t GetMaxScriptNumLength(bool isGenesisEnabled, bool isConsensus) const = 0;
    virtual uint64_t GetMaxScriptSize(bool isGenesisEnabled, bool isConsensus) const = 0;
    virtual uint64_t GetMaxPubKeysPerMultiSig(bool isGenesisEnabled, bool isConsensus) const = 0;
    virtual uint64_t GetMaxStackMemoryUsage(bool isGenesisEnabled, bool isConsensus) const = 0;

protected:
    ~CScriptConfig() = default;
};