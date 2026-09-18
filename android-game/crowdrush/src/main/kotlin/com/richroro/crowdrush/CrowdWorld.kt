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

    data class GateSide(val op: Op, val value: Int) {
        val isGood: Boolean get() = op == Op.ADD || op == Op.MUL
        val label: String
            get() = when (op) {
                Op.ADD -> "+$value"
                Op.MUL -> "×$value"
                Op.SUB -> "−$value"
                Op.DIV -> "÷$value"
            }
    }

    class Gate(val z: Float, val left: GateSide, val right: GateSide) {
        var used: Boolean = false
            internal set
    }

    class Enemy(val z: Float, val x: Float, val count: Int) {
        var alive: Boolean = true
            internal set
    }

    class Boss(val z: Float, val count: Int) {
        var alive: Boolean = true
            internal set
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

    private val mutableGates = ArrayList<Gate>()
    private val mutableEnemies = ArrayList<Enemy>()
    val gates: List<Gate> get() = mutableGates
    val enemies: List<Enemy> get() = mutableEnemies
    var boss: Boss? = null
        private set

    val playerRadius: Float
        get() = min(PLAYER_MAX_RADIUS, PLAYER_BASE_RADIUS + PLAYER_RADIUS_GROWTH * sqrt(count.toFloat()))

    val progress: Float
        get() = if (length <= 0f) 0f else min(1f, z / length)

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
        for (i in 0 until enemyCount) {
            val ez = 24f + random.next() * (length - 40f)
            val expected = expectedCountAt(ez)
            val n = max(1, floor(expected * (0.15f + random.next() * 0.35f)).toInt())
            mutableEnemies.add(Enemy(ez, -0.55f + random.next() * 1.1f, n))
        }

        boss = Boss(length, max(3, floor(best * BOSS_FACTOR).toInt()))
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

        for (g in mutableGates) {
            if (!g.used && g.z > prevZ && g.z <= z) {
                g.used = true
                val side = if (playerX < 0f) g.left else g.right
                count = apply(count, side)
                flash = FLASH_SECONDS
                lastGateGood = side.isGood
                if (count <= 0) {
                    state = State.GAME_OVER
                    message = MSG_WIPED
                    return
                }
            }
        }

        for (e in mutableEnemies) {
            if (e.alive && e.z > prevZ && e.z <= z && abs(e.x - playerX) < ENEMY_HALF_WIDTH + playerRadius) {
                e.alive = false
                count -= e.count
                flash = FLASH_SECONDS
                lastGateGood = false
                if (count <= 0) {
                    count = 0
                    state = State.GAME_OVER
                    message = MSG_LOST_TO_SQUAD.format(e.count)
                    return
                }
            }
        }

        val b = boss
        if (b != null && b.alive && b.z <= z) {
            b.alive = false
            count -= b.count
            if (count > 0) {
                state = State.LEVEL_CLEAR
                bestLevel = max(bestLevel, level)
                message = MSG_BOSS_BEATEN.format(b.count)
            } else {
                count = 0
                state = State.GAME_OVER
                message = MSG_LOST_TO_BOSS.format(b.count)
            }
        }
    }

    /** Test hook: put the crowd at a lane position and distance without generating a level. */
    internal fun setForTest(count: Int, playerX: Float, z: Float) {
        this.count = count
        this.playerX = playerX
        this.z = z
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
        const val BASE_SPEED = 6f
        const val SPEED_PER_LEVEL = 0.4f
        const val MAX_SPEED = 12f
        const val BASE_LENGTH = 110f
        const val LENGTH_PER_LEVEL = 12f
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
