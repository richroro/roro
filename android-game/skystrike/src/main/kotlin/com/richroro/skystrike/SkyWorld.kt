package com.richroro.skystrike

import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin

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

    enum class Kind { DRONE, WEAVER, GUNNER, DIVER }

    enum class ItemKind { SPREAD, RAPID, SHIELD, BOMB, REPAIR }

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
            COMBO_UP, COMBO_LOST, RUSH,
            HIT_PLAYER, SHIELD_USED, PICKUP, BOMB, BOSS_IN, CLEAR, OVER,
        }
    }

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

    fun start() = startLevel(1)

    fun nextLevel() = startLevel(level + 1)

    fun startLevel(newLevel: Int) {
        level = newLevel
        random = Rng(seed * 7919 + newLevel * 104729)
        shotRandom = Rng(seed * 31 + newLevel * 17)
        val profile = profileOf(newLevel)
        mutableEnemies.clear()
        mutableShots.clear()
        mutableItems.clear()
        mutableFlares.clear()
        pendingEvents.clear()
        boss = null
        playerX = 0f
        playerY = PLAYER_Y
        hp = MAX_HP
        bombs = START_BOMBS
        shield = false
        rapidTimer = 0f
        spread = 1
        mercy = 0f
        flash = 0f
        combo = 0
        comboTimer = 0f
        bestCombo = 0
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
        state = State.RUNNING
    }

    /**
     * Nudges the fighter. [dy] is positive downwards, like the rest of screen space, and both axes
     * are clamped to the flight band so no drag can fling you into the raider's lap or off-screen.
     */
    fun movePlayerBy(dx: Float, dy: Float = 0f) {
        playerX = (playerX + dx).coerceIn(-PLAYER_LIMIT, PLAYER_LIMIT)
        playerY = (playerY + dy).coerceIn(PLAYER_Y_MIN, PLAYER_Y_MAX)
    }

    /** Sets off the screen-clearing bomb, if one is left. Returns true when it fired. */
    fun useBomb(): Boolean {
        if (state != State.RUNNING || bombs <= 0) return false
        bombs--
        pendingEvents.add(Event(Event.Type.BOMB, playerX, playerY))
        for (e in mutableEnemies) {
            if (!e.alive) continue
            e.alive = false
            awardKill(e.kind, e.x, e.y)
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

    fun update(dtSeconds: Float) {
        if (state != State.RUNNING) return
        val dt = min(MAX_FRAME_DT, max(0f, dtSeconds))
        elapsed += dt
        flash = max(0f, flash - dt)
        mercy = max(0f, mercy - dt)
        rapidTimer = max(0f, rapidTimer - dt)

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
                    n = 3 + random.nextInt(3),
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
            n = 3 + random.nextInt(4),
            baseX = -0.62f + random.next() * 1.24f,
            speed = profile.speed * (0.85f + random.next() * 0.3f),
            extraLead = 0f,
        )
        waveIndex++
        nextWaveAt = elapsed + WAVE_GAP * (0.8f + random.next() * 0.5f)
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
        val hpEach = 1 + (level - 1) / 3 + if (kind == Kind.GUNNER) 1 else 0
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

    private fun updateEnemies(dt: Float) {
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
                Kind.DIVER -> e.y += e.speed * (1f + (e.y + 0.2f) * 1.6f) * dt
            }
            e.bank = ((e.x - e.lastX) / max(1e-4f, dt) * 0.9f).coerceIn(-1f, 1f)

            if (e.kind == Kind.GUNNER || e.kind == Kind.WEAVER) {
                e.cooldown -= dt
                if (e.cooldown <= 0f && e.y > 0.04f && e.y < playerY - 0.08f) {
                    e.cooldown = (1.5f - level * 0.04f).coerceAtLeast(0.55f) / profile.fireRate *
                        (0.7f + shotRandom.next() * 0.7f)
                    fireEnemyShot(e)
                }
            }
            if (e.y > 1.12f) { e.alive = false; it.remove(); continue }
            if (hitsPlayer(e.x, e.y, ENEMY_HALF)) {
                e.alive = false
                it.remove()
                hurtPlayer(RAM_DAMAGE, e.x, e.y)
                if (state != State.RUNNING) return
            }
        }
    }

    private fun fireEnemyShot(e: Plane) {
        // Gunners lead the player; weavers just spit straight down.
        val vx = if (e.kind == Kind.GUNNER) ((playerX - e.x) * 0.55f).coerceIn(-0.5f, 0.5f) else 0f
        mutableShots.add(Shot(e.x, e.y + 0.04f, vx, ENEMY_SHOT_SPEED, fromPlayer = false))
        pendingEvents.add(Event(Event.Type.ENEMY_SHOT, e.x, e.y))
    }

    // ---- the boss -------------------------------------------------------------------------

    private fun spawnBoss() {
        val profile = profileOf(level)
        val hp = max(30, (BOSS_BASE_HP * profile.bossHp * (1f + (level - 1) * 0.45f)).toInt())
        boss = Boss((level - 1).mod(BOSS_KINDS), hp)
        pendingEvents.add(Event(Event.Type.BOSS_IN, 0f, 0f, value = (level - 1).mod(BOSS_KINDS)))
    }

    private fun updateBoss(dt: Float) {
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
            b.sweep += dt * BOSS_PHASE_SWEEP[b.phase]
            b.x = sin(b.sweep * BOSS_SWEEP_RATE) * BOSS_SWEEP_X * BOSS_PHASE_REACH[b.phase]
            b.salvo -= dt
            if (b.salvo <= 0f) {
                b.salvo = ((BOSS_SALVO_GAP - level * 0.03f) * BOSS_PHASE_GAP[b.phase]).coerceAtLeast(0.32f)
                fireBossSalvo(b)
            }
        }
        b.bank = ((b.x - lastX) / max(1e-4f, dt) * 1.4f).coerceIn(-1f, 1f)
        if (hitsPlayer(b.x, b.y, BOSS_HALF)) hurtPlayer(RAM_DAMAGE, b.x, b.y)
    }

    private fun fireBossSalvo(b: Boss) {
        // Phase 2 turns the fan into a slow spiral, so the gap you slip through keeps moving.
        if (b.phase >= 2) {
            b.spin += BOSS_SPIN_STEP
            for (i in 0 until BOSS_SPIRAL_ARMS) {
                val ang = b.spin + i * (TAU / BOSS_SPIRAL_ARMS)
                mutableShots.add(
                    Shot(b.x, b.y + 0.08f, sin(ang) * ENEMY_SHOT_SPEED, abs(cos(ang)) * ENEMY_SHOT_SPEED, false),
                )
            }
            pendingEvents.add(Event(Event.Type.ENEMY_SHOT, b.x, b.y))
            return
        }
        // A fan the player has to slip between, widening with the stage.
        val arms = 3 + (level - 1).coerceAtMost(4)
        for (i in 0 until arms) {
            val t = if (arms == 1) 0.5f else i / (arms - 1).toFloat()
            val ang = (t - 0.5f) * BOSS_FAN
            mutableShots.add(
                Shot(b.x, b.y + 0.08f, sin(ang) * ENEMY_SHOT_SPEED, cos(ang) * ENEMY_SHOT_SPEED, false),
            )
        }
        // From phase 1 it also picks you out of the fan and puts one straight at you.
        if (b.phase >= 1) {
            val dx = playerX - b.x
            val dy = max(0.15f, playerY - b.y)
            val len = kotlin.math.sqrt(dx * dx + dy * dy)
            mutableShots.add(
                Shot(b.x, b.y + 0.08f, dx / len * BOSS_AIMED_SPEED, dy / len * BOSS_AIMED_SPEED, false),
            )
        }
        pendingEvents.add(Event(Event.Type.ENEMY_SHOT, b.x, b.y))
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
        val rate = BASE_FIRE_RATE * (if (rapidTimer > 0f) RAPID_MULT else 1f)
        fireAccumulator += rate * dt
        while (fireAccumulator >= 1f) {
            fireAccumulator -= 1f
            for (i in 0 until spread) {
                val off = if (spread == 1) 0f else (i / (spread - 1f) - 0.5f)
                mutableShots.add(
                    Shot(playerX + off * 0.09f, playerY - 0.05f, off * 0.35f, -SHOT_SPEED, true),
                )
            }
            pendingEvents.add(Event(Event.Type.SHOT, playerX, playerY - 0.05f))
        }
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
        // the chain is the price of being hit, and it hurts more than the hit point does
        if (combo >= COMBO_STEP) pendingEvents.add(Event(Event.Type.COMBO_LOST, x, y, value = combo))
        combo = 0
        comboTimer = 0f
        hp -= amount
        flash = FLASH_SECONDS
        mercy = MERCY_SECONDS
        spread = max(1, spread - 1)            // losing armour costs you a gun
        pendingEvents.add(Event(Event.Type.HIT_PLAYER, x, y, value = amount))
        if (hp <= 0) {
            hp = 0
            state = State.GAME_OVER
            bestLevel = max(bestLevel, level - 1)
            pendingEvents.add(Event(Event.Type.OVER))
        }
    }

    // ---- bullets and pickups --------------------------------------------------------------

    private fun updateShots(dt: Float) {
        val it = mutableShots.iterator()
        while (it.hasNext()) {
            val s = it.next()
            if (!s.alive) { it.remove(); continue }
            s.x += s.vx * dt
            s.y += s.vy * dt
            if (s.y < -0.15f || s.y > 1.15f || abs(s.x) > 1.2f) { it.remove(); continue }
            if (s.fromPlayer) {
                var spent = false
                for (e in mutableEnemies) {
                    if (!e.alive) continue
                    if (abs(e.x - s.x) < ENEMY_HALF && abs(e.y - s.y) < ENEMY_HALF) {
                        e.hp -= s.damage
                        spent = true
                        if (e.hp <= 0) {
                            e.alive = false
                            awardKill(e.kind, e.x, e.y)
                            maybeDropItem(e.x, e.y)
                        } else {
                            pendingEvents.add(Event(Event.Type.HIT_ENEMY, s.x, s.y))
                        }
                        break
                    }
                }
                if (!spent) {
                    val b = boss
                    if (b != null && b.alive && abs(b.x - s.x) < BOSS_HALF && abs(b.y - s.y) < BOSS_HALF) {
                        spent = true
                        damageBoss(b, s.damage)
                        if (b.alive) pendingEvents.add(Event(Event.Type.HIT_BOSS, s.x, s.y))
                    }
                }
                if (spent) { s.alive = false; it.remove() }
            } else if (hitsPlayer(s.x, s.y, SHOT_HALF)) {
                s.alive = false
                it.remove()
                hurtPlayer(SHOT_DAMAGE, s.x, s.y)
                if (state != State.RUNNING) return
            }
        }
    }

    private fun maybeDropItem(x: Float, y: Float) {
        if (random.next() >= ITEM_CHANCE) return
        val roll = random.next()
        val kind = when {
            roll < 0.26f -> ItemKind.SPREAD
            roll < 0.5f -> ItemKind.RAPID
            roll < 0.72f -> ItemKind.SHIELD
            roll < 0.88f -> ItemKind.REPAIR
            else -> ItemKind.BOMB
        }
        mutableItems.add(Item(x, y, kind))
    }

    private fun updateItems(dt: Float) {
        val it = mutableItems.iterator()
        while (it.hasNext()) {
            val item = it.next()
            if (!item.alive) { it.remove(); continue }
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
            ItemKind.REPAIR -> hp = min(MAX_HP, hp + 1)
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
            state = State.LEVEL_CLEAR
            bestLevel = max(bestLevel, level)
            score += CLEAR_BONUS * level
            pendingEvents.add(Event(Event.Type.CLEAR))
        }
    }

    /** What a kill is worth right now: one more step of the chain for every [COMBO_STEP] kills. */
    fun comboMultiplier(): Int = (1 + combo / COMBO_STEP).coerceAtMost(MAX_COMBO_MULT)

    /** Banks a kill, extends the chain, and pays out at the chain's rate. */
    private fun awardKill(kind: Kind, x: Float, y: Float) {
        kills++
        combo++
        comboTimer = COMBO_WINDOW
        bestCombo = max(bestCombo, combo)
        val mult = comboMultiplier()
        score += scoreFor(kind) * mult
        pendingEvents.add(Event(Event.Type.KILL_ENEMY, x, y, value = mult))
        // the chain announces itself only when it actually steps up
        if (combo % COMBO_STEP == 0 && mult <= MAX_COMBO_MULT) {
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
        const val BOSS_HALF = 0.2f
        const val SHOT_HALF = 0.012f
        const val ITEM_HALF = 0.05f

        const val MAX_HP = 5
        const val START_BOMBS = 2
        const val MAX_BOMBS = 5
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
        const val CLEAR_BONUS = 250
        const val BOSS_SCORE = 500

        const val BOSS_KINDS = 4
        const val BOSS_BASE_HP = 70f
        const val BOSS_STATION_Y = 0.2f
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
                22, listOf(Kind.DRONE, Kind.DRONE, Kind.WEAVER), 0.8f, 0.30f, 1.0f,
                listOf(Formation.LINE, Formation.VEE), Hazard.NONE, -0.12f,
            ),
            // Thunderhead pass: flown inside the weather, which pushes you off your line.
            Profile(
                26, listOf(Kind.WEAVER, Kind.DRONE, Kind.DIVER), 1.0f, 0.34f, 1.15f,
                listOf(Formation.TRAIL, Formation.LINE), Hazard.GUSTS, -0.12f,
            ),
            // The ember fields: the ground burns, and the fire reaches the altitude you are at.
            Profile(
                30, listOf(Kind.GUNNER, Kind.WEAVER, Kind.DRONE), 1.25f, 0.32f, 1.3f,
                listOf(Formation.ARC, Formation.SPLIT), Hazard.FLAK, -0.12f,
            ),
            // The long night: they are on you before you see them.
            Profile(
                34, listOf(Kind.DIVER, Kind.GUNNER, Kind.WEAVER, Kind.DRONE), 1.4f, 0.40f, 1.5f,
                listOf(Formation.SPLIT, Formation.TRAIL, Formation.VEE), Hazard.DARK, -0.03f,
            ),
        )

        fun profileOf(level: Int): Profile = PROFILES[(level - 1).mod(PROFILES.size)]
    }
}
