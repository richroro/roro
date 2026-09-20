package com.richroro.skystrike

import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin
import kotlin.math.sqrt

/**
 * The whole game, with no Android in it.
 *
 * Screen space is x in [-1, 1] across and y in [0, 1] down, so the simulation does not care what
 * size the device is. The player flies in a band near the bottom -- sideways between
 * [-PLAYER_LIMIT, PLAYER_LIMIT] and forward and back between [PLAYER_Y_MIN] and [PLAYER_Y_MAX] --
 * and everything else falls towards them. Pushing forward buys reaction room the way a real
 * fighter does: you meet the wave sooner, with less sky left to dodge in. Kept free of Canvas and Context so it can be unit tested on
 * a plain JVM, exactly like the crowd game's world.
 */
class SkyWorld(private val seed: Int = 1) {

    enum class State { READY, RUNNING, LEVEL_CLEAR, GAME_OVER }

    /**
     * Eight ways to be in the way. The first four fall towards you in different lines; the last
     * four each ask you to do something you would not otherwise do -- move off the centre line,
     * finish what you started, deal with something that will not leave, or thin a crowd fast.
     */
    enum class Kind {
        DRONE, WEAVER, GUNNER, DIVER, SHIELDER, SPLITTER, TURRET, SWARM,
        /** Lays mines behind it. The mines themselves are [MINE]. */
        MINER,
        /** A mine: it barely moves, and it is still there when you come back. */
        MINE,
        /** Picks a lane, tells you it is coming, and then comes. */
        CHARGER,
        /** Mends whatever you just damaged. Deal with it first or deal with everything twice. */
        HEALER,
    }

    /** How big a target each kind is. A swarm bee is a much smaller thing to hit than a barge. */
    fun halfOf(kind: Kind): Float = when (kind) {
        Kind.SWARM -> ENEMY_HALF * 0.55f
        Kind.MINE -> ENEMY_HALF * 0.7f
        Kind.SHIELDER, Kind.SPLITTER, Kind.MINER -> ENEMY_HALF * 1.2f
        else -> ENEMY_HALF
    }

    /**
     * Ten pickups on five different axes: more guns (SPREAD, WINGMAN), a faster gun (RAPID), a
     * gun that behaves differently (PIERCE, HOMING), staying alive (SHIELD, REPAIR, BOMB), and
     * the two that look after the chain and the sky around you (CHARM, MAGNET).
     */
    enum class ItemKind {
        SPREAD, RAPID, SHIELD, BOMB, REPAIR, WINGMAN, PIERCE, HOMING, MAGNET, CHARM,
        /** Everything coming at you moves at a fraction of its speed for a while. */
        SLOW,
        /** Orbs that circle you and eat the fire that runs into them. */
        ORBIT,
        /** Every few kills mends the aircraft. Aggression pays for itself. */
        VAMPIRE,
        /** Points, there and then, at whatever your chain is paying. */
        MEDAL,
    }

    /** A bullet. Player shots travel up the screen, enemy shots down. */
    class Shot(
        var x: Float,
        var y: Float,
        var vx: Float,
        var vy: Float,
        val fromPlayer: Boolean,
        val damage: Int = 1,
    ) {
        var alive = true
            internal set
        /** How many more aircraft this shot can punch through before it is spent. */
        var pierce = 0
            internal set
        /** The last thing it hit, so punching through does not mean hitting it four frames running. */
        internal var lastHit: Any? = null
    }

    class Plane(
        var x: Float,
        var y: Float,
        val kind: Kind,
        hp: Int,
        /** Lane the formation wants this plane to hold; weaving is measured from it. */
        val homeX: Float,
        val phase: Float,
        val speed: Float,
    ) {
        var hp: Int = hp
            internal set
        val maxHp: Int = hp
        var alive = true
            internal set
        /** Seconds until this one may fire again. */
        var cooldown = 0f
            internal set
        /** Roll angle in [-1, 1], driven by sideways travel; the renderer banks the sprite with it. */
        var bank = 0f
            internal set
        internal var lastX = x
        /** A turret holds station for a while, then gives up and carries on down. */
        internal var anchor = 0f
        /** A charger's countdown: positive while it is winding up, negative while it is committed. */
        internal var charge = 0f
        /** The lane a charger picked when it started telling you about it. */
        internal var lockX = 0f
        /** Non-zero for a beat after a healer mends this one; the view flashes it green. */
        var mended = 0f
            internal set

        internal fun hpForTest(value: Int) { hp = value }

        init {
            // a charger always starts in the open, telling you where it is going
            if (kind == Kind.CHARGER) charge = CHARGE_TELL
        }
    }

    class Boss(val kind: Int, hp: Int) {
        var x = 0f
            internal set
        var y = -0.25f
            internal set
        var hp: Int = hp
            internal set
        val maxHp: Int = hp
        var alive = true
            internal set
        /** 0 while flying in, 1 once it has taken station and started attacking. */
        var engaged = false
            internal set
        var bank = 0f
            internal set
        /**
         * Counts down while the hull comes apart. The stage does not end until it reaches zero,
         * so a kill is a thing you watch rather than a switch that flips the panel up.
         */
        var dying = 0f
            internal set
        /** How far the wreck has rolled over, in turns, once it stops flying. */
        var roll = 0f
            internal set
        internal var salvo = 0f
        internal var sweep = 0f
        /**
         * 0, 1, then 2. It sweeps harder and fires differently at each step, so the fight is three
         * short fights rather than one long one.
         */
        var phase = 0
            internal set
        /** Non-zero for a moment after it steps up a phase; the view flashes it. */
        var rage = 0f
            internal set
        internal var spin = 0f
        internal var burst = 0
        internal var wallGap = 0
        /** True once the last blast has gone off and the hull is no longer there to draw. */
        var finished = false
            internal set
        internal var driftX = 0f
        internal var nextBreakAt = 0f
        internal var breaks = 0
    }

    class Item(var x: Float, var y: Float, val kind: ItemKind) {
        var alive = true
            internal set
    }

    class Event(
        val type: Type,
        val x: Float = 0f,
        val y: Float = 0f,
        val value: Int = 0,
        val item: ItemKind? = null,
    ) {
        enum class Type {
            SHOT, ENEMY_SHOT, HIT_ENEMY, KILL_ENEMY, HIT_BOSS,
            BOSS_DOWN, BOSS_BREAK, KILL_BOSS, BOSS_PHASE,
            COMBO_UP, COMBO_LOST, CHARM_USED, RUSH, DEFLECT, SPLIT,
            MINE_LAID, CHARGE, HEAL, ORBIT_BLOCK, VAMP_HEAL, MEDAL, BOON_TAKEN,
            HIT_PLAYER, SHIELD_USED, PICKUP, BOMB, BOSS_IN, CLEAR, OVER,
        }
    }

    /**
     * How a raider fights. The hull you see is the hull that behaves this way, so a stage you
     * have flown before still surprises you once the raider underneath it changes.
     */
    enum class BossStyle { FAN, BURST, WALL, DAGGER, COLUMN, RING }

    class BossProfile(
        val style: BossStyle,
        val sweepRate: Float,
        val reach: Float,
        val gap: Float,
        val hp: Float,
    )

    /**
     * What you pick between stages. Unlike a pickup, a boon is yours for the rest of the run --
     * it is what makes the fourth stage of a good run feel different from the fourth stage of a
     * bad one, and it is the reason to keep a run alive rather than restart for a better start.
     */
    enum class Boon { ARMOUR, BOMBS, GUNS, ESCORT, RAPIDFIRE, CHAINWINDOW, CHARMED, MAGNETIC, PIERCING, SUPPLY, AGILITY, CHAINCAP }

    /** The shapes a wave can fly in. Each stage draws from its own set. */
    enum class Formation { LINE, VEE, ARC, TRAIL, SPLIT }

    /** What the place itself does to you, on top of whatever is shooting. */
    enum class Hazard { NONE, GUSTS, FLAK, DARK }

    /**
     * What a stage is made of. Wave count and enemy mix alone made every stage a longer version
     * of the last one; the formation set, the hazard and how much warning you get are what make
     * the four places fly differently.
     */
    class Profile(
        val waves: Int,
        val mix: List<Kind>,
        val fireRate: Float,
        val speed: Float,
        val bossHp: Float,
        val formations: List<Formation>,
        val hazard: Hazard,
        /** Where enemies cross into view. Nearer zero is less warning. */
        val entryY: Float,
    )

    /** A column of fire standing up off the burning ground. Stage 3 only. */
    class Flare(var x: Float, var y: Float, var life: Float, val maxLife: Float, val phase: Float) {
        var alive = true
            internal set
    }

    // ---- state ----------------------------------------------------------------------------

    var state = State.READY
        private set
    var level = 1
        private set
    var bestLevel = 0
        internal set
    var score = 0
        private set
    var kills = 0
        private set
    /** What the run has picked up between stages, and how many times each. */
    private val boonLevels = HashMap<Boon, Int>()
    val boons: Map<Boon, Int> get() = boonLevels

    /** The three on offer right now. Empty unless the stage has just been cleared. */
    var offered: List<Boon> = emptyList()
        private set

    fun boonLevel(boon: Boon): Int = boonLevels[boon] ?: 0

    // What the boons add up to. Everything that reads a starting value reads one of these.
    fun maxHp(): Int = MAX_HP + boonLevel(Boon.ARMOUR)
    fun startBombs(): Int = START_BOMBS + boonLevel(Boon.BOMBS)
    fun startSpread(): Int = min(MAX_SPREAD, 1 + boonLevel(Boon.GUNS))
    fun startWingmen(): Int = min(MAX_WINGMEN, boonLevel(Boon.ESCORT))
    fun fireRate(): Float = BASE_FIRE_RATE * (1f + RAPIDFIRE_STEP * boonLevel(Boon.RAPIDFIRE))
    fun comboWindow(): Float = COMBO_WINDOW + CHAINWINDOW_STEP * boonLevel(Boon.CHAINWINDOW)
    fun maxComboMult(): Int = MAX_COMBO_MULT + CHAINCAP_STEP * boonLevel(Boon.CHAINCAP)
    fun basePierce(): Int = boonLevel(Boon.PIERCING)
    fun itemChance(): Float = ITEM_CHANCE * (1f + SUPPLY_STEP * boonLevel(Boon.SUPPLY))
    /**
     * How far forward this run may push. Agility buys sky, but never past [FRONT_FLOOR] -- the
     * boss fight opening with a free ram is a promise the boons do not get to break.
     */
    fun frontLimit(): Float =
        max(FRONT_FLOOR, PLAYER_Y_MIN - AGILITY_STEP * boonLevel(Boon.AGILITY))
    /** A standing pull on pickups, before any magnet you happen to be holding. */
    fun standingPull(): Float = MAGNETIC_STEP * boonLevel(Boon.MAGNETIC)

