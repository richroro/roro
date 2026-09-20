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
 * size the device is. The player sits near the bottom on [PLAYER_Y] and only moves sideways;
 * everything else falls towards them. Kept free of Canvas and Context so it can be unit tested on
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
        internal var salvo = 0f
        internal var sweep = 0f
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
            SHOT, ENEMY_SHOT, HIT_ENEMY, KILL_ENEMY, HIT_BOSS, KILL_BOSS,
            HIT_PLAYER, SHIELD_USED, PICKUP, BOMB, BOSS_IN, CLEAR, OVER,
        }
    }

    /** What a stage is made of. Gives each one its own shape instead of a longer version of the last. */
    class Profile(
        val waves: Int,
        val mix: List<Kind>,
        val fireRate: Float,
        val speed: Float,
        val bossHp: Float,
    )

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

    /** Counts down while the player is briefly untouchable after a hit. */
    var mercy = 0f
        private set
    /** Non-zero for a moment after the player is hit; the view flashes on it. */
    var flash = 0f
        private set

    private val mutableEnemies = ArrayList<Plane>()
    private val mutableShots = ArrayList<Shot>()
    private val mutableItems = ArrayList<Item>()
    val enemies: List<Plane> get() = mutableEnemies
    val shots: List<Shot> get() = mutableShots
    val items: List<Item> get() = mutableItems
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
        pendingEvents.clear()
        boss = null
        playerX = 0f
        hp = MAX_HP
        bombs = START_BOMBS
        shield = false
        rapidTimer = 0f
        spread = 1
        mercy = 0f
        flash = 0f
        fireAccumulator = 0f
        elapsed = 0f
        waveIndex = 0
        totalWaves = profile.waves
        nextWaveAt = 0.8f
        state = State.RUNNING
    }

    fun movePlayerBy(dx: Float) {
        playerX = (playerX + dx).coerceIn(-PLAYER_LIMIT, PLAYER_LIMIT)
    }

    /** Sets off the screen-clearing bomb, if one is left. Returns true when it fired. */
    fun useBomb(): Boolean {
        if (state != State.RUNNING || bombs <= 0) return false
        bombs--
        pendingEvents.add(Event(Event.Type.BOMB, playerX, PLAYER_Y))
        for (e in mutableEnemies) {
            if (!e.alive) continue
            e.alive = false
            kills++
            score += scoreFor(e.kind)
            pendingEvents.add(Event(Event.Type.KILL_ENEMY, e.x, e.y, value = e.maxHp))
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

        spawnWaves()
        updateEnemies(dt)
        updateBoss(dt)
        updatePlayerFire(dt)
        updateShots(dt)
        updateItems(dt)
        checkStageEnd()
    }

    // ---- stage script ---------------------------------------------------------------------

    private fun spawnWaves() {
        if (waveIndex >= totalWaves || elapsed < nextWaveAt) return
        val profile = profileOf(level)
        val kind = profile.mix[random.nextInt(profile.mix.size)]
        val n = 3 + random.nextInt(4)
        val formation = random.nextInt(3)
        val baseX = -0.62f + random.next() * 1.24f
        val speed = profile.speed * (0.85f + random.next() * 0.3f)
        val hpEach = 1 + (level - 1) / 3 + if (kind == Kind.GUNNER) 1 else 0
        for (i in 0 until n) {
            val t = if (n == 1) 0.5f else i / (n - 1).toFloat()
            val spreadX: Float
            val lead: Float
            when (formation) {
                0 -> {                                   // line abreast
                    spreadX = (t - 0.5f) * 0.72f
                    lead = 0f
                }
                1 -> {                                   // vee
                    spreadX = (t - 0.5f) * 0.8f
                    lead = abs(t - 0.5f) * 0.34f
                }
                else -> {                                // trail
                    spreadX = 0f
                    lead = t * 0.5f
                }
            }
            val homeX = (baseX + spreadX).coerceIn(-0.86f, 0.86f)
            mutableEnemies.add(
                Plane(
                    x = homeX,
                    y = -0.12f - lead,
                    kind = kind,
                    hp = hpEach,
                    homeX = homeX,
                    phase = random.next() * TAU,
                    speed = speed,
                ),
            )
        }
        waveIndex++
        nextWaveAt = elapsed + WAVE_GAP * (0.8f + random.next() * 0.5f)
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
                if (e.cooldown <= 0f && e.y > 0.04f && e.y < PLAYER_Y - 0.08f) {
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
        if (!b.alive) return
        val lastX = b.x
        if (!b.engaged) {
            b.y = min(BOSS_STATION_Y, b.y + BOSS_ENTRY_SPEED * dt)
            if (b.y >= BOSS_STATION_Y - 1e-4f) b.engaged = true
        } else {
            b.sweep += dt
            b.x = sin(b.sweep * BOSS_SWEEP_RATE) * BOSS_SWEEP_X
            b.salvo -= dt
            if (b.salvo <= 0f) {
                b.salvo = (BOSS_SALVO_GAP - level * 0.03f).coerceAtLeast(0.45f)
                fireBossSalvo(b)
            }
        }
        b.bank = ((b.x - lastX) / max(1e-4f, dt) * 1.4f).coerceIn(-1f, 1f)
        if (hitsPlayer(b.x, b.y, BOSS_HALF)) hurtPlayer(RAM_DAMAGE, b.x, b.y)
    }

    private fun fireBossSalvo(b: Boss) {
        // A fan the player has to slip between, widening with the stage.
        val arms = 3 + (level - 1).coerceAtMost(4)
        for (i in 0 until arms) {
            val t = if (arms == 1) 0.5f else i / (arms - 1).toFloat()
            val ang = (t - 0.5f) * BOSS_FAN
            mutableShots.add(
                Shot(b.x, b.y + 0.08f, sin(ang) * ENEMY_SHOT_SPEED, cos(ang) * ENEMY_SHOT_SPEED, false),
            )
        }
        pendingEvents.add(Event(Event.Type.ENEMY_SHOT, b.x, b.y))
    }

    private fun damageBoss(b: Boss, amount: Int) {
        b.hp = max(0, b.hp - amount)
        if (b.hp == 0) {
            b.alive = false
            kills++
            score += BOSS_SCORE * level
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
                    Shot(playerX + off * 0.09f, PLAYER_Y - 0.05f, off * 0.35f, -SHOT_SPEED, true),
                )
            }
            pendingEvents.add(Event(Event.Type.SHOT, playerX, PLAYER_Y - 0.05f))
        }
    }

    private fun hitsPlayer(x: Float, y: Float, half: Float): Boolean =
        mercy <= 0f && abs(y - PLAYER_Y) < half + PLAYER_HALF_Y && abs(x - playerX) < half + PLAYER_HALF_X

    private fun hurtPlayer(amount: Int, x: Float, y: Float) {
        if (mercy > 0f) return
        if (shield) {
            shield = false
            mercy = MERCY_SECONDS
            pendingEvents.add(Event(Event.Type.SHIELD_USED, x, y))
            return
        }
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
                            kills++
                            score += scoreFor(e.kind)
                            pendingEvents.add(Event(Event.Type.KILL_ENEMY, e.x, e.y, value = e.maxHp))
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
            if (abs(item.y - PLAYER_Y) < ITEM_HALF + PLAYER_HALF_Y &&
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
            state = State.LEVEL_CLEAR
            bestLevel = max(bestLevel, level)
            score += CLEAR_BONUS * level
            pendingEvents.add(Event(Event.Type.CLEAR))
        }
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
        spread: Int = this.spread,
        bombs: Int = this.bombs,
        shield: Boolean = this.shield,
        mercy: Float = this.mercy,
    ) {
        this.hp = hp
        this.playerX = playerX
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

    internal fun forceBossForTest(hp: Int) {
        boss = Boss(0, hp).also { it.y = BOSS_STATION_Y; it.engaged = true }
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
        const val PLAYER_Y = 0.86f
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
        const val ITEM_CHANCE = 0.13f
        const val ITEM_FALL_SPEED = 0.26f
        const val ITEM_SCORE = 30
        const val CLEAR_BONUS = 250
        const val BOSS_SCORE = 500

        const val BOSS_KINDS = 4
        const val BOSS_BASE_HP = 70f
        const val BOSS_STATION_Y = 0.2f
        const val BOSS_ENTRY_SPEED = 0.22f
        const val BOSS_SWEEP_RATE = 0.9f
        const val BOSS_SWEEP_X = 0.5f
        const val BOSS_SALVO_GAP = 1.15f
        const val BOSS_FAN = 1.5f
        const val BOMB_BOSS_RATIO = 0.16f

        const val MAX_FRAME_DT = 0.05f
        const val TAU = 6.2831855f

        /**
         * Stage shapes. The first is a gentle introduction, then the weavers arrive, then the
         * gunners make you move, then everything at once and faster.
         */
        val PROFILES = listOf(
            Profile(16, listOf(Kind.DRONE, Kind.DRONE, Kind.WEAVER), 0.8f, 0.30f, 1.0f),
            Profile(18, listOf(Kind.WEAVER, Kind.DRONE, Kind.DIVER), 1.0f, 0.34f, 1.15f),
            Profile(21, listOf(Kind.GUNNER, Kind.WEAVER, Kind.DRONE), 1.25f, 0.32f, 1.3f),
            Profile(24, listOf(Kind.DIVER, Kind.GUNNER, Kind.WEAVER, Kind.DRONE), 1.4f, 0.40f, 1.5f),
        )

        fun profileOf(level: Int): Profile = PROFILES[(level - 1).mod(PROFILES.size)]
    }
}
