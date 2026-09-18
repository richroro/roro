package com.richroro.crowdrush

import kotlin.math.abs
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sqrt

/**
 * Pure crowd-runner simulation with no Android dependencies.
 *
 * The lane is 2 units wide (x in -1..1) and the crowd runs forward along z in metres.
 * Gates, enemy squads and the boss sit at fixed z positions; when the crowd's z passes
 * one of them the interaction is resolved. Level generation is deterministic per seed.
 */
class CrowdWorld(private val seed: Int = 1) {

    enum class State { READY, RUNNING, LEVEL_CLEAR, GAME_OVER }

    enum class Op { ADD, MUL, SUB, DIV }

    /** One half of a gate. Bullets mutate it, so it is a mutable class rather than a data class. */
    class GateSide(op: Op, value: Int) {
        var op: Op = op
            private set
        var value: Int = value
            private set
        var hits: Int = 0
            private set

        val isGood: Boolean get() = op == Op.ADD || op == Op.MUL
        val label: String
            get() = when (op) {
                Op.ADD -> "+$value"
                Op.MUL -> "×$value"
                Op.SUB -> "−$value"
                Op.DIV -> "÷$value"
            }

        /**
         * A bullet hit improves the side: +N grows, −N shrinks and flips to +1, ÷2 flips to +1 after
         * enough hits. Returns true when the displayed value changed.
         */
        internal fun hit(): Boolean {
            hits++
            return when (op) {
                Op.ADD -> if (hits % GATE_HITS_PER_STEP == 0) { value++; true } else false
                Op.MUL -> if (hits % MUL_HITS_PER_STEP == 0) { value++; true } else false
                Op.SUB -> if (hits % GATE_HITS_PER_STEP == 0) {
                    value--
                    if (value <= 0) flipToPlusOne()
                    true
                } else false
                Op.DIV -> if (hits >= DIV_HITS_TO_FLIP) { flipToPlusOne(); true } else false
            }
        }

        private fun flipToPlusOne() {
            op = Op.ADD
            value = 1
            hits = 0
        }
    }

    class Gate(val z: Float, val left: GateSide, val right: GateSide) {
        var used: Boolean = false
            internal set
    }

    class Enemy(z: Float, val x: Float, count: Int) {
        val maxCount: Int = count
        var z: Float = z
            private set
        var count: Int = count
            private set

        internal fun march(dz: Float) {
            z -= dz
        }

        internal fun wipe() {
            count = 0
            alive = false
        }
        var alive: Boolean = true
            internal set

        internal fun shot() {
            count--
            if (count <= 0) {
                count = 0
                alive = false
            }
        }
    }

    /** The end-of-road monster. [kind] indexes the monster type (0 ogre, 1 troll, 2 golem, 3 demon). */
    class Boss(z: Float, count: Int, val kind: Int) {
        val maxCount: Int = count
        var z: Float = z
            private set
        var count: Int = count
            private set
        var alive: Boolean = true
            internal set
        var roared: Boolean = false
            internal set
        var marching: Boolean = false
            internal set

        internal fun march(dz: Float) {
            z -= dz
        }

        internal fun shot() {
            count--
            if (count <= 0) {
                count = 0
                alive = false
            }
        }

        /** Removes up to [amount] soldiers; returns how many were actually removed. */
        internal fun damage(amount: Int): Int {
            val removed = min(amount, count)
            count -= removed
            if (count <= 0) {
                count = 0
                alive = false
            }
            return removed
        }
    }

    class Bullet(val x: Float, var z: Float) {
        var alive: Boolean = true
            internal set
    }

    enum class ItemKind { RAPID, SHIELD, REINFORCE, BOMB }

    class Item(val z: Float, val x: Float, val kind: ItemKind) {
        var alive: Boolean = true
            internal set
    }