    /** Hits taken on this stage, and the best chain held on it: what the stage is graded on. */
    var stageHits = 0
        private set
    var stageBestCombo = 0
        private set

    /** How many times this run can still pick itself up where it fell. */
    var continues = MAX_CONTINUES
        private set

    var playerX = 0f
        private set
    /** How far up the screen the fighter has been pushed, inside the band. */
    var playerY = PLAYER_Y
        private set
    var hp = MAX_HP
        private set
    var bombs = START_BOMBS
        private set
    var shield = false
        private set
    var rapidTimer = 0f
        private set
    var spread = 1
        private set
    /** Escorts flying off your wingtips. They fire on their own and are the first thing a hit takes. */
    var wingmen = 0
        private set
    var pierceTimer = 0f
        private set
    var homingTimer = 0f
        private set
    var magnetTimer = 0f
        private set
    /** A charm that eats one chain break. The hit still lands; the chain survives it. */
    var charm = false
        private set
    /** While this runs, everything coming at you moves at [SLOW_FACTOR] of its speed. */
    var slowTimer = 0f
        private set
    /** Orbs circling you, eating the fire that runs into them. */
    var orbs = 0
        private set
    var orbitPhase = 0f
        private set
    /** While this runs, every [VAMP_KILLS] kills puts a hit point back. */
    var vampTimer = 0f
        private set
    private var vampCount = 0

    /** How fast the world coming at you is allowed to move right now. */
    fun enemyTimeScale(): Float = if (slowTimer > 0f) SLOW_FACTOR else 1f

    /** Where orb [index] is sitting, so the view can draw it and a test can ask. */
    fun orbX(index: Int): Float = playerX + cos(orbitPhase + index * (TAU / max(1, orbs))) * ORBIT_R
    fun orbY(index: Int): Float = playerY + sin(orbitPhase + index * (TAU / max(1, orbs))) * ORBIT_R * 0.72f

    /**
     * Kills land in chains: each one inside [COMBO_WINDOW] of the last extends it, and the chain
     * multiplies what every kill is worth. Taking a hit drops it to nothing, so flying forward to
     * keep the chain alive is the gamble the whole scoring system is built on.
     */
    var combo = 0
        private set
    var comboTimer = 0f
        private set
    var bestCombo = 0
        private set

    /** Counts down while the player is briefly untouchable after a hit. */
    var mercy = 0f
        private set
    /** Non-zero for a moment after the player is hit; the view flashes on it. */
    var flash = 0f
        private set

    private val mutableEnemies = ArrayList<Plane>()
    /** Anything spawned while the enemy list is being walked waits here until the walk is done. */
    private val pendingSpawns = ArrayList<Plane>()
    private val mutableShots = ArrayList<Shot>()
    private val mutableItems = ArrayList<Item>()
    private val mutableFlares = ArrayList<Flare>()
    val enemies: List<Plane> get() = mutableEnemies
    val shots: List<Shot> get() = mutableShots
    val items: List<Item> get() = mutableItems
    val flares: List<Flare> get() = mutableFlares

    /** The crosswind pushing you sideways right now, in lane widths per second. Zero off stage 2. */
    var gust = 0f
        private set
    var boss: Boss? = null
        private set

    private val pendingEvents = ArrayList<Event>()
    private var random = Rng(seed)
    private var shotRandom = Rng(seed * 31 + 7)
    private var fireAccumulator = 0f
    private var elapsed = 0f
    private var waveIndex = 0
    private var nextWaveAt = 0f
    private var totalWaves = 0
    private var nextFlareAt = 0f
    private var rushAt = 0
    private var rushDone = false

    /** Moves queued events into [into] and clears the queue. */
    fun drainEvents(into: MutableList<Event>) {
        into.addAll(pendingEvents)
        pendingEvents.clear()
    }

    /**
     * A brand new run. Everything a run accumulates resets here and nowhere else, so a stage
     * change or a continue carries the score, the kill count and the best chain with it.
     */
    /**
     * Lays out three to pick between. Anything already at its ceiling drops out of the pool, so
     * late in a run you are choosing between the things you have not taken yet.
     */
    private fun offerBoons() {
        val pool = Boon.entries.filter { boonLevel(it) < boonCap(it) }.toMutableList()
        val picks = ArrayList<Boon>(BOONS_OFFERED)
        while (picks.size < BOONS_OFFERED && pool.isNotEmpty()) {
            picks.add(pool.removeAt(random.nextInt(pool.size)))
        }
        offered = picks
    }

    /**
     * Takes the boon at [index] of what is on offer and flies on. Returns false when there is
     * nothing to take, so the view can fall back to simply starting the next stage.
     */
    fun takeBoon(index: Int): Boolean {
        if (state != State.LEVEL_CLEAR || index !in offered.indices) return false
        val boon = offered[index]
        boonLevels[boon] = boonLevel(boon) + 1
        pendingEvents.add(Event(Event.Type.BOON_TAKEN, 0f, 0f, value = boon.ordinal))
        offered = emptyList()
        nextLevel()
        return true
    }

    fun start() {
        score = 0
        kills = 0
        bestCombo = 0
        continues = MAX_CONTINUES
        boonLevels.clear()
        offered = emptyList()
        startLevel(1)
    }

    /**
     * Picks the run back up on the stage you fell on, with a fresh aircraft. The score and the
     * kills stay -- you are continuing, not starting over -- and you only get [MAX_CONTINUES] of
     * them, so the run still has an end. Returns false when there is nothing left to spend.
     */
    fun continueRun(): Boolean {
        if (state != State.GAME_OVER || continues <= 0) return false
        continues--
        startLevel(level)
        return true
    }

    fun nextLevel() = startLevel(level + 1)

    fun startLevel(newLevel: Int) {
        level = newLevel
        random = Rng(seed * 7919 + newLevel * 104729)
        shotRandom = Rng(seed * 31 + newLevel * 17)
        val profile = profileOf(newLevel)
        mutableEnemies.clear()
        pendingSpawns.clear()
        mutableShots.clear()
        mutableItems.clear()
        mutableFlares.clear()
        pendingEvents.clear()
        boss = null
        playerX = 0f
        playerY = PLAYER_Y
        hp = maxHp()
        bombs = startBombs()
        shield = false
        rapidTimer = 0f
        spread = startSpread()
        wingmen = startWingmen()
        pierceTimer = 0f
        homingTimer = 0f
        magnetTimer = 0f
        charm = boonLevel(Boon.CHARMED) > 0
        slowTimer = 0f
        orbs = 0
        orbitPhase = 0f
        vampTimer = 0f
        vampCount = 0
        mercy = 0f
        flash = 0f
        combo = 0
        comboTimer = 0f
        stageHits = 0
        stageBestCombo = 0
        rushDone = false
        fireAccumulator = 0f
        elapsed = 0f
        waveIndex = 0
        totalWaves = profile.waves
        // one scripted surge halfway through, so the stage is not a metronome all the way down
        rushAt = profile.waves / 2
        nextWaveAt = 0.8f
        gust = 0f
        nextFlareAt = FLARE_GAP
        offered = emptyList()
        state = State.RUNNING
    }

    /**
     * Nudges the fighter. [dy] is positive downwards, like the rest of screen space, and both axes
     * are clamped to the flight band so no drag can fling you into the raider's lap or off-screen.
     */
    fun movePlayerBy(dx: Float, dy: Float = 0f) {
        playerX = (playerX + dx).coerceIn(-PLAYER_LIMIT, PLAYER_LIMIT)
        playerY = (playerY + dy).coerceIn(frontLimit(), PLAYER_Y_MAX)
    }

    /** Sets off the screen-clearing bomb, if one is left. Returns true when it fired. */
    fun useBomb(): Boolean {
        if (state != State.RUNNING || bombs <= 0) return false
        bombs--
        pendingEvents.add(Event(Event.Type.BOMB, playerX, playerY))
        // iterate a copy: splitting adds to the list while we are walking it
        for (e in mutableEnemies.toList()) {
            if (!e.alive) continue
            e.alive = false
            awardKill(e.kind, e.x, e.y)
            if (e.kind == Kind.SPLITTER) splitInTwo(e)
        }
        for (s in mutableShots) if (!s.fromPlayer) s.alive = false
        boss?.let { b ->
            if (b.alive) {
                val dmg = max(1, (b.maxHp * BOMB_BOSS_RATIO).toInt())
                damageBoss(b, dmg)
            }
        }
        return true
    }

    // ---- flying itself --------------------------------------------------------------------

    /** True while the aircraft is flying itself. */
    var ai = false
        private set
    private var aiDelay = 0f
    private var aiLastState = State.READY
    /** Worked out once a frame rather than once per candidate square: aiCost runs thirteen times. */
    private var aiPick: Plane? = null
    private var aiDrift = 0f

    fun setAi(on: Boolean) {
        ai = on
        // switched on over a panel, it still reads the panel before it acts
        aiDelay = if (state == State.RUNNING) 0f else AI_PAUSE
        aiLastState = state
    }

    /**
     * One tick of flying itself. Called before [update], and it drives the whole run: it starts a
     * stage, flies it, picks a boon at the end of one, and picks the run back up when it falls.
     * It lives here rather than in the view so both ports fly identically and a test can watch it.
     */
    fun aiTick(dt: Float) {
        if (!ai) return
        if (state != aiLastState) {
            aiLastState = state
            // a beat on each panel, so a watcher can read what just happened
            aiDelay = if (state == State.RUNNING) 0f else AI_PAUSE
        }
        aiDelay = max(0f, aiDelay - dt)
        if (state == State.RUNNING) {
            flyAutopilot(min(MAX_FRAME_DT, max(0f, dt)))
            return
        }
        if (aiDelay > 0f) return
        when (state) {
            State.READY -> start()
            State.LEVEL_CLEAR -> if (!takeBoon(bestBoonIndex())) nextLevel()
            State.GAME_OVER -> if (!continueRun()) start()
            State.RUNNING -> {}
        }
    }

