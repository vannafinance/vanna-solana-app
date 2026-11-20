// READ-ONLY snapshot of the Vanna fork (getMultipleAccounts), made by a read script; see NOTES.md.
window.POOLS_READ = {
 "readAt": "2026-11-20T11:06:46.538Z",
 "forkClock": 1795220961,
 "rpc": "https://rpc-devnet.solana.vanna.finance",
 "program": "H37YVBG3eGtz89ofd7iDLc2PJgn12778392XeU2QJcGC",
 "pools": {
  "SOL": {
   "sym": "SOL",
   "decimals": 9,
   "addresses": {
    "shareMint": "EK9uA9sLhLxWd3QznpBeuhtJAfbKxsEQ5ceHnNyGu7Jy",
    "reserve": "qKe68DeWMV8MHqDzMvK7W3b98eii63NkMg9CtePvEZK",
    "liquidityVault": "37K8agTpQbkLiGxufDr7S7p6fbz3AsrmUt4r26UR1rjX",
    "assetConfig": "EWWMd3G3cmhMzo3mXi11JGBNQPNsvidd7PJeGxEwjMXa",
    "scopePrices": "3t4JZcueEzTbVP6kLxXrL3VpWx45jDer4eqysweBchNH",
    "pythFallback": "7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE",
    "mint": "So11111111111111111111111111111111111111112",
    "program": "H37YVBG3eGtz89ofd7iDLc2PJgn12778392XeU2QJcGC"
   },
   "rateCurveWad": {
    "linear": "10000000000000000",
    "jump": "300000000000000000",
    "mult": "3500000000000000000"
   },
   "rateCurve": {
    "linear": 0.01,
    "jump": 0.3,
    "mult": 3.5
   },
   "reserveFactorBps": 1000,
   "status": "Active",
   "supplyCap": null,
   "borrowCap": null,
   "totalSupplied": 18817.90024702,
   "totalBorrowed": 194.892590668,
   "availableLiquidity": 18623.007656352,
   "utilization": 0.010356765,
   "borrowApr": 0.000362486,
   "supplyApr": 0.000003378764086011,
   "exchangeRate": 1.000000553,
   "shareSupply": 18817.889832882,
   "asset": {
    "ltvBps": 7000,
    "liqThresholdBps": 8000,
    "liqBonusBps": 500,
    "collateral": true,
    "borrow": true
   },
   "oracle": {
    "source": "Kamino Scope → Pyth fallback",
    "maxAgeSecs": 120
   },
   "raw": {
    "liquidity": "18623008305827",
    "borrows": "194892572655",
    "fees": "647674",
    "lastUpdate": 1795212915
   },
   "oraclePrice": 72.37168133,
   "oraclePublishTime": 1795220257
  },
  "USDC": {
   "sym": "USDC",
   "decimals": 6,
   "addresses": {
    "shareMint": "Fj992jZvsykN19LotAdxdtBrM3sFYrfachmNteUgERZ8",
    "reserve": "A4x4ZZn134HAodwDdFdB9hquaqhwcxqbq5mVxnTXTY4t",
    "liquidityVault": "CVrvxziroPPDMQ6ujE1o3fHDu2vKsJv28RVrVeLA5VuR",
    "assetConfig": "2AbzAudotZqN3CKxmnFZQLbKfWqcWXkQjT1UHVyHM4eS",
    "scopePrices": "3t4JZcueEzTbVP6kLxXrL3VpWx45jDer4eqysweBchNH",
    "pythFallback": "Dpw1EAVrSB1ibxiDQyTAW6Zip3J4Btk2x4SgApQCeFbX",
    "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "program": "H37YVBG3eGtz89ofd7iDLc2PJgn12778392XeU2QJcGC"
   },
   "rateCurveWad": {
    "linear": "10000000000000000",
    "jump": "300000000000000000",
    "mult": "3500000000000000000"
   },
   "rateCurve": {
    "linear": 0.01,
    "jump": 0.3,
    "mult": 3.5
   },
   "reserveFactorBps": 1000,
   "status": "Active",
   "supplyCap": null,
   "borrowCap": null,
   "totalSupplied": 164692.611619,
   "totalBorrowed": 128401.763888,
   "availableLiquidity": 36290.847731,
   "utilization": 0.779451738,
   "borrowApr": 0.027292994,
   "supplyApr": 0.019146214447671218,
   "exchangeRate": 1.003180177,
   "shareSupply": 164170.520159,
   "asset": {
    "ltvBps": 8000,
    "liqThresholdBps": 8500,
    "liqBonusBps": 500,
    "collateral": true,
    "borrow": true
   },
   "oracle": {
    "source": "Kamino Scope → Pyth fallback",
    "maxAgeSecs": 180
   },
   "raw": {
    "liquidity": "36331673244",
    "borrows": "128399721344",
    "fees": "40621259",
    "lastUpdate": 1795202568
   },
   "oraclePrice": 0.99962337,
   "oraclePublishTime": 1795220257
  },
  "USDT": {
   "sym": "USDT",
   "decimals": 6,
   "addresses": {
    "shareMint": "8aCbzJJeLDhRGpdZd47BShyo9PD6MQSzNvNUoA13eT6F",
    "reserve": "EkSogUZ3gLwFD7oeefFLjXwrnbhu3bcWuVxYxshXuk2X",
    "liquidityVault": "GRRhzAEAM8w58QuyjGDdzGY5Jn64GMAEPc5ej5C7QTDu",
    "assetConfig": "HC5R9hVWKsXxxcfoczM26m159rDZFRV4UWxzx98u2xvv",
    "scopePrices": "3t4JZcueEzTbVP6kLxXrL3VpWx45jDer4eqysweBchNH",
    "pythFallback": "HT2PLQBcG5EiCcNSaMHAjSgd9F98ecpATbk4Sk5oYuM",
    "mint": "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    "program": "H37YVBG3eGtz89ofd7iDLc2PJgn12778392XeU2QJcGC"
   },
   "rateCurveWad": {
    "linear": "10000000000000000",
    "jump": "300000000000000000",
    "mult": "3500000000000000000"
   },
   "rateCurve": {
    "linear": 0.01,
    "jump": 0.3,
    "mult": 3.5
   },
   "reserveFactorBps": 1000,
   "status": "Active",
   "supplyCap": null,
   "borrowCap": null,
   "totalSupplied": 44142.871231,
   "totalBorrowed": 28246.093125,
   "availableLiquidity": 15896.778106,
   "utilization": 0.639779292,
   "borrowApr": 0.022392296,
   "supplyApr": 0.01289351455302099,
   "exchangeRate": 1.001846799,
   "shareSupply": 44061.498457,
   "asset": {
    "ltvBps": 8000,
    "liqThresholdBps": 8500,
    "liqBonusBps": 500,
    "collateral": true,
    "borrow": true
   },
   "oracle": {
    "source": "Kamino Scope → Pyth fallback",
    "maxAgeSecs": 300
   },
   "raw": {
    "liquidity": "15903652685",
    "borrows": "28242293092",
    "fees": "6494576",
    "lastUpdate": 1795031332
   },
   "oraclePrice": 0.99880397,
   "oraclePublishTime": 1795220257
  },
  "SKR": {
   "sym": "SKR",
   "decimals": 6,
   "addresses": {
    "shareMint": "3z5FdQtjTFdgfUMUnsxHZZXrYxaXydkGQYKeGJeTD1ag",
    "reserve": "8YMfc1ySbvgUdn82T9DkbUnd8uAZ53D5QbFeMkSZacLu",
    "liquidityVault": "9er2bCYxnLsrNjicWFp8Ah5xTZ5yvB3PQQEatK2YorAF",
    "assetConfig": "BVCzBUUda7oLBVbLMnDDLPfMgJbMMG8zSFoN84rbV3dd",
    "scopePrices": null,
    "pythFallback": "AFrJWhfWt3vDtGPdcwTyLyHz8ZQ4M9L2z1YHThY5Vbj5",
    "mint": "SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3",
    "program": "H37YVBG3eGtz89ofd7iDLc2PJgn12778392XeU2QJcGC"
   },
   "rateCurveWad": {
    "linear": "20000000000000000",
    "jump": "500000000000000000",
    "mult": "5000000000000000000"
   },
   "rateCurve": {
    "linear": 0.02,
    "jump": 0.5,
    "mult": 5
   },
   "reserveFactorBps": 1500,
   "status": "Active",
   "supplyCap": null,
   "borrowCap": null,
   "totalSupplied": 251400.000537,
   "totalBorrowed": 0,
   "availableLiquidity": 251400.000537,
   "utilization": 0,
   "borrowApr": 0,
   "supplyApr": 0,
   "exchangeRate": 1.000000004,
   "shareSupply": 251399.999435,
   "asset": {
    "ltvBps": 4000,
    "liqThresholdBps": 5500,
    "liqBonusBps": 500,
    "collateral": true,
    "borrow": true
   },
   "oracle": {
    "source": "Pyth",
    "maxAgeSecs": 180
   },
   "raw": {
    "liquidity": "251400000548",
    "borrows": "0",
    "fees": "11",
    "lastUpdate": 1794962606
   },
   "oraclePrice": 0.01016971,
   "oraclePublishTime": 1795220257
  }
 },
 "unreadable": []
};