    /** Something the renderer may want to show or play. Drained once per frame via [drainEvents]. */
    class Event(val type: Type, val x: Float = 0f, val z: Float = 0f, val value: Int = 0, val flag: Boolean = false, val label: String = "", val item: ItemKind? = null) {
        enum class Type { SHOT, HIT_GATE, HIT_ENEMY, HIT_BOSS, GATE_GOOD, GATE_BAD, CONTACT, LEVEL_CLEAR, GAME_OVER, ITEM, SHIELD_USED, ROAR }
    }

    var level: Int = 1
        private set
    var bestLevel: Int = 0
        private set
    var state: State = State.READY
        private set
    var count: Int = START_COUNT
        private set
    var playerX: Float = 0f
        private set
    var z: Float = 0f
        private set
    var length: Float = 0f
        private set
    var speed: Float = 0f
        private set
    var message: String = ""
        private set
    var flash: Float = 0f
        private set
    var lastGateGood: Boolean = true
        private set
    var kills: Int = 0
        private set

    private val mutableGates = ArrayList<Gate>()
    private val mutableEnemies = ArrayList<Enemy>()
    private val mutableBullets = ArrayList<Bullet>()
    private val mutableItems = ArrayList<Item>()
    val gates: List<Gate> get() = mutableGates
    val enemies: List<Enemy> get() = mutableEnemies
    val bullets: List<Bullet> get() = mutableBullets
    val items: List<Item> get() = mutableItems

    /** Seconds of rapid fire left; 0 when inactive. */
    var rapidTimer: Float = 0f
        private set

    /** True while a shield is held; it absorbs the next bad gate or squad contact. */
    var shield: Boolean = false
        private set
    private var fireAccumulator = 0f
    private val shotRandom = Mulberry32(seed)
    private val pendingEvents = ArrayList<Event>()

    /** Moves all queued events into [into] and clears the queue. */
    fun drainEvents(into: MutableList<Event>) {
        into.addAll(pendingEvents)
        pendingEvents.clear()
    }
    var boss: Boss? = null
        private set

    val playerRadius: Float
        get() = min(PLAYER_MAX_RADIUS, PLAYER_BASE_RADIUS + PLAYER_RADIUS_GROWTH * sqrt(count.toFloat()))

    val progress: Float
        get() = if (length <= 0f) 0f else min(1f, z / length)

    /** Bullets per second right now: every soldier up to [MAX_SHOOTERS] fires, doubled by rapid fire. */
    val fireRate: Float
        get() = fireRateFor(count) * (if (rapidTimer > 0f) RAPID_MULT else 1f)

    fun start() = startLevel(1)

    fun nextLevel() = startLevel(level + 1)