    /**
     * Scores a ring of places it could be in a moment and steps towards the best one. Sampling
     * beats steering rules here: it dodges a curtain and a diver with the same code, and it never
     * argues with itself about which threat to run from.
     */
    private fun flyAutopilot(dt: Float) {
        aiPick = aiTarget()
        aiDrift = bossDriftX()
        // the crosswind is going to push it before the next frame, so plan from where it lands
        val drift = gust * dt
        var bestCost = aiCost(playerX + drift, playerY)
        var bestX = playerX
        var bestY = playerY
        var i = 0
        while (i < AI_SAMPLES.size) {
            val cx = (playerX + AI_SAMPLES[i] * AI_REACH + drift).coerceIn(-PLAYER_LIMIT, PLAYER_LIMIT)
            val cy = (playerY + AI_SAMPLES[i + 1] * AI_REACH).coerceIn(frontLimit(), PLAYER_Y_MAX)
            val cost = aiCost(cx, cy)
            if (cost < bestCost) { bestCost = cost; bestX = cx; bestY = cy }
            i += 2
        }
        val step = AI_SPEED * dt
        movePlayerBy((bestX - playerX).coerceIn(-step, step), (bestY - playerY).coerceIn(-step, step))
        // a bomb when there is nowhere good left to stand, and sooner on the last of the hull
        val patience = if (hp <= 1) AI_BOMB_AT * 0.45f else AI_BOMB_AT
        if (bombs > 0 && mercy <= 0f && bestCost > patience) useBomb()
    }

    /**
     * What it would cost to be at ([x], [y]). Staying alive is worth orders of magnitude more
     * than lining up a shot, so danger is squared and heavy and everything else only breaks ties.
     */
    private fun aiCost(x: Float, y: Float): Float {
        // while the hull is still flashing nothing can touch it, so it may cross a curtain to
        // pick something up rather than cower through the one window it has
        val exposure = if (mercy > AI_MERCY_TRUST) AI_MERCY_DISCOUNT else 1f
        var danger = 0f
        // incoming fire, at its closest approach rather than sampled: a round moving half a
        // screen a second steps straight through any sampling coarse enough to be affordable
        for (s in mutableShots) {
            if (s.fromPlayer || !s.alive) continue
            danger += bite(s.x - x, s.y - y, s.vx, s.vy, AI_SHOT_CLEAR, AI_SHOT_WEIGHT)
        }
        // and anything solid, each kind projected the way it actually flies
        for (e in mutableEnemies) {
            if (!e.alive) continue
            danger += bite(e.x - x, e.y - y, 0f, aiSpeedY(e), AI_BODY_CLEAR + halfOf(e.kind), AI_BODY_WEIGHT)
        }
        // the fields burn upward, and a column you have not looked for is a column you fly into
        for (f in mutableFlares) {
            if (!f.alive || f.life <= FLARE_LIFE * 0.25f) continue
            danger += bite(f.x - x, f.y - y, 0f, -FLARE_RISE, AI_FLARE_CLEAR, AI_FLARE_WEIGHT)
        }
        boss?.let { b ->
            if (b.alive) {
                val clear = BOSS_HALF + AI_BODY_CLEAR
                val gap = max(abs(b.x - x), abs(b.y - y))
                if (gap < clear) {
                    val nip = 1f - gap / clear
                    danger += nip * nip * AI_BODY_WEIGHT
                }
            }
        }
        // the edges are a trap: nowhere to run once you are in one
        val edge = PLAYER_LIMIT - abs(x)
        if (edge < AI_EDGE_CLEAR) {
            val nip = 1f - edge / AI_EDGE_CLEAR
            danger += nip * nip * AI_EDGE_WEIGHT
        }
        danger *= exposure

        var pull = 0f
        // pickups are worth going for, and worth more the closer they already are
        for (item in mutableItems) {
            if (!item.alive) continue
            val dx = item.x - x
            val dy = item.y - y
            pull -= AI_ITEM_WEIGHT / (0.08f + sqrt(dx * dx + dy * dy))
        }
        val target = aiPick
        if (target != null) {
            // rounds take time to arrive and everything worth shooting is moving, so it stands
            // where the target is going to be, not where it is
            val flight = max(0f, y - target.y) / SHOT_SPEED
            // a shielder's plate means lining up on its nose is the one place that does nothing
            val nose = if (target.kind == Kind.SHIELDER) halfOf(target.kind) * 0.8f else 0f
            pull += offAim(abs(target.x + nose - x) + flight * AI_LEAD_SLACK)
            pull += (PLAYER_Y_MAX - y) * AI_REAR_WEIGHT
        } else {
            val b = boss
            if (b != null && b.alive) {
                // the raider sweeps, and fast: aim off it by however far it travels while the
                // round is in the air, and close the range so that lead is a guess worth making
                val flight = max(0f, y - b.y) / SHOT_SPEED
                pull += offAim(abs(b.x + aiDrift * flight - x))
                pull += (y - frontLimit()) * AI_RANGE_WEIGHT
            } else {
                pull += (PLAYER_Y_MAX - y) * AI_REAR_WEIGHT
            }
        }
        return danger + pull
    }

    /**
     * What being [off] lanes away from what it is shooting costs. It flattens out rather than
     * clipping, so being a whole screen off still leans it the right way instead of reading as
     * no worse than half a screen off -- which is how it used to lose track of a lone aircraft.
     */
    private fun offAim(off: Float): Float = AI_AIM_WEIGHT * AI_AIM_REACH * off / (off + AI_AIM_REACH)

    /**
     * How badly a thing at ([rx], [ry]) travelling at ([vx], [vy]) relative to a standing
     * aircraft wants that square, judged at the closest it ever comes over [AI_LOOKAHEAD].
     */
    private fun bite(rx: Float, ry: Float, vx: Float, vy: Float, clear: Float, weight: Float): Float {
        val vv = vx * vx + vy * vy
        val t = if (vv > 1e-6f) (-(rx * vx + ry * vy) / vv).coerceIn(0f, AI_LOOKAHEAD) else 0f
        val dx = rx + vx * t
        val dy = ry + vy * t
        val d = sqrt(dx * dx + dy * dy)
        if (d >= clear) return 0f
        val nip = 1f - d / clear
        // a round arriving now is worth more worry than one arriving at the end of the horizon
        return nip * nip * weight * (1f - AI_SOON * t / AI_LOOKAHEAD)
    }

    /** How fast [e] is actually coming down, per kind. A bad guess here is a dead aircraft. */
    private fun aiSpeedY(e: Plane): Float = when (e.kind) {
        Kind.DRONE -> e.speed
        Kind.WEAVER -> e.speed * 0.92f
        Kind.GUNNER -> e.speed * 0.62f
        // a diver is already accelerating, and will be faster still by the time it arrives
        Kind.DIVER -> e.speed * max(DIVE_CRAWL, 1f + (e.y + 0.2f) * 1.6f) * 1.35f
        Kind.SHIELDER -> e.speed * 0.55f
        Kind.SPLITTER -> e.speed * 0.72f
        Kind.TURRET -> if (e.anchor > 0f) 0f else e.speed * 1.2f
        Kind.SWARM -> e.speed * 1.35f
        Kind.MINER -> e.speed * 0.5f
        Kind.MINE -> MINE_DRIFT
        // a charger that has committed covers ground faster than anything else in the sky
        Kind.CHARGER -> if (e.charge > 0f) e.speed * 0.25f else e.speed * CHARGE_SPEED
        Kind.HEALER -> e.speed * 0.6f
    }

    /** How fast the raider is sliding sideways right now, straight off its own sweep. */
    private fun bossDriftX(): Float {
        val b = boss ?: return 0f
        if (!b.engaged) return 0f
        val kindly = bossProfileOf(b.kind)
        val rate = BOSS_PHASE_SWEEP[b.phase] * kindly.sweepRate * BOSS_SWEEP_RATE
        return cos(b.sweep * BOSS_SWEEP_RATE) * BOSS_SWEEP_X * BOSS_PHASE_REACH[b.phase] * kindly.reach * rate
    }

    /**
     * What it would rather be shooting: the things that get worse if you leave them. Once the
     * raider is on station it is the only thing on the board worth the time, and anything else
     * in the air is something to fly around rather than something to chase.
     */
    private fun aiTarget(): Plane? {
        val b = boss
        if (b != null && b.alive && b.engaged) {
            // except a healer, which will keep putting back whatever else is in the air
            for (e in mutableEnemies) if (e.alive && e.kind == Kind.HEALER) return e
            return null
        }
        var best: Plane? = null
        var bestRank = Int.MIN_VALUE
        for (e in mutableEnemies) {
            if (!e.alive || e.kind == Kind.MINE) continue
            val rank = when (e.kind) {
                Kind.HEALER -> 400
                Kind.TURRET -> 300
                Kind.MINER -> 250
                Kind.GUNNER -> 200
                else -> 100
            } + (e.y * 60f).toInt()          // and among equals, whatever is closest to the floor
            if (rank > bestRank) { bestRank = rank; best = e }
        }
        return best
    }

    /** Which of the three on offer it wants most. */
    private fun bestBoonIndex(): Int {
        var bestAt = 0
        var bestRank = Int.MIN_VALUE
        for ((i, boon) in offered.withIndex()) {
            val rank = AI_BOON_ORDER.indexOf(boon).let { if (it < 0) 0 else AI_BOON_ORDER.size - it }
            if (rank > bestRank) { bestRank = rank; bestAt = i }
        }
        return bestAt
    }

    fun update(dtSeconds: Float) {
        if (state != State.RUNNING) return
        val dt = min(MAX_FRAME_DT, max(0f, dtSeconds))
        elapsed += dt
        flash = max(0f, flash - dt)
        mercy = max(0f, mercy - dt)
        rapidTimer = max(0f, rapidTimer - dt)
        pierceTimer = max(0f, pierceTimer - dt)
        homingTimer = max(0f, homingTimer - dt)
        magnetTimer = max(0f, magnetTimer - dt)
        slowTimer = max(0f, slowTimer - dt)
        vampTimer = max(0f, vampTimer - dt)
        if (orbs > 0) orbitPhase = (orbitPhase + ORBIT_RATE * dt) % TAU

        updateHazard(dt)
        updateCombo(dt)
        spawnWaves()
        updateEnemies(dt)
        updateBoss(dt)
        updatePlayerFire(dt)
        updateShots(dt)
        updateItems(dt)
        checkStageEnd()
    }

    /** The place itself, acting on you: the pass blows you sideways, the fields burn upward. */
    private fun updateHazard(dt: Float) {
        val profile = profileOf(level)
        gust = if (profile.hazard == Hazard.GUSTS) sin(elapsed * GUST_RATE) * GUST_STRENGTH else 0f
        if (gust != 0f) movePlayerBy(gust * dt)

        if (profile.hazard == Hazard.FLAK) {
            nextFlareAt -= dt
            if (nextFlareAt <= 0f) {
                nextFlareAt = FLARE_GAP * (0.7f + random.next() * 0.7f)
                mutableFlares.add(
                    Flare(-0.8f + random.next() * 1.6f, 1.05f, FLARE_LIFE, FLARE_LIFE, random.next() * TAU),
                )
            }
        }
        val it = mutableFlares.iterator()
        while (it.hasNext()) {
            val f = it.next()
            f.life -= dt
            f.y -= FLARE_RISE * dt
            if (f.life <= 0f || f.y < -0.2f) { f.alive = false; it.remove(); continue }
            // only the body of the column bites, not its fading tail
            if (f.life > FLARE_LIFE * 0.25f && hitsPlayer(f.x, f.y, FLARE_HALF)) {
                hurtPlayer(RAM_DAMAGE, f.x, f.y)
                if (state != State.RUNNING) return
            }
        }
    }

