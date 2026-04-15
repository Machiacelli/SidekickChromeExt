const ScammingModule = (() => {
    const SCAMMING_STORAGE_KEY = 'crime-scamming';

    // Avoid duplicate injection
    if (window.SIDEKICK_SCAMMING_INJECTED) {
        return { init: () => {} };
    }
    window.SIDEKICK_SCAMMING_INJECTED = true;

    const LOCAL_STORAGE_PREFIX = 'CRIME_MORALE_';
    const STYLE_ELEMENT_ID = 'CRIME-MORALE-STYLE';

    function getLocalStorage(key, defaultValue) {
        const value = window.localStorage.getItem(LOCAL_STORAGE_PREFIX + key);
        try {
            return JSON.parse(value) ?? defaultValue;
        } catch (err) {
            return defaultValue;
        }
    }

    function setLocalStorage(key, value) {
        window.localStorage.setItem(LOCAL_STORAGE_PREFIX + key, JSON.stringify(value));
    }

    const isPda = window.GM_info?.scriptHandler?.toLowerCase().includes('tornpda');
    const [getValue, setValue] =
        isPda || typeof window.GM_getValue !== 'function' || typeof window.GM_setValue !== 'function'
            ? [getLocalStorage, setLocalStorage]
            : [window.GM_getValue, window.GM_setValue];

    function addStyle(css) {
        const style =
            document.getElementById(STYLE_ELEMENT_ID) ??
            (function () {
                const style = document.createElement('style');
                style.id = STYLE_ELEMENT_ID;
                document.head.appendChild(style);
                return style;
            })();
        style.appendChild(document.createTextNode(css));
    }

    function formatLifetime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const text =
            hours >= 72
                ? `${Math.floor(hours / 24)}d`
                : hours > 0
                ? `${hours}h`
                : seconds >= 0
                ? `${Math.floor(seconds / 60)}m`
                : '';
        const color = hours >= 24 ? 't-gray-c' : hours >= 12 ? 't-yellow' : hours >= 0 ? 't-red' : '';
        return { seconds, hours, text, color };
    }

    class ScammingSolver {
        get BASE_ACTION_COST() {
            return this.algo === 'meritGrift' ? 0.001 : 0.02;
        }
        get FAILURE_COST_MAP() {
            return this.algo === 'merit' || this.algo === 'meritGrift'
                ? {
                    1: 0,
                    20: 0,
                    40: 0,
                    60: 0,
                    80: 0,
                }
                : {
                    1: 1,
                    20: 1,
                    40: 1,
                    60: 0.5,
                    80: 0.33,
                };
        }
        get CONCERN_SUCCESS_RATE_MAP() {
            return {
                'young adult': 0.55,
                'middle-aged': 0.5,
                senior: 0.45,
                professional: 0.4,
                affluent: 0.35,
                '': 0.5,
            };
        }
        get CELL_VALUE_MAP() {
            return this.algo === 'merit'
                ? {
                    low: 2,
                    medium: 2,
                    high: 2,
                    fail: -20,
                }
                : this.algo === 'meritGrift'
                ? {
                    low: 0,
                    medium: 1,
                    high: 1,
                    fail: 0,
                }
                : {
                    low: 0.5,
                    medium: 1.5,
                    high: 2.5,
                    fail: -20,
                };
        }
        get SAFE_CELL_SET() {
            return new Set(['neutral', 'low', 'medium', 'high', 'temptation']);
        }
        get DISPLACEMENT() {
            return {
                1: {
                    strong: [[10, 19], [15, 29], [18, 35], [21, 39], [22, 42], [23, 44]],
                    soft: [[3, 7], [5, 11], [6, 13], [6, 14], [7, 15], [7, 16]],
                    back: [[-4, -2], [-6, -3], [-7, -4], [-8, -4], [-9, -4], [-9, -5]],
                },
                20: {
                    strong: [[8, 15], [12, 23], [15, 28], [16, 31], [18, 33], [18, 35]],
                    soft: [[3, 7], [5, 11], [6, 13], [6, 14], [7, 15], [7, 16]],
                    back: [[-4, -2], [-6, -3], [-7, -4], [-8, -4], [-9, -4], [-9, -5]],
                },
                40: {
                    strong: [[7, 13], [11, 20], [13, 24], [14, 27], [15, 29], [16, 30]],
                    soft: [[3, 6], [5, 9], [6, 11], [6, 12], [7, 13], [7, 14]],
                    back: [[-4, -2], [-6, -3], [-7, -4], [-8, -4], [-9, -4], [-9, -5]],
                },
                60: {
                    strong: [[6, 11], [9, 17], [11, 20], [12, 23], [13, 24], [14, 25]],
                    soft: [[2, 4], [3, 6], [4, 7], [4, 8], [4, 9], [5, 9]],
                    back: [[-4, -2], [-6, -3], [-7, -4], [-8, -4], [-9, -4], [-9, -5]],
                },
                80: {
                    strong: [[5, 9], [8, 14], [9, 17], [10, 19], [11, 20], [12, 21]],
                    soft: [[2, 3], [3, 5], [4, 6], [4, 6], [4, 7], [5, 7]],
                    back: [[-3, -2], [-5, -3], [-6, -4], [-6, -4], [-7, -4], [-7, -5]],
                },
            };
        }
        get MERIT_MASK_MAP() {
            return {
                temptation: 1n << 50n,
                sensitivity: 1n << 51n,
                hesitation: 1n << 52n,
                concern: 1n << 53n,
            };
        }
        get MERIT_REQUIREMENT_MASK() {
            return 0xfn << 50n;
        }

        constructor(algo, bar, targetLevel, round, suspicion, mark) {
            this.algo = algo;
            this.bar = bar;
            this.targetLevel = targetLevel;
            this.failureCost = this.FAILURE_COST_MAP[this.targetLevel];
            this.initialRound = round;
            this.initialSuspicion = suspicion;
            this.mark = mark;

            this.driftArrayMap = new Map();
            this.dp = new Map();

            this.resolvingMasks = new Array(50);
            for (let pip = 0; pip < 50; pip++) {
                if (this.resolvingMasks[pip]) {
                    continue;
                }
                if (this.bar[pip] !== 'hesitation' && this.bar[pip] !== 'concern') {
                    this.resolvingMasks[pip] = 0n;
                    continue;
                }
                let mask = this.algo === 'merit' ? this.MERIT_MASK_MAP[this.bar[pip]] : 0n;
                for (let endPip = pip; endPip < 50 && this.bar[endPip] === this.bar[pip]; endPip++) {
                    mask += 1n << BigInt(endPip);
                }
                for (let endPip = pip; endPip < 50 && this.bar[endPip] === this.bar[pip]; endPip++) {
                    this.resolvingMasks[endPip] = mask;
                }
            }
        }

        solve(round, pip, resolvingBitmap, multiplierUsed, driftBitmap) {
            if (this.algo === 'merit') {
                for (let pip = 0; pip < 50; pip++) {
                    if (this._isResolved(pip, resolvingBitmap)) {
                        resolvingBitmap |= this.MERIT_MASK_MAP[this.bar[pip]] ?? 0n;
                    }
                }
                resolvingBitmap |= BigInt(driftBitmap) << 50n;
            }
            const result = this._visit(round - multiplierUsed, resolvingBitmap, multiplierUsed, pip);
            return result[pip];
        }

        _visit(round, resolvingBitmap, minMulti, singlePip = undefined) {
            const dpKey = BigInt(round) | (resolvingBitmap << 6n);
            if (minMulti === 0) {
                const visited = this.dp.get(dpKey);
                if (visited) {
                    return visited;
                }
            }
            const result = new Array(50);
            this.dp.set(dpKey, result);
            if (this._estimateSuspicion(round) >= 50) {
                for (let pip = 0; pip < 50; pip++) {
                    result[pip] = this._getCellResult(pip, resolvingBitmap);
                }
                return result;
            }
            const driftArray = this._getDriftArray(resolvingBitmap);
            const [pipBegin, pipEnd] = singlePip !== undefined ? [singlePip, singlePip + 1] : [0, 50];
            for (let pip = pipBegin; pip < pipEnd; pip++) {
                const best = this._getCellResult(pip, resolvingBitmap);
                if (this.bar[pip] === 'fail') {
                    result[pip] = best;
                    continue;
                }
                if (!this._isResolved(pip, resolvingBitmap)) {
                    if (this.bar[pip] === 'hesitation') {
                        const resolvedResult = this._visit(round, resolvingBitmap | this.resolvingMasks[pip], 0);
                        result[pip] = resolvedResult[pip];
                        continue;
                    }
                    if (this.bar[pip] === 'concern') {
                        const resolvedResult = this._visit(round + 1, resolvingBitmap | this.resolvingMasks[pip], 0);
                        const unresolvedResult = this._visit(round + 1, resolvingBitmap, 0);
                        const concernSuccessRate = this.CONCERN_SUCCESS_RATE_MAP[this.mark] ?? this.CONCERN_SUCCESS_RATE_MAP[''];
                        const value =
                            resolvedResult[pip].value * concernSuccessRate +
                            (unresolvedResult[pip].value - this.failureCost) * (1 - concernSuccessRate) -
                            this.BASE_ACTION_COST;
                        result[pip] = {
                            value: Math.max(0, value),
                            action: value > 0 ? 'resolve' : 'abandon',
                            multi: 0,
                        };
                        continue;
                    }
                }
                for (let multi = minMulti; multi <= 5; multi++) {
                    const suspicionAfterMulti = this._estimateSuspicion(round + multi);
                    const nextRoundResult = this._visit(round + multi + 1, resolvingBitmap, 0);
                    const feasibleActions = pip > 0 ? ['strong', 'soft', 'back'] : ['strong', 'soft'];
                    for (const action of feasibleActions) {
                        const displacementArray = this.DISPLACEMENT[this.targetLevel.toString()]?.[action]?.[multi];
                        if (!displacementArray) {
                            continue;
                        }
                        const [minDisplacement, maxDisplacement] = displacementArray;
                        let totalValue = 0;
                        for (let disp = minDisplacement; disp <= maxDisplacement; disp++) {
                            const landingPip = Math.max(Math.min(pip + disp, 49), 0);
                            const newPip = driftArray[landingPip];
                            if (landingPip < suspicionAfterMulti || newPip < suspicionAfterMulti) {
                                totalValue += this.CELL_VALUE_MAP.fail;
                            } else {
                                if (!this.SAFE_CELL_SET.has(this.bar[landingPip]) && !this._isResolved(landingPip, resolvingBitmap)) {
                                    totalValue -= this.failureCost;
                                }
                                totalValue -= this.BASE_ACTION_COST;
                                const landingResult =
                                    this.algo === 'merit' && newPip !== landingPip
                                        ? this._visit(round + multi + 1, resolvingBitmap | this.MERIT_MASK_MAP[this.bar[landingPip]], 0)
                                        : nextRoundResult;
                                totalValue += landingResult[newPip].value;
                            }
                        }
                        const avgValue = totalValue / (maxDisplacement - minDisplacement + 1) - this.BASE_ACTION_COST * multi;
                        if (avgValue > best.value) {
                            best.value = avgValue;
                            best.action = action;
                            best.multi = multi;
                        }
                    }
                }
                result[pip] = best;
            }
            return result;
        }

        _getDriftArray(resolvingBitmap) {
            const cached = this.driftArrayMap.get(resolvingBitmap);
            if (cached) {
                return cached;
            }
            const driftArray = new Array(50);
            this.driftArrayMap.set(resolvingBitmap, driftArray);
            for (let pip = 0; pip < 50; pip++) {
                let newPip = pip;
                switch (this.bar[pip]) {
                    case 'temptation':
                        while (
                            newPip + 1 < 50 &&
                            (!this.SAFE_CELL_SET.has(this.bar[newPip]) || this.bar[newPip] === 'temptation') &&
                            !this._isResolved(newPip, resolvingBitmap)
                        ) {
                            newPip++;
                        }
                        break;
                    case 'sensitivity':
                        while (newPip > 0 && this.bar[newPip] !== 'neutral' && !this._isResolved(newPip, resolvingBitmap)) {
                            newPip--;
                        }
                        break;
                }
                driftArray[pip] = newPip;
            }
            return driftArray;
        }

        _getCellResult(pip, resolvingBitmap) {
            let value = this.CELL_VALUE_MAP[this.bar[pip]] ?? 0;
            if (this.algo === 'merit' && (resolvingBitmap & this.MERIT_REQUIREMENT_MASK) !== this.MERIT_REQUIREMENT_MASK) {
                value = Math.min(value, 0);
            }
            const action = this.bar[pip] === 'fail' ? 'fail' : value > 0 ? 'capitalize' : 'abandon';
            return { value, action, multi: 0 };
        }

        _estimateSuspicion(round) {
            if (round <= this.initialRound) {
                return this.initialSuspicion;
            }
            const predefined = [0, 0, 0, 0, 2, 5, 8, 11, 16, 23, 34, 50][round] ?? 50;
            const current = Math.floor(this.initialSuspicion * 1.5 ** (round - this.initialRound));
            return Math.max(predefined, current);
        }

        _isResolved(pip, resolvingBitmap) {
            return ((1n << BigInt(pip)) & resolvingBitmap) !== 0n;
        }
    }

    class ScammingStore {
        get TARGET_LEVEL_MAP() {
            return {
                'delivery scam': 1,
                'family scam': 1,
                'prize scam': 1,
                'charity scam': 20,
                'tech support scam': 20,
                'vacation scam': 40,
                'tax scam': 40,
                'advance-fee scam': 60,
                'job scam': 60,
                'romance scam': 80,
                'investment scam': 80,
            };
        }
        get SPAM_ID_MAP() {
            return {
                295: 'delivery',
                293: 'family',
                291: 'prize',
                297: 'charity',
                299: 'tech support',
                301: 'vacation',
                303: 'tax',
                305: 'advance-fee',
                307: 'job',
                309: 'romance',
                311: 'investment',
            };
        }
        constructor() {
            this.data = getValue('scamming', {});
            this.data.targets = this.data.targets ?? {};
            this.data.farms = this.data.farms ?? {};
            this.data.spams = this.data.spams ?? {};
            this.data.defaultAlgo = this.data.defaultAlgo ?? 'exp';
            this.data.algoNotice = this.data.algoNotice ?? {};
            this.unsyncedSet = new Set(Object.keys(this.data.targets));
            this.solvers = {};
            this.lastSolutions = {};
            this.cash = undefined;
        }

        update(data) {
            this._updateTargets(data.DB?.crimesByType?.targets);
            this._updateFarms(data.DB?.additionalInfo?.currentOngoing);
            this._updateSpams(data.DB?.currentUserStats?.crimesByIDAttempts, data.DB?.crimesByType?.methods);
            this.cash = data.DB?.user?.money;
            this._save();
        }

        setDefaultAlgo(algo) {
            this.data.defaultAlgo = algo;
            this._save();
        }

        changeAlgo(target) {
            target.algos.push(target.algos.shift());
            target.solution = null;
            this._solve(target);
            this._save();
        }

        setAlgoNoticeRead(algo) {
            this.data.algoNotice[algo] = true;
            this._save();
        }

        _save() {
            setValue('scamming', this.data);
        }

        _updateTargets(targets) {
            if (!targets) {
                return;
            }
            for (const target of targets) {
                const stored = this.data.targets[target.subID];
                if (stored && !target.new && target.bar) {
                    stored.driftBitmap = stored.driftBitmap ?? 0;
                    stored.turns = stored.turns ?? target.turns ?? 0;
                    stored.mark = (target.target ?? '').toLowerCase();
                    let updated = false;
                    if (
                        stored.multiplierUsed !== target.multiplierUsed ||
                        stored.pip !== target.pip ||
                        stored.turns !== (target.turns ?? 0)
                    ) {
                        stored.multiplierUsed = target.multiplierUsed;
                        stored.pip = target.pip;
                        stored.turns = target.turns ?? 0;
                        stored.expire = target.expire;
                        updated = true;
                    }
                    if (updated && this.unsyncedSet.has(stored.id)) {
                        stored.unsynced = true;
                    }
                    this.unsyncedSet.delete(stored.id);
                    if (stored.bar) {
                        for (let pip = 0; pip < 50; pip++) {
                            if (target.bar[pip] === stored.bar[pip]) {
                                continue;
                            }
                            if (target.bar[pip] === 'fail' && stored.suspicion <= pip) {
                                stored.suspicion = pip + 1;
                                updated = true;
                            }
                            if (target.bar[pip] === 'neutral' && (BigInt(stored.resolvingBitmap) & (1n << BigInt(pip))) === 0n) {
                                stored.resolvingBitmap = (BigInt(stored.resolvingBitmap) | (1n << BigInt(pip))).toString();
                                updated = true;
                            }
                        }
                        if (target.firstPip) {
                            if (stored.bar[target.firstPip] === 'temptation') {
                                stored.driftBitmap |= 1;
                            }
                            if (stored.bar[target.firstPip] === 'sensitivity') {
                                stored.driftBitmap |= 2;
                            }
                        }
                    }
                    if (updated) {
                        stored.round = stored.unsynced ? this._estimateRound(target) : stored.round + 1;
                    }
                    if (!stored.bar) {
                        stored.bar = target.bar;
                        updated = true;
                    }
                    if (updated || !stored.solution) {
                        this._solve(stored);
                    }
                } else {
                    const multiplierUsed = target.multiplierUsed ?? 0;
                    const pip = target.pip ?? 0;
                    const round = multiplierUsed === 0 && pip === 0 ? 0 : Math.max(1, multiplierUsed);
                    const stored = {
                        id: target.subID,
                        email: target.email,
                        level: this.TARGET_LEVEL_MAP[target.scamMethod.toLowerCase()] ?? 999,
                        mark: '',
                        round,
                        turns: target.turns ?? 0,
                        multiplierUsed,
                        pip,
                        expire: target.expire,
                        bar: target.bar ?? null,
                        suspicion: 0,
                        resolvingBitmap: '0',
                        driftBitmap: 0,
                        algos: null,
                        solution: null,
                        unsynced: round > 0,
                    };
                    this.data.targets[target.subID] = stored;
                    this._solve(stored);
                }
            }
            const now = Math.floor(Date.now() / 1000);
            for (const target of Object.values(this.data.targets)) {
                if (target.expire < now) {
                    delete this.data.targets[target.id];
                }
            }
        }

        _updateFarms(currentOngoing) {
            if (typeof currentOngoing !== 'object' || !(currentOngoing.length > 0)) {
                return;
            }
            for (const item of currentOngoing) {
                if (!item.type) {
                    continue;
                }
                this.data.farms[item.type] = { expire: item.timeEnded };
            }
        }

        _updateSpams(crimesByIDAttempts, methods) {
            if (!crimesByIDAttempts || !methods) {
                return;
            }
            const now = Math.floor(Date.now() / 1000);
            for (const [id, count] of Object.entries(crimesByIDAttempts)) {
                const type = this.SPAM_ID_MAP[id];
                const method = methods.find((x) => String(x.crimeID) === id);
                if (!type || !method) {
                    continue;
                }
                const stored = this.data.spams[id];
                if (stored) {
                  if (count !== stored.count) {
                    stored.count = count;
                    stored.accurate = now - stored.ts < 3600;
                    stored.since = now;
                  }
                  stored.ts = now;
                  stored.depreciation = method.depreciation;
                } else {
                  this.data.spams[id] = {
                    count,
                    accurate: false,
                    since: null,
                    ts: now,
                    depreciation: method.depreciation,
                  };
                }
            }
        }

        _solve(target) {
            if (!target.bar) {
                return;
            }
            this.lastSolutions[target.id] = target.solution;
            let solver = this.solvers[target.id];
            if (!solver || solver.algo !== target.algos?.[0] || target.suspicion > 0) {
                if (!target.algos) {
                    target.algos = ['exp'];
                    if (this._isDecepticonFeasible(target)) {
                        target.algos.push('merit');
                    }
                    if (this._isGriftHorseFeasible(target)) {
                        target.algos.push('meritGrift');
                    }
                    const defaultIndex = target.algos.indexOf(this.data.defaultAlgo);
                    if (defaultIndex > 0) {
                        target.algos = [...target.algos.slice(defaultIndex), ...target.algos.slice(0, defaultIndex)];
                    }
                }
                solver = new ScammingSolver(
                    target.algos[0],
                    target.bar,
                    target.level,
                    target.round,
                    target.suspicion,
                    target.mark,
                );
                this.solvers[target.id] = solver;
            }
            target.solution = solver.solve(
                target.round,
                target.pip,
                BigInt(target.resolvingBitmap),
                target.multiplierUsed,
                target.driftBitmap,
            );
        }

        _estimateRound(target) {
            return Math.max(
                0,
                (target.turns ?? 0) -
                (target.temptationAttempt ?? 0) -
                (target.sensitivityAttempt ?? 0) +
                (target.hesitationAttempt ?? 0),
            );
        }

        _isDecepticonFeasible(target) {
            const cells = new Set(target.bar);
            return cells.has('temptation') && cells.has('sensitivity') && cells.has('hesitation') && cells.has('concern');
        }

        _isGriftHorseFeasible(target) {
            return target.mark === 'affluent';
        }
    }

    class ScammingObserver {
        constructor() {
            this.store = new ScammingStore();
            this.crimeOptions = null;
            this.farmIcons = null;
            this.spamOptions = null;
            this.virtualLists = null;
            this.observer = new MutationObserver((mutations) => {
                const isAdd = mutations.some((mutation) => {
                    for (const added of mutation.addedNodes) {
                        if (added instanceof HTMLElement) {
                            return true;
                        }
                    }
                    return false;
                });
                if (!isAdd) {
                    return;
                }
                for (const element of this.crimeOptions) {
                    if (!element.classList.contains('cm-sc-seen')) {
                        element.classList.add('cm-sc-seen');
                        this._refreshCrimeOption(element);
                    }
                }
                for (const element of this.farmIcons) {
                    if (!element.classList.contains('cm-sc-seen')) {
                        element.classList.add('cm-sc-seen');
                        this._refreshFarm(element);
                    }
                }
                for (const element of this.spamOptions) {
                    if (!element.classList.contains('cm-sc-seen')) {
                        element.classList.add('cm-sc-seen');
                        this._refreshSpam(element);
                    }
                }
                for (const element of this.virtualLists) {
                    if (!element.classList.contains('cm-sc-seen')) {
                        element.classList.add('cm-sc-seen');
                        this._refreshSettings(element);
                    }
                }
            });
        }

        start() {
            if (this.crimeOptions) {
                return;
            }
            this.crimeOptions = document.body.getElementsByClassName('crime-option');
            this.farmIcons = document.body.getElementsByClassName('scraperPhisher___oy1Wn');
            this.spamOptions = document.body.getElementsByClassName('optionWithLevelRequirement___cHH35');
            this.virtualLists = document.body.getElementsByClassName('virtualList___noLef');
            this.observer.observe($('.scamming-root')[0], { subtree: true, childList: true });
        }

        stop() {
            this.crimeOptions = null;
            this.observer.disconnect();
        }

        onNewData() {
            this.start();
            for (const element of this.crimeOptions) {
                this._refreshCrimeOption(element);
            }
            for (const element of this.farmIcons) {
                this._refreshFarm(element);
            }
            for (const element of this.spamOptions) {
                this._refreshSpam(element);
            }
        }

        _buildHintHtml(target, solution, lastSolution, showGriftNotice) {
            const actionText =
                {
                    strong: 'Fast Fwd',
                    soft: 'Soft Fwd',
                    back: 'Back',
                    capitalize: '$$$',
                    abandon: 'Abandon',
                    resolve: 'Resolve',
                }[solution.action] ?? 'N/A';
            const algo = target.algos?.[0];
            const algoText =
                {
                    exp: 'Exp',
                    merit: 'Decep',
                    meritGrift: 'Grift',
                }[algo] ?? 'Score';
            const score = Math.floor(solution.value * 100);
            const scoreText = `${score}${algo === 'meritGrift' ? '%' : ''}`;
            let scoreColor = '';
            if (algo === 'meritGrift') {
                scoreColor = score < 30 ? 't-red' : score < 60 ? 't-yellow' : 't-green';
            } else {
                scoreColor = score < 30 ? 't-red' : score < 100 ? 't-yellow' : 't-green';
            }
            const scoreDiff = lastSolution ? score - Math.floor(lastSolution.value * 100) : 0;
            const scoreDiffColor = scoreDiff > 0 ? 't-green' : 't-red';
            const scoreDiffText = scoreDiff !== 0 ? `(${scoreDiff > 0 ? '+' : ''}${scoreDiff})` : '';
            let rspText = solution.multi > target.multiplierUsed ? 'Accel' : actionText;
            let rspColor = '';
            let fullRspText = solution.multi > 0 ? `(${target.multiplierUsed}/${solution.multi} + ${actionText})` : '';
            if (target.unsynced) {
                rspText = 'Unsynced';
                rspColor = 't-gray-c';
                fullRspText = fullRspText !== '' ? fullRspText : `(${actionText})`;
            }
            const $wrapper = $('<span class="cm-sc-info cm-sc-hint cm-sc-hint-content"></span>');
            if (showGriftNotice) {
                $wrapper.append(`<span><span class="cm-sc-algo">${algoText}</span></span>`);
                $wrapper.append('<span class="cm-sc-notice t-blue">Click to read about this strategy</span>');
                $wrapper.children('.cm-sc-notice').on('click', () => {
                    const msg =
                        'Warning: The "Grift Horse" strategy is highly aggressive and does NOT avoid critical failures. ' +
                        'You may lose a significant amount of crime experience.\n\n' +
                        'Click OK to proceed with this risky strategy, or Cancel to choose a safer alternative.';
                    if (confirm(msg)) {
                        this.store.setAlgoNoticeRead(algo);
                        location.reload();
                    }
                });
            } else {
                $wrapper.append(
                    `<span><span class="cm-sc-algo">${algoText}</span>: <span class="${scoreColor}">${scoreText}</span><span class="${scoreDiffColor}">${scoreDiffText}</span></span>`,
                );
                $wrapper.append(
                    `<span class="cm-sc-hint-action"><span class="${rspColor}">${rspText}</span> <span class="t-gray-c">${fullRspText}</span></span>`,
                );
            }
            $wrapper.append(`<span class="cm-sc-hint-button t-blue">Lv${target.level}</span>`);
            return $wrapper;
        }

        _refreshCrimeOption(element) {
            this._refreshTarget(element);
            this._refreshFarmButton(element);
        }

        _refreshTarget(element) {
            const $crimeOption = $(element);
            const $email = $crimeOption.find('span.email___gVRXx');
            const email = $email.text();
            const target = Object.values(this.store.data.targets).find((x) => x.email === email);
            if (!target) {
                return;
            }
            $crimeOption.find('.cm-sc-info').remove();
            $email.parent().addClass('cm-sc-info-wrapper');
            $email.parent().children().addClass('cm-sc-orig-info');
            const solution = target.solution;
            if (solution) {
                if (!$crimeOption.find('.cm-sc-hint-content').length) {
                    $email.parent().removeClass('cm-sc-hint-hidden');
                }
                const algo = target.algos?.[0];
                const showGriftNotice = algo === 'meritGrift' && !this.store.data.algoNotice[algo];
                const actionAttr = showGriftNotice
                    ? ''
                    : solution.multi > target.multiplierUsed
                    ? 'accelerate'
                    : solution.action;
                $crimeOption.attr('data-cm-action', actionAttr);
                $crimeOption.toggleClass('cm-sc-unsynced', !showGriftNotice && (target.unsynced ?? false));
                const lastSolution = this.store.lastSolutions[target.id];
                $email.parent().append(this._buildHintHtml(target, solution, lastSolution, showGriftNotice));
                $email.parent().append(`<span class="cm-sc-info cm-sc-orig-info cm-sc-hint-button t-blue">Hint</div>`);
                $crimeOption.find('.cm-sc-hint-button').on('click', () => {
                    $email.parent().toggleClass('cm-sc-hint-hidden');
                });
                if (target.algos?.length > 1) {
                    const $algo = $crimeOption.find('.cm-sc-algo');
                    $algo.addClass('t-blue');
                    $algo.addClass('cm-sc-active');
                    $algo.on('click', () => {
                        this.store.changeAlgo(target);
                        this._refreshTarget(element);
                    });
                }
            } else {
                $email.parent().addClass('cm-sc-hint-hidden');
            }
            const now = Math.floor(Date.now() / 1000);
            const lifetime = formatLifetime(target.expire - now);
            $email.before(`<span class="cm-sc-info ${lifetime.color}">${lifetime.text}</div>`);
            if ($crimeOption.find('.cell___AfwZm').length >= 50) {
                $crimeOption.find('.cell___AfwZm .cm-sc-scale').remove();
                for (let i = 0; i < 50; i++) {
                    const dist = i - target.pip;
                    const label = dist % 5 !== 0 || dist === 0 || dist < -5 ? '' : dist % 10 === 0 ? (dist / 10).toString() : "'";
                    let $scale = $crimeOption.find('.cell___AfwZm').eq(i).children('.cm-sc-scale');
                    if ($scale.length === 0) {
                        $scale = $('<div class="cm-sc-scale"></div>');
                        $crimeOption.find('.cell___AfwZm').eq(i).append($scale);
                    }
                    $scale.text(label);
                }
            }
            const $accButton = $crimeOption.find('.response-type-button').eq(3);
            $accButton.find('.cm-sc-multiplier').remove();
            if (target.multiplierUsed > 0) {
                $accButton.append(`<div class="cm-sc-multiplier">${target.multiplierUsed}</div>`);
            }
        }

        _refreshFarmButton(element) {
            const $element = $(element);
            if ($element.find('.emailAddresses___ky_qG').length === 0) {
                return;
            }
            $element.find('.commitButtonSection___wJfnI button').toggleClass('cm-sc-low-cash', this.store.cash < 10000);
        }

        _refreshFarm(element) {
            const $element = $(element);
            const label = $element.attr('aria-label') ?? '';
            const farm = Object.entries(this.store.data.farms).find(([type]) => label.toLowerCase().includes(type))?.[1];
            if (!farm) {
                return;
            }
            const now = Math.floor(Date.now() / 1000);
            const lifetime = formatLifetime(farm.expire - now);
            $element.find('.cm-sc-farm-lifetime').remove();
            $element.append(`<div class="cm-sc-farm-lifetime ${lifetime.color}">${lifetime.text}</div>`);
        }

        _refreshSpam(element) {
            const $spamOption = $(element);
            if ($spamOption.closest('.dropdownList').length === 0) {
                return;
            }
            const label = $spamOption
                .contents()
                .filter((_, x) => x.nodeType === Node.TEXT_NODE)
                .text();
            const spam = Object.entries(this.store.data.spams).find(([id]) =>
                label.toLowerCase().includes(this.store.SPAM_ID_MAP[id]),
            )?.[1];
            $spamOption.addClass('cm-sc-spam-option');
            $spamOption.find('.cm-sc-spam-elapsed').remove();
            if (!spam || !spam.since || spam.depreciation) {
                return;
            }
            const now = Math.floor(Date.now() / 1000);
            const elapsed = formatLifetime(now - spam.since);
            if (!spam.accurate) {
                elapsed.text = '> ' + elapsed.text;
            }
            if (elapsed.hours >= 24 * 8) {
                elapsed.text = '> 7d';
            }
            if (elapsed.hours >= 24 && elapsed.hours < 72) {
                elapsed.color = 't-green';
            }
            $spamOption.append(`<div class="cm-sc-spam-elapsed ${elapsed.color}">${elapsed.text}</div>`);
        }

        _refreshSettings(element) {
            const store = this.store;
            const defaultAlgo = store.data.defaultAlgo;
            const $settings = $(`<div class="cm-sc-settings">
                <span>Default Strategy:</span>
                <span class="cm-sc-algo-option t-blue" data-cm-value="exp">Exp</span>
                <span class="cm-sc-algo-option t-blue" data-cm-value="merit">Decepticon</span>
                <span class="cm-sc-algo-option t-blue" data-cm-value="meritGrift">Grift Horse</span>
            </div>`);
            $settings.children(`[data-cm-value="${defaultAlgo}"]`).addClass('cm-sc-active');
            $settings.children('.cm-sc-algo-option').on('click', function () {
                const $this = $(this);
                store.setDefaultAlgo($this.attr('data-cm-value'));
                $this.siblings().removeClass('cm-sc-active');
                $this.addClass('cm-sc-active');
            });
            $settings.insertBefore(element);
        }
    }

    const scammingObserver = new ScammingObserver();

    async function checkScamming(crimeType, data) {
        if (crimeType !== '12') {
            scammingObserver.stop();
            return;
        }
        scammingObserver.store.update(data);
        scammingObserver.onNewData();
    }

    async function onCrimeData(crimeType, data) {
        await checkScamming(crimeType, data);
    }

    function interceptFetch() {
        const targetWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
        const origFetch = targetWindow.fetch;
        targetWindow.fetch = async (...args) => {
            const rsp = await origFetch(...args);

            try {
                const url = new URL(args[0], location.origin);
                const params = new URLSearchParams(url.search);
                const reqBody = args[1]?.body;
                const crimeType = params.get('typeID') ?? reqBody?.get('typeID');
                if (url.pathname === '/page.php' && params.get('sid') === 'crimesData' && crimeType) {
                    const clonedRsp = rsp.clone();
                    await onCrimeData(crimeType, await clonedRsp.json());
                }
            } catch {
                // ignore
            }

            return rsp;
        };
    }

    function renderStyle() {
        addStyle(`
            .cm-sc-info {
                transform: translateY(1px);
            }
            .cm-sc-notice,
            .cm-sc-hint-button {
                cursor: pointer;
            }
            .cm-sc-info-wrapper.cm-sc-hint-hidden > .cm-sc-hint,
            .cm-sc-info-wrapper:not(.cm-sc-hint-hidden) > .cm-sc-orig-info {
                display: none;
            }
            .cm-sc-hint-content {
                display: flex;
                justify-content: space-between;
                flex-grow: 1;
                gap: 5px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .cm-sc-notice,
            .cm-sc-hint-action {
                flex-shrink: 1;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .cm-sc-seen[data-cm-action=strong] .response-type-button:nth-child(1):after,
            .cm-sc-seen[data-cm-action=soft] .response-type-button:nth-child(2):after,
            .cm-sc-seen[data-cm-action=back] .response-type-button:nth-child(3):after,
            .cm-sc-seen[data-cm-action=accelerate] .response-type-button:nth-child(4):after,
            .cm-sc-seen[data-cm-action=capitalize] .response-type-button:nth-child(5):after {
                content: '\u2713';
                color: var(--crimes-green-color);
                position: absolute;
                top: 0;
                right: 0;
                font-size: 12px;
                font-weight: bolder;
                line-height: 1;
                z-index: 999;
            }
            .cm-sc-seen.cm-sc-unsynced[data-cm-action=strong] .response-type-button:nth-child(1):after,
            .cm-sc-seen.cm-sc-unsynced[data-cm-action=soft] .response-type-button:nth-child(2):after,
            .cm-sc-seen.cm-sc-unsynced[data-cm-action=back] .response-type-button:nth-child(3):after,
            .cm-sc-seen.cm-sc-unsynced[data-cm-action=accelerate] .response-type-button:nth-child(4):after,
            .cm-sc-seen.cm-sc-unsynced[data-cm-action=capitalize] .response-type-button:nth-child(5):after {
                content: '?';
            }
            .cm-sc-seen[data-cm-action=abandon] .response-type-button:after {
                content: '\u2715';
                color: var(--crimes-stats-criticalFails-color);
                position: absolute;
                top: 0;
                right: 0;
                font-size: 12px;
                font-weight: bolder;
                line-height: 1;
                z-index: 999;
            }
            .cm-sc-scale {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: calc(100% + 10px);
                line-height: 1;
                font-size: 8px;
                display: flex;
                align-items: flex-end;
                justify-content: center;
            }
            .cm-sc-multiplier {
                position: absolute;
                bottom: 0;
                right: 0;
                color: var(--crimes-baseText-color);
                text-align: right;
                font-size: 10px;
                line-height: 1;
            }
            .cm-sc-farm-lifetime {
                padding-top: 2px;
                text-align: center;
            }
            .cm-sc-spam-option .levelLabel___LNbg8,
            .cm-sc-spam-option .separator___C2skk {
                display: none;
            }
            .cm-sc-spam-elapsed {
                position: absolute;
                right: -5px;
            }
            .cm-sc-settings {
                height: 40px;
                width: 100%;
                background: var(--default-bg-panel-color);
                border-bottom: 1px solid var(--crimes-crimeOption-borderBottomColor);
                padding-left: 10px;
                box-sizing: border-box;
                display: flex;
                align-items: center;
                gap: 20px;
            }
            .cm-sc-algo-option {
                cursor: pointer;
                line-height: 1.5;
                border-top: 2px solid #0000;
                border-bottom: 2px solid #0000;
            }
            .cm-sc-algo-option.cm-sc-active {
                border-bottom-color: var(--default-blue-color);
            }
            .cm-sc-algo.cm-sc-active {
                cursor: pointer;
            }
            .cm-sc-algo.cm-sc-active:before {
                content: '\u21bb ';
            }
            .cm-sc-low-cash:after {
                content: 'Low Cash';
                color: var(--default-red-color);
                position: absolute;
                width: 100%;
                left: 0;
                top: calc(100% - 4px);
                line-height: 1;
                font-size: 12px;
            }
        `);
    }

    function isCrimesPage() {
        const url = new URL(window.location.href);
        return (
            (url.pathname.endsWith('/page.php') || url.pathname.endsWith('/loader.php')) &&
            url.searchParams.get('sid') === 'crimes'
        );
    }

    function isScammingPage() {
        return isCrimesPage() && window.location.hash.includes('/scamming');
    }

    async function getSettings() {
        return window.SidekickModules.Core.ChromeStorage.get('sidekick_settings');
    }

    function shouldRun(settings) {
        return settings?.[SCAMMING_STORAGE_KEY]?.isEnabled === true;
    }

    return {
        async init() {
            if (!isScammingPage()) {
                return;
            }

            const settings = await getSettings();
            if (!shouldRun(settings)) {
                return;
            }

            if (!window.jQuery && !window.$) {
                console.warn('[Scamming] Scamming helper requires jQuery and will run only when available');
                return;
            }

            interceptFetch();
            renderStyle();
            console.log('[Scamming] Module initialized');
        }
    };
})();

if (typeof window.SidekickModules === 'undefined') {
    window.SidekickModules = {};
}

window.SidekickModules.Scamming = ScammingModule;
console.log('[Scamming] Registered');