    fun startLevel(newLevel: Int) {
        level = newLevel
        val random = Mulberry32(seed * 7919 + newLevel * 104729)
        length = BASE_LENGTH + LENGTH_PER_LEVEL * (newLevel - 1)
        speed = min(MAX_SPEED, BASE_SPEED + SPEED_PER_LEVEL * (newLevel - 1))
        count = START_COUNT
        playerX = 0f
        z = 0f
        flash = 0f
        message = ""
        lastGateGood = true
        kills = 0
        fireAccumulator = 0f
        mutableBullets.clear()
        pendingEvents.clear()
        mutableItems.clear()
        rapidTimer = 0f
        shield = false

        val gateCount = min(MAX_GATES, BASE_GATES + GATES_PER_LEVEL * (newLevel - 1))
        val spacing = (length - 20f) / gateCount
        mutableGates.clear()
        var best = START_COUNT
        for (i in 0 until gateCount) {
            val gz = 14f + spacing * i + random.next() * spacing * 0.3f
            val goodOp = if (random.next() < 0.35f && best >= 4) Op.MUL else Op.ADD
            val goodValue = if (goodOp == Op.MUL) {
                if (random.next() < 0.75f) 2 else 3
            } else {
                2 + floor(random.next() * (4f + newLevel * 2f + best * 0.4f)).toInt()
            }
            val roll = random.next()
            val otherOp: Op
            val otherValue: Int
            when {
                roll < 0.4f -> {
                    otherOp = Op.ADD
                    otherValue = max(1, floor(goodValue * (0.3f + random.next() * 0.4f)).toInt())
                }
                roll < 0.7f -> {
                    otherOp = Op.SUB
                    otherValue = 1 + floor(random.next() * max(2f, best * 0.3f)).toInt()
                }
                else -> {
                    otherOp = Op.DIV
                    otherValue = 2
                }
            }
            val good = GateSide(goodOp, goodValue)
            val other = GateSide(otherOp, otherValue)
            val goodLeft = random.next() < 0.5f
            val gate = if (goodLeft) Gate(gz, good, other) else Gate(gz, other, good)
            mutableGates.add(gate)
            best = max(apply(best, gate.left), apply(best, gate.right))
        }

        val enemyCount = min(MAX_ENEMIES, BASE_ENEMIES + ((newLevel - 1) / 2) * ENEMIES_PER_TWO_LEVELS)
        mutableEnemies.clear()
        // Squads are spread evenly along the lane (one per zone), kept clear of gates, alternate
        // sides, and grow with how far along the lane they stand.
        val zoneStart = 40f
        val zoneEnd = length - 22f
        val zoneLen = (zoneEnd - zoneStart) / enemyCount
        for (i in 0 until enemyCount) {
            val preferred = (zoneStart + zoneLen * (i + 0.35f + random.next() * 0.3f)).coerceIn(LANE_MIN_Z, length - 12f)
            // Walk outwards from the preferred spot until the squad stands clear of every gate.
            var ez = Float.NaN
            var offset = 0f
            while (offset <= zoneLen + ENEMY_GATE_CLEARANCE && ez.isNaN()) {
                for (candidate in floatArrayOf(preferred + offset, preferred - offset)) {
                    if (candidate < LANE_MIN_Z || candidate > length - 12f) continue
                    if (mutableGates.all { abs(it.z - candidate) >= ENEMY_GATE_CLEARANCE }) {
                        ez = candidate
                        break
                    }
                }
                offset += 1f
            }
            if (ez.isNaN()) continue
            val progress = ez / length
            val expected = expectedCountAt(ez)
            val shotsInRange = fireRateFor(expected) * (BULLET_RANGE / speed)
            val n = max(MIN_ENEMY, floor(expected * (0.2f + 0.3f * progress) + shotsInRange * ENEMY_SHOOT_FACTOR).toInt())
            val ex = (if (i % 2 == 0) -1f else 1f) * (0.25f + random.next() * 0.4f)
            mutableEnemies.add(Enemy(ez, ex, n))
        }

        // Items: one per zone, clear of gates and squads, random kind.
        val itemCount = min(MAX_ITEMS, BASE_ITEMS + ((newLevel - 1) / 2) * ITEMS_PER_TWO_LEVELS)
        val izStart = 20f
        val izEnd = length - 16f
        val izLen = (izEnd - izStart) / itemCount
        for (i in 0 until itemCount) {
            val preferred = (izStart + izLen * (i + 0.2f + random.next() * 0.6f)).coerceIn(16f, length - 10f)
            // Walk outwards from the preferred spot until the item is clear of every gate and squad.
            var iz = Float.NaN
            var offset = 0f
            while (offset <= izLen && iz.isNaN()) {
                for (candidate in floatArrayOf(preferred + offset, preferred - offset)) {
                    if (candidate < 16f || candidate > length - 10f) continue
                    if (mutableGates.all { abs(it.z - candidate) >= ITEM_CLEARANCE } &&
                        mutableEnemies.all { abs(it.z - candidate) >= ITEM_CLEARANCE }
                    ) {
                        iz = candidate
                        break
                    }
                }
                offset += 1f
            }
            val ix = -0.6f + random.next() * 1.2f
            val roll = random.next()
            val kind = when {
                roll < 0.3f -> ItemKind.RAPID
                roll < 0.6f -> ItemKind.REINFORCE
                roll < 0.85f -> ItemKind.SHIELD
                else -> ItemKind.BOMB
            }
            if (!iz.isNaN()) mutableItems.add(Item(iz, ix, kind))
        }

        // The boss is sized so a best-path army wins even while landing only half its shots.
        val bossShots = fireRateFor(best) * (BULLET_RANGE / speed)
        boss = Boss(length, max(3, floor(best * BOSS_FACTOR + bossShots * BOSS_SHOOT_FACTOR).toInt()), kind = (newLevel - 1) % MONSTER_KINDS)
        bossResolved = false
        state = State.RUNNING
    }