    // ---- stage script ---------------------------------------------------------------------

    private fun spawnWaves() {
        if (waveIndex >= totalWaves || elapsed < nextWaveAt) return
        val profile = profileOf(level)
        // Halfway down the stage everything arrives at once: three formations of different
        // kinds, a third faster, stacked back to back. It is the one place a chain can really
        // run, and the one place the stage stops feeling like a metronome.
        if (!rushDone && waveIndex >= rushAt) {
            rushDone = true
            for (i in 0 until RUSH_FORMATIONS) {
                val kind = profile.mix[random.nextInt(profile.mix.size)]
                val formation = profile.formations[random.nextInt(profile.formations.size)]
                spawnFormation(
                    profile = profile,
                    kind = kind,
                    formation = formation,
                    n = max(2, flightSize(kind) - 1),
                    baseX = -0.5f + random.next() * 1.0f,
                    speed = profile.speed * RUSH_SPEED,
                    extraLead = i * RUSH_STACK,
                )
            }
            waveIndex++
            nextWaveAt = elapsed + WAVE_GAP * 1.6f
            pendingEvents.add(Event(Event.Type.RUSH))
            return
        }
        val kind = profile.mix[random.nextInt(profile.mix.size)]
        spawnFormation(
            profile = profile,
            kind = kind,
            formation = profile.formations[random.nextInt(profile.formations.size)],
            n = flightSize(kind),
            baseX = -0.62f + random.next() * 1.24f,
            speed = profile.speed * (0.85f + random.next() * 0.3f),
            extraLead = 0f,
        )
        waveIndex++
        nextWaveAt = elapsed + WAVE_GAP * (0.8f + random.next() * 0.5f)
    }

    /** How many of [kind] fly together: a swarm is a crowd, a shielder comes in twos. */
    private fun flightSize(kind: Kind): Int = when (kind) {
        Kind.SWARM -> 7 + random.nextInt(4)
        Kind.SHIELDER, Kind.SPLITTER, Kind.TURRET, Kind.CHARGER -> 2 + random.nextInt(2)
        // one of each is quite enough
        Kind.MINER, Kind.HEALER -> 1 + random.nextInt(2)
        Kind.MINE -> 1
        else -> 3 + random.nextInt(4)
    }

    /** Lays one formation of [n] aircraft out along the top of the screen. */
    private fun spawnFormation(
        profile: Profile,
        kind: Kind,
        formation: Formation,
        n: Int,
        baseX: Float,
        speed: Float,
        extraLead: Float,
    ) {
        // a swarm bee always goes down in one; the heavies are worth the extra rounds
        val hpEach = when (kind) {
            Kind.SWARM, Kind.MINE -> 1
            Kind.SHIELDER -> 3 + (level - 1) / 3
            Kind.SPLITTER, Kind.TURRET, Kind.GUNNER, Kind.CHARGER -> 2 + (level - 1) / 3
            Kind.MINER, Kind.HEALER -> 3 + (level - 1) / 3
            else -> 1 + (level - 1) / 3
        }
        for (i in 0 until n) {
            val t = if (n == 1) 0.5f else i / (n - 1).toFloat()
            val spreadX: Float
            val lead: Float
            when (formation) {
                Formation.LINE -> {                      // abreast, all arriving together
                    spreadX = (t - 0.5f) * 0.72f
                    lead = 0f
                }
                Formation.VEE -> {                       // edges out front
                    spreadX = (t - 0.5f) * 0.8f
                    lead = abs(t - 0.5f) * 0.34f
                }
                Formation.ARC -> {                       // centre out front, edges trailing
                    spreadX = (t - 0.5f) * 0.9f
                    lead = (0.5f - abs(t - 0.5f)) * 0.42f
                }
                Formation.TRAIL -> {                     // one file, straight down
                    spreadX = 0f
                    lead = t * 0.5f
                }
                Formation.SPLIT -> {                     // two groups peeling apart, gap in the middle
                    val side = if (t < 0.5f) -1f else 1f
                    spreadX = side * (0.26f + abs(t - 0.5f) * 0.7f)
                    lead = abs(t - 0.5f) * 0.3f
                }
            }
            val homeX = (baseX + spreadX).coerceIn(-0.86f, 0.86f)
            mutableEnemies.add(
                Plane(
                    x = homeX,
                    y = profile.entryY - lead - extraLead,
                    kind = kind,
                    hp = hpEach,
                    homeX = homeX,
                    phase = random.next() * TAU,
                    speed = speed,
                ),
            )
        }
    }

    private fun updateEnemies(dtRaw: Float) {
        val dt = dtRaw * enemyTimeScale()
        val profile = profileOf(level)
        val it = mutableEnemies.iterator()
        while (it.hasNext()) {
            val e = it.next()
            if (!e.alive) { it.remove(); continue }
            e.lastX = e.x
            when (e.kind) {
                Kind.DRONE -> e.y += e.speed * dt
                Kind.WEAVER -> {
                    e.y += e.speed * 0.92f * dt
                    e.x = e.homeX + sin(elapsed * 2.4f + e.phase) * 0.22f
                }
                Kind.GUNNER -> {
                    e.y += e.speed * 0.62f * dt
                    e.x = e.homeX + sin(elapsed * 1.1f + e.phase) * 0.08f
                }
                // it accelerates as it comes down, but never backwards: one stacked high enough
                // by a rush used to climb away and leave a stage that could not end
                Kind.DIVER -> e.y += e.speed * max(DIVE_CRAWL, 1f + (e.y + 0.2f) * 1.6f) * dt
                // heavy and slow, with a plate across its nose: you have to come at it from the side
                Kind.SHIELDER -> {
                    e.y += e.speed * 0.55f * dt
                    e.x = e.homeX + sin(elapsed * 0.9f + e.phase) * 0.05f
                }
                // fat, and it does not die all at once
                Kind.SPLITTER -> {
                    e.y += e.speed * 0.72f * dt
                    e.x = e.homeX + sin(elapsed * 1.6f + e.phase) * 0.12f
                }
                // comes in, stops, and makes the sky its own until you deal with it
                Kind.TURRET -> {
                    if (e.y < TURRET_STATION_Y && e.anchor <= 0f) {
                        e.y += e.speed * 1.3f * dt
                        if (e.y >= TURRET_STATION_Y) e.anchor = TURRET_SECONDS
                    } else {
                        e.anchor -= dt
                        if (e.anchor <= 0f) e.y += e.speed * 1.1f * dt     // gives up and moves on
                    }
                }
                // tiny, quick, and never alone
                Kind.SWARM -> {
                    e.y += e.speed * 1.35f * dt
                    e.x = e.homeX + sin(elapsed * 5.2f + e.phase) * 0.09f
                }
                // crosses slowly and leaves things behind it
                Kind.MINER -> {
                    e.y += e.speed * 0.5f * dt
                    e.x = e.homeX + sin(elapsed * 0.7f + e.phase) * 0.28f
                    e.charge -= dt
                    if (e.charge <= 0f && e.y > 0.05f && e.y < playerY - 0.25f) {
                        e.charge = MINE_GAP * (0.8f + shotRandom.next() * 0.5f)
                        dropMine(e)
                    }
                }
                // it hardly moves at all, and it is still there when you come back
                Kind.MINE -> {
                    e.y += MINE_DRIFT * dt
                    e.x = e.homeX + sin(elapsed * 1.1f + e.phase) * 0.012f
                }
                // picks a lane, tells you it is coming, then comes
                Kind.CHARGER -> {
                    if (e.charge > 0f) {                      // winding up, in the open
                        e.charge -= dt
                        e.y += e.speed * 0.25f * dt
                        if (e.charge <= 0f) {
                            e.lockX = playerX
                            pendingEvents.add(Event(Event.Type.CHARGE, e.x, e.y))
                        }
                    } else {                                  // committed: it goes where it aimed
                        e.y += e.speed * CHARGE_SPEED * dt
                        e.x += ((e.lockX - e.x) * CHARGE_TRACK * dt).coerceIn(-0.03f, 0.03f)
                    }
                }
                // mends whatever you just damaged
                Kind.HEALER -> {
                    e.y += e.speed * 0.6f * dt
                    e.x = e.homeX + sin(elapsed * 1.3f + e.phase) * 0.16f
                    e.charge -= dt
                    if (e.charge <= 0f) {
                        e.charge = HEAL_GAP
                        mendSomeone(e)
                    }
                }
            }
            e.mended = max(0f, e.mended - dt)
            e.bank = ((e.x - e.lastX) / max(1e-4f, dt) * 0.9f).coerceIn(-1f, 1f)

            if (e.kind == Kind.GUNNER || e.kind == Kind.WEAVER || e.kind == Kind.TURRET) {
                e.cooldown -= dt
                if (e.cooldown <= 0f && e.y > 0.04f && e.y < playerY - 0.08f) {
                    val rate = if (e.kind == Kind.TURRET) TURRET_FIRE else 1f
                    e.cooldown = (1.5f - level * 0.04f).coerceAtLeast(0.55f) / profile.fireRate * rate *
                        (0.7f + shotRandom.next() * 0.7f)
                    fireEnemyShot(e)
                }
            }
            if (e.y > 1.12f) { e.alive = false; it.remove(); continue }
            if (hitsPlayer(e.x, e.y, halfOf(e.kind))) {
                e.alive = false
                it.remove()
                hurtPlayer(RAM_DAMAGE, e.x, e.y)
                if (state != State.RUNNING) { drainSpawns(); return }
            }
        }
        drainSpawns()
    }

    private fun drainSpawns() {
        if (pendingSpawns.isEmpty()) return
        mutableEnemies.addAll(pendingSpawns)
        pendingSpawns.clear()
    }

    /** A miner lets one go: it sits where it was dropped and waits for you to fly into it. */
    private fun dropMine(e: Plane) {
        pendingSpawns.add(
            Plane(
                x = e.x,
                y = e.y + 0.05f,
                kind = Kind.MINE,
                hp = 1,
                homeX = e.x,
                phase = random.next() * TAU,
                speed = 0f,
            ),
        )
        pendingEvents.add(Event(Event.Type.MINE_LAID, e.x, e.y + 0.05f))
    }

