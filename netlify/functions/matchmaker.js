exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { entries, roundsCount = 1, maxDiff = 40, restBuffer = 5 } = JSON.parse(event.body);

    if (!entries || entries.length < 2) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Kailangan ng kahit 2 entries.' }) };
    }

    // Grouping birds per entry
    const entryGroups = {};
    entries.forEach(e => {
      if (!entryGroups[e.entryName]) entryGroups[e.entryName] = [];
      entryGroups[e.entryName].push({ ...e });
    });

    const matches = [];
    const entryLastFight = {}; // Tracks rest buffer
    let fightCounter = 1;

    for (let round = 1; round <= roundsCount; round++) {
      // Pick 1 bird from each entry per round
      let roundPool = [];
      Object.keys(entryGroups).forEach(entryName => {
        if (entryGroups[entryName].length > 0) {
          roundPool.push(entryGroups[entryName].shift());
        }
      });

      // Sort by weight descending
      roundPool.sort((a, b) => b.weight - a.weight);

      while (roundPool.length >= 2) {
        let bestPair = null;
        let bestScore = Infinity;
        let meronIdx = 0;
        let walaIdx = -1;

        const meron = roundPool[meronIdx];

        for (let i = 1; i < roundPool.length; i++) {
          const candidate = roundPool[i];

          // Rule 1: Hindi pwedeng magkalaban ang magkasamahan sa entry
          if (meron.entryName === candidate.entryName) continue;

          // Rule 2: Weight Gap Check
          const diff = Math.abs(meron.weight - candidate.weight);
          if (diff > maxDiff) continue;

          // Rule 3: Rest Interval Penalty
          const meronLast = entryLastFight[meron.entryName] || -999;
          const candidateLast = entryLastFight[candidate.entryName] || -999;

          const meronRestPenalty = Math.max(0, restBuffer - (fightCounter - meronLast));
          const candidateRestPenalty = Math.max(0, restBuffer - (fightCounter - candidateLast));

          const score = diff + (meronRestPenalty + candidateRestPenalty) * 50;

          if (score < bestScore) {
            bestScore = score;
            bestPair = [meron, candidate];
            walaIdx = i;
          }
        }

        // Kung walang nahanap sa strict gap, kunin ang pinakamalapit na magkaibang entry
        if (!bestPair) {
          for (let i = 1; i < roundPool.length; i++) {
            if (roundPool[i].entryName !== meron.entryName) {
              bestPair = [meron, roundPool[i]];
              walaIdx = i;
              break;
            }
          }
        }

        if (bestPair && walaIdx !== -1) {
          const [m, w] = bestPair;
          matches.push({
            num: fightCounter,
            meron: m,
            wala: w
          });

          entryLastFight[m.entryName] = fightCounter;
          entryLastFight[w.entryName] = fightCounter;

          fightCounter++;

          // Remove paired birds from pool
          roundPool.splice(walaIdx, 1);
          roundPool.splice(0, 1);
        } else {
          // Kung walang mahanap na katapat na ibang entry, ilipat sa susunod na round
          break;
        }
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, matches })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
};