    /** Best-path crowd size after every gate before [atZ]; used to size enemies fairly. */
    fun expectedCountAt(atZ: Float): Int {
        var c = START_COUNT
        for (g in mutableGates) {
            if (g.z < atZ) c = max(apply(c, g.left), apply(c, g.right))
        }
        return c
    }

    fun movePlayerBy(dx: Float) {
        val limit = LANE_HALF - playerRadius
        playerX = (playerX + dx).coerceIn(-limit, limit)
    }

    fun update(dtSeconds: Float) {
        if (state != State.RUNNING) return
        val dt = dtSeconds.coerceIn(0f, MAX_FRAME_DT)
        val prevZ = z
        z += speed * dt
        flash = max(0f, flash - dt)
        rapidTimer = max(0f, rapidTimer - dt)
        for (item in mutableItems) {
            if (item.alive && item.z > prevZ && item.z <= z && abs(item.x - playerX) < ITEM_RADIUS + playerRadius) {
                item.alive = false
                applyItem(item)
            }
        }
        for (e in mutableEnemies) { // squads advance on the player once they are close
            val d = e.z - z
            if (e.alive && d > 0f && d < ENEMY_MARCH_RANGE) e.march(ENEMY_MARCH_SPEED * dt)
        }
        boss?.let { b -> // the monster roars and stomps toward the rangers once they are in range
            val d = b.z - z
            if (b.alive && d > 0f && d < MONSTER_MARCH_RANGE) {
                if (!b.roared) {
                    b.roared = true
                    pendingEvents.add(Event(Event.Type.ROAR, 0f, b.z, value = b.kind))
                }
                b.march(MONSTER_MARCH_SPEED * dt)
                b.marching = true
            } else {
                b.marching = false
            }
        }
        updateShooting(dt)

        for (g in mutableGates) {
            if (!g.used && g.z > prevZ && g.z <= z) {
                g.used = true
                val side = if (playerX < 0f) g.left else g.right
                if (!side.isGood && shield) {
                    shield = false
                    pendingEvents.add(Event(Event.Type.SHIELD_USED, playerX, g.z))
                    continue
                }
                count = apply(count, side)
                flash = FLASH_SECONDS
                lastGateGood = side.isGood
                pendingEvents.add(Event(if (side.isGood) Event.Type.GATE_GOOD else Event.Type.GATE_BAD, playerX, g.z, label = side.label))
                if (count <= 0) {
                    state = State.GAME_OVER
                    message = MSG_WIPED
                    pendingEvents.add(Event(Event.Type.GAME_OVER))
                    return
                }
            }
        }

        for (e in mutableEnemies) {
            if (e.alive && e.z > prevZ && e.z <= z && abs(e.x - playerX) < ENEMY_HALF_WIDTH + playerRadius) {
                if (shield) {
                    shield = false
                    e.alive = false
                    kills += e.count
                    pendingEvents.add(Event(Event.Type.SHIELD_USED, e.x, e.z))
                    continue
                }
                e.alive = false
                count -= e.count
                flash = FLASH_SECONDS
                lastGateGood = false
                pendingEvents.add(Event(Event.Type.CONTACT, e.x, e.z, value = e.count))
                if (count <= 0) {
                    count = 0
                    state = State.GAME_OVER
                    message = MSG_LOST_TO_SQUAD.format(e.count)
                    pendingEvents.add(Event(Event.Type.GAME_OVER))
                    return
                }
            }
        }

        val b = boss
        if (b != null && b.z <= z && !bossResolved) {
            bossResolved = true
            val remaining = if (b.alive) b.count else 0
            b.alive = false
            count -= remaining
            if (count > 0) {
                state = State.LEVEL_CLEAR
                bestLevel = max(bestLevel, level)
                message = MSG_BOSS_BEATEN.format(b.maxCount)
                pendingEvents.add(Event(Event.Type.LEVEL_CLEAR))
            } else {
                count = 0
                state = State.GAME_OVER
                message = MSG_LOST_TO_BOSS.format(remaining)
                pendingEvents.add(Event(Event.Type.GAME_OVER))
            }
        }
    }