    /**
     * A healer puts one hit point back into the worst-off aircraft near it. It will not mend
     * itself, so a healer is always the thing to shoot first.
     */
    private fun mendSomeone(healer: Plane) {
        var worst: Plane? = null
        var worstGap = 0
        for (other in mutableEnemies) {
            if (other === healer || !other.alive || other.kind == Kind.MINE) continue
            val gap = other.maxHp - other.hp
            if (gap <= 0) continue
            val dx = other.x - healer.x
            val dy = other.y - healer.y
            if (dx * dx + dy * dy > HEAL_RADIUS * HEAL_RADIUS) continue
            if (gap > worstGap) { worstGap = gap; worst = other }
        }
        val patient = worst ?: return
        patient.hp = min(patient.maxHp, patient.hp + 1)
        patient.mended = HEAL_FLASH
        pendingEvents.add(Event(Event.Type.HEAL, patient.x, patient.y))
    }

    private fun fireEnemyShot(e: Plane) {
        // Gunners lead the player; weavers just spit straight down.
        // gunners and turrets lead the player; weavers just spit straight down
        val vx = if (e.kind == Kind.GUNNER || e.kind == Kind.TURRET) {
            ((playerX - e.x) * 0.55f).coerceIn(-0.5f, 0.5f)
        } else {
            0f
        }
        mutableShots.add(Shot(e.x, e.y + 0.04f, vx, ENEMY_SHOT_SPEED, fromPlayer = false))
        pendingEvents.add(Event(Event.Type.ENEMY_SHOT, e.x, e.y))
    }

    // ---- the boss -------------------------------------------------------------------------

    private fun spawnBoss() {
        val profile = profileOf(level)
        val kind = (level - 1).mod(BOSS_KINDS)
        val hp = max(
            30,
            (BOSS_BASE_HP * profile.bossHp * bossProfileOf(kind).hp * (1f + (level - 1) * 0.45f)).toInt(),
        )
        boss = Boss(kind, hp)
        pendingEvents.add(Event(Event.Type.BOSS_IN, 0f, 0f, value = kind))
    }

    private fun updateBoss(dtRaw: Float) {
        val dt = dtRaw * enemyTimeScale()
        val b = boss ?: return
        if (!b.alive) {
            updateWreck(b, dt)
            return
        }
        val lastX = b.x
        if (!b.engaged) {
            b.y = min(BOSS_STATION_Y, b.y + BOSS_ENTRY_SPEED * dt)
            if (b.y >= BOSS_STATION_Y - 1e-4f) b.engaged = true
        } else {
            b.rage = max(0f, b.rage - dt)
            // each phase sweeps faster and wider, and leans on the salvo harder
            val kindly = bossProfileOf(b.kind)
            b.sweep += dt * BOSS_PHASE_SWEEP[b.phase] * kindly.sweepRate
            b.x = sin(b.sweep * BOSS_SWEEP_RATE) * BOSS_SWEEP_X * BOSS_PHASE_REACH[b.phase] * kindly.reach
            b.salvo -= dt
            if (b.salvo <= 0f) {
                // a burst raider keeps firing until its burst is spent, then takes the long gap
                if (b.burst > 0) {
                    b.burst--
                    b.salvo = BURST_GAP
                } else {
                    b.salvo = ((BOSS_SALVO_GAP - level * 0.03f) * BOSS_PHASE_GAP[b.phase] * kindly.gap)
                        .coerceAtLeast(0.32f)
                    if (kindly.style == BossStyle.BURST) b.burst = BURST_SHOTS - 1
                }
                fireBossSalvo(b)
            }
        }
        b.bank = ((b.x - lastX) / max(1e-4f, dt) * 1.4f).coerceIn(-1f, 1f)
        if (hitsPlayer(b.x, b.y, BOSS_HALF)) hurtPlayer(RAM_DAMAGE, b.x, b.y)
    }

    private fun fireBossSalvo(b: Boss) {
        val kindly = bossProfileOf(b.kind)
        val step = b.phase                              // every phase adds one more of everything
        when (kindly.style) {
            // the plain wide fan: slip between the arms
            BossStyle.FAN -> fan(b, 3 + (level - 1).coerceAtMost(4) + step, BOSS_FAN)
            // three quick ones, tight, then it has to breathe
            BossStyle.BURST -> fan(b, 3 + step, BOSS_FAN * 0.55f)
            // a curtain the width of the sky, with one gap that walks along it
            BossStyle.WALL -> {
                val slots = WALL_SLOTS + step
                b.wallGap = (b.wallGap + 1 + step).mod(slots)
                for (i in 0 until slots) {
                    if (i == b.wallGap || i == (b.wallGap + 1).mod(slots)) continue
                    val x = -WALL_REACH + 2f * WALL_REACH * (i / (slots - 1f))
                    mutableShots.add(Shot(x, b.y + 0.08f, 0f, ENEMY_SHOT_SPEED * 0.8f, false))
                }
            }
            // a narrow spike, straight down its own nose, from a hull that will not hold still
            BossStyle.DAGGER -> fan(b, 2 + step, BOSS_FAN * 0.3f)
            // it owns the ground under it: a tight column, one shot behind the next
            BossStyle.COLUMN -> {
                for (i in 0 until COLUMN_SHOTS + step) {
                    val lead = i * 0.07f
                    mutableShots.add(Shot(b.x, b.y + 0.08f + lead, 0f, ENEMY_SHOT_SPEED * 1.15f, false))
                }
            }
            // an even ring, turned a little further each time, so the gap keeps moving
            BossStyle.RING -> {
                b.spin += BOSS_SPIN_STEP
                val arms = BOSS_SPIRAL_ARMS + step
                for (i in 0 until arms) {
                    val ang = b.spin + i * (TAU / arms)
                    mutableShots.add(
                        Shot(b.x, b.y + 0.08f, sin(ang) * ENEMY_SHOT_SPEED, abs(cos(ang)) * ENEMY_SHOT_SPEED, false),
                    )
                }
            }
        }
        // From phase 1 every raider also picks you out of its own pattern.
        if (b.phase >= 1) {
            val dx = playerX - b.x
            val dy = max(0.15f, playerY - b.y)
            val len = sqrt(dx * dx + dy * dy)
            mutableShots.add(
                Shot(b.x, b.y + 0.08f, dx / len * BOSS_AIMED_SPEED, dy / len * BOSS_AIMED_SPEED, false),
            )
        }
        pendingEvents.add(Event(Event.Type.ENEMY_SHOT, b.x, b.y))
    }

    /** [arms] shots spread evenly across [width] radians, aimed down the screen. */
    private fun fan(b: Boss, arms: Int, width: Float) {
        for (i in 0 until arms) {
            val t = if (arms == 1) 0.5f else i / (arms - 1).toFloat()
            val ang = (t - 0.5f) * width
            mutableShots.add(
                Shot(b.x, b.y + 0.08f, sin(ang) * ENEMY_SHOT_SPEED, cos(ang) * ENEMY_SHOT_SPEED, false),
            )
        }
    }

    private fun damageBoss(b: Boss, amount: Int) {
        b.hp = max(0, b.hp - amount)
        if (b.hp > 0) {
            // it changes its mind twice on the way down
            val left = b.hp / max(1, b.maxHp).toFloat()
            val want = when {
                left <= BOSS_PHASE_3 -> 2
                left <= BOSS_PHASE_2 -> 1
                else -> 0
            }
            if (want > b.phase) {
                b.phase = want
                b.rage = BOSS_RAGE_SECONDS
                b.salvo = max(b.salvo, BOSS_RAGE_SECONDS * 0.7f)   // one beat to read the change
                pendingEvents.add(Event(Event.Type.BOSS_PHASE, b.x, b.y, value = b.phase))
            }
            return
        }
        b.alive = false
        kills++
        score += BOSS_SCORE * level
        // it stops flying here: nose over, roll, and slide out of its own wake
        b.dying = BOSS_DEATH_SECONDS
        b.driftX = if (b.x >= 0f) -BOSS_DRIFT else BOSS_DRIFT
        b.nextBreakAt = BOSS_DEATH_SECONDS - BOSS_BREAK_GAP * 0.35f
        b.breaks = 0
        b.finished = false
        b.burst = 0
        // the sky clears with it: nothing already in the air may still kill you now
        for (s in mutableShots) if (!s.fromPlayer) s.alive = false
        pendingEvents.add(Event(Event.Type.BOSS_DOWN, b.x, b.y, value = b.kind))
    }

    /**
     * The wreck. It falls, rolls, and lets go of a run of explosions that walk along the hull
     * rather than piling up in one place, and only then does the stage end.
     */
    private fun updateWreck(b: Boss, dt: Float) {
        if (b.dying <= 0f) return
        b.dying = max(0f, b.dying - dt)
        b.y += BOSS_SINK * dt
        b.x += b.driftX * dt
        b.roll += BOSS_ROLL * dt
        while (b.breaks < BOSS_BREAKS && b.dying <= b.nextBreakAt) {
            b.breaks++
            b.nextBreakAt -= BOSS_BREAK_GAP
            val ox = (random.next() - 0.5f) * BOSS_HALF * 1.6f
            val oy = (random.next() - 0.5f) * BOSS_HALF * 0.9f
            // value carries how far along the run this one is, so the fireworks grow
            val t = (b.breaks * 100) / BOSS_BREAKS
            pendingEvents.add(Event(Event.Type.BOSS_BREAK, b.x + ox, b.y + oy, value = t))
        }
        // The last blast takes the hull with it, and then the sky gets a beat to itself before
        // the clear panel comes up -- otherwise the finale is a frame long and you miss it.
        if (b.dying <= BOSS_AFTERGLOW && !b.finished) {
            b.finished = true
            pendingEvents.add(Event(Event.Type.KILL_BOSS, b.x, b.y, value = b.kind))
        }
    }

    // ---- the player -----------------------------------------------------------------------

    private fun updatePlayerFire(dt: Float) {
        val rate = fireRate() * (if (rapidTimer > 0f) RAPID_MULT else 1f)
        fireAccumulator += rate * dt
        while (fireAccumulator >= 1f) {
            fireAccumulator -= 1f
            for (i in 0 until spread) {
                val off = if (spread == 1) 0f else (i / (spread - 1f) - 0.5f)
                addPlayerShot(playerX + off * 0.09f, playerY - 0.05f, off * 0.35f)
            }
            // the escorts fire straight ahead from where they are sitting
            for (i in 0 until wingmen) {
                val side = if (i % 2 == 0) -1f else 1f
                val rank = 1 + i / 2
                addPlayerShot(playerX + side * WINGMAN_OFFSET * rank, playerY + WINGMAN_TRAIL, 0f)
            }
            pendingEvents.add(Event(Event.Type.SHOT, playerX, playerY - 0.05f))
        }
    }

    private fun addPlayerShot(x: Float, y: Float, vx: Float) {
        val shot = Shot(x, y, vx, -SHOT_SPEED, true)
        shot.pierce = if (pierceTimer > 0f) PIERCE_HITS else basePierce()
        mutableShots.add(shot)
    }

    /** Where the escort at [index] is sitting right now, so the view can draw it. */
    fun wingmanX(index: Int): Float =
        playerX + (if (index % 2 == 0) -1f else 1f) * WINGMAN_OFFSET * (1 + index / 2)

    fun wingmanY(): Float = playerY + WINGMAN_TRAIL

    /** Whether an incoming round has run into one of the orbs circling the aircraft. */
    private fun blockedByOrb(s: Shot): Boolean {
        for (i in 0 until orbs) {
            val dx = s.x - orbX(i)
            val dy = s.y - orbY(i)
            if (dx * dx + dy * dy < (ORBIT_HALF + SHOT_HALF) * (ORBIT_HALF + SHOT_HALF)) return true
        }
        return false
    }

    private fun hitsPlayer(x: Float, y: Float, half: Float): Boolean =
        mercy <= 0f && abs(y - playerY) < half + PLAYER_HALF_Y && abs(x - playerX) < half + PLAYER_HALF_X

    private fun hurtPlayer(amount: Int, x: Float, y: Float) {
        if (mercy > 0f) return
        // while the raider is coming apart the stage is over; nothing left flying may take it back
        boss?.let { if (!it.alive && it.dying > 0f) return }
        if (shield) {
            shield = false
            mercy = MERCY_SECONDS
            pendingEvents.add(Event(Event.Type.SHIELD_USED, x, y))
            return
        }
        // the charm eats one chain break; the hit still lands, the chain survives it
        if (charm) {
            charm = false
            pendingEvents.add(Event(Event.Type.CHARM_USED, x, y, value = combo))
        } else {
            if (combo >= COMBO_STEP) pendingEvents.add(Event(Event.Type.COMBO_LOST, x, y, value = combo))
            combo = 0
            comboTimer = 0f
        }
        stageHits++
        hp -= amount
        flash = FLASH_SECONDS
        mercy = MERCY_SECONDS
        // an escort is the first thing a hit takes; only once they are gone does it cost a gun
        if (wingmen > 0) wingmen-- else spread = max(1, spread - 1)
        pendingEvents.add(Event(Event.Type.HIT_PLAYER, x, y, value = amount))
        if (hp <= 0) {
            hp = 0
            state = State.GAME_OVER
            bestLevel = max(bestLevel, level - 1)
            pendingEvents.add(Event(Event.Type.OVER))
        }
    }

    // ---- bullets and pickups --------------------------------------------------------------

    /** Turns a player shot towards the nearest target, without letting it speed up or slow down. */
    private fun steerHoming(s: Shot, dt: Float) {
        var bestX = 0f
        var bestY = 0f
        var bestD = Float.MAX_VALUE
        for (e in mutableEnemies) {
            if (!e.alive || e.y > s.y) continue          // only things still ahead of it
            val d = (e.x - s.x) * (e.x - s.x) + (e.y - s.y) * (e.y - s.y)
            if (d < bestD) { bestD = d; bestX = e.x; bestY = e.y }
        }
        boss?.let { b ->
            if (b.alive && b.y <= s.y) {
                val d = (b.x - s.x) * (b.x - s.x) + (b.y - s.y) * (b.y - s.y)
                if (d < bestD) { bestD = d; bestX = b.x; bestY = b.y }
            }
        }
        if (bestD == Float.MAX_VALUE) return
        val speed = sqrt(s.vx * s.vx + s.vy * s.vy)
        if (speed <= 1e-5f) return
        val tx = bestX - s.x
        val ty = bestY - s.y
        val tl = sqrt(tx * tx + ty * ty)
        if (tl <= 1e-5f) return
        val k = (HOMING_TURN * dt).coerceIn(0f, 1f)
        var nx = s.vx / speed * (1f - k) + tx / tl * k
        var ny = s.vy / speed * (1f - k) + ty / tl * k
        val nl = sqrt(nx * nx + ny * ny)
        if (nl <= 1e-5f) return
        nx /= nl
        ny /= nl
        s.vx = nx * speed
        s.vy = ny * speed
    }

    private fun updateShots(dt: Float) {
        val it = mutableShots.iterator()
        while (it.hasNext()) {
            val s = it.next()
            if (!s.alive) { it.remove(); continue }
            // your own rounds keep their speed; theirs are what the clock is slowing
            val sdt = if (s.fromPlayer) dt else dt * enemyTimeScale()
            s.x += s.vx * sdt
            s.y += s.vy * sdt
            if (s.y < -0.15f || s.y > 1.15f || abs(s.x) > 1.2f) { it.remove(); continue }
            if (s.fromPlayer) {
                if (homingTimer > 0f) steerHoming(s, dt)
                var spent = false
                for (e in mutableEnemies) {
                    if (!e.alive || e === s.lastHit) continue
                    val half = halfOf(e.kind)
                    if (abs(e.x - s.x) < half && abs(e.y - s.y) < half) {
                        // a shielder's plate throws off anything that comes straight at its nose
                        if (e.kind == Kind.SHIELDER && abs(e.x - s.x) < half * SHIELD_ARC) {
                            s.alive = false
                            it.remove()
                            pendingEvents.add(Event(Event.Type.DEFLECT, s.x, s.y))
                            break
                        }
                        e.hp -= s.damage
                        // a piercing round carries on to whatever is behind it
                        if (s.pierce > 0) { s.pierce--; s.lastHit = e } else spent = true
                        if (e.hp <= 0) {
                            e.alive = false
                            awardKill(e.kind, e.x, e.y)
                            if (e.kind == Kind.SPLITTER) splitInTwo(e)
                            maybeDropItem(e.x, e.y)
                        } else {
                            pendingEvents.add(Event(Event.Type.HIT_ENEMY, s.x, s.y))
                        }
                        break
                    }
                }
                if (!spent) {
                    val b = boss
                    if (b != null && b.alive && b !== s.lastHit &&
                        abs(b.x - s.x) < BOSS_HALF && abs(b.y - s.y) < BOSS_HALF
                    ) {
                        if (s.pierce > 0) { s.pierce--; s.lastHit = b } else spent = true
                        damageBoss(b, s.damage)
                        if (b.alive) pendingEvents.add(Event(Event.Type.HIT_BOSS, s.x, s.y))
                    }
                }
                if (spent) { s.alive = false; it.remove() }
            } else if (orbs > 0 && blockedByOrb(s)) {
                s.alive = false
                it.remove()
                pendingEvents.add(Event(Event.Type.ORBIT_BLOCK, s.x, s.y))
            } else if (hitsPlayer(s.x, s.y, SHOT_HALF)) {
                s.alive = false
                it.remove()
                hurtPlayer(SHOT_DAMAGE, s.x, s.y)
                if (state != State.RUNNING) return
            }
        }
    }

    /** A splitter does not die all at once: two smaller ones peel away from where it was. */
    private fun splitInTwo(e: Plane) {
        for (side in intArrayOf(-1, 1)) {
            val x = (e.x + side * SPLIT_SPREAD).coerceIn(-0.9f, 0.9f)
            pendingSpawns.add(
                Plane(
                    x = x,
                    y = e.y,
                    kind = Kind.DRONE,
                    hp = 1,
                    homeX = x,
                    phase = random.next() * TAU,
                    speed = e.speed * 1.15f,
                ),
            )
        }
        pendingEvents.add(Event(Event.Type.SPLIT, e.x, e.y))
        // the shot loop is not walking the enemy list with an iterator, so these can land now
        drainSpawns()
    }

    private fun maybeDropItem(x: Float, y: Float) {
        if (random.next() >= itemChance()) return
        var roll = random.next() * DROP_WEIGHT_TOTAL
        var kind = DROP_TABLE.last().first
        for ((k, weight) in DROP_TABLE) {
            roll -= weight
            if (roll < 0f) { kind = k; break }
        }
        mutableItems.add(Item(x, y, kind))
    }

    private fun updateItems(dt: Float) {
        val it = mutableItems.iterator()
        while (it.hasNext()) {
            val item = it.next()
            if (!item.alive) { it.remove(); continue }
            val pull = if (magnetTimer > 0f) MAGNET_PULL else standingPull()
            if (pull > 0f) {
                // reel it in: still falling, but now it is coming to you
                val dx = playerX - item.x
                val dy = playerY - item.y
                val d = sqrt(dx * dx + dy * dy)
                if (d > 1e-4f) {
                    item.x += dx / d * pull * dt
                    item.y += dy / d * pull * dt
                }
            }
            item.y += ITEM_FALL_SPEED * dt
            if (item.y > 1.1f) { it.remove(); continue }
            if (abs(item.y - playerY) < ITEM_HALF + PLAYER_HALF_Y &&
                abs(item.x - playerX) < ITEM_HALF + PLAYER_HALF_X
            ) {
                item.alive = false
                it.remove()
                applyItem(item)
            }
        }
    }

    private fun applyItem(item: Item) {
        when (item.kind) {
            ItemKind.SPREAD -> spread = min(MAX_SPREAD, spread + 1)
            ItemKind.RAPID -> rapidTimer = RAPID_SECONDS
            ItemKind.SHIELD -> shield = true
            ItemKind.BOMB -> bombs = min(MAX_BOMBS, bombs + 1)
            ItemKind.REPAIR -> hp = min(maxHp(), hp + 1)
            ItemKind.WINGMAN -> wingmen = min(MAX_WINGMEN, wingmen + 1)
            ItemKind.PIERCE -> pierceTimer = PIERCE_SECONDS
            ItemKind.HOMING -> homingTimer = HOMING_SECONDS
            ItemKind.MAGNET -> magnetTimer = MAGNET_SECONDS
            ItemKind.CHARM -> charm = true
            ItemKind.SLOW -> slowTimer = SLOW_SECONDS
            ItemKind.ORBIT -> orbs = min(MAX_ORBS, orbs + 1)
            ItemKind.VAMPIRE -> { vampTimer = VAMP_SECONDS; vampCount = 0 }
            // a medal is worth whatever your chain is paying, so it rewards the run you are having
            ItemKind.MEDAL -> {
                val worth = MEDAL_SCORE * comboMultiplier()
                score += worth
                pendingEvents.add(Event(Event.Type.MEDAL, item.x, item.y, value = worth))
            }
        }
        score += ITEM_SCORE
        pendingEvents.add(Event(Event.Type.PICKUP, item.x, item.y, item = item.kind))
    }

    // ---- stage end ------------------------------------------------------------------------

    private fun checkStageEnd() {
        val b = boss
        if (b == null) {
            if (waveIndex >= totalWaves && mutableEnemies.none { it.alive }) spawnBoss()
            return
        }
        if (!b.alive) {
            if (b.dying > 0f) return
            offerBoons()
            state = State.LEVEL_CLEAR
            bestLevel = max(bestLevel, level)
            score += CLEAR_BONUS * level
            pendingEvents.add(Event(Event.Type.CLEAR))
        }
    }