    private var bossResolved = false

    private fun applyItem(item: Item) {
        pendingEvents.add(Event(Event.Type.ITEM, item.x, item.z, item = item.kind))
        when (item.kind) {
            ItemKind.RAPID -> rapidTimer = RAPID_SECONDS
            ItemKind.SHIELD -> shield = true
            ItemKind.REINFORCE -> count += max(REINFORCE_MIN, floor(count * REINFORCE_RATIO).toInt())
            ItemKind.BOMB -> {
                for (e in mutableEnemies) {
                    if (e.alive && e.z - z < BOMB_RANGE) {
                        kills += e.count
                        e.wipe()
                        pendingEvents.add(Event(Event.Type.HIT_ENEMY, e.x, e.z, flag = true))
                    }
                }
                val b = boss
                if (b != null && b.alive && b.z - z < BOMB_RANGE) {
                    val damage = floor(b.maxCount * BOMB_BOSS_RATIO).toInt()
                    kills += b.damage(damage)
                }
            }
        }
    }

    private fun updateShooting(dt: Float) {
        fireAccumulator += fireRate * dt
        while (fireAccumulator >= 1f) {
            fireAccumulator -= 1f
            val spread = playerRadius * 0.8f
            val bx = playerX + (shotRandom.next() * 2f - 1f) * spread
            mutableBullets.add(Bullet(bx, z + 1f))
            pendingEvents.add(Event(Event.Type.SHOT, bx, z))
        }
        val b = boss
        for (bullet in mutableBullets) {
            val prevBz = bullet.z
            bullet.z += BULLET_SPEED * dt
            if (bullet.z - z > BULLET_RANGE) {
                bullet.alive = false
                continue
            }
            for (g in mutableGates) {
                if (!g.used && g.z > prevBz && g.z <= bullet.z) {
                    val side = if (bullet.x < 0f) g.left else g.right
                    val stepped = side.hit()
                    bullet.alive = false
                    pendingEvents.add(Event(Event.Type.HIT_GATE, bullet.x, g.z, flag = stepped, label = side.label, value = if (side.isGood) 1 else 0))
                    break
                }
            }
            if (!bullet.alive) continue
            for (e in mutableEnemies) {
                if (e.alive && e.z > prevBz && e.z <= bullet.z && abs(e.x - bullet.x) < ENEMY_HALF_WIDTH) {
                    e.shot()
                    kills++
                    bullet.alive = false
                    pendingEvents.add(Event(Event.Type.HIT_ENEMY, bullet.x, e.z, flag = !e.alive))
                    break
                }
            }
            if (!bullet.alive) continue
            if (b != null && b.alive && b.z > prevBz && b.z <= bullet.z) {
                b.shot()
                kills++
                bullet.alive = false
                pendingEvents.add(Event(Event.Type.HIT_BOSS, bullet.x, b.z, flag = !b.alive))
            }
        }
        mutableBullets.removeAll { !it.alive }
    }

    /** Test hook: put the crowd at a lane position and distance without generating a level. */
    internal fun setForTest(count: Int, playerX: Float, z: Float) {
        this.count = count
        this.playerX = playerX
        this.z = z
    }