    /**
     * How the stage just flown is graded: 0 is S, 1 is A, and so on. Flying clean is what earns
     * the top of it, and holding a chain through a whole stage is what separates S from A.
     */
    fun stageRank(): Int = when {
        stageHits == 0 && stageBestCombo >= RANK_S_CHAIN -> 0
        stageHits <= 1 && stageBestCombo >= RANK_A_CHAIN -> 1
        stageHits <= 3 -> 2
        else -> 3
    }

    /** What a kill is worth right now: one more step of the chain for every [COMBO_STEP] kills. */
    fun comboMultiplier(): Int = (1 + combo / COMBO_STEP).coerceAtMost(maxComboMult())

    /** Banks a kill, extends the chain, and pays out at the chain's rate. */
    private fun awardKill(kind: Kind, x: Float, y: Float) {
        kills++
        combo++
        comboTimer = comboWindow()
        bestCombo = max(bestCombo, combo)
        stageBestCombo = max(stageBestCombo, combo)
        val mult = comboMultiplier()
        score += scoreFor(kind) * mult
        if (vampTimer > 0f && hp < maxHp()) {
            vampCount++
            if (vampCount >= VAMP_KILLS) {
                vampCount = 0
                hp = min(maxHp(), hp + 1)
                pendingEvents.add(Event(Event.Type.VAMP_HEAL, x, y))
            }
        }
        pendingEvents.add(Event(Event.Type.KILL_ENEMY, x, y, value = mult))
        // the chain announces itself only when it actually steps up
        if (combo % COMBO_STEP == 0 && mult <= maxComboMult()) {
            pendingEvents.add(Event(Event.Type.COMBO_UP, x, y, value = mult))
        }
    }

    private fun updateCombo(dt: Float) {
        if (combo == 0) return
        comboTimer = max(0f, comboTimer - dt)
        if (comboTimer > 0f) return
        val lost = combo
        combo = 0
        if (lost >= COMBO_STEP) pendingEvents.add(Event(Event.Type.COMBO_LOST, playerX, playerY, value = lost))
    }

    private fun scoreFor(kind: Kind): Int = when (kind) {
        Kind.DRONE -> 10
        Kind.WEAVER -> 15
        Kind.GUNNER -> 25
        Kind.DIVER -> 20
        Kind.SHIELDER -> 35
        Kind.SPLITTER -> 30
        Kind.TURRET -> 40
        Kind.SWARM -> 8
        Kind.MINER -> 45
        Kind.MINE -> 5
        Kind.CHARGER -> 30
        Kind.HEALER -> 50
    }

    // ---- test hooks -----------------------------------------------------------------------

    internal fun setForTest(
        hp: Int = this.hp,
        playerX: Float = this.playerX,
        playerY: Float = this.playerY,
        spread: Int = this.spread,
        bombs: Int = this.bombs,
        shield: Boolean = this.shield,
        mercy: Float = this.mercy,
    ) {
        this.hp = hp
        this.playerX = playerX
        this.playerY = playerY
        this.spread = spread
        this.bombs = bombs
        this.shield = shield
        this.mercy = mercy
    }

    internal fun addEnemyForTest(kind: Kind, x: Float, y: Float, hp: Int = 1): Plane {
        val p = Plane(x, y, kind, hp, x, 0f, 0.3f)
        mutableEnemies.add(p)
        return p
    }

    internal fun addItemForTest(kind: ItemKind, x: Float, y: Float): Item {
        val i = Item(x, y, kind)
        mutableItems.add(i)
        return i
    }

    internal fun addEnemyShotForTest(x: Float, y: Float, vy: Float = ENEMY_SHOT_SPEED): Shot {
        val s = Shot(x, y, 0f, vy, fromPlayer = false)
        mutableShots.add(s)
        return s
    }

    internal fun addFlareForTest(x: Float, y: Float): Flare {
        val f = Flare(x, y, FLARE_LIFE, FLARE_LIFE, 0f)
        mutableFlares.add(f)
        return f
    }

    internal fun forceBossForTest(hp: Int) {
        boss = Boss(0, hp).also { it.y = BOSS_STATION_Y; it.engaged = true }
    }

    internal fun forceBossKindForTest(kind: Int) {
        val b = boss ?: return
        boss = Boss(kind, b.hp).also { it.y = BOSS_STATION_Y; it.engaged = true }
    }

    /** Spawns one flight of [kind] and reports how many turned up. */
    internal fun spawnFlightForTest(kind: Kind): Int {
        val before = mutableEnemies.size
        val profile = profileOf(level)
        spawnFormation(profile, kind, profile.formations[0], flightSize(kind), 0f, profile.speed, 0f)
        return mutableEnemies.size - before
    }

    /**
     * Whether a shot at ([x], [y]) would connect with [e] -- the same test the shot loop runs,
     * exposed so a test can ask about the hitbox without racing a weaving aircraft.
     */
    internal fun wouldHitForTest(e: Plane, x: Float, y: Float): Boolean {
        val half = halfOf(e.kind)
        return abs(e.x - x) < half && abs(e.y - y) < half
    }

    /** And whether that shot would bounce off a plate rather than land. */
    internal fun wouldDeflectForTest(e: Plane, x: Float): Boolean =
        e.kind == Kind.SHIELDER && abs(e.x - x) < halfOf(e.kind) * SHIELD_ARC

    /** Runs the weighted drop choice once, skipping the chance gate, and says what came up. */
    internal fun rollDropForTest(): ItemKind {
        var roll = random.next() * DROP_WEIGHT_TOTAL
        var kind = DROP_TABLE.last().first
        for ((k, weight) in DROP_TABLE) {
            roll -= weight
            if (roll < 0f) { kind = k; break }
        }
        return kind
    }

    internal fun giveBoonForTest(boon: Boon) {
        boonLevels[boon] = boonLevel(boon) + 1
    }

    internal fun clearShotsForTest() {
        mutableShots.clear()
    }

    internal fun forceBossPhaseForTest(phase: Int) {
        boss?.phase = phase
    }

    /** Empty sky: no waves left to come, no raider either, so a test owns what is in the air. */
    internal fun soloModeForTest() {
        mutableEnemies.clear()
        mutableShots.clear()
        waveIndex = 0
        rushDone = true
        nextWaveAt = Float.MAX_VALUE
    }

    internal fun clearWavesForTest() {
        waveIndex = totalWaves
        mutableEnemies.clear()
    }

    /** Deterministic PRNG (mulberry32) so a seed lays out the same stage on every port. */
    private class Rng(seed: Int) {
        private var a = seed
        fun next(): Float {
            a += -0x61c88647
            var t = a
            t = (t xor (t ushr 15)) * (t or 1)
            t = t xor (t + (t xor (t ushr 7)) * (t or 61))
            return ((t xor (t ushr 14)).toLong() and 0xFFFFFFFFL).toFloat() / 4294967296f
        }
        fun nextInt(bound: Int): Int = floor(next() * bound).toInt().coerceIn(0, bound - 1)
    }

    companion object {
        /** Where the fighter starts every stage, and the back of the band it flies in. */
        const val PLAYER_Y = 0.86f
        /**
         * How far forward you may push. The raider parks at [BOSS_STATION_Y] and is [BOSS_HALF]
         * deep, so this stays clear of its hull -- otherwise the boss fight would open with a ram.
         */
        const val PLAYER_Y_MIN = 0.50f
        const val PLAYER_Y_MAX = 0.94f
        const val PLAYER_LIMIT = 0.88f
        const val PLAYER_HALF_X = 0.055f
        const val PLAYER_HALF_Y = 0.045f
        const val ENEMY_HALF = 0.062f
        /** A shot that comes at a shielder inside this much of its nose bounces off the plate. */
        const val SHIELD_ARC = 0.55f
        const val TURRET_STATION_Y = 0.30f
        const val TURRET_SECONDS = 7f
        const val TURRET_FIRE = 0.62f          // it fires faster than a gunner while it is parked
        const val SPLIT_SPREAD = 0.075f
        const val MINE_GAP = 1.5f
        const val MINE_DRIFT = 0.035f          // barely falls: it is a place, not an aircraft
        const val CHARGE_TELL = 1.1f           // how long it shows you the lane before taking it
        const val DIVE_CRAWL = 0.35f           // slowest a diver ever comes down, whatever its height
        const val CHARGE_SPEED = 4.2f
        const val CHARGE_TRACK = 2.2f
        const val HEAL_GAP = 1.8f
        const val HEAL_RADIUS = 0.45f
        const val HEAL_FLASH = 0.35f
        const val BOSS_HALF = 0.2f
        const val SHOT_HALF = 0.012f
        const val ITEM_HALF = 0.05f

        const val MAX_HP = 5
        const val START_BOMBS = 2
        const val MAX_BOMBS = 5
        const val MAX_CONTINUES = 3
        const val RANK_S_CHAIN = 12
        const val RANK_A_CHAIN = 8
        const val MAX_SPREAD = 5
        const val RAM_DAMAGE = 1
        const val SHOT_DAMAGE = 1
        const val MERCY_SECONDS = 1.1f
        const val FLASH_SECONDS = 0.3f

        const val BASE_FIRE_RATE = 9f          // bullets per second per gun line
        const val RAPID_MULT = 1.9f
        const val RAPID_SECONDS = 7f
        const val SHOT_SPEED = 1.9f            // screen heights per second
        const val ENEMY_SHOT_SPEED = 0.72f

        const val WAVE_GAP = 2.1f
        /** The chain: every [COMBO_STEP] kills inside the window is one more step of multiplier. */
        const val COMBO_WINDOW = 2.3f
        const val COMBO_STEP = 3
        const val MAX_COMBO_MULT = 8
        /** The surge halfway down the stage. */
        const val RUSH_FORMATIONS = 3
        const val RUSH_SPEED = 1.35f
        const val RUSH_STACK = 0.46f
        const val ITEM_CHANCE = 0.13f
        const val ITEM_FALL_SPEED = 0.26f
        const val ITEM_SCORE = 30

        const val MAX_WINGMEN = 4
        const val WINGMAN_OFFSET = 0.115f      // how far off your wingtip the first one sits
        const val WINGMAN_TRAIL = 0.035f       // and how far back
        const val PIERCE_SECONDS = 8f
        const val PIERCE_HITS = 3              // how many hulls one round can punch through
        const val HOMING_SECONDS = 7f
        const val HOMING_TURN = 5.5f           // how hard a round may lean, per second
        const val MAGNET_SECONDS = 9f
        const val MAGNET_PULL = 0.85f
        const val SLOW_SECONDS = 6f
        const val SLOW_FACTOR = 0.42f
        const val MAX_ORBS = 3
        const val ORBIT_R = 0.17f
        const val ORBIT_RATE = 2.4f            // radians per second
        const val ORBIT_HALF = 0.032f
        const val VAMP_SECONDS = 12f
        const val VAMP_KILLS = 8
        const val MEDAL_SCORE = 120

        // ---- what the autopilot is made of ---------------------------------------------------
        /** How long it looks at a panel before moving on, so a watcher can read it. */
        const val AI_PAUSE = 1.6f
        const val AI_REACH = 0.12f             // how far out it considers stepping
        const val AI_SPEED = 3.6f              // and how fast it may actually travel
        const val AI_LOOKAHEAD = 0.85f         // seconds of threat it plans against
        const val AI_SOON = 0.5f               // how much a late threat is discounted
        const val AI_MERCY_TRUST = 0.25f       // flashing, with time on it: nothing can touch it
        const val AI_MERCY_DISCOUNT = 0.15f
        const val AI_SHOT_CLEAR = 0.15f
        const val AI_SHOT_WEIGHT = 900f
        const val AI_BODY_CLEAR = 0.11f
        const val AI_BODY_WEIGHT = 700f
        const val AI_FLARE_CLEAR = 0.23f
        const val AI_FLARE_WEIGHT = 1100f      // a column cannot be shot down, so give it the room
        const val AI_EDGE_CLEAR = 0.16f
        const val AI_EDGE_WEIGHT = 120f
        const val AI_ITEM_WEIGHT = 1.4f
        const val AI_AIM_WEIGHT = 11f
        const val AI_AIM_REACH = 0.5f          // past which one lane is much like another
        const val AI_LEAD_SLACK = 0.35f        // the longer the round is in the air, the worse
        const val AI_REAR_WEIGHT = 2.0f        // room to dodge is worth something in itself
        const val AI_RANGE_WEIGHT = 5.0f       // but in a raider fight, range is the thing
        const val AI_BOMB_AT = 300f            // nowhere good left to stand

        /** Where it steps to look: eight ways out, plus two longer ones sideways. */
        val AI_SAMPLES = floatArrayOf(
            -1f, 0f, 1f, 0f, 0f, -1f, 0f, 1f,
            -0.7f, -0.7f, 0.7f, -0.7f, -0.7f, 0.7f, 0.7f, 0.7f,
            -1.8f, 0f, 1.8f, 0f, 0f, -1.7f, 0f, 1.7f,
        )

        /** What it takes first when it gets the choice. */
        val AI_BOON_ORDER = listOf(
            Boon.GUNS, Boon.PIERCING, Boon.ARMOUR, Boon.RAPIDFIRE, Boon.ESCORT,
            Boon.CHAINWINDOW, Boon.CHARMED, Boon.CHAINCAP, Boon.SUPPLY,
            Boon.MAGNETIC, Boon.BOMBS, Boon.AGILITY,
        )

        /** How many to lay out between stages, and how far each one may be stacked. */
        const val BOONS_OFFERED = 3
        const val RAPIDFIRE_STEP = 0.15f
        const val CHAINWINDOW_STEP = 0.6f
        const val CHAINCAP_STEP = 2
        const val SUPPLY_STEP = 0.5f
        // one level takes you as far forward as the raider's hull allows, so there is no second
        const val AGILITY_STEP = 0.045f
        const val MAGNETIC_STEP = 0.22f

        fun boonCap(boon: Boon): Int = when (boon) {
            // the ones that change a number you can keep stacking
            Boon.ARMOUR, Boon.BOMBS, Boon.RAPIDFIRE, Boon.SUPPLY, Boon.CHAINWINDOW -> 3
            Boon.GUNS -> MAX_SPREAD - 1
            Boon.ESCORT -> MAX_WINGMEN
            Boon.PIERCING -> 2
            Boon.CHAINCAP -> 2
            Boon.AGILITY -> 1
            // the ones that are either on or off
            Boon.CHARMED, Boon.MAGNETIC -> 1
        }

        /**
         * What falls, and how often. Ten kinds at the same drop rate means more variety per
         * drop rather than more power; the staples stay common and the exotics stay a treat.
         */
        val DROP_TABLE = listOf(
            ItemKind.SPREAD to 14,
            ItemKind.RAPID to 13,
            ItemKind.SHIELD to 11,
            ItemKind.REPAIR to 11,
            ItemKind.PIERCE to 11,
            ItemKind.HOMING to 11,
            ItemKind.WINGMAN to 10,
            ItemKind.BOMB to 8,
            ItemKind.MAGNET to 6,
            ItemKind.CHARM to 5,
            ItemKind.SLOW to 7,
            ItemKind.ORBIT to 8,
            ItemKind.VAMPIRE to 6,
            ItemKind.MEDAL to 9,
        )
        val DROP_WEIGHT_TOTAL = DROP_TABLE.sumOf { it.second }.toFloat()
        const val CLEAR_BONUS = 250
        const val BOSS_SCORE = 500

        const val BOSS_KINDS = 6

        /**
         * One per hull, in the order [SkyView] loads the sprites. A raider that slides fast does
         * not also get to be a wall, and the one that barely moves is paid for in health.
         */
        val BOSS_PROFILES = listOf(
            // the four-engine heavy: the plain wide fan everything else is measured against
            BossProfile(BossStyle.FAN, 1.0f, 1.0f, 1.0f, 1.0f),
            // twin boom: three salvos in a row, then long enough to breathe
            BossProfile(BossStyle.BURST, 1.5f, 1.1f, 1.3f, 1.0f),
            // flying wing: lays a curtain across the sky with one gap in it
            BossProfile(BossStyle.WALL, 0.5f, 0.6f, 1.4f, 1.1f),
            // the dagger: a narrow spike of fire, and it will not hold still
            BossProfile(BossStyle.DAGGER, 1.9f, 1.15f, 0.8f, 0.9f),
            // the barge: slow, heavy, and it owns the ground under its nose
            BossProfile(BossStyle.COLUMN, 0.6f, 1.2f, 0.75f, 1.25f),
            // the eye: an even ring, turning a little each time
            BossProfile(BossStyle.RING, 0.8f, 0.5f, 1.15f, 1.05f),
        )

        fun bossProfileOf(kind: Int): BossProfile = BOSS_PROFILES[kind.mod(BOSS_PROFILES.size)]
        const val BOSS_BASE_HP = 70f
        const val BOSS_STATION_Y = 0.2f
        /** No aircraft, however agile, may sit inside the raider's hull. */
        const val FRONT_FLOOR = BOSS_STATION_Y + BOSS_HALF + PLAYER_HALF_Y + 0.01f
        /** How long the hull takes to come apart before the clear panel is allowed up. */
        const val BOSS_DEATH_SECONDS = 2.6f
        const val BOSS_BREAKS = 11
        const val BOSS_BREAK_GAP = 0.16f
        /** The tail of the sequence: the hull is gone, the debris is still in the air. */
        const val BOSS_AFTERGLOW = 0.8f
        const val BOSS_SINK = 0.085f           // screen heights per second, falling
        const val BOSS_DRIFT = 0.075f          // sideways, away from the middle
        const val BOSS_ROLL = 0.34f            // turns per second
        const val BOSS_ENTRY_SPEED = 0.22f
        /** Where the raider changes its mind, as a fraction of its health. */
        const val BOSS_PHASE_2 = 0.62f
        const val BOSS_PHASE_3 = 0.30f
        const val BOSS_RAGE_SECONDS = 0.9f
        val BOSS_PHASE_SWEEP = floatArrayOf(1f, 1.45f, 1.9f)
        val BOSS_PHASE_REACH = floatArrayOf(1f, 1.08f, 1.15f)
        val BOSS_PHASE_GAP = floatArrayOf(1f, 0.74f, 0.56f)
        const val BOSS_AIMED_SPEED = 0.95f
        const val BOSS_SPIRAL_ARMS = 5
        const val BOSS_SPIN_STEP = 0.7f
        const val BURST_SHOTS = 3
        const val BURST_GAP = 0.17f
        const val WALL_SLOTS = 8
        const val WALL_REACH = 0.85f
        const val COLUMN_SHOTS = 3
        const val BOSS_SWEEP_RATE = 0.9f
        const val BOSS_SWEEP_X = 0.5f
        const val BOSS_SALVO_GAP = 1.15f
        const val BOSS_FAN = 1.5f
        const val BOMB_BOSS_RATIO = 0.16f

        const val MAX_FRAME_DT = 0.05f
        const val TAU = 6.2831855f

        const val GUST_RATE = 0.55f            // how quickly the crosswind swings round
        const val GUST_STRENGTH = 0.30f        // lane widths per second at full push
        const val FLARE_GAP = 1.5f             // seconds between fire columns
        const val FLARE_RISE = 0.2f
        const val FLARE_LIFE = 4.6f
        const val FLARE_HALF = 0.055f

        /**
         * Stage shapes. The first is a gentle introduction, then the weavers arrive, then the
         * gunners make you move, then everything at once and faster.
         */
        val PROFILES = listOf(
            // The coast road: clean shapes, plenty of warning, nothing but the aircraft to read.
            Profile(
                22, listOf(Kind.DRONE, Kind.DRONE, Kind.WEAVER, Kind.SWARM, Kind.CHARGER), 0.8f, 0.30f, 1.0f,
                listOf(Formation.LINE, Formation.VEE), Hazard.NONE, -0.12f,
            ),
            // Thunderhead pass: flown inside the weather, which pushes you off your line.
            Profile(
                26, listOf(Kind.WEAVER, Kind.DRONE, Kind.DIVER, Kind.SPLITTER, Kind.MINER), 1.0f, 0.34f, 1.15f,
                listOf(Formation.TRAIL, Formation.LINE), Hazard.GUSTS, -0.12f,
            ),
            // The ember fields: the ground burns, and the fire reaches the altitude you are at.
            Profile(
                30, listOf(Kind.GUNNER, Kind.WEAVER, Kind.TURRET, Kind.SHIELDER, Kind.HEALER), 1.25f, 0.32f, 1.3f,
                listOf(Formation.ARC, Formation.SPLIT), Hazard.FLAK, -0.12f,
            ),
            // The long night: they are on you before you see them.
            Profile(
                34, listOf(Kind.DIVER, Kind.CHARGER, Kind.SHIELDER, Kind.HEALER, Kind.MINER, Kind.SWARM), 1.4f, 0.40f, 1.5f,
                listOf(Formation.SPLIT, Formation.TRAIL, Formation.VEE), Hazard.DARK, -0.03f,
            ),
        )

        fun profileOf(level: Int): Profile = PROFILES[(level - 1).mod(PROFILES.size)]
    }
}