    /** Test hook: place an item directly. */
    internal fun addItemForTest(kind: ItemKind, x: Float, z: Float): Item {
        val item = Item(z, x, kind)
        mutableItems.add(item)
        return item
    }

    /** Test hook: place a bullet directly. */
    internal fun addBulletForTest(x: Float, z: Float) {
        mutableBullets.add(Bullet(x, z))
    }

    /** Small deterministic PRNG shared with the browser build so levels match across ports. */
    private class Mulberry32(seed: Int) {
        private var a = seed
        fun next(): Float {
            a += 0x6D2B79F5
            var t = a
            t = (t xor (t ushr 15)) * (t or 1)
            t = t xor (t + ((t xor (t ushr 7)) * (t or 61)))
            val out = (t xor (t ushr 14)).toLong() and 0xFFFFFFFFL
            return (out.toDouble() / 4294967296.0).toFloat()
        }
    }

    companion object {
        const val LANE_HALF = 1f
        const val PLAYER_BASE_RADIUS = 0.12f
        const val PLAYER_RADIUS_GROWTH = 0.018f
        const val PLAYER_MAX_RADIUS = 0.42f
        const val BASE_SPEED = 4.4f
        const val SPEED_PER_LEVEL = 0.28f
        const val MAX_SPEED = 8.5f
        const val BASE_LENGTH = 132f
        const val LENGTH_PER_LEVEL = 10f
        const val BASE_GATES = 5
        const val GATES_PER_LEVEL = 1
        const val MAX_GATES = 12
        const val BASE_ENEMIES = 2
        const val ENEMIES_PER_TWO_LEVELS = 1
        const val MAX_ENEMIES = 8
        const val ENEMY_HALF_WIDTH = 0.36f
        const val BOSS_FACTOR = 0.6f
        const val START_COUNT = 1
        const val MAX_FRAME_DT = 0.05f
        const val FLASH_SECONDS = 0.25f

        const val MAX_SHOOTERS = 40
        const val SHOTS_PER_SHOOTER = 1.2f
        const val BULLET_SPEED = 28f
        const val BULLET_RANGE = 48f
        const val GATE_HITS_PER_STEP = 3
        const val MUL_HITS_PER_STEP = 20
        const val DIV_HITS_TO_FLIP = 15
        const val BOSS_SHOOT_FACTOR = 0.5f
        const val ENEMY_SHOOT_FACTOR = 0.10f
        const val ENEMY_GATE_CLEARANCE = 7f
        const val LANE_MIN_Z = 24f
        const val ENEMY_MARCH_SPEED = 0.7f
        const val ENEMY_MARCH_RANGE = 30f
        const val MIN_ENEMY = 2

        const val ITEM_RADIUS = 0.22f
        const val BASE_ITEMS = 2
        const val ITEMS_PER_TWO_LEVELS = 1
        const val MAX_ITEMS = 5
        const val ITEM_CLEARANCE = 5f
        const val RAPID_SECONDS = 6f
        const val RAPID_MULT = 2f
        const val REINFORCE_RATIO = 0.3f
        const val REINFORCE_MIN = 3
        const val BOMB_RANGE = 40f
        const val BOMB_BOSS_RATIO = 0.1f

        const val MONSTER_KINDS = 4
        const val MONSTER_MARCH_RANGE = 30f
        const val MONSTER_MARCH_SPEED = 0.45f

        fun fireRateFor(count: Int): Float = min(count, MAX_SHOOTERS) * SHOTS_PER_SHOOTER

        const val MSG_WIPED = "wiped"
        const val MSG_LOST_TO_SQUAD = "squad:%d"
        const val MSG_BOSS_BEATEN = "boss_beaten:%d"
        const val MSG_LOST_TO_BOSS = "boss_lost:%d"

        fun apply(count: Int, side: GateSide): Int = when (side.op) {
            Op.ADD -> count + side.value
            Op.MUL -> count * side.value
            Op.SUB -> max(0, count - side.value)
            Op.DIV -> max(0, count / side.value)
        }
    }
